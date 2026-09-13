import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth } from './components/auth/RequireAuth';
import { ConsoleShell } from './components/layout/ConsoleShell';
import { LandingPage } from './routes/LandingPage';
import { Login } from './routes/Login';
import { Signup } from './routes/Signup';
import { Sandbox } from './routes/console/Sandbox';
import { Developer } from './routes/console/Developer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/console',
    element: (
      <RequireAuth>
        <ConsoleShell />
      </RequireAuth>
    ),
    children: [
      {
        path: 'sandbox',
        element: <Sandbox />,
      },
      {
        path: 'developer',
        element: <Developer />,
      },
      {
        index: true,
        element: <Navigate to="/console/sandbox" replace />,
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
