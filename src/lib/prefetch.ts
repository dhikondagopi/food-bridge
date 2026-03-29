const prefetchedRoutes = new Set<string>();

const routeImports: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/Landing'),
  '/login': () => import('@/pages/Login'),
  '/signup': () => import('@/pages/Signup'),
  '/forgot-password': () => import('@/pages/ForgotPassword'),
  '/reset-password': () => import('@/pages/ResetPassword'),
  '/dashboard': () => import('@/pages/Dashboard'),
  '/map': () => import('@/pages/MapPage'),
  '/profile': () => import('@/pages/Profile'),
  '/analytics': () => import('@/pages/Analytics'),
  '/chat': () => import('@/pages/Chat'),
  '/call-history': () => import('@/pages/CallHistory'),
  '/leaderboard': () => import('@/pages/Leaderboard'),
  '/install': () => import('@/pages/Install'),
  '/sudo-panel': () => import('@/pages/AdminLogin'),
  '/admin': () => import('@/pages/Admin'),
};

export function prefetchRoute(path: string) {
  if (prefetchedRoutes.has(path)) return;
  const loader = routeImports[path];
  if (loader) {
    prefetchedRoutes.add(path);
    loader();
  }
}
