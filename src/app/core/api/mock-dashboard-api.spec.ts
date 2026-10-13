import { TestBed } from '@angular/core/testing';
import { firstValueFrom, timeout } from 'rxjs';
import { DemoScenario } from '../demo/demo-scenario';
import { DashboardApi } from './dashboard-api';
import { MOCK_LATENCY } from './mock-dashboard-api';
import { ApiError } from './models';
import { provideDashboardApi } from './provide-dashboard-api';

describe('MockDashboardApi', () => {
  let api: DashboardApi;
  let scenario: DemoScenario;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideDashboardApi(), { provide: MOCK_LATENCY, useValue: [0, 0] }],
    });
    api = TestBed.inject(DashboardApi);
    scenario = TestBed.inject(DemoScenario);
  });

  it('answers with data in the normal scenario', async () => {
    const page = await firstValueFrom(api.listRequests({ range: '7d', pageSize: 10 }));
    expect(page.items).toHaveLength(10);
    expect(page.total).toBeGreaterThan(10);
    expect(await firstValueFrom(api.getKpis({ range: '24h' }))).toHaveLength(4);
  });

  it('answers empty, not failing, in the empty scenario', async () => {
    scenario.current.set('empty');
    expect(await firstValueFrom(api.getKpis({ range: '24h' }))).toEqual([]);
    expect(await firstValueFrom(api.listRequests({ range: '7d' }))).toMatchObject({
      items: [],
      total: 0,
    });
  });

  it('fails with an ApiError in the error scenario', async () => {
    scenario.current.set('error');
    const error = await firstValueFrom(api.getTraffic({ range: '24h' })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 503 });
  });

  it('never answers in the loading scenario', async () => {
    scenario.current.set('loading');
    const result = await firstValueFrom(api.getKpis({ range: '24h' }).pipe(timeout(50))).catch(
      (e: Error) => e.name,
    );
    expect(result).toBe('TimeoutError');
  });

  it('reads the scenario when subscribed, not when the call is made', async () => {
    const call = api.getKpis({ range: '24h' });
    scenario.current.set('empty');
    expect(await firstValueFrom(call)).toEqual([]);
  });

  it('finds one request by id and 404s on an unknown one', async () => {
    const [first] = (await firstValueFrom(api.listRequests({ range: '24h' }))).items;
    expect(await firstValueFrom(api.getRequest(first.id))).toEqual(first);
    const error = await firstValueFrom(api.getRequest('req_nope')).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 404 });
  });
});
