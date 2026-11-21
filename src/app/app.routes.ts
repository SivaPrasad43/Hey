import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'chat' },
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · Hey',
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Create account · Hey',
    loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    title: 'Hey',
    loadComponent: () => import('./features/chat/chat-shell.page').then((m) => m.ChatShellPage),
    children: [
      { path: '', loadComponent: () => import('./features/chat/empty-room.component').then((m) => m.EmptyRoomComponent) },
      {
        path: 'settings',
        title: 'Settings · Hey',
        loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: 'help',
        title: 'Help · Hey',
        loadComponent: () => import('./features/help/help.page').then((m) => m.HelpPage),
      },
      { path: ':roomId', loadComponent: () => import('./features/chat/room.page').then((m) => m.RoomPage) },
    ],
  },
  {
    path: '**',
    title: 'Not found · Hey',
    loadComponent: () => import('./features/not-found.page').then((m) => m.NotFoundPage),
  },
];
