'use client';

import { Phone, PhoneOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface IncomingCallProps {
  caller: { username: string; full_name?: string; avatar_url?: string };
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCall({ caller, onAccept, onReject }: IncomingCallProps) {
  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
      <div className="bg-zinc-900 p-10 rounded-3xl text-center max-w-md w-full mx-4 shadow-2xl">
        <div className="mb-8">
          <Avatar className="w-36 h-36 mx-auto border-4 border-green-500">
            <AvatarImage src={caller.avatar_url} />
            <AvatarFallback className="text-7xl bg-blue-600">
              {caller.username?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
        </div>

        <h2 className="text-4xl font-bold mb-2">{caller.full_name || caller.username}</h2>
        <p className="text-zinc-400 text-xl mb-12">is calling you...</p>

        <div className="flex gap-8 justify-center">
          <Button 
            onClick={onReject}
            size="lg"
            variant="destructive"
            className="w-24 h-24 rounded-full bg-red-600 hover:bg-red-700 text-4xl"
          >
            <PhoneOff />
          </Button>
          
          <Button 
            onClick={onAccept}
            size="lg"
            className="w-24 h-24 rounded-full bg-green-600 hover:bg-green-700 text-4xl"
          >
            <Phone />
          </Button>
        </div>
      </div>
    </div>
  );
}