import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../../../core/icon';

/**
 * What this page is and how it is built, for a reader who will never open the
 * repository. Kept short: the dashboard below is the real argument.
 */
@Component({
  selector: 'app-intro',
  imports: [Icon],
  templateUrl: './intro.html',
  styleUrl: './intro.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Intro {
  protected readonly points = [
    {
      icon: 'chart',
      title: 'Two chart libraries, picked per chart',
      text: 'd3 draws the bespoke visuals, the request-flow Sankey and the sparklines, as SVG. ECharts takes standard charts and volume: the traffic line zooms through 43,200 points.',
    },
    {
      icon: 'layers',
      title: 'Every state is designed',
      text: 'Loading, empty, error and refreshing each have a look, not only the happy path. Switch them with the Demo button in the menu.',
    },
    {
      icon: 'search',
      title: 'Filters you can share',
      text: 'Time range and service scope every number on the page; search and status narrow the request log. It all lives in the URL, so a link or a refresh shows the same view.',
    },
    {
      icon: 'grid',
      title: 'Built to grow',
      text: 'Reusable cards, charts and table on standalone components, signals and RxJS. Data comes through a typed REST-style API layer; swapping the mock for a real backend is one line.',
    },
  ];

  protected readonly stack = [
    'Angular 22',
    'TypeScript',
    'RxJS',
    'Signals',
    'd3',
    'ECharts',
    'SCSS',
    'Vitest',
    'Playwright',
  ];
}
