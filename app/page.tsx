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

    const loadFriends = async () => {
      const { data } = await supabase
        .from('friends')
        .select(`
          *,
          friend_profile:profiles!friend_id (username, full_name, avatar_url)
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      setFriends(data || []);
    };

    loadFriends();
  }, [user]);

  const addFriend = async () => {
    if (!searchId || searchId === user?.id) return alert("Enter a valid User ID");

    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: user.id,
        friend_id: searchId,
        status: 'accepted'        // ← This makes it instant
      });

    if (error) {
      alert("Failed to add friend: " + error.message);
    } else {
      alert("✅ Friend added successfully!");
      setSearchId('');
    }
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white text-2xl">Loading...</div>;

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
              <p className="text-zinc-500">No friends yet. Add someone using their User ID.</p>
            )}
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{friend.friend_profile?.username?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{friend.friend_profile?.full_name || friend.friend_profile?.username}</p>
                  </div>
                </div>
                <Button onClick={() => callUser(friend.friend_id)}>
                  <Phone className="w-5 h-5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex items-center justify-center bg-black">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-6">VideoChat</h1>
            <p className="text-zinc-400">Select a friend from the sidebar to call or chat</p>
          </div>
        </div>
      </div>

      {incomingCall && (
        <IncomingCall 
          caller={incomingCall.caller} 
          onAccept={() => acceptCall(incomingCall)} 
          onReject={() => rejectCall(incomingCall.id)} 
        />
      )}
    </div>
  );
}
