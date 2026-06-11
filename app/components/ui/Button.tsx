import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false,
    loading = false,
    disabled,
    className = '',
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 active:scale-[0.96] active:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
    
    const variants = {
      primary: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 focus:ring-indigo-500 shadow-md shadow-indigo-200/50 dark:shadow-indigo-950/50 hover:shadow-lg hover:shadow-indigo-200/60',
      secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 focus:ring-slate-300 shadow-sm',
      danger: 'bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-700 hover:to-red-700 focus:ring-rose-500 shadow-md shadow-rose-200/50 dark:shadow-rose-950/50',
      ghost: 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-200',
    };
    
    const sizes = {
      sm: 'px-4 py-2 text-xs',
      md: 'px-5 py-3 text-sm min-h-[46px]',
      lg: 'px-7 py-4 text-base min-h-[52px]',
    };
    
    const widthClass = fullWidth ? 'w-full' : '';
    
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
