import { update } from 'firebase/database';
import { useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { ChatBubble } from '@/src/components/lobby/ChatBubble';
import { ChatInput } from '@/src/components/lobby/ChatInput';
import { PlayerCard } from '@/src/components/lobby/PlayerCard';
import { RoomCodeDisplay } from '@/src/components/lobby/RoomCodeDisplay';
import { useChat } from '@/src/hooks/useChat';
import { playerRef } from '@/src/services/firebase/rtdb';
import { useProfileStore } from '@/src/store/profileStore';
import { useRoomStore, selectPlayerList, selectIsHost } from '@/src/store/roomStore';

export default function LobbyScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const uid = useProfileStore((s) => s.uid);
  const players = useRoomStore((s) => s.players);
  const playerList = useRoomStore(selectPlayerList);
  const isHost = useRoomStore(selectIsHost(uid));
  const { messages, sendMessage } = useChat(code);
  const scrollRef = useRef<ScrollView>(null);

  const myPlayer = uid ? players[uid] : null;

  async function handleReadyToggle() {
    if (!uid) return;
    const pRef = playerRef(code, uid);
    await update(pRef, { isReady: !myPlayer?.isReady });
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.top}>
        <RoomCodeDisplay code={code} />

        <Text style={styles.playersHeader}>
          Oyuncular ({playerList.length}/10)
        </Text>

        <FlatList
          data={playerList}
          keyExtractor={(p) => p.uid}
          renderItem={({ item }) => <PlayerCard player={item} />}
          contentContainerStyle={styles.playerList}
          scrollEnabled={false}
        />

        <Button
          label={myPlayer?.isReady ? 'Hazır Değilim' : 'Hazırım'}
          variant={myPlayer?.isReady ? 'secondary' : 'primary'}
          onPress={handleReadyToggle}
        />

        {isHost && (
          <View style={styles.startSection}>
            <Button
              label="Oyunu Başlat"
              disabled
              onPress={() => {}}
            />
            <Text style={styles.startHint}>
              {playerList.length < 3
                ? `En az 3 oyuncu gerekli (şu an: ${playerList.length})`
                : 'Oyun başlatma Faz 2\'de aktif olacak.'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chat}>
        <Text style={styles.chatHeader}>Sohbet</Text>
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <ChatBubble key={msg.key} message={msg} isMine={msg.uid === uid} />
          ))}
        </ScrollView>
        <ChatInput onSend={sendMessage} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  top: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  playersHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playerList: {
    gap: 8,
  },
  startSection: {
    gap: 6,
  },
  startHint: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  chat: {
    height: 280,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C7C7CC',
  },
  chatHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  chatScroll: {
    flex: 1,
  },
});
