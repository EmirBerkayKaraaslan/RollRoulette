import { httpsCallable } from 'firebase/functions';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { CurationCard } from '@/src/components/game/CurationCard';
import { useCuration } from '@/src/hooks/useCuration';
import { functions } from '@/src/services/firebase/config';
import { useProfileStore } from '@/src/store/profileStore';
import { useRoomStore, selectPlayerList, selectIsHost } from '@/src/store/roomStore';

export default function CurationScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const uid = useProfileStore((s) => s.uid);
  const meta = useRoomStore((s) => s.meta);
  const playerList = useRoomStore(selectPlayerList);
  const isHost = useRoomStore(selectIsHost(uid));

  const { photos, castVote, submitVotes, myVote, readyCount, myReady } = useCuration(
    code,
    uid,
  );

  const [submittingVotes, setSubmittingVotes] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [approvedSummary, setApprovedSummary] = useState<number | null>(null);

  const curationDone = meta?.curationDone === true;
  const totalPlayers = playerList.length;
  const allReady = readyCount >= totalPlayers && totalPlayers > 0;

  async function handleSubmitVotes() {
    setSubmittingVotes(true);
    try {
      await submitVotes();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Oylar gönderilemedi.');
    } finally {
      setSubmittingVotes(false);
    }
  }

  async function handleFinalize() {
    setFinalizing(true);
    try {
      const result = await httpsCallable<{ code: string }, { approvedCount: number }>(
        functions,
        'finalizeCuration',
      )({ code });
      setApprovedSummary(result.data.approvedCount);
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Küratörlük tamamlanamadı.');
    } finally {
      setFinalizing(false);
    }
  }

  async function handleStartRound() {
    setStarting(true);
    try {
      await httpsCallable(functions, 'startRound')({ code, roundNumber: 1 });
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Tur başlatılamadı.');
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Küratörlük</Text>
        <Text style={styles.subtitle}>
          Fotoğrafları oyla — sahipleri gizli
        </Text>
        <Text style={styles.readyCount}>
          {readyCount}/{totalPlayers} oyuncu oyladı
        </Text>
      </View>

      <FlatList
        data={photos}
        keyExtractor={(p) => `${p.ownerUid}/${p.index}`}
        renderItem={({ item }) => (
          <CurationCard
            photo={item}
            vote={myVote(item.ownerUid, item.index)}
            onVote={(keep) => castVote(item.ownerUid, item.index, keep)}
          />
        )}
        contentContainerStyle={styles.list}
        style={styles.listContainer}
      />

      <View style={styles.footer}>
        {!myReady && (
          <Button
            label="Oyumu Gönder"
            onPress={handleSubmitVotes}
            loading={submittingVotes}
          />
        )}

        {myReady && !isHost && (
          <Text style={styles.waitText}>
            {curationDone
              ? 'Host turu başlatıyor...'
              : 'Host küratörlüğü tamamlıyor...'}
          </Text>
        )}

        {isHost && myReady && !curationDone && (
          <Button
            label={allReady ? 'Küratörlüğü Bitir' : `Küratörlüğü Bitir (${readyCount}/${totalPlayers})`}
            onPress={handleFinalize}
            loading={finalizing}
            disabled={finalizing}
          />
        )}

        {isHost && curationDone && (
          <View style={styles.summarySection}>
            {approvedSummary !== null && (
              <Text style={styles.summaryText}>
                {approvedSummary} fotoğraf onaylandı — hazır!
              </Text>
            )}
            <Button
              label="Turu Başlat"
              onPress={handleStartRound}
              loading={starting}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  readyCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  listContainer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  footer: {
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  waitText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 8,
  },
  summarySection: {
    gap: 8,
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#34C759',
    textAlign: 'center',
  },
});
