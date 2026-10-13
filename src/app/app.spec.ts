import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  it('renders a dock with one link per page section', async () => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = [...fixture.nativeElement.querySelectorAll('.dock a')].map((a: Element) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual(['/#overview', '/#traffic', '/#flow', '/#requests']);
  });
});
