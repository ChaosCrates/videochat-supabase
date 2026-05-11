'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useVideoCall } from './hooks/useVideoCall';
import IncomingCall from './components/IncomingCall';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, LogOut, UserPlus, Mic, MicOff, Video as VideoIcon, VideoOff, MessageCircle } from 'lucide-react';

export default function VideoChatApp() {
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState('');

  const { callUser, acceptCall, rejectCall, endCall, incomingCall, isCallActive, localVideoRef, remoteVideoRef } = useVideoCall(user?.id);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) setMyUserId(data.session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setMyUserId(session.user.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Load Friends
  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      const { data } = await supabase
        .from('friends')
        .select(`
          *,
          friend_profile:profiles!friend_id(id, username, full_name, avatar_url)
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      setFriends(data || []);
    };

    fetchFriends();

    // Realtime
    const channel = supabase.channel('friends');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, fetchFriends).subscribe();

    return () => channel.unsubscribe();
  }, [user]);

  const addFriend = async () => {
    if (!searchId || !user) return alert("Enter User ID");

    const { error } = await supabase
      .from('friends')
      .insert({ 
        user_id: user.id, 
        friend_id: searchId, 
        status: 'accepted'   // ← Direct accept
      });

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("✅ Friend added successfully!");
      setSearchId('');
    }
  };

  const toggleMic = () => { /* same as before */ };
  const toggleCamera = () => { /* same as before */ };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">Loading...</div>;

  if (!user) {
    // Keep your login screen here (same as previous)
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="bg-zinc-900 p-10 rounded-3xl w-full max-w-md">
          <h1 className="text-5xl font-bold text-center mb-10">VideoChat</h1>
          {/* Your email + Google login code from before */}
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-3" />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-6" />
          {/* ... rest of login ... */}
        </div>
      </div>
    );
  }

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
              </div>
            </div>
            <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
              <LogOut />
            </Button>
          </div>

          <div className="bg-zinc-900 p-4 rounded-2xl mb-6">
            <p className="text-xs text-zinc-500 mb-1">YOUR USER ID</p>
            <p className="font-mono text-sm break-all bg-black p-3 rounded">{myUserId}</p>
          </div>

          <h2 className="font-semibold mb-3">Add Friend</h2>
          <div className="flex gap-2 mb-8">
            <Input placeholder="Paste User ID" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
            <Button onClick={addFriend}><UserPlus /></Button>
          </div>

          <h2 className="font-semibold mb-4">Friends ({friends.length})</h2>
          <div className="space-y-2 overflow-auto flex-1">
            {friends.length === 0 && <p className="text-zinc-500">No friends yet</p>}
            {friends.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-zinc-900 p-3 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{f.friend_profile?.username?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p>{f.friend_profile?.full_name || f.friend_profile?.username}</p>
                    <p className="text-xs text-zinc-500">@{f.friend_profile?.username}</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => callUser(f.friend_id)}>
                  <Phone className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 flex items-center justify-center bg-black relative">
          {isCallActive ? (
            <div className="grid grid-cols-2 gap-6 w-full max-w-6xl p-8">
              <video ref={localVideoRef} autoPlay muted className="rounded-3xl" />
              <video ref={remoteVideoRef} autoPlay className="rounded-3xl" />
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-6xl font-bold mb-4">VideoChat</h1>
              <p className="text-zinc-400">Add friends and start calling</p>
            </div>
          )}

          {isCallActive && (
            <div className="absolute bottom-12 flex gap-4">
              <Button onClick={toggleMic} variant={isMicMuted ? "destructive" : "default"}>Mic</Button>
              <Button onClick={toggleCamera} variant={isCameraOff ? "destructive" : "default"}>Camera</Button>
              <Button onClick={endCall} variant="destructive">End Call</Button>
            </div>
          )}
        </div>
      </div>

      {incomingCall && <IncomingCall caller={incomingCall.caller} onAccept={() => acceptCall(incomingCall)} onReject={() => rejectCall(incomingCall.id)} />}
    </div>
  );
}
