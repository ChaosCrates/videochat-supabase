'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export function useVideoCall(currentUserId: string | null) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && incomingCall?.id) {
        supabase
          .from('calls')
          .update({ ice_candidates: [...(incomingCall.ice_candidates || []), event.candidate] })
          .eq('id', incomingCall.id);
      }
    };

    return pc;
  }, [incomingCall]);

  const startLocalStream = async () => {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;
    } catch (err) {
      console.error(err);
      alert("Please allow camera and microphone");
    }
  };

  const callUser = async (calleeId: string) => {
    if (!currentUserId) return;
    await startLocalStream();
    peerConnection.current = createPeerConnection();

    localStream.current?.getTracks().forEach(track => 
      peerConnection.current?.addTrack(track, localStream.current!)
    );

    const offer = await peerConnection.current!.createOffer();
    await peerConnection.current!.setLocalDescription(offer);

    await supabase.from('calls').insert({
      caller_id: currentUserId,
      callee_id: calleeId,
      sdp_offer: offer,
      status: 'ringing'
    });
  };

  const acceptCall = async (call: any) => {
    setIncomingCall(null);
    await startLocalStream();
    peerConnection.current = createPeerConnection();

    localStream.current?.getTracks().forEach(track => 
      peerConnection.current?.addTrack(track, localStream.current!)
    );

    await peerConnection.current!.setRemoteDescription(new RTCSessionDescription(call.sdp_offer));
    const answer = await peerConnection.current!.createAnswer();
    await peerConnection.current!.setLocalDescription(answer);

    await supabase.from('calls').update({ 
      status: 'accepted', 
      sdp_answer: answer 
    }).eq('id', call.id);

    setIsCallActive(true);
  };

  const rejectCall = (callId: string) => {
    supabase.from('calls').update({ status: 'rejected' }).eq('id', callId);
    setIncomingCall(null);
  };

  const endCall = () => {
    peerConnection.current?.close();
    localStream.current?.getTracks().forEach(t => t.stop());
    setIsCallActive(false);
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel(`incoming-${currentUserId}`);

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'calls', filter: `callee_id=eq.${currentUserId}` },
      async (payload) => {
        if (payload.new.status === 'ringing') {
          const { data: caller } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.caller_id)
            .single();
          
          setIncomingCall({ ...payload.new, caller: caller || { username: 'Someone' } });
        }
      }
    ).subscribe();

    return () => channel.unsubscribe();
  }, [currentUserId]);

  return {
    callUser,
    acceptCall,
    rejectCall,
    endCall,
    incomingCall,
    isCallActive,
    localVideoRef,
    remoteVideoRef,
  };
}