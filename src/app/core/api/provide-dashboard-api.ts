import { Provider } from '@angular/core';
import { DashboardApi } from './dashboard-api';
import { MockDashboardApi } from './mock-dashboard-api';

/**
 * The one line to change for a real backend:
 * `{ provide: DashboardApi, useClass: HttpDashboardApi }`, with `provideHttpClient(withFetch())`
 * and `{ provide: API_BASE_URL, useValue: 'https://…' }`.
 */
export function provideDashboardApi(): Provider[] {
  return [{ provide: DashboardApi, useClass: MockDashboardApi }];
}
