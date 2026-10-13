import { Injector, runInInjectionContext, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, throwError } from 'rxjs';
import { loadState } from './load-state';
import { ApiError } from './models';

const flush = async () => {
  TestBed.tick();
  await new Promise((r) => setTimeout(r));
};

describe('loadState', () => {
  const setup = <T>(stream: () => Observable<T>, isEmpty: (v: T) => boolean) =>
    runInInjectionContext(TestBed.inject(Injector), () => {
      const key = signal(1);
      const res = rxResource({ params: () => key(), stream });
      return { key, res, load: loadState(res, isEmpty) };
    });

  it('reports error without reading the value, which would throw', async () => {
    const { load } = setup(
      () => throwError(() => new ApiError(503, 'Down.')),
      () => false,
    );
    await flush();
    expect(load.state()).toBe('error');
    expect(load.errorText()).toBe('Down. (HTTP 503)');
  });

  it('goes loading, then ready or empty, and dims stale data on reload', async () => {
    const source = new Subject<number[]>();
    const { res, load } = setup(
      () => source,
      (v) => v.length === 0,
    );
    await flush();
    expect(load.state()).toBe('loading');
    source.next([1]);
    await flush();
    expect(load.state()).toBe('ready');
    expect(load.stale()).toBe(false);
    res.reload();
    await flush();
    expect(load.stale()).toBe(true);
    source.next([]);
    await flush();
    expect(load.state()).toBe('empty');
  });
});
