import { DOCUMENT } from '@angular/common';
import { afterRenderEffect, inject, signal, Signal, untracked } from '@angular/core';
import { ThemeService } from '../../../core/theme';
import { SERIES_COLORS, STATUS_COLORS } from '../chart-palette';

/** The design tokens as concrete colours, for a canvas that cannot read CSS variables. */
export interface ChartColors {
  ink: string;
  muted: string;
  grid: string;
  axis: string;
  surface: string;
  border: string;
  accent: string;
  series: string[];
  status: Record<keyof typeof STATUS_COLORS, string>;
  /** Off when the reader asks for reduced motion. */
  animate: boolean;
  /** Sequential ramp for magnitude, low to high, chosen per scheme. */
  sequential: string[];
}

// Sequential blue, one hue light to dark (dataviz reference ramp). On the dark
// surface low values sit near the surface and high values come forward.
const SEQUENTIAL_LIGHT = ['#cde2fb', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b'];
const SEQUENTIAL_DARK = ['#0d366b', '#184f95', '#2a78d6', '#6da7ec', '#b7d3f6'];

/**
 * Resolves the tokens through a probe element, which also settles `light-dark()`,
 * and resolves again whenever the theme switches. `null` until the first render
 * in the browser, so charts that need it draw only there.
 */
export function injectChartColors(): Signal<ChartColors | null> {
  const document = inject(DOCUMENT);
  const theme = inject(ThemeService);
  const colors = signal<ChartColors | null>(null);

  afterRenderEffect(() => {
    const dark = theme.dark();
    untracked(() => {
      const probe = document.createElement('span');
      probe.style.display = 'none';
      document.body.appendChild(probe);
      const read = (value: string) => {
        probe.style.color = value;
        return getComputedStyle(probe).color;
      };
      colors.set({
        ink: read('var(--page-ink)'),
        muted: read('var(--page-muted)'),
        grid: read('var(--chart-grid)'),
        axis: read('var(--chart-axis)'),
        surface: read('var(--card-bg)'),
        border: read('var(--card-border)'),
        accent: read('var(--chart-accent)'),
        series: SERIES_COLORS.map(read),
        status: {
          '2xx': read(STATUS_COLORS['2xx']),
          '3xx': read(STATUS_COLORS['3xx']),
          '4xx': read(STATUS_COLORS['4xx']),
          '5xx': read(STATUS_COLORS['5xx']),
        },
        animate: !document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches,
        sequential: dark ? SEQUENTIAL_DARK : SEQUENTIAL_LIGHT,
      });
      probe.remove();
    });
  });
  return colors.asReadonly();
}

/** The parts every ECharts option shares: text, axes, grid and tooltip in the tokens. */
export function baseOption(c: ChartColors) {
  const axisLabel = { color: c.muted, fontSize: 11 };
  return {
    textStyle: { fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', color: c.ink },
    // Axis labels in UTC like everything else, whatever the reader's time zone.
    useUTC: true,
    animation: c.animate,
    animationDuration: 400,
    tooltip: {
      backgroundColor: c.surface,
      borderColor: c.border,
      textStyle: { color: c.ink, fontSize: 12 },
      extraCssText: 'border-radius: 8px; box-shadow: 0 6px 18px rgba(0,0,0,.14);',
    },
    axis: {
      axisLabel,
      axisLine: { lineStyle: { color: c.grid } },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: c.grid, type: 'solid' as const } },
    },
  };
}

/** A resolved `rgb()` colour at the given opacity. */
export function alpha(color: string, opacity: number): string {
  const [r, g, b] = color.match(/[\d.]+/g) ?? ['0', '0', '0'];
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
