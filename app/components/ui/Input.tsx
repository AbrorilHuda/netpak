import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-3.5 text-sm bg-slate-50/60 dark:bg-slate-800/50 border rounded-2xl transition-all duration-200 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
            error ? 'border-rose-500 bg-rose-50/20 focus:ring-rose-500/10 focus:border-rose-500' : 'border-slate-200/80 dark:border-slate-700'
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs font-medium text-rose-600 ml-1">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-slate-400 ml-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
