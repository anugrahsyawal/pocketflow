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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-surface shadow-nav border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-2 pb-safe">
        {navItems.map((item) => {
          if (item.path === '__add__') {
            return (
              <button
                key="add"
                onClick={onAddClick}
                className="flex items-center justify-center w-14 h-14 -mt-5 rounded-full bg-primary shadow-elevated text-on-primary active:scale-95 transition-transform"
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
            >
              <span className={`material-symbols-rounded text-2xl ${active ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
