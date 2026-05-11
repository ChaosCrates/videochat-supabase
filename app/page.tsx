'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useVideoCall } from './hooks/useVideoCall';
import IncomingCall from './components/IncomingCall';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, LogOut, UserPlus, Send, Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react';

export default function VideoChatApp() {
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchId, setSearchId] = useState('');
  const [myUserId, setMyUserId] = useState('');
  const [loading, setLoading] = useState(true);

  const { callUser, acceptCall, rejectCall, endCall, incomingCall, isCallActive, localVideoRef, remoteVideoRef } = useVideoCall(user?.id);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        .select(`*, friend_profile:profiles!friend_id(*)`)
        .eq('user_id', user.id)
        .eq('status', 'accepted');
      setFriends(data || []);
    };
    fetchFriends();
  }, [user]);

  // Load Messages when friend is selected
  useEffect(() => {
    if (!selectedFriend || !user) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedFriend.friend_id}),and(sender_id.eq.${selectedFriend.friend_id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };

    fetchMessages();

    // Realtime Messages
    const channel = supabase.channel(`chat-${selectedFriend.friend_id}`);
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.sender_id === selectedFriend.friend_id || payload.new.sender_id === user.id) {
          setMessages(prev => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => channel.unsubscribe();
  }, [selectedFriend, user]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addFriend = async () => {
    if (!searchId || !user) return alert("Enter User ID");
    const { error } = await supabase.from('friends').insert({
      user_id: user.id,
      friend_id: searchId,
      status: 'accepted'
    });
    if (error) alert(error.message);
    else {
      alert("✅ Friend added!");
      setSearchId('');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend || !user) return;

    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selectedFriend.friend_id,
      message: newMessage.trim()
    });

    setNewMessage('');
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;

  if (!user) {
    // Your login screen (keep previous version)
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">Login Screen Here</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex h-screen">
      {/* Sidebar - Friends List */}
      <div className="w-96 border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">VideoChat</h1>
            <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
              <LogOut />
            </Button>
          </div>

          <div className="bg-zinc-900 p-4 rounded-2xl mb-6">
            <p className="text-xs text-zinc-500">YOUR ID</p>
            <p className="font-mono text-sm break-all">{myUserId}</p>
          </div>

          <div className="flex gap-2">
            <Input placeholder="Add friend by User ID" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
            <Button onClick={addFriend}><UserPlus /></Button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          <h2 className="font-semibold mb-4">Friends ({friends.length})</h2>
          {friends.map((f) => (
            <div
              key={f.id}
              onClick={() => setSelectedFriend(f)}
              className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer mb-2 hover:bg-zinc-900 ${selectedFriend?.friend_id === f.friend_id ? 'bg-zinc-800' : ''}`}
            >
              <Avatar>
                <AvatarFallback>{f.friend_profile?.username?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{f.friend_profile?.full_name || f.friend_profile?.username}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); callUser(f.friend_id); }}>
                <Phone size={18} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-zinc-800 p-4 flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{selectedFriend.friend_profile?.username?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{selectedFriend.friend_profile?.full_name}</p>
                <p className="text-sm text-green-500">Online</p>
              </div>
              <Button className="ml-auto" onClick={() => callUser(selectedFriend.friend_id)}>
                <Phone /> Call
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-6 space-y-4 bg-zinc-950">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-3 rounded-2xl ${msg.sender_id === user.id ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                    {msg.message}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-zinc-800 flex gap-3">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage}><Send /></Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Select a friend to start chatting
          </div>
        )}
      </div>

      {/* Video Call Area (Overlay when calling) */}
      {isCallActive && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
          {/* Video Call UI */}
        </div>
      )}

      {incomingCall && <IncomingCall caller={incomingCall.caller} onAccept={() => acceptCall(incomingCall)} onReject={() => rejectCall(incomingCall.id)} />}
    </div>
  );
}
