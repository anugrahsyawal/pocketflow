import { Providers } from '@/app/providers';
import { AppRouter } from '@/app/router';
import { AppDataInitializer } from '@/components/layout/AppDataInitializer';

export default function App() {
  return (
    <Providers>
      <AppDataInitializer />
      <AppRouter />
    </Providers>
  );
}
