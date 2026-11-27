import { createBrowserRouter } from 'react-router';
import { StaffLayout } from '../layouts/StaffLayout';

// Pages are lazy-loaded per route. Route guards (UX only) arrive with staff sign-in in S1.
export const router = createBrowserRouter([
  {
    element: <StaffLayout />,
    children: [
      { path: '/', lazy: () => import('../pages/overview/OverviewPage') },
      { path: '*', lazy: () => import('../pages/not-found/NotFoundPage') },
    ],
  },
]);
