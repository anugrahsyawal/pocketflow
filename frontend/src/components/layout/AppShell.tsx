import { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  showBottomNav?: boolean;
  className?: string;
}

export function AppShell({ children, showBottomNav = true, className = '' }: AppShellProps) {
  return (
    <div className="min-h-screen min-h-dvh bg-background flex justify-center">
      <div className={`app-frame w-full min-w-0 max-w-app flex flex-col min-h-screen min-h-dvh ${className}`}>
        <main className={`flex-1 min-w-0 ${showBottomNav ? 'pb-[calc(88px+env(safe-area-inset-bottom,0px))]' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
