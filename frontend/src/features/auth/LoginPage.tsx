import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { APP_NAME } from '@/data/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate brief network delay for realism
    setTimeout(() => {
      const result = login(email, password);
      setIsLoading(false);

      if (result) {
        setError(result);
      } else {
        navigate('/', { replace: true });
      }
    }, 400);
  };

  return (
    <div className="flex flex-col min-h-dvh min-h-screen bg-background">
      <div className="flex-1 flex flex-col justify-center px-safe py-12">
        {/* Logo & Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-pocket bg-primary shadow-elevated mb-6">
            <span className="material-symbols-rounded text-on-primary text-4xl filled">
              account_balance_wallet
            </span>
          </div>
          <h1 className="font-display text-headline-lg-mobile text-text-primary mb-2">
            {APP_NAME}
          </h1>
          <p className="text-body-sm text-text-secondary max-w-[280px] mx-auto">
            Kelola uangmu lebih asik dengan sistem kantong.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-[360px] mx-auto w-full">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-3 rounded-card bg-bahaya-soft animate-scale-in">
              <span className="material-symbols-rounded text-bahaya text-xl flex-shrink-0">
                error
              </span>
              <p className="text-body-sm text-bahaya font-medium">{error}</p>
            </div>
          )}

          <Input
            label="Email"
            type="email"
            icon="mail"
            placeholder="Masukkan email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            autoComplete="email"
            autoFocus
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              icon="lock"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container-high transition-colors"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              <span className="material-symbols-rounded text-text-muted text-xl">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            className="mt-2"
          >
            Masuk
          </Button>
        </form>

        {/* Dev Hint */}
        <div className="mt-8 text-center">
          <p className="text-[11px] text-text-muted/60 leading-relaxed">
            Dev: kyune@example.com / pocketflow123
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-6 pt-4">
        <p className="text-[11px] text-text-muted">
          {APP_NAME} v0.1.0 — Sprint 1
        </p>
      </div>
    </div>
  );
}
