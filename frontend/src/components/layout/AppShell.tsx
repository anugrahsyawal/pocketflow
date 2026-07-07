import { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  showBottomNav?: boolean;
  className?: string;
}

export function AppShell({ children, showBottomNav = true, className = '' }: AppShellProps) {
  return (
    <div className="min-h-screen min-h-dvh bg-background flex justify-center">
      <div className={`w-full max-w-app flex flex-col min-h-screen min-h-dvh ${className}`}>
        <main className={`flex-1 overflow-y-auto ${showBottomNav ? 'pb-20' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
