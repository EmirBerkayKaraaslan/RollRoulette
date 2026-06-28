import { push, query, limitToLast } from 'firebase/database';
import { useEffect, useState } from 'react';
import { chatRef, serverTimestamp, subscribeValue } from '@/src/services/firebase/rtdb';
import { useProfileStore } from '@/src/store/profileStore';
import type { ChatMessage } from '@/src/types/firebase';

const MAX_MESSAGES = 50;
const MAX_TEXT_LENGTH = 200;

export function useChat(code: string) {
  const [messages, setMessages] = useState<Array<ChatMessage & { key: string }>>([]);
  const uid = useProfileStore((s) => s.uid);
  const nickname = useProfileStore((s) => s.nickname);

  useEffect(() => {
    const limited = query(chatRef(code), limitToLast(MAX_MESSAGES));
    const unsub = subscribeValue<Record<string, ChatMessage>>(limited as any, (val) => {
      if (!val) return setMessages([]);
      const sorted = Object.entries(val)
        .map(([key, msg]) => ({ key, ...msg }))
        .sort((a, b) => a.ts - b.ts);
      setMessages(sorted);
    });
    return unsub;
  }, [code]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX_TEXT_LENGTH || !uid) return;

    await push(chatRef(code), {
      uid,
      nickname,
      text: trimmed,
      ts: serverTimestamp(),
    });
  }

  return { messages, sendMessage };
}
