import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-4 py-3.5 text-sm bg-slate-50/60 border rounded-2xl transition-all duration-200 focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
            error ? 'border-rose-500 bg-rose-50/20 focus:ring-rose-500/10 focus:border-rose-500' : 'border-slate-200/80'
          } ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select';
