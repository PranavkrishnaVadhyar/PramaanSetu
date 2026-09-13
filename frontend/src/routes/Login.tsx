import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/console/sandbox';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-lg shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Welcome Back</h1>
          <p className="text-sm text-text-secondary mt-2">Sign in to your PramaanSetu developer account</p>
        </div>

        {error && (
          <div className="mb-6 p-3 text-sm bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-control">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-border rounded-control text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-stone-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-border rounded-control text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-stone-400"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 mt-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium text-sm rounded-control hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-70 flex justify-center"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Signing in...</span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-text-secondary">
          Don't have an account? <Link to="/signup" className="text-stone-900 dark:text-stone-100 font-medium hover:underline">Sign up</Link>
        </div>
      </div>
    </div>
  );
};
