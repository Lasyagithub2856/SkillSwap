import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../context/AuthContext';
import {
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Trash,
  Video,
  Star,
  DollarSign,
  UserCheck,
  MessageSquare,
  X
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import confetti from 'canvas-confetti';

interface Session {
  _id: string;
  teacher: any;
  learner: any;
  skill: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  tokenCost: number;
  meetingRoomId: string;
  rating?: number;
  review?: string;
}

const analyticsData = [
  { name: 'Week 1', learned: 2, taught: 1 },
  { name: 'Week 2', learned: 4, taught: 3 },
  { name: 'Week 3', learned: 5, taught: 6 },
  { name: 'Week 4', learned: 8, taught: 7 },
  { name: 'Week 5', learned: 10, taught: 9 },
  { name: 'Week 6', learned: 12, taught: 11 },
];

const Dashboard: React.FC = () => {
  const { user, token, socket, aiParseBio, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Profile Edit States
  const [bioText, setBioText] = useState(user?.bio || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Manual Skill inputs
  const [newTeachSkill, setNewTeachSkill] = useState({ name: '', category: 'Programming', level: 'Intermediate' as any });
  const [newLearnSkill, setNewLearnSkill] = useState({ name: '', category: 'Programming', level: 'Beginner' as any });

  // Dynamic Categories State
  const [categories, setCategories] = useState<{ _id: string, name: string, description?: string }[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  // Chat window state
  const [activeChatUser, setActiveChatUser] = useState<{ _id: string; name: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Sessions State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  
  // Review modal state
  const [selectedSessionForReview, setSelectedSessionForReview] = useState<Session | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    if (user) {
      setBioText(user.bio);
    }
  }, [user?.bio]);

  const fetchSessions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/categories`);
      const data = await res.json();
      if (res.ok) {
        setCategories(data);
        if (data.length > 0) {
          setNewTeachSkill(prev => ({ ...prev, category: data[0].name }));
          setNewLearnSkill(prev => ({ ...prev, category: data[0].name }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !token) return;
    setCategoryLoading(true);
    setCategoryError('');
    try {
      const res = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCategoryName, description: newCategoryDesc })
      });
      const data = await res.json();
      if (res.ok) {
        setNewCategoryName('');
        setNewCategoryDesc('');
        fetchCategories();
        confetti({ particleCount: 50 });
      } else {
        setCategoryError(data.message || 'Failed to create category');
      }
    } catch (err) {
      setCategoryError('Failed to connect to server');
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await fetch(`${API_URL}/api/categories/${catId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCategories();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchCategories();
  }, [token]);

  const handleAiParse = async () => {
    if (!bioText.trim()) return;
    setAiLoading(true);
    setSuccessMsg('');
    try {
      await aiParseBio(bioText);
      setSuccessMsg('AI successfully analyzed your bio and updated your skills!');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddTeachSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeachSkill.name.trim() || !user) return;
    const updatedSkills = [...user.skillsToTeach, newTeachSkill];
    try {
      await updateProfile({ skillsToTeach: updatedSkills });
      setNewTeachSkill({ name: '', category: 'Programming', level: 'Intermediate' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTeachSkill = async (index: number) => {
    if (!user) return;
    const updatedSkills = user.skillsToTeach.filter((_, i) => i !== index);
    try {
      await updateProfile({ skillsToTeach: updatedSkills });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLearnSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLearnSkill.name.trim() || !user) return;
    const updatedSkills = [...user.skillsToLearn, newLearnSkill];
    try {
      await updateProfile({ skillsToLearn: updatedSkills });
      setNewLearnSkill({ name: '', category: 'Programming', level: 'Beginner' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLearnSkill = async (index: number) => {
    if (!user) return;
    const updatedSkills = user.skillsToLearn.filter((_, i) => i !== index);
    try {
      await updateProfile({ skillsToLearn: updatedSkills });
    } catch (err) {
      console.error(err);
    }
  };

  // Session Action handlers
  const handleRespondToBooking = async (sessionId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`${API_URL}/api/sessions/${sessionId}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        fetchSessions();
        refreshProfile();
        if (action === 'accept') {
          confetti({ particleCount: 50, colors: ['#a855f7', '#6366f1'] });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/sessions/${sessionId}/complete`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSessions();
        refreshProfile();
        confetti({ particleCount: 150, spread: 80, colors: ['#fbbf24', '#f59e0b'] });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch(`${API_URL}/api/sessions/${sessionId}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSessions();
        refreshProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedSessionForReview) return;
    try {
      const res = await fetch(`${API_URL}/api/sessions/${selectedSessionForReview._id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rating, review: reviewText })
      });
      if (res.ok) {
        fetchSessions();
        setSelectedSessionForReview(null);
        setReviewText('');
        confetti({ particleCount: 50 });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Socket.io Chat Integration ---
  useEffect(() => {
    if (!socket || !activeChatUser) return;

    // Fetch message history
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/api/chat/${activeChatUser._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setChatMessages(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchHistory();

    const handleIncomingMessage = (message: any) => {
      if (
        (message.sender === activeChatUser._id && message.recipient === user?._id) ||
        (message.sender === user?._id && message.recipient === activeChatUser._id)
      ) {
        setChatMessages(prev => [...prev, message]);
      }
    };

    socket.on('receive-message', handleIncomingMessage);

    return () => {
      socket.off('receive-message', handleIncomingMessage);
    };
  }, [socket, activeChatUser?._id, user?._id]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatUser || !socket || !user) return;

    socket.emit('send-message', {
      senderId: user._id,
      recipientId: activeChatUser._id,
      content: newMessage
    });

    setNewMessage('');
  };

  const formatSessionTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-10">
      {/* Top Banner with Stats & Token Wallet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="glass p-6 rounded-2xl flex items-center gap-4 border border-white/5 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl"></div>
          <div className="h-16 w-16 rounded-full bg-purple-600/30 text-purple-200 border border-purple-500/20 flex items-center justify-center font-outfit font-extrabold text-2xl uppercase">
            {user.name.charAt(0)}
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold font-outfit">{user.name}</h2>
            <p className="text-slate-400 text-xs">{user.email}</p>
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full w-fit">
              <UserCheck className="h-3 w-3" />
              Active Swapper
            </div>
          </div>
        </div>

        {/* Tokens Wallet */}
        <div className="glass p-6 rounded-2xl flex flex-col justify-between border border-white/5 relative overflow-hidden bg-gradient-to-br from-purple-950/20 to-slate-900/40">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">SwapTokens Wallet</span>
            <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-amber-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-4xl font-outfit font-extrabold text-amber-400">{user.tokens}</span>
            <span className="text-sm font-semibold text-slate-400">Tokens Available</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            * 1 Token is held in escrow upon booking and released upon completion.
          </p>
        </div>

        {/* Dynamic Analytics (Recharts) */}
        <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Swap Activity Profile</span>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLearned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#475569" />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#94a3b8' }} />
                <Area type="monotone" dataKey="learned" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorLearned)" name="Hours Learned" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Admin Panel for Categories */}
      {user.role === 'admin' && (
        <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-6 relative overflow-hidden bg-gradient-to-r from-purple-950/10 via-slate-900/10 to-purple-950/10">
          <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 w-40 h-40 bg-purple-600/5 rounded-full blur-3xl"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-purple-600/20 p-2 rounded-xl text-purple-400 border border-purple-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-outfit font-extrabold text-base text-white">Admin Category Manager</h3>
                <p className="text-slate-400 text-xs font-medium">Configure official platform categories for skills classification</p>
              </div>
            </div>
            <span className="text-[10px] bg-purple-500/15 border border-purple-500/25 text-purple-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider font-outfit shadow-sm">
              Admin Access
            </span>
          </div>

          {categoryError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">
              {categoryError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start relative">
            {/* Create form */}
            <form onSubmit={handleCreateCategory} className="flex flex-col gap-3.5 bg-slate-950/20 border border-white/5 p-4 rounded-xl">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., AI & Prompting"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Artificial intelligence and prompt engineering"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                type="submit"
                disabled={categoryLoading}
                className="bg-purple-650 hover:bg-purple-700 disabled:bg-purple-900/30 text-white font-bold py-2.5 rounded-xl text-xs mt-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                {categoryLoading ? 'Creating...' : 'Create Official Category'}
              </button>
            </form>

            {/* List and manage */}
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Official Categories ({categories.length})</label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {categories.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">No categories loaded.</p>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat._id}
                      className="bg-white/5 border border-white/5 pl-3 pr-2 py-1.5 rounded-xl flex items-center gap-2 text-xs text-slate-300 hover:border-purple-500/20 transition-all"
                    >
                      <span className="font-semibold">{cat.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat._id)}
                        className="text-slate-500 hover:text-red-400 p-0.5 transition-colors"
                        title="Delete Category"
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: AI Builder & Skill lists (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          {/* AI Bio Parser */}
          <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-purple-600/10 p-2 rounded-xl border border-purple-500/20 text-purple-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-outfit font-bold text-lg text-white">AI Profile Autofill</h3>
                <p className="text-slate-400 text-xs">Let Gemini extract skills automatically from your bio or LinkedIn resume</p>
              </div>
            </div>

            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs">
                {successMsg}
              </div>
            )}

            <textarea
              rows={4}
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              placeholder="E.g., I have 3 years of experience building Node.js REST APIs and React frontends. I'm hoping to find someone to teach me Spanish conversation and beginner guitar chord structures..."
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />

            <button
              onClick={handleAiParse}
              disabled={aiLoading || !bioText.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/30 text-white font-outfit font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {aiLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze Profile with Gemini
                </>
              )}
            </button>
          </div>

          {/* Skills Management Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teach Skills */}
            <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
              <h3 className="font-outfit font-bold text-base text-white flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-purple-400" />
                Skills You Can Teach
              </h3>
              
              {/* Add form */}
              <form onSubmit={handleAddTeachSkill} className="flex flex-col gap-2.5 bg-slate-950/25 p-3 rounded-xl border border-white/5">
                <input
                  type="text"
                  required
                  placeholder="Skill (e.g., Node.js)"
                  value={newTeachSkill.name}
                  onChange={(e) => setNewTeachSkill({ ...newTeachSkill, name: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newTeachSkill.category}
                    onChange={(e) => setNewTeachSkill({ ...newTeachSkill, category: e.target.value })}
                    className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500 w-full"
                  >
                    {categories.length === 0 ? (
                      <option value="Programming">Programming</option>
                    ) : (
                      categories.map((cat) => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))
                    )}
                  </select>
                  <select
                    value={newTeachSkill.level}
                    onChange={(e) => setNewTeachSkill({ ...newTeachSkill, level: e.target.value as any })}
                    className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500 w-full"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Skill to Teach
                </button>
              </form>

              {/* List */}
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {user.skillsToTeach.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">No skills listed yet.</p>
                ) : (
                  user.skillsToTeach.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-xs animate-fade-in">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">{skill.name}</span>
                        <span className="text-[10px] text-slate-400">{skill.level} • {skill.category}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteTeachSkill(index)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Learn Skills */}
            <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
              <h3 className="font-outfit font-bold text-base text-white flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-indigo-400" />
                Skills You Want to Learn
              </h3>

              {/* Add form */}
              <form onSubmit={handleAddLearnSkill} className="flex flex-col gap-2.5 bg-slate-950/25 p-3 rounded-xl border border-white/5">
                <input
                  type="text"
                  required
                  placeholder="Skill (e.g., Spanish)"
                  value={newLearnSkill.name}
                  onChange={(e) => setNewLearnSkill({ ...newLearnSkill, name: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newLearnSkill.category}
                    onChange={(e) => setNewLearnSkill({ ...newLearnSkill, category: e.target.value })}
                    className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500 w-full"
                  >
                    {categories.length === 0 ? (
                      <option value="Programming">Programming</option>
                    ) : (
                      categories.map((cat) => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))
                    )}
                  </select>
                  <select
                    value={newLearnSkill.level}
                    onChange={(e) => setNewLearnSkill({ ...newLearnSkill, level: e.target.value as any })}
                    className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500 w-full"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Skill to Learn
                </button>
              </form>

              {/* List */}
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {user.skillsToLearn.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">No skills listed yet.</p>
                ) : (
                  user.skillsToLearn.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-xs animate-fade-in">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">{skill.name}</span>
                        <span className="text-[10px] text-slate-400">{skill.level} • {skill.category}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteLearnSkill(index)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Bookings list (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
            <h3 className="font-outfit font-bold text-lg text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-400" />
              Swap Sessions
            </h3>

            {sessionsLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-slate-500 text-sm italic py-10 text-center">No scheduled swap sessions found. Head over to Browse to find partners!</p>
            ) : (
              <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-1">
                {sessions.map((session) => {
                  const isTeacher = session.teacher._id === user._id;
                  const partner = isTeacher ? session.learner : session.teacher;

                  return (
                    <div
                      key={session._id}
                      className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${
                        session.status === 'pending'
                          ? 'bg-purple-950/15 border-purple-500/25'
                          : session.status === 'accepted'
                          ? 'bg-emerald-950/10 border-emerald-500/20'
                          : 'bg-slate-900/40 border-white/5'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                            {isTeacher ? 'TEACHING SESSION' : 'LEARNING SESSION'}
                          </span>
                          <span className="font-outfit font-bold text-sm text-white mt-0.5">
                            {session.skill}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            session.status === 'accepted'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                              : session.status === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25'
                              : session.status === 'completed'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex flex-col gap-1 text-xs text-slate-400 border-t border-white/5 pt-2.5">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>{formatSessionTime(session.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="h-4.5 w-4.5 rounded-full bg-white/5 text-[9px] flex items-center justify-center font-bold font-outfit border border-white/10 uppercase">
                            {partner.name.charAt(0)}
                          </div>
                          <span>Partner: <strong className="text-slate-300">{partner.name}</strong></span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(session.status === 'pending' || session.status === 'accepted') && (
                          <button
                            onClick={() => setActiveChatUser({ _id: partner._id, name: partner.name })}
                            className="bg-white/5 hover:bg-white/10 text-slate-350 border border-white/10 px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all"
                            title="Chat with partner"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Chat
                          </button>
                        )}
                        {/* Pending actions for Teacher */}
                        {session.status === 'pending' && isTeacher && (
                          <>
                            <button
                              onClick={() => handleRespondToBooking(session._id, 'accept')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRespondToBooking(session._id, 'reject')}
                              className="bg-red-950/40 border border-red-500/30 hover:bg-red-900/30 text-red-300 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Approved states: Classroom button */}
                        {session.status === 'accepted' && (
                          <>
                            <button
                              onClick={() => navigate(`/classroom/${session.meetingRoomId}?skill=${session.skill}`)}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all hover:scale-[1.02]"
                            >
                              <Video className="h-3.5 w-3.5" />
                              Enter Classroom
                            </button>
                            {isTeacher && (
                              <button
                                onClick={() => handleCompleteSession(session._id)}
                                className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Mark Completed
                              </button>
                            )}
                          </>
                        )}

                        {/* Completed actions: Review for learner */}
                        {session.status === 'completed' && !isTeacher && !session.rating && (
                          <button
                            onClick={() => setSelectedSessionForReview(session)}
                            className="bg-slate-800 hover:bg-slate-700 text-white border border-white/5 font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                            Leave Review
                          </button>
                        )}

                        {/* Display existing review */}
                        {session.status === 'completed' && session.rating && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 italic">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span>Rated {session.rating}/5</span>
                          </div>
                        )}

                        {/* Cancel available for pending/accepted */}
                        {(session.status === 'pending' || session.status === 'accepted') && (
                          <button
                            onClick={() => handleCancelSession(session._id)}
                            className="text-slate-500 hover:text-red-400 text-[11px] py-1.5 ml-auto font-medium transition-colors"
                          >
                            Cancel Session
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal Dialog */}
      {selectedSessionForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass p-6 rounded-2xl border border-white/10 flex flex-col gap-4">
            <h3 className="font-outfit font-bold text-lg text-white">Leave a Review</h3>
            <p className="text-xs text-slate-400">Rate your experience learning <strong className="text-purple-300">{selectedSessionForReview.skill}</strong></p>

            {/* Stars Selector */}
            <div className="flex gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 transition-transform hover:scale-110 ${
                      star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Review text */}
            <textarea
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="What did you learn? Was the teacher helpful?"
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 resize-none"
            />

            <div className="flex gap-3 mt-2">
              <button
                onClick={handleSubmitReview}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl text-xs"
              >
                Submit Review
              </button>
              <button
                onClick={() => setSelectedSessionForReview(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT OVERLAY SLIDEOUT */}
      {activeChatUser && (
        <div className="fixed bottom-0 right-6 z-50 w-80 glass border border-white/10 rounded-t-2xl flex flex-col h-96 shadow-2xl">
          {/* Header */}
          <div className="bg-slate-900 px-4 py-3 rounded-t-2xl border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
                {activeChatUser.name.charAt(0)}
              </div>
              <span className="text-xs font-bold text-white max-w-[130px] truncate">{activeChatUser.name}</span>
            </div>
            <button
              onClick={() => setActiveChatUser(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 bg-slate-950/40">
            {chatMessages.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic text-center py-10">Start the conversation! Say hello.</p>
            ) : (
              chatMessages.map((msg, idx) => {
                const isMine = msg.sender === user?._id;
                return (
                  <div
                    key={idx}
                    className={`max-w-[75%] p-2 rounded-lg text-xs leading-relaxed ${
                      isMine 
                        ? 'bg-purple-600 text-white self-end rounded-br-none' 
                        : 'bg-white/5 text-slate-200 self-start rounded-bl-none border border-white/5'
                    }`}
                  >
                    {msg.content}
                  </div>
                );
              })
            )}
          </div>

          {/* Input form */}
          <form onSubmit={handleSendMessage} className="p-2 border-t border-white/5 bg-slate-900">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
              <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold px-3 rounded-lg">
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
