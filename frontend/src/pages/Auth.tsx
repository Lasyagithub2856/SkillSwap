import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, ShieldAlert, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-3xl -z-10"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md glass p-8 rounded-2xl border border-white/5 flex flex-col gap-6"
      >
        {/* Header */}
        <div className="text-center flex flex-col gap-2">
          <h2 className="font-outfit font-extrabold text-2xl md:text-3xl text-white">
            {isLogin ? 'Welcome Back' : 'Join SkillSwap'}
          </h2>
          <p className="text-slate-400 text-sm">
            {isLogin ? 'Log in to continue swapping skills' : 'Create an account and get 5 free SwapTokens'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold font-outfit transition-all ${
              isLogin ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold font-outfit transition-all ${
              !isLogin ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="flex gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs leading-relaxed">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-outfit font-bold py-3.5 rounded-xl mt-2 flex items-center justify-center shadow-lg shadow-purple-600/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Demo Tip */}
        <div className="border-t border-white/5 pt-4 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3 text-purple-400" />
            Tip: Register a couple of different accounts to test swapping!
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
