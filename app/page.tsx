'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useVideoCall } from './hooks/useVideoCall';
import IncomingCall from './components/IncomingCall';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, LogOut, UserPlus, Copy, RefreshCw } from 'lucide-react';

export default function VideoChatApp() {
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [searchId, setSearchId] = useState('');
  const [myUserId, setMyUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { callUser, acceptCall, rejectCall, endCall, incomingCall, isCallActive, localVideoRef, remoteVideoRef } = useVideoCall(user?.id);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u);
      if (u) setMyUserId(u.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user;
      setUser(u);
      if (u) setMyUserId(u.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Load Friends
  const loadFriends = async () => {
    if (!user) return;
    setRefreshing(true);

    const { data } = await supabase
      .from('friends')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    setFriends(data || []);
    setRefreshing(false);
  };

  useEffect(() => {
    loadFriends();
  }, [user]);

  const copyUserId = () => {
    navigator.clipboard.writeText(myUserId);
    alert("✅ User ID copied to clipboard!");
  };

  const addFriend = async () => {
    if (!searchId || !user) return alert("Enter a User ID");

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
      alert("✅ Friend added successfully!");
      setSearchId('');
      loadFriends();        // Refresh list
    }
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-2xl">Loading...</div>;

  if (!user) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">Login Screen...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-96 border-r border-zinc-800 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">VideoChat</h1>
            <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
              <LogOut />
            </Button>
          </div>

          {/* COPY USER ID SECTION */}
          <div className="bg-zinc-900 p-5 rounded-2xl mb-8">
            <p className="text-sm text-zinc-400 mb-2">YOUR USER ID (Share this)</p>
            <div className="flex gap-2">
              <p className="font-mono text-sm break-all flex-1 bg-black p-3 rounded">{myUserId}</p>
              <Button onClick={copyUserId} variant="outline">
                <Copy size={18} />
              </Button>
            </div>
          </div>

          {/* ADD FRIEND SECTION */}
          <h2 className="font-semibold mb-3">Add Friend</h2>
          <div className="flex gap-2 mb-8">
            <Input 
              placeholder="Paste Friend's User ID here" 
              value={searchId} 
              onChange={(e) => setSearchId(e.target.value)} 
            />
            <Button onClick={addFriend}>
              <UserPlus />
            </Button>
          </div>

          {/* FRIENDS LIST */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">My Friends ({friends.length})</h2>
            <Button variant="ghost" size="sm" onClick={loadFriends} disabled={refreshing}>
              <RefreshCw className={refreshing ? "animate-spin" : ""} size={18} />
            </Button>
          </div>

          <div className="space-y-3 flex-1 overflow-auto">
            {friends.length === 0 && (
              <p className="text-zinc-500">No friends yet.<br />Add them using their User ID above.</p>
            )}

            {friends.map((f) => (
              <div key={f.id} className="bg-zinc-900 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="font-medium">Friend</p>
                  <p className="font-mono text-xs text-zinc-500">{f.friend_id}</p>
                </div>
                <Button onClick={() => callUser(f.friend_id)}>
                  <Phone />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex items-center justify-center bg-black relative">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-6">VideoChat</h1>
            <p className="text-zinc-400">Add friends using their User ID</p>
          </div>
        </div>
      </div>

      {incomingCall && <IncomingCall caller={incomingCall.caller} onAccept={() => acceptCall(incomingCall)} onReject={() => rejectCall(incomingCall.id)} />}
    </div>
  );
}
