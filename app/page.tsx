'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useVideoCall } from './hooks/useVideoCall';
import IncomingCall from './components/IncomingCall';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, LogOut, UserPlus, Video, Mic, MicOff, Video as VideoIcon, VideoOff, Mail } from 'lucide-react';

export default function VideoChatApp() {
  const [user, setUser] = useState<any>(null);
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState('');

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const { 
    callUser, acceptCall, rejectCall, endCall, 
    incomingCall, isCallActive, 
    localVideoRef, remoteVideoRef 
  } = useVideoCall(user?.id);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user;
      setUser(currentUser);
      if (currentUser) setMyUserId(currentUser.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      const currentUser = session?.user;
      setUser(currentUser);
      if (currentUser) setMyUserId(currentUser.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleEmailAuth = async () => {
    setAuthLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) alert(error.message);
        else alert("✅ Check your email for confirmation link!");
      }
    } catch (err) {
      alert("Something went wrong");
    }
    setAuthLoading(false);
  };

  const addFriend = async () => {
    if (!searchId || !user) return alert("Please enter a User ID");
    const { error } = await supabase
      .from('friends')
      .insert({ user_id: user.id, friend_id: searchId, status: 'pending' });
    
    if (error) alert(error.message);
    else alert("Friend request sent! ✅");
    setSearchId('');
  };

  const toggleMic = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream;
    stream?.getAudioTracks().forEach(track => track.enabled = !isMicMuted);
    setIsMicMuted(!isMicMuted);
  };

  const toggleCamera = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream;
    stream?.getVideoTracks().forEach(track => track.enabled = !isCameraOff);
    setIsCameraOff(!isCameraOff);
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white text-2xl">Loading...</div>;
  }

  // ==================== LOGIN / SIGNUP SCREEN ====================
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="bg-zinc-900 p-10 rounded-3xl w-full max-w-md">
          <h1 className="text-5xl font-bold text-center mb-10">VideoChat</h1>
          
          <div className="space-y-4 mb-8">
            <Input 
              type="email" 
              placeholder="Email address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <Input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          <Button onClick={handleEmailAuth} className="w-full mb-4" disabled={authLoading}>
            <Mail className="mr-2" /> 
            {isLogin ? "Sign In" : "Create Account"}
          </Button>

          <Button 
            variant="outline" 
            className="w-full mb-6"
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
          >
            Sign in with Google
          </Button>

          <p 
            className="text-center text-sm text-zinc-400 cursor-pointer hover:text-white"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </p>
        </div>
      </div>
    );
  }

  // ==================== MAIN APP ====================
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-96 border-r border-zinc-800 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-xs text-green-500">● Online</p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
              <LogOut />
            </Button>
          </div>

          {/* Your User ID */}
          <div className="bg-zinc-900 p-4 rounded-2xl mb-6">
            <p className="text-xs text-zinc-500 mb-1">YOUR USER ID (Share this to get called)</p>
            <p className="font-mono text-sm break-all bg-black/50 p-3 rounded">{myUserId}</p>
          </div>

          {/* Add Friend */}
          <h2 className="text-xl font-semibold mb-3">Add Friend</h2>
          <div className="flex gap-2 mb-8">
            <Input
              placeholder="Paste User ID here"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
            <Button onClick={addFriend}>
              <UserPlus />
            </Button>
          </div>

          <h2 className="text-xl font-semibold mb-4">Friends</h2>
          <p className="text-zinc-500 text-sm">No friends yet. Add some using their User ID above.</p>
        </div>

        {/* Main Video Area */}
        <div className="flex-1 flex flex-col items-center justify-center bg-black relative">
          {isCallActive ? (
            <div className="grid grid-cols-2 gap-6 w-full max-w-6xl p-8">
              <div className="relative rounded-3xl overflow-hidden bg-zinc-900 aspect-video">
                <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover" />
                <p className="absolute bottom-4 left-4 bg-black/70 px-4 py-1 rounded">You</p>
              </div>
              <div className="relative rounded-3xl overflow-hidden bg-zinc-900 aspect-video">
                <video ref={remoteVideoRef} autoPlay className="w-full h-full object-cover" />
                <p className="absolute bottom-4 left-4 bg-black/70 px-4 py-1 rounded">Them</p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-7xl font-bold mb-6">VideoChat</h1>
              <p className="text-2xl text-zinc-400">Share your User ID to get called</p>
            </div>
          )}

          {/* Call Controls */}
          {isCallActive && (
            <div className="absolute bottom-12 flex gap-4">
              <Button onClick={toggleMic} variant={isMicMuted ? "destructive" : "default"} size="lg">
                {isMicMuted ? <MicOff size={26} /> : <Mic size={26} />}
              </Button>
              <Button onClick={toggleCamera} variant={isCameraOff ? "destructive" : "default"} size="lg">
                {isCameraOff ? <VideoOff size={26} /> : <VideoIcon size={26} />}
              </Button>
              <Button onClick={endCall} variant="destructive" size="lg" className="px-10">
                End Call
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Incoming Call Screen */}
      {incomingCall && (
        <IncomingCall
          caller={incomingCall.caller || { username: "Unknown User" }}
          onAccept={() => acceptCall(incomingCall)}
          onReject={() => rejectCall(incomingCall.id)}
        />
      )}
    </div>
  );
}