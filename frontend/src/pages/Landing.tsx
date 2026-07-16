import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Sparkles, Video, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const Landing: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="relative min-h-[calc(100vh-73px)] flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Background blobs for premium gradient aesthetic */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Hero Section */}
      <div className="max-w-4xl text-center flex flex-col items-center gap-6 mt-12 md:mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 px-4 py-2 rounded-full text-xs font-semibold tracking-wide font-outfit"
        >
          <Sparkles className="h-3.5 w-3.5" />
          The Future of Peer-to-Peer Learning
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl font-outfit font-extrabold tracking-tight leading-[1.1] md:leading-[1.05]"
        >
          Swap Your Skills.<br />
          <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-500 bg-clip-text text-transparent">
            Unleash Joint Potential.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-400 text-base md:text-xl max-w-2xl leading-relaxed"
        >
          Teach what you excel at, learn what you desire, completely free. Fueled by a smart token economy, instant AI matchmaking, and an interactive virtual classroom.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 mt-4"
        >
          <Link
            to={user ? '/browse' : '/auth'}
            className="group bg-purple-600 hover:bg-purple-700 text-white font-outfit font-semibold px-8 py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Start Swapping Now
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#features"
            className="border border-white/10 hover:bg-white/5 text-slate-300 font-outfit font-semibold px-8 py-4 rounded-xl flex items-center justify-center transition-all"
          >
            See How It Works
          </a>
        </motion.div>
      </div>

      {/* Features Grid */}
      <div id="features" className="max-w-6xl w-full mt-24 md:mt-36 mb-20 grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-card p-8 rounded-2xl flex flex-col gap-4 text-left"
        >
          <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 p-3 rounded-xl w-fit">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-outfit font-bold text-lg text-white">AI-Powered Matchmaker</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Upload your bio or paste your resume. Our integrated Gemini AI automatically extracts your skills and highlights compatible swapping matches instantly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass-card p-8 rounded-2xl flex flex-col gap-4 text-left"
        >
          <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 p-3 rounded-xl w-fit">
            <Award className="h-6 w-6" />
          </div>
          <h3 className="font-outfit font-bold text-lg text-white">SwapToken Economy</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            No direct swap needed. Earn tokens by hosting sessions for others, and spend those tokens booking classes from anyone else on the platform.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card p-8 rounded-2xl flex flex-col gap-4 text-left"
        >
          <div className="bg-pink-500/10 border border-pink-500/20 text-pink-400 p-3 rounded-xl w-fit">
            <Video className="h-6 w-6" />
          </div>
          <h3 className="font-outfit font-bold text-lg text-white">Virtual Classroom</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Collaborate in real-time. Enjoy face-to-face WebRTC video calling alongside a shared whiteboard canvas and synced collaborative code/text editor.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Landing;
