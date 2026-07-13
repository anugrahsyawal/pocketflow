import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useStoreHydration } from '@/lib/storeHydration';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route guard that redirects unauthenticated users to /login.
 * Waits for auth store hydration to finish before making routing decisions.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useStoreHydration(useAuthStore);
  const location = useLocation();

  // Render a minimal loader while hydrating to prevent premature redirect / flash
  if (!isHydrated) {
    return (
      <div className="min-h-screen min-h-dvh bg-background flex items-center justify-center">
        <span className="material-symbols-rounded animate-spin text-primary text-3xl">progress_activity</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
