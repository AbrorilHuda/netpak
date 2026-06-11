import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    path: '/transactions',
    label: 'Transaksi',
    icon: (
      <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    path: '/customers',
    label: 'Pelanggan',
    icon: (
      <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    path: '/debts',
    label: 'Hutang',
    icon: (
      <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    path: '/more',
    label: 'Lainnya',
    icon: (
      <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [debtCount, setDebtCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    // Fetch number of unique customers with active debt
    supabase
      .from('transactions')
      .select('customer_id', { count: 'exact', head: false })
      .eq('user_id', user.id)
      .in('payment_status', ['debt', 'partial'])
      .gt('remaining_amount', 0)
      .then(({ data }) => {
        if (data) {
          const uniqueCustomers = new Set(data.map((t: any) => t.customer_id));
          setDebtCount(uniqueCustomers.size);
        }
      });
  }, [user]);

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-slate-950/60 rounded-3xl p-1 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 relative rounded-2xl active:scale-90 ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <div className={`transition-transform duration-300 ${isActive ? '-translate-y-0.5 scale-110' : ''} relative`}>
                {item.icon}
                {item.path === '/debts' && debtCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {debtCount > 9 ? '9+' : debtCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-wider uppercase font-semibold scale-90">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
