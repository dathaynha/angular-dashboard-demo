import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideDashboardApi } from './core/api/provide-dashboard-api';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // No router scrolling: it would jump to the URL's #section on every filter
    // change. The shell scrolls to sections itself.
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(withEventReplay()),
    provideDashboardApi(),
  ],
};
