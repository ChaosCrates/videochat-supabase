'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useVideoCall } from './hooks/useVideoCall';
import IncomingCall from './components/IncomingCall';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, LogOut, UserPlus } from 'lucide-react';

export default function VideoChatApp() {
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [searchId, setSearchId] = useState('');
  const [myUserId, setMyUserId] = useState('');
  const [loading, setLoading] = useState(true);

  const { callUser, acceptCall, rejectCall, endCall, incomingCall, isCallActive, localVideoRef, remoteVideoRef } = useVideoCall(user?.id);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user;
      setUser(currentUser);
      if (currentUser) setMyUserId(currentUser.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setMyUserId(session.user.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Load Friends
  const loadFriends = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        friend_profile:profiles!friend_id (username, full_name, avatar_url)
      `)
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (error) console.error(error);
    setFriends(data || []);
  };

  useEffect(() => {
    loadFriends();
  }, [user]);

  const addFriend = async () => {
    if (!searchId || !user) return alert("Please enter User ID");

    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: user.id,
        friend_id: searchId,
        status: 'accepted'
      });

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("✅ Friend added!");
      setSearchId('');
      loadFriends();        // ← This forces refresh
    }
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-2xl text-white">Loading...</div>;

  if (!user) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">Login Screen...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-96 border-r border-zinc-800 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">VideoChat</h1>
            <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
              <LogOut />
            </Button>
          </div>

          <div className="bg-zinc-900 p-4 rounded-2xl mb-6">
            <p className="text-xs text-zinc-500">YOUR USER ID</p>
            <p className="font-mono text-sm break-all">{myUserId}</p>
          </div>

          <h2 className="font-semibold mb-3">Add Friend</h2>
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

          <h2 className="font-semibold mb-4">My Friends ({friends.length})</h2>
          
          <div className="space-y-3 flex-1 overflow-auto">
            {friends.length === 0 && (
              <p className="text-zinc-500 italic">No friends yet. Add someone using their User ID above.</p>
            )}
            
            {friends.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{f.friend_profile?.username?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{f.friend_profile?.full_name || f.friend_profile?.username || 'User'}</p>
                  </div>
                </div>
                <Button onClick={() => callUser(f.friend_id)}>
                  <Phone />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex items-center justify-center bg-black">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-6">VideoChat</h1>
            <p className="text-xl text-zinc-400">Your friends appear here after you add them</p>
          </div>
        </div>
      </div>

      {incomingCall && <IncomingCall caller={incomingCall.caller} onAccept={() => acceptCall(incomingCall)} onReject={() => rejectCall(incomingCall.id)} />}
    </div>
  );
}
