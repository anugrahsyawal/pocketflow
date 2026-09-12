import { useLocation, useNavigate } from 'react-router-dom';

interface BottomNavProps {
  onAddClick?: () => void;
}

export function BottomNav({ onAddClick }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Beranda', icon: 'home' },
    { path: '/pockets', label: 'Pocket', icon: 'account_balance_wallet' },
    { path: '__add__', label: '', icon: 'add' },
    { path: '/transactions', label: 'Riwayat', icon: 'receipt_long' },
    { path: '/reports', label: 'Laporan', icon: 'bar_chart' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav aria-label="Navigasi utama" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-surface/95 backdrop-blur-xl shadow-nav border-t border-border/60 z-50 pb-safe rounded-t-[24px]">
      <div className="flex items-center justify-around h-[72px] px-2">
        {navItems.map((item) => {
          if (item.path === '__add__') {
            return (
              <button
                key="add"
                onClick={onAddClick}
                className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-primary shadow-[0_6px_18px_rgba(0,74,198,0.24)] ring-[5px] ring-background text-on-primary hover:bg-primary-container active:scale-95 transition-all"
                aria-label="Tambah transaksi"
              >
                <span className="material-symbols-rounded text-3xl">add</span>
              </button>
            );
          }

          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 transition-colors ${
                active ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`material-symbols-rounded text-2xl rounded-pill px-3 py-0.5 transition-colors ${active ? 'filled bg-primary-soft/70' : ''}`} aria-hidden="true">
                {item.icon}
              </span>
              <span className={`text-[11px] leading-4 ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
