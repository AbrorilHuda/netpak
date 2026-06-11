import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from './+types/login';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { useAuth } from '~/lib/auth';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Login - Transaksi Kuota' },
    { name: 'description', content: 'Masuk ke akun Transaksi Kuota Anda' },
  ];
}

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in (Safe inside useEffect)
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setError('Email atau password salah');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center p-5 relative overflow-hidden font-sans">
      {/* Premium Warm Ambient Decorative Blobs (No Neon/AI vibes) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-100/40 blur-[100px] animate-blob pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100/50 blur-[100px] animate-blob-delayed pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-violet-50/60 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[440px] z-10 animate-fade-in-up">
        {/* Main Card with Glassmorphism */}
        <div className="bg-white/75 backdrop-blur-xl border border-white/60 shadow-xl shadow-slate-200/50 rounded-3xl p-8 md:p-10">
          
          {/* Brand/Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-150/40">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Transaksi Kuota</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 font-medium">Kelola bisnis kuota Anda dengan mudah</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-fade-in-up">
              <div className="w-2 h-2 bg-rose-500 rounded-full shrink-0" />
              <p className="text-xs font-semibold text-rose-600 leading-normal">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              label="Email Address"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />

            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />

            <div className="pt-2">
              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={loading}
              >
                Sign In
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 dark:text-slate-500 text-xs font-semibold mt-8 tracking-wide">
          © 2026 TRANSAKSI KUOTA • PREMIUM DOCK
        </p>
      </div>
    </div>
  );
}
