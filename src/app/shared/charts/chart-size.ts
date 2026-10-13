import {
  afterNextRender,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  type Signal,
} from '@angular/core';

/**
 * The host element's content width as a signal, for laying a chart out at
 * the size it is actually given. Starts at `fallback`, which is what a server
 * render uses (there is nothing to measure there), then follows the element
 * through a `ResizeObserver` once it is in the browser. Call in an injection
 * context.
 */
export function injectChartWidth(fallback: number): Signal<number> {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const width = signal(fallback);
  const destroyRef = inject(DestroyRef);

  afterNextRender(() => {
    const measure = (value: number) => {
      // A collapsed or hidden host reports 0; keep the last real width.
      if (value > 0) width.set(Math.round(value));
    };
    measure(host.nativeElement.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width));
    observer.observe(host.nativeElement);
    destroyRef.onDestroy(() => observer.disconnect());
  });

  return width.asReadonly();
}

let nextId = 0;

/** A document-unique id prefix, for SVG `<defs>` a chart refers to by id. */
export function chartId(prefix: string): string {
  nextId += 1;
  return `chart-${prefix}-${nextId}`;
}
