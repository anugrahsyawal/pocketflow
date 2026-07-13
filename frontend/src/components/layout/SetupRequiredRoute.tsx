import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSetupStore } from '@/features/setup/useSetupStore';
import { useStoreHydration } from '@/lib/storeHydration';

interface SetupRequiredRouteProps {
  children: ReactNode;
}

/**
 * Route guard that redirects authenticated users to the setup wizard
 * if setup is not complete. Waits for setup store hydration to finish
 * before routing to prevent layout flash or bypassing the guard.
 */
export function SetupRequiredRoute({ children }: SetupRequiredRouteProps) {
  const isSetupComplete = useSetupStore((s) => s.isSetupComplete);
  const isHydrated = useStoreHydration(useSetupStore);

  // Render a minimal loader while hydrating to prevent premature redirect or flash
  if (!isHydrated) {
    return (
      <div className="min-h-screen min-h-dvh bg-background flex items-center justify-center">
        <span className="material-symbols-rounded animate-spin text-primary text-3xl">progress_activity</span>
      </div>
    );
  }

  if (!isSetupComplete) {
    return <Navigate to="/setup/welcome" replace />;
  }

  return <>{children}</>;
}
