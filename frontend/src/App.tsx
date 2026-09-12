import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './context/LanguageContext';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './routes/Dashboard';
import { NewScan } from './routes/NewScan';
import { Processing } from './routes/Processing';
import { Result } from './routes/Result';
import { History } from './routes/History';

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
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'scan/new',
        element: <NewScan />,
      },
      {
        path: 'scan/:scanId/processing',
        element: <Processing />,
      },
      {
        path: 'scan/:scanId/result',
        element: <Result />,
      },
      {
        path: 'history',
        element: <History />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <RouterProvider router={router} />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
