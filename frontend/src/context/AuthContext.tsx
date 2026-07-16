import React, { createContext, useState, useEffect, useContext } from 'react';
import { io, Socket } from 'socket.io-client';

interface Skill {
  name: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Expert';
}

interface Availability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  bio: string;
  tokens: number;
  skillsToTeach: Skill[];
  skillsToLearn: Skill[];
  availability: Availability[];
  role: 'user' | 'admin';
  token?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  socket: Socket | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
  aiParseBio: (text: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from LocalStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('skillswap_user');
    const storedToken = localStorage.getItem('skillswap_token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  // Initialize and register socket when token/user changes
  useEffect(() => {
    if (token && user) {
      const newSocket = io(API_URL);
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Socket connected, registering user ID:', user._id);
        newSocket.emit('register-user', user._id);
      });

      return () => {
        newSocket.disconnect();
      };
    } else {
      setSocket(null);
    }
  }, [token, user?._id]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    setUser(data);
    setToken(data.token);
    localStorage.setItem('skillswap_user', JSON.stringify(data));
    localStorage.setItem('skillswap_token', data.token);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');

    setUser(data);
    setToken(data.token);
    localStorage.setItem('skillswap_user', JSON.stringify(data));
    localStorage.setItem('skillswap_token', data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('skillswap_user');
    localStorage.removeItem('skillswap_token');
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        // Keep existing token
        const updatedUser = { ...data, token };
        setUser(updatedUser);
        localStorage.setItem('skillswap_user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Failed to refresh profile', err);
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update profile');

    const updatedUser = { ...data, token };
    setUser(updatedUser);
    localStorage.setItem('skillswap_user', JSON.stringify(updatedUser));
  };

  const aiParseBio = async (text: string) => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/auth/profile/ai-parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'AI Parse failed');

    await refreshProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        socket,
        loading,
        login,
        register,
        logout,
        updateProfile,
        aiParseBio,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export type { Skill, User, Availability };
