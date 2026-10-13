import { DEFAULT_QUERY, DashboardQuery, parseQuery, toParams } from './dashboard-query';

describe('dashboard query in the URL', () => {
  it('reads every field and writes it back unchanged', () => {
    const query: DashboardQuery = {
      range: '7d',
      q: 'checkout',
      services: ['file-service', 'event-store'],
      statuses: ['5xx'],
      sort: 'durationMs',
      dir: 'asc',
      page: 3,
      size: 25,
    };
    const params = toParams(query);
    expect(params).toEqual({
      range: '7d',
      q: 'checkout',
      service: 'file-service,event-store',
      status: '5xx',
      sort: 'durationMs',
      dir: 'asc',
      page: 3,
      size: 25,
    });
    expect(parseQuery(params)).toEqual(query);
  });

  it('keeps a default view out of the URL', () => {
    expect(Object.values(toParams(DEFAULT_QUERY)).every((v) => v === null)).toBe(true);
  });

  it('falls back to defaults for anything it does not know, instead of failing', () => {
    expect(
      parseQuery({
        range: '1y',
        service: 'nope,file-service,file-service',
        status: '7xx',
        sort: 'secret',
        dir: 'sideways',
        page: '-2',
        size: '1000',
      }),
    ).toEqual({ ...DEFAULT_QUERY, services: ['file-service'] });
  });
});
