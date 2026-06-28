import { StyleSheet, Text, View } from 'react-native';
import type { ChatMessage } from '@/src/types/firebase';

interface ChatBubbleProps {
  message: ChatMessage;
  isMine: boolean;
}

export function ChatBubble({ message, isMine }: ChatBubbleProps) {
  const time = new Date(message.ts).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.row, isMine && styles.rowMine]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        {!isMine && <Text style={styles.nickname}>{message.nickname}</Text>}
        <Text style={[styles.text, isMine && styles.textMine]}>{message.text}</Text>
        <Text style={[styles.time, isMine && styles.timeMine]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 3,
    paddingHorizontal: 12,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 2,
  },
  bubbleOther: {
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  nickname: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  text: {
    fontSize: 15,
    color: '#000',
  },
  textMine: {
    color: '#fff',
  },
  time: {
    fontSize: 10,
    color: '#8E8E93',
    alignSelf: 'flex-end',
  },
  timeMine: {
    color: 'rgba(255,255,255,0.65)',
  },
});
