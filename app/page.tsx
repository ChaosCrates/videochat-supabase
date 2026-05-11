'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useVideoCall } from './hooks/useVideoCall';
import IncomingCall from './components/IncomingCall';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, LogOut, UserPlus, RefreshCw } from 'lucide-react';

export default function VideoChatApp() {
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [searchId, setSearchId] = useState('');
  const [myUserId, setMyUserId] = useState('');
  const [loading, setLoading] = useState(true);

  const { callUser, acceptCall, rejectCall, endCall, incomingCall } = useVideoCall(user?.id);

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

  const loadFriends = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('friends')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    setFriends(data || []);
  };

  useEffect(() => {
    loadFriends();
  }, [user]);

  const addFriend = async () => {
    if (!searchId || !user) return alert("Enter User ID");

    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: user.id,
        friend_id: searchId,
        status: 'accepted'
      });

    if (error) alert(error.message);
    else {
      alert("✅ Added! Refreshing...");
      setSearchId('');
      loadFriends();
    }
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">Please log in</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="flex h-screen">
        <div className="w-96 border-r border-zinc-800 p-6 flex flex-col">
          <div className="flex justify-between mb-8">
            <h1 className="text-2xl font-bold">VideoChat</h1>
            <Button variant="ghost" onClick={() => supabase.auth.signOut()}>Logout</Button>
          </div>

          <div className="bg-zinc-900 p-4 rounded-2xl mb-6">
            <p className="text-xs text-zinc-500">YOUR ID</p>
            <p className="font-mono break-all">{myUserId}</p>
          </div>

          <h2 className="font-semibold mb-3">Add Friend</h2>
          <div className="flex gap-2 mb-8">
            <Input placeholder="User ID" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
            <Button onClick={addFriend}><UserPlus /></Button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Friends ({friends.length})</h2>
            <Button variant="ghost" size="sm" onClick={loadFriends}><RefreshCw /></Button>
          </div>

          <div className="space-y-3">
            {friends.length === 0 && <p className="text-zinc-500">No friends found yet.</p>}

            {friends.map((f) => (
              <div key={f.id} className="bg-zinc-900 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <p>Friend ID:</p>
                  <p className="font-mono text-sm text-zinc-400">{f.friend_id}</p>
                </div>
                <Button onClick={() => callUser(f.friend_id)}>
                  <Phone />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-black">
          <h1 className="text-5xl font-bold text-zinc-600">VideoChat</h1>
        </div>
      </div>

      {incomingCall && <IncomingCall caller={incomingCall.caller} onAccept={() => acceptCall(incomingCall)} onReject={() => rejectCall(incomingCall.id)} />}
    </div>
  );
}
