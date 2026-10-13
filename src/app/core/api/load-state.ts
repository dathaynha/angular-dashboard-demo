import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID, Resource, Signal } from '@angular/core';
import type { ChartState } from '../../shared/charts/chart.types';
import { ApiError } from './models';

export interface LoadState {
  state: Signal<ChartState>;
  /** Old data still on screen while new data loads: shown dimmed, not replaced by a skeleton. */
  stale: Signal<boolean>;
  errorText: Signal<string>;
}

/** Maps a resource onto the four states every card and table draws. */
export function loadState<T>(
  resource: Resource<T | undefined>,
  isEmpty: (value: T) => boolean,
): LoadState {
  const busy = () => resource.status() === 'loading' || resource.status() === 'reloading';
  return {
    state: computed(() => {
      if (resource.status() === 'error') return 'error';
      // value() throws in the error state, so it is read only past that check.
      if (!resource.hasValue()) return 'loading';
      return isEmpty(resource.value() as T) ? 'empty' : 'ready';
    }),
    stale: computed(() => busy() && resource.hasValue()),
    errorText: computed(() => {
      const error = resource.error();
      return error instanceof ApiError
        ? `${error.message} (HTTP ${error.status})`
        : 'Something went wrong while loading.';
    }),
  };
}

/**
 * True in the browser. Resource params return `undefined` on the server, so the
 * prerendered page ships skeletons and hydration never swaps baked-in data for a
 * skeleton and back. Call in an injection context.
 */
export const isBrowser = () => isPlatformBrowser(inject(PLATFORM_ID));
