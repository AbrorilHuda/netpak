import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-24 font-sans antialiased">
      {children}
      <BottomNav />
    </div>
  );
}
