import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { Page, RequestRecord } from '../../core/api/models';
import { DashboardApi } from '../../core/api/dashboard-api';
import { DashboardStore } from './dashboard-store';

const flush = async () => {
  TestBed.tick();
  await new Promise((r) => setTimeout(r));
  TestBed.tick();
};

function setup() {
  const api = {
    getKpis: vi.fn<DashboardApi['getKpis']>(() => of([])),
    getTraffic: vi.fn<DashboardApi['getTraffic']>(() => of([])),
    getRequestsByService: vi.fn<DashboardApi['getRequestsByService']>(() =>
      of({ buckets: [], series: [] }),
    ),
    getStatusBreakdown: vi.fn<DashboardApi['getStatusBreakdown']>(() => of([])),
    getRequestFlow: vi.fn<DashboardApi['getRequestFlow']>(() => of({ nodes: [], links: [] })),
    getLatencyHeatmap: vi.fn<DashboardApi['getLatencyHeatmap']>(() => of([])),
    listRequests: vi.fn<DashboardApi['listRequests']>(() =>
      of({ items: [], total: 0, page: 1, pageSize: 10 }),
    ),
  };
  TestBed.configureTestingModule({
    providers: [provideRouter([]), DashboardStore, { provide: DashboardApi, useValue: api }],
  });
  return { api, store: TestBed.inject(DashboardStore), router: TestBed.inject(Router) };
}

describe('DashboardStore', () => {
  it('reloads only the table for a search, not the range-scoped charts', async () => {
    const { api, router } = setup();
    await flush();
    expect(api.getTraffic).toHaveBeenCalledTimes(1);
    expect(api.listRequests).toHaveBeenCalledTimes(1);

    await router.navigate([], { queryParams: { q: 'notifications', page: 2 } });
    await flush();

    expect(api.listRequests).toHaveBeenCalledTimes(2);
    expect(api.listRequests).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'notifications', page: 2 }),
    );
    for (const call of [
      api.getKpis,
      api.getTraffic,
      api.getRequestsByService,
      api.getStatusBreakdown,
      api.getRequestFlow,
      api.getLatencyHeatmap,
    ]) {
      expect(call).toHaveBeenCalledTimes(1);
    }
  });

  it('reloads every chart when the range changes', async () => {
    const { api, router } = setup();
    await flush();
    await router.navigate([], { queryParams: { range: '7d' } });
    await flush();
    expect(api.getTraffic).toHaveBeenCalledTimes(2);
    expect(api.getTraffic).toHaveBeenLastCalledWith({ range: '7d', services: [] });
  });

  it('reloads every chart, scoped, when the service filter changes', async () => {
    const { api, router } = setup();
    await flush();
    await router.navigate([], { queryParams: { service: 'chatbot-service' } });
    await flush();
    for (const call of [api.getKpis, api.getTraffic, api.getStatusBreakdown, api.getRequestFlow]) {
      expect(call).toHaveBeenCalledTimes(2);
      expect(call).toHaveBeenLastCalledWith({ range: '24h', services: ['chatbot-service'] });
    }
  });

  it('keeps the previous page on screen, dimmed, while the next one loads', async () => {
    const { api, store, router } = setup();
    await flush();
    const row = { id: 'req_1' } as RequestRecord;
    const pending = new Subject<Page<RequestRecord>>();
    api.listRequests.mockReturnValueOnce(of({ items: [row], total: 30, page: 1, pageSize: 10 }));
    await router.navigate([], { queryParams: { size: 25 } });
    await flush();
    api.listRequests.mockReturnValueOnce(pending);
    await router.navigate([], { queryParams: { size: 25, page: 2 } });
    await flush();

    expect(store.rows()).toEqual([row]);
    expect(store.requestLoad.state()).toBe('ready');
    expect(store.requestLoad.stale()).toBe(true);

    pending.next({ items: [], total: 30, page: 2, pageSize: 10 });
    await flush();
    expect(store.rows()).toEqual([]);
    expect(store.requestLoad.stale()).toBe(false);
  });

  it('starts a refresh clean, with skeletons, like the charts', async () => {
    const { api, store } = setup();
    await flush();
    expect(store.requestLoad.state()).toBe('empty');
    api.listRequests.mockReturnValueOnce(new Subject<Page<RequestRecord>>());
    store.reload();
    await flush();
    expect(store.requestLoad.state()).toBe('loading');
  });
});
