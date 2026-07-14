import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { SetupWelcomePage } from '@/features/setup/SetupWelcomePage';
import { SetupBudgetPeriodPage } from '@/features/setup/SetupBudgetPeriodPage';
import { SetupPocketTemplatePage } from '@/features/setup/SetupPocketTemplatePage';
import { SetupInitialBalancePage } from '@/features/setup/SetupInitialBalancePage';
import { SetupReviewPage } from '@/features/setup/SetupReviewPage';
import { SetupRequiredRoute } from '@/components/layout/SetupRequiredRoute';
import { useSetupStore } from '@/features/setup/useSetupStore';
import { useStoreHydration } from '@/lib/storeHydration';
import { PocketListPage } from '@/features/pockets/PocketListPage';
import { PocketDetailPage } from '@/features/pockets/PocketDetailPage';
import { CategoryManagementPage } from '@/features/categories/CategoryManagementPage';
import { AddExpensePage } from '@/features/transactions/AddExpensePage';
import { AddIncomePage } from '@/features/transactions/AddIncomePage';
import { AddTransferPage } from '@/features/transactions/AddTransferPage';
import { TransactionHistoryPage } from '@/features/transactions/TransactionHistoryPage';
import { TransactionDetailPage } from '@/features/transactions/TransactionDetailPage';

function PlaceholderPage({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-safe">
      <span className="text-4xl mb-4">🚧</span>
      <h1 className="font-display text-headline-md text-text-primary mb-2">{name}</h1>
      <p className="text-body-sm text-text-secondary">Halaman ini akan dibangun segera.</p>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-safe">
      <span className="text-5xl mb-4">🔎</span>
      <h1 className="font-display text-headline-md text-text-primary mb-2">404</h1>
      <p className="text-body-sm text-text-secondary">Halaman tidak ditemukan.</p>
    </div>
  );
}

/**
 * Redirect authenticated users away from /login.
 * Setup-aware and hydration-safe.
 */
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isSetupComplete = useSetupStore((s) => s.isSetupComplete);
  const isAuthHydrated = useStoreHydration(useAuthStore);
  const isSetupHydrated = useStoreHydration(useSetupStore);

  if (!isAuthHydrated || !isSetupHydrated) {
    return (
      <div className="min-h-screen min-h-dvh bg-background flex items-center justify-center">
        <span className="material-symbols-rounded animate-spin text-primary text-3xl">progress_activity</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={isSetupComplete ? "/" : "/setup/welcome"} replace />;
  }
  return <>{children}</>;
}

export function AppRouter() {
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const navigate = useNavigate();

  const handleSheetNav = (path: string) => {
    setIsAddSheetOpen(false);
    navigate(path);
  };

  return (
    <>
      <Routes>
        {/* Public routes — redirect to / if already authenticated */}
        <Route path="/login" element={<AuthRedirect><LoginPage /></AuthRedirect>} />

        {/* Setup wizard routes — require authentication */}
        <Route path="/setup" element={<ProtectedRoute><Navigate to="/setup/welcome" replace /></ProtectedRoute>} />
        <Route path="/setup/welcome" element={<ProtectedRoute><SetupWelcomePage /></ProtectedRoute>} />
        <Route path="/setup/period" element={<ProtectedRoute><SetupBudgetPeriodPage /></ProtectedRoute>} />
        <Route path="/setup/pockets" element={<ProtectedRoute><SetupPocketTemplatePage /></ProtectedRoute>} />
        <Route path="/setup/balances" element={<ProtectedRoute><SetupInitialBalancePage /></ProtectedRoute>} />
        <Route path="/setup/review" element={<ProtectedRoute><SetupReviewPage /></ProtectedRoute>} />

        {/* Main pages with bottom nav */}
        <Route path="/" element={
          <ProtectedRoute><SetupRequiredRoute><AppShell><PlaceholderPage name="Beranda" /><BottomNav onAddClick={() => setIsAddSheetOpen(true)} /></AppShell></SetupRequiredRoute></ProtectedRoute>
        } />
        <Route path="/pockets" element={
          <ProtectedRoute><SetupRequiredRoute><AppShell><PocketListPage /><BottomNav onAddClick={() => setIsAddSheetOpen(true)} /></AppShell></SetupRequiredRoute></ProtectedRoute>
        } />
        <Route path="/transactions" element={
          <ProtectedRoute><SetupRequiredRoute><AppShell><TransactionHistoryPage /><BottomNav onAddClick={() => setIsAddSheetOpen(true)} /></AppShell></SetupRequiredRoute></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute><SetupRequiredRoute><AppShell><PlaceholderPage name="Laporan" /><BottomNav onAddClick={() => setIsAddSheetOpen(true)} /></AppShell></SetupRequiredRoute></ProtectedRoute>
        } />

        {/* Detail pages without bottom nav */}
        <Route path="/pockets/:id" element={<ProtectedRoute><SetupRequiredRoute><AppShell showBottomNav={false}><PocketDetailPage /></AppShell></SetupRequiredRoute></ProtectedRoute>} />
        <Route path="/pockets/:id/categories" element={<ProtectedRoute><SetupRequiredRoute><AppShell showBottomNav={false}><CategoryManagementPage /></AppShell></SetupRequiredRoute></ProtectedRoute>} />
        <Route path="/transactions/add/expense" element={<ProtectedRoute><SetupRequiredRoute><AppShell showBottomNav={false}><AddExpensePage /></AppShell></SetupRequiredRoute></ProtectedRoute>} />
        <Route path="/transactions/add/income" element={<ProtectedRoute><SetupRequiredRoute><AppShell showBottomNav={false}><AddIncomePage /></AppShell></SetupRequiredRoute></ProtectedRoute>} />
        <Route path="/transactions/add/transfer" element={<ProtectedRoute><SetupRequiredRoute><AppShell showBottomNav={false}><AddTransferPage /></AppShell></SetupRequiredRoute></ProtectedRoute>} />
        <Route path="/transactions/:id" element={<ProtectedRoute><SetupRequiredRoute><AppShell showBottomNav={false}><TransactionDetailPage /></AppShell></SetupRequiredRoute></ProtectedRoute>} />
        <Route path="/transactions/:id/edit" element={<ProtectedRoute><SetupRequiredRoute><AppShell showBottomNav={false}><PlaceholderPage name="Edit Transaksi" /></AppShell></SetupRequiredRoute></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SetupRequiredRoute><AppShell showBottomNav={false}><PlaceholderPage name="Pengaturan" /></AppShell></SetupRequiredRoute></ProtectedRoute>} />
        <Route path="/placeholder/:feature" element={<ProtectedRoute><SetupRequiredRoute><AppShell showBottomNav={false}><PlaceholderPage name="Segera Hadir" /></AppShell></SetupRequiredRoute></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<AppShell showBottomNav={false}><NotFoundPage /></AppShell>} />
      </Routes>

      {/* Add Transaction Bottom Sheet */}
      <BottomSheet isOpen={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} title="Tambah Transaksi">
        <div className="flex flex-col gap-2 pb-4">
          <button onClick={() => handleSheetNav('/transactions/add/expense')} className="flex items-center gap-4 p-4 rounded-card hover:bg-surface-container transition-colors text-left">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-bahaya-soft">
              <span className="material-symbols-rounded text-bahaya">remove_circle</span>
            </span>
            <div>
              <div className="font-display text-headline-sm text-text-primary">Pengeluaran</div>
              <div className="text-body-sm text-text-secondary">Catat uang keluar</div>
            </div>
          </button>

          <button onClick={() => handleSheetNav('/transactions/add/income')} className="flex items-center gap-4 p-4 rounded-card hover:bg-surface-container transition-colors text-left">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-aman-soft">
              <span className="material-symbols-rounded text-aman">add_circle</span>
            </span>
            <div>
              <div className="font-display text-headline-sm text-text-primary">Pemasukan</div>
              <div className="text-body-sm text-text-secondary">Uang masuk</div>
            </div>
          </button>

          <button onClick={() => handleSheetNav('/transactions/add/transfer')} className="flex items-center gap-4 p-4 rounded-card hover:bg-surface-container transition-colors text-left">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-soft">
              <span className="material-symbols-rounded text-primary">swap_horiz</span>
            </span>
            <div>
              <div className="font-display text-headline-sm text-text-primary">Transfer</div>
              <div className="text-body-sm text-text-secondary">Pindah kantong</div>
            </div>
          </button>

          <button disabled className="flex items-center gap-4 p-4 rounded-card opacity-50 cursor-not-allowed text-left">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-container">
              <span className="material-symbols-rounded text-text-muted">receipt_long</span>
            </span>
            <div>
              <div className="font-display text-headline-sm text-text-primary">Paste JSON Struk</div>
              <div className="text-body-sm text-text-secondary">Import dari AI eksternal</div>
              <div className="text-label-caps text-accent-dark mt-0.5">SPRINT 2</div>
            </div>
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
