import React, { useRef, useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Video, VideoOff, Mic, MicOff, Palette, RotateCcw, Code, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';

const Classroom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const skill = searchParams.get('skill') || 'Skill Swap Session';
  
  const { user, socket } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  // Media Stream States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [deviceError, setDeviceError] = useState(false);

  // Peer connection ref
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Classroom Tool Tab: 'whiteboard' or 'editor'
  const [activeTool, setActiveTool] = useState<'whiteboard' | 'editor'>('whiteboard');

  // Whiteboard Canvas states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const [strokeColor, setStrokeColor] = useState('#8b5cf6'); // violet
  const [lineWidth, setLineWidth] = useState(4);

  // Code Editor states
  const [codeText, setCodeText] = useState('// Welcome to the SkillSwap Shared Workspace!\n// Write code or take notes here in real-time.\n\nfunction helloWorld() {\n  console.log("Welcome to Skill Swap!");\n}');

  // WebRTC STUN/TURN servers
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  };

  // 1. Capture camera & microphone on load
  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Could not acquire local camera/mic. Using mock preview:', err);
        setDeviceError(true);
      }
    };

    startMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Sync ref with local stream state
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Dynamically attach tracks when localStream becomes available
  useEffect(() => {
    if (localStream && peerRef.current) {
      const senders = peerRef.current.getSenders();
      localStream.getTracks().forEach(track => {
        const alreadyAdded = senders.some(s => s.track === track);
        if (!alreadyAdded) {
          peerRef.current?.addTrack(track, localStream);
        }
      });
    }
  }, [localStream]);

  // 2. Connect to signaling socket and handle WebRTC setup
  useEffect(() => {
    if (!socket || !roomId || !user) return;

    socket.emit('join-room', {
      roomId,
      userId: user._id,
      userName: user.name
    });

    // Receive peer signal
    socket.on('signal', async ({ senderSocketId, signalData }) => {
      try {
        if (!peerRef.current) {
          initializePeerConnection(senderSocketId);
        }

        const pc = peerRef.current!;

        if (signalData.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
          if (signalData.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('signal', {
              targetSocketId: senderSocketId,
              signalData: { sdp: pc.localDescription }
            });
          }
        } else if (signalData.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    });

    // When a peer joins, the initiator creates an offer
    socket.on('peer-joined', ({ socketId }) => {
      console.log('Peer joined, initializing WebRTC handshake initiator...');
      initializePeerConnection(socketId, true);
    });

    // --- Sync Canvas Drawing ---
    socket.on('draw', (drawingData: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.strokeStyle = drawingData.color;
      ctx.lineWidth = drawingData.width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(drawingData.prevX, drawingData.prevY);
      ctx.lineTo(drawingData.currX, drawingData.currY);
      ctx.stroke();
    });

    // Clear canvas trigger
    socket.on('clear-canvas', () => {
      clearLocalCanvas();
    });

    // --- Sync Code Editor ---
    socket.on('code-change', (text: string) => {
      setCodeText(text);
    });

    return () => {
      socket.off('signal');
      socket.off('peer-joined');
      socket.off('draw');
      socket.off('clear-canvas');
      socket.off('code-change');
      if (peerRef.current) {
        peerRef.current.close();
      }
    };
  }, [socket, roomId]);

  // WebRTC Peer Connection Helper
  const initializePeerConnection = (targetSocketId: string, isInitiator = false) => {
    const pc = new RTCPeerConnection(iceServers);
    peerRef.current = pc;

    // Attach local stream tracks to WebRTC
    const currentStream = localStreamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        pc.addTrack(track, currentStream);
      });
    }

    // Capture remote stream tracks
    pc.ontrack = (event) => {
      console.log('WebRTC track received from remote peer');
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    // Send ICE candidates to signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('signal', {
          targetSocketId,
          signalData: { candidate: event.candidate }
        });
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('signal', {
            targetSocketId,
            signalData: { sdp: pc.localDescription }
          });
        } catch (err) {
          console.error('Error creating WebRTC offer:', err);
        }
      };
    }
  };

  // Toggle Video/Audio Tracks
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // --- WHITEBOARD DRAWING LOGIC ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    isDrawingRef.current = true;
    lastXRef.current = clientX - rect.left;
    lastYRef.current = clientY - rect.top;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const currX = clientX - rect.left;
    const currY = clientY - rect.top;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(lastXRef.current, lastYRef.current);
    ctx.lineTo(currX, currY);
    ctx.stroke();

    // Emit drawing coordinates to remote peer
    socket?.emit('draw', {
      roomId,
      drawingData: {
        prevX: lastXRef.current,
        prevY: lastYRef.current,
        currX,
        currY,
        color: strokeColor,
        width: lineWidth
      }
    });

    lastXRef.current = currX;
    lastYRef.current = currY;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const triggerClearCanvas = () => {
    clearLocalCanvas();
    socket?.emit('clear-canvas', { roomId });
  };

  // Set initial canvas proportions
  useEffect(() => {
    if (activeTool === 'whiteboard' && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 500;
    }
  }, [activeTool]);

  // --- COLLABORATIVE TEXT WRITING LOGIC ---
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCodeText(val);
    socket?.emit('code-change', {
      roomId,
      codeText: val
    });
  };

  const handleLeaveClass = () => {
    if (window.confirm('Do you want to end the session?')) {
      confetti({ particleCount: 50 });
      navigate('/dashboard');
    }
  };

  return (
    <div className="h-[calc(100vh-73px)] w-full flex flex-col md:flex-row bg-slate-950 overflow-hidden">
      
      {/* LEFT: COLLABORATIVE PANEL (Whiteboard or Code Editor) */}
      <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-white/5 relative bg-slate-900/10">
        {/* Workspace Toolbar */}
        <div className="bg-slate-900/60 border-b border-white/5 py-3 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Classroom:</span>
            <h3 className="font-outfit font-extrabold text-sm text-purple-300">{skill}</h3>
          </div>

          {/* Toggle buttons */}
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-white/5">
            <button
              onClick={() => setActiveTool('whiteboard')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTool === 'whiteboard' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              Whiteboard
            </button>
            <button
              onClick={() => setActiveTool('editor')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTool === 'editor' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              Code Sandbox
            </button>
          </div>
        </div>

        {/* Workspace Content */}
        <div className="flex-1 relative flex items-center justify-center p-4">
          
          {/* A. CANVAS WHITEBOARD */}
          {activeTool === 'whiteboard' && (
            <div className="w-full h-full flex flex-col gap-3 relative">
              {/* Drawing options bar overlay */}
              <div className="absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur border border-white/5 p-2 rounded-xl flex items-center gap-3">
                {/* Palette */}
                <div className="flex gap-1.5">
                  {['#8b5cf6', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ffffff'].map(color => (
                    <button
                      key={color}
                      onClick={() => setStrokeColor(color)}
                      style={{ backgroundColor: color }}
                      className={`h-4.5 w-4.5 rounded-full border transition-transform hover:scale-110 ${
                        strokeColor === color ? 'border-white scale-105' : 'border-white/10'
                      }`}
                    />
                  ))}
                </div>
                
                <div className="h-4 w-px bg-white/10" />

                {/* Line width selector */}
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(Number(e.target.value))}
                  className="w-16 accent-purple-500"
                  title="Brush Width"
                />

                <div className="h-4 w-px bg-white/10" />

                {/* Reset local and remote canvas */}
                <button
                  onClick={triggerClearCanvas}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-all"
                  title="Clear Whiteboard"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* HTML5 Canvas */}
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full bg-slate-950/90 border border-white/5 rounded-2xl whiteboard-canvas"
              />
            </div>
          )}

          {/* B. CODE EDITOR */}
          {activeTool === 'editor' && (
            <div className="w-full h-full bg-slate-950/90 border border-white/5 rounded-2xl p-4 flex flex-col relative">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Collaborative Text Editor</span>
                <span className="text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-bold">Synced Live</span>
              </div>
              <textarea
                value={codeText}
                onChange={handleCodeChange}
                className="flex-1 bg-transparent border-0 resize-none font-mono text-xs text-slate-300 focus:outline-none focus:ring-0 leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}

        </div>
      </div>

      {/* RIGHT: WEBRTC MEDIA PANELS (Video/Audio feeds) */}
      <div className="w-full md:w-80 bg-slate-900/40 p-6 flex flex-col gap-6 select-none border-t md:border-t-0 border-white/5 justify-between">
        
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-1.5 border-b border-white/5 pb-3">
            <Video className="h-4.5 w-4.5 text-purple-400" />
            <h4 className="font-outfit font-bold text-sm text-white">Live Classroom Audio/Video</h4>
          </div>

          {/* Local Feed */}
          <div className="relative rounded-2xl border border-white/5 overflow-hidden bg-slate-950 h-36 flex items-center justify-center">
            {videoEnabled && !deviceError ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center justify-center font-bold text-xs uppercase">
                  {user.name.charAt(0)}
                </div>
                <span className="text-[10px] text-slate-500">Camera Off</span>
              </div>
            )}
            <span className="absolute bottom-2.5 left-3 text-[10px] font-semibold bg-slate-950/80 px-2 py-0.5 rounded border border-white/5">
              You ({user.name})
            </span>
          </div>

          {/* Remote Feed */}
          <div className="relative rounded-2xl border border-white/5 overflow-hidden bg-slate-950 h-36 flex items-center justify-center">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-center px-4">
                <div className="h-7 w-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                  ?
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">Waiting for partner...</span>
                  <span className="text-[9px] text-slate-600 mt-0.5 leading-relaxed">
                    Open another tab or send room link to a partner.
                  </span>
                </div>
              </div>
            )}
            {remoteStream && (
              <span className="absolute bottom-2.5 left-3 text-[10px] font-semibold bg-slate-950/80 px-2 py-0.5 rounded border border-white/5">
                Swapping Partner
              </span>
            )}
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 justify-center">
            {/* Toggle Cam */}
            <button
              onClick={toggleVideo}
              disabled={deviceError}
              className={`p-3 rounded-xl border transition-all ${
                videoEnabled && !deviceError
                  ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
              title={videoEnabled ? 'Stop Video' : 'Start Video'}
            >
              {videoEnabled && !deviceError ? <Video className="h-4.5 w-4.5" /> : <VideoOff className="h-4.5 w-4.5" />}
            </button>

            {/* Toggle Mic */}
            <button
              onClick={toggleAudio}
              disabled={deviceError}
              className={`p-3 rounded-xl border transition-all ${
                audioEnabled && !deviceError
                  ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
              title={audioEnabled ? 'Mute' : 'Unmute'}
            >
              {audioEnabled && !deviceError ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />}
            </button>
          </div>

          <button
            onClick={handleLeaveClass}
            className="w-full bg-red-650 hover:bg-red-700 text-white font-outfit font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-red-650/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <LogOut className="h-4 w-4" />
            End Swapping Session
          </button>
        </div>

      </div>
      
    </div>
  );
};

export default Classroom;
