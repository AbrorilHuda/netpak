interface HeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function Header({ title, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-lg border-b border-slate-100/80 dark:border-slate-800/80 px-5 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">{title}</h1>
        {action && <div>{action}</div>}
      </div>
    </header>
  );
}
