import { Routes } from '@angular/router';
import { authGuard, entryGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'sign-in',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/sign-in.component').then((component) => component.SignInComponent),
    title: 'Sign in · SK-SUbong',
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.component').then((component) => component.RegisterComponent),
    title: 'Register · SK-SUbong',
  },
  {
    path: 'workspace/:page',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workspace/workspace-page.component').then(
        (component) => component.WorkspacePage,
      ),
    title: 'Workspace · SK-SUbong',
  },
  { path: '', pathMatch: 'full', canActivate: [entryGuard], children: [] },
  { path: '**', redirectTo: '' },
];
