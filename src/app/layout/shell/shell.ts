import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Icon } from '../../core/icon';
import { ThemeService } from '../../core/theme';
import { DemoPanel } from '../demo-panel/demo-panel';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, Icon, DemoPanel],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  protected readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private unspy?: () => void;

  /** The page's sections; the one in view is marked current. */
  protected readonly nav = [
    { id: 'overview', label: 'Overview', icon: 'grid' },
    { id: 'traffic', label: 'Traffic', icon: 'chart' },
    { id: 'flow', label: 'Flow', icon: 'flow' },
    { id: 'requests', label: 'Requests', icon: 'list' },
  ];
  protected readonly active = signal('overview');

  private readonly router = inject(Router);

  constructor() {
    let first = true;
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        // Only once the first navigation ends does the URL hold a shared #section.
        const fragment = first ? this.router.parseUrl(this.router.url).fragment : null;
        first = false;
        afterNextRender(
          () => {
            this.watchSections();
            if (fragment) this.holdAt(fragment);
          },
          { injector: this.injector },
        );
      });
    inject(DestroyRef).onDestroy(() => this.unspy?.());
  }

  /**
   * A rail link scrolls to its section and writes `#section` to the URL for
   * sharing. A modified click (new tab) keeps the browser's default.
   */
  protected go(event: MouseEvent, id: string): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    this.active.set(id);
    this.scrollTo(id, true);
    this.router.navigate([], {
      fragment: id,
      queryParamsHandling: 'preserve',
      replaceUrl: true,
    });
  }

  private scrollTo(id: string, smooth: boolean): void {
    const reduce = this.document.defaultView?.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    this.document
      .getElementById(id)
      ?.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto', block: 'start' });
  }

  /**
   * A shared link opens at its section. Charts load after the first render and
   * change the height above it, so the section is held in place while the page
   * settles, until the reader scrolls or 4 seconds pass.
   */
  private holdAt(id: string): void {
    const main = this.document.querySelector('main');
    const view = this.document.defaultView;
    if (!main || !view || typeof ResizeObserver === 'undefined') return;
    this.active.set(id);
    this.scrollTo(id, false);
    const observer = new ResizeObserver(() => this.scrollTo(id, false));
    observer.observe(main);
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    const release = () => {
      observer.disconnect();
      for (const type of events) view.removeEventListener(type, release);
    };
    for (const type of events) view.addEventListener(type, release, { passive: true });
    view.setTimeout(release, 4000);
  }

  /**
   * Scroll-spy: the current section is the last one whose top has passed a line
   * 30% down the screen. The last section is short and can never reach that line,
   * so at the very bottom of the page it is current anyway.
   */
  private watchSections(): void {
    const view = this.document.defaultView;
    if (!view || this.unspy) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = this.document.documentElement;
      const atEnd = view.scrollY + view.innerHeight >= root.scrollHeight - 2;
      const line = view.innerHeight * 0.3;
      let current = this.nav[0].id;
      for (const item of this.nav) {
        const top = this.document.getElementById(item.id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) current = item.id;
      }
      this.active.set(atEnd ? this.nav[this.nav.length - 1].id : current);
    };
    const onScroll = () => (frame ||= view.requestAnimationFrame(update));
    view.addEventListener('scroll', onScroll, { passive: true });
    view.addEventListener('resize', onScroll, { passive: true });
    this.unspy = () => {
      view.removeEventListener('scroll', onScroll);
      view.removeEventListener('resize', onScroll);
    };
    update();
  }
}
