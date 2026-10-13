import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Datha Ops — Angular dashboard demo',
    loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
  },
  { path: '**', redirectTo: '' },
];
