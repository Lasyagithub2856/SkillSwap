import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Repeat, Coins, LogOut, LayoutDashboard, Search } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="glass sticky top-0 z-50 w-full border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 group">
        <div className="bg-purple-600 p-2 rounded-xl text-white group-hover:scale-105 transition-transform">
          <Repeat className="h-5 w-5 animate-pulse" />
        </div>
        <span className="font-outfit font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
          SkillSwap
        </span>
      </Link>

      {/* Nav Links */}
      {user && (
        <div className="hidden md:flex items-center gap-6">
          <Link
            to="/browse"
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isActive('/browse') ? 'text-purple-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="h-4 w-4" />
            Browse Skills
          </Link>
          <Link
            to="/dashboard"
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isActive('/dashboard') ? 'text-purple-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      )}

      {/* Auth & Token Display */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            {/* Tokens Badge */}
            <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-full text-xs font-bold font-outfit shadow-sm">
              <Coins className="h-4 w-4 animate-bounce" />
              <span>{user.tokens} SwapTokens</span>
            </div>

            {/* User Icon */}
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <div className="h-6 w-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs uppercase border border-purple-500/30">
                {user.name.charAt(0)}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-slate-300 max-w-[100px] truncate">
                {user.name}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        ) : (
          <Link
            to="/auth"
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold font-outfit px-5 py-2.5 rounded-xl shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Get Started
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
