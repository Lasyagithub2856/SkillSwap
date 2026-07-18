import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Repeat, Coins, LogOut, LayoutDashboard, Search } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

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
      <div className="flex items-center gap-4 relative">
        {user ? (
          <>
            {/* Tokens Badge */}
            <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-full text-xs font-bold font-outfit shadow-sm">
              <Coins className="h-4 w-4 animate-bounce" />
              <span>{user.tokens} SwapTokens</span>
            </div>

            {/* Click-away backdrop */}
            {showProfileDropdown && (
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setShowProfileDropdown(false)} 
              />
            )}

            {/* User Icon Button */}
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/10 px-3 py-1.5 rounded-xl transition-all cursor-pointer relative z-50"
            >
              <div className="h-6 w-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs uppercase border border-purple-500/30">
                {user.name.charAt(0)}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-slate-300 max-w-[100px] truncate">
                {user.name}
              </span>
            </button>

            {/* Profile Dropdown Card */}
            {showProfileDropdown && (
              <div className="absolute right-0 top-14 z-50 w-80 glass border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-fade-in">
                {/* Header Profile Details */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-base uppercase border border-purple-500/30">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate">{user.name}</span>
                    <span className="text-[10px] text-slate-400 truncate">{user.email}</span>
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Bio Section */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bio</span>
                  <p className="text-xs text-slate-300 leading-relaxed max-h-20 overflow-y-auto pr-1">
                    {user.bio || "No bio listed yet. Add one in your Dashboard!"}
                  </p>
                </div>

                <div className="h-px bg-white/5" />

                {/* Skills to Teach */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Teaching Skills</span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {user.skillsToTeach.length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic">None added yet</span>
                    ) : (
                      user.skillsToTeach.map((s: any, idx: number) => (
                        <span key={idx} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-semibold px-2 py-0.5 rounded-full">
                          {s.name} ({s.level})
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Skills to Learn */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Learning Skills</span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {user.skillsToLearn.length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic">None added yet</span>
                    ) : (
                      user.skillsToLearn.map((s: any, idx: number) => (
                        <span key={idx} className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-semibold px-2 py-0.5 rounded-full">
                          {s.name} ({s.level})
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="h-px bg-white/5 mt-1" />

                {/* Action buttons inside Profile Card */}
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    handleLogout();
                  }}
                  className="w-full bg-red-600/10 border border-red-500/20 hover:bg-red-600 hover:text-white text-red-300 font-semibold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log Out
                </button>
              </div>
            )}
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
