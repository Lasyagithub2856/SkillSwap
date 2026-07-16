import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../context/AuthContext';
import { Search, Sparkles, MessageSquare, Calendar, Info, ShieldAlert, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface SearchResultUser {
  _id: string;
  name: string;
  bio: string;
  skillsToTeach: Array<{ name: string; category: string; level: string }>;
  skillsToLearn: Array<{ name: string; category: string; level: string }>;
}

interface MatchRecommendation {
  user: SearchResultUser;
  score: number;
  mutualMatch: boolean;
  teachOverlap: string[];
  learnOverlap: string[];
  aiExplanation: string;
}

const Browse: React.FC = () => {
  const { user, token, socket } = useAuth();
  const [activeTab, setActiveTab] = useState<'recommendations' | 'all'>('recommendations');
  const [recommendations, setRecommendations] = useState<MatchRecommendation[]>([]);
  const [allUsers, setAllUsers] = useState<SearchResultUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Booking modal state
  const [selectedPartner, setSelectedPartner] = useState<SearchResultUser | null>(null);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingStartTime, setBookingStartTime] = useState('14:00');
  const [bookingEndTime, setBookingEndTime] = useState('15:00');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Chat window state
  const [activeChatUser, setActiveChatUser] = useState<SearchResultUser | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const fetchRecommendations = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/matches/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRecommendations(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllUsers = async (search = '') => {
    if (!token) return;
    try {
      const url = search 
        ? `${API_URL}/api/matches/browse?search=${encodeURIComponent(search)}`
        : `${API_URL}/api/matches/browse`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAllUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchRecommendations(), fetchAllUsers()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Fetch search matches
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAllUsers(searchQuery);
  };

  // Open booking modal
  const openBookingModal = (partner: SearchResultUser) => {
    setSelectedPartner(partner);
    setSelectedSkill(partner.skillsToTeach[0]?.name || '');
    setBookingDate('');
    setBookingStartTime('14:00');
    setBookingEndTime('15:00');
    setBookingError('');
    setBookingSuccess(false);
  };

  // Submit Booking
  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner || !bookingDate || !token) return;
    
    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess(false);

    // Robust date and time parsing helper to prevent RangeErrors
    const parseDateTimeSafe = (dateVal: string, timeVal: string): Date => {
      try {
        let year = '';
        let month = '';
        let day = '';

        if (dateVal.includes('-')) {
          const parts = dateVal.split('-');
          if (parts[0].length === 4) {
            [year, month, day] = parts;
          } else if (parts[2].length === 4) {
            [day, month, year] = parts; // DD-MM-YYYY
          } else {
            [month, day, year] = parts;
          }
        } else if (dateVal.includes('/')) {
          const parts = dateVal.split('/');
          if (parts[2].length === 4) {
            [month, day, year] = parts; // MM/DD/YYYY
          }
        }

        let hours = 0;
        let minutes = 0;
        const timeClean = timeVal.trim().toUpperCase();
        const isPM = timeClean.includes('PM');
        const isAM = timeClean.includes('AM');
        const timeCore = timeClean.replace('AM', '').replace('PM', '').trim();
        const [hStr, mStr] = timeCore.split(':');
        
        hours = parseInt(hStr, 10);
        minutes = parseInt(mStr, 10);

        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;

        const pad = (n: number) => n.toString().padStart(2, '0');

        if (!year || !month || !day || isNaN(hours) || isNaN(minutes)) {
          // Fallback to standard constructor
          const d = new Date(`${dateVal}T${timeVal}`);
          if (isNaN(d.getTime())) throw new Error('Invalid Date format');
          return d;
        }

        const isoStr = `${year}-${pad(Number(month))}-${pad(Number(day))}T${pad(hours)}:${pad(minutes)}:00Z`;
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) throw new Error('Invalid Date format');
        return d;
      } catch (err) {
        // Ultimate fallback
        const d = new Date(dateVal + ' ' + timeVal);
        if (isNaN(d.getTime())) {
          throw new Error(`Unable to parse date/time: "${dateVal}" "${timeVal}"`);
        }
        return d;
      }
    };

    try {
      const startDateTime = parseDateTimeSafe(bookingDate, bookingStartTime);
      const endDateTime = parseDateTimeSafe(bookingDate, bookingEndTime);

      const res = await fetch(`${API_URL}/api/sessions/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          teacherId: selectedPartner._id,
          skill: selectedSkill,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setBookingSuccess(true);
        // Refresh profile token balance
        setTimeout(() => setSelectedPartner(null), 1500);
      } else {
        setBookingError(data.message || 'Failed to book session');
      }
    } catch (err: any) {
      console.error('Booking error detail:', err);
      setBookingError(err.message || 'Server connection error. Please try again.');
    } finally {
      setBookingLoading(false);
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-8">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="font-outfit font-extrabold text-2xl md:text-3xl text-white">Find Swapping Partners</h2>
          <p className="text-slate-400 text-xs">Discover compatible experts to trade skills and upgrade together</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/5 w-fit">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold font-outfit flex items-center gap-1.5 transition-all ${
              activeTab === 'recommendations'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Recommendations
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold font-outfit flex items-center gap-1.5 transition-all ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Browse All
          </button>
        </div>
      </div>

      {/* Recommendations view */}
      {activeTab === 'recommendations' ? (
        <div className="flex flex-col gap-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="glass p-12 text-center rounded-2xl border border-white/5 flex flex-col items-center gap-4">
              <Info className="h-10 w-10 text-slate-500" />
              <div className="flex flex-col">
                <span className="font-outfit font-bold text-lg text-white">No Direct Recommendations Found</span>
                <span className="text-xs text-slate-400 max-w-sm mt-1">
                  Try adding more skills to teach or want to learn in your Dashboard, or use AI autofill to parse your profile bio.
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.map((match) => (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={match.user._id}
                  className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-5 justify-between relative overflow-hidden"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-outfit font-bold text-lg uppercase border border-purple-500/30">
                        {match.user.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-outfit font-bold text-base text-white">{match.user.name}</h4>
                        <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full w-fit mt-1">
                          Compatibility Score: {match.score}
                        </span>
                      </div>
                    </div>

                    {match.mutualMatch && (
                      <span className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Mutual Swap Match
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                    {match.user.bio || "This user hasn't added a bio yet."}
                  </p>

                  {/* AI Explanation Box */}
                  <div className="bg-purple-950/15 border border-purple-500/15 rounded-xl p-3.5 flex gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-purple-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-purple-300 leading-relaxed italic">
                      &quot;{match.aiExplanation}&quot;
                    </p>
                  </div>

                  {/* Skills Grid */}
                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Teaches:</span>
                      <div className="flex flex-wrap gap-1">
                        {match.user.skillsToTeach.map((s, idx) => (
                          <span key={idx} className="bg-white/5 text-[10px] font-medium px-2 py-0.5 rounded-md text-slate-300 border border-white/5">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Wants to Learn:</span>
                      <div className="flex flex-wrap gap-1">
                        {match.user.skillsToLearn.map((s, idx) => (
                          <span key={idx} className="bg-white/5 text-[10px] font-medium px-2 py-0.5 rounded-md text-slate-300 border border-white/5">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Call to Actions */}
                  <div className="flex gap-3 border-t border-white/5 pt-4">
                    <button
                      onClick={() => openBookingModal(match.user)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-outfit font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/10 transition-colors"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Book Swap Session
                    </button>
                    <button
                      onClick={() => setActiveChatUser(match.user)}
                      className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-4 py-2 rounded-xl text-xs flex items-center justify-center"
                      title="Chat"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Browse All View */
        <div className="flex flex-col gap-6">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-md">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search user name or skill (e.g. Figma)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 rounded-xl">
              Search
            </button>
          </form>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
            </div>
          ) : allUsers.length === 0 ? (
            <div className="glass p-12 text-center rounded-2xl border border-white/5">
              <p className="text-slate-400 text-sm italic">No swappers found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {allUsers.map((item) => (
                <div key={item._id} className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-outfit font-bold text-sm uppercase">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-outfit font-bold text-sm text-white">{item.name}</h4>
                      <p className="text-slate-500 text-[10px] line-clamp-1">{item.bio || 'Active participant'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Teaches:</span>
                      <div className="flex flex-wrap gap-1">
                        {item.skillsToTeach.map((s, idx) => (
                          <span key={idx} className="bg-white/5 text-[9px] font-medium px-2 py-0.5 rounded-md text-slate-300">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Wants:</span>
                      <div className="flex flex-wrap gap-1">
                        {item.skillsToLearn.map((s, idx) => (
                          <span key={idx} className="bg-white/5 text-[9px] font-medium px-2 py-0.5 rounded-md text-slate-300">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-white/5 pt-3 mt-1">
                    <button
                      onClick={() => openBookingModal(item)}
                      className="flex-1 bg-purple-600/80 hover:bg-purple-600 text-white font-semibold py-1.5 rounded-lg text-xs"
                    >
                      Book Session
                    </button>
                    <button
                      onClick={() => setActiveChatUser(item)}
                      className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-3 rounded-lg text-xs flex items-center justify-center"
                    >
                      <MessageSquare className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BOOKING MODAL */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass p-6 rounded-2xl border border-white/10 flex flex-col gap-4 relative">
            <button
              onClick={() => setSelectedPartner(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-outfit font-bold text-lg text-white">Book Swap Session</h3>
            <p className="text-xs text-slate-400">
              Schedule a timezone-safe session with <strong className="text-purple-300">{selectedPartner.name}</strong>.
            </p>

            {bookingError && (
              <div className="flex gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            {bookingSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs text-center">
                Session booked! 1 SwapToken put in escrow.
              </div>
            )}

            <form onSubmit={handleBookSession} className="flex flex-col gap-4">
              {/* Skill Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Choose Skill to Learn</label>
                <select
                  required
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  {selectedPartner.skillsToTeach.map((s, idx) => (
                    <option key={idx} value={s.name}>
                      {s.name} ({s.level})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Choose Date</label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Time Slots */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Start Time (UTC)</label>
                  <input
                    type="time"
                    required
                    value={bookingStartTime}
                    onChange={(e) => setBookingStartTime(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">End Time (UTC)</label>
                  <input
                    type="time"
                    required
                    value={bookingEndTime}
                    onChange={(e) => setBookingEndTime(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/30 text-white font-outfit font-bold py-3.5 rounded-xl mt-2 flex items-center justify-center text-xs"
              >
                {bookingLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  'Confirm Booking (Costs 1 Token)'
                )}
              </button>
            </form>
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

export default Browse;
