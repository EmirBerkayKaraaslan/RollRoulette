import { httpsCallable } from 'firebase/functions';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { CurationCard } from '@/src/components/game/CurationCard';
import { useCuration } from '@/src/hooks/useCuration';
import { useHostMigration } from '@/src/hooks/useHostMigration';
import { functions } from '@/src/services/firebase/config';
import { useProfileStore } from '@/src/store/profileStore';
import { useRoomStore, selectPlayerList, selectIsHost } from '@/src/store/roomStore';
import { AFK_GRACE_MS } from '@/src/services/game/constants';

export default function CurationScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const uid = useProfileStore((s) => s.uid);
  const meta = useRoomStore((s) => s.meta);
  const players = useRoomStore((s) => s.players);
  const playerList = useRoomStore(selectPlayerList);
  const isHost = useRoomStore(selectIsHost(uid));

  const { photos, castVote, submitVotes, myVote, ready, myReady } = useCuration(code, uid);

  const [submittingVotes, setSubmittingVotes] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [approvedSummary, setApprovedSummary] = useState<number | null>(null);
  const [afkTimeElapsed, setAfkTimeElapsed] = useState(false);
  const afkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useHostMigration(code, uid);

  const isSpectator = uid != null && players[uid]?.isSpectator === true;

  const curationDone = meta?.curationDone === true;

  // N2 fix: gate counts only connected non-spectator players
  const connectedActive = playerList.filter((p) => p.isConnected && !p.isSpectator);
  const totalActive = connectedActive.length;
  const activeReadyCount = connectedActive.filter((p) => ready[p.uid]).length;
  const allReady = totalActive > 0 && activeReadyCount >= totalActive;

  // AFK timer: starts when host has voted but gate is still stuck
  const gateStuck = isHost && myReady && !allReady && totalActive > 0;

  useEffect(() => {
    if (gateStuck) {
      if (!afkTimerRef.current) {
        afkTimerRef.current = setTimeout(() => setAfkTimeElapsed(true), AFK_GRACE_MS);
      }
    } else {
      if (afkTimerRef.current) {
        clearTimeout(afkTimerRef.current);
        afkTimerRef.current = null;
      }
      setAfkTimeElapsed(false);
    }
  }, [gateStuck]);

  useEffect(() => {
    return () => {
      if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
    };
  }, []);

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

  async function handleDropInactive() {
    setSkipping(true);
    try {
      await httpsCallable(functions, 'dropInactive')({ code });
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'İşlem başarısız.');
    } finally {
      setSkipping(false);
    }
  }

  // Spectator: read-only view (shows photos and vote progress but no actions)
  if (isSpectator) {
    return (
      <Screen style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Küratörlük</Text>
          <Text style={styles.subtitle}>Fotoğrafları oyla — sahipleri gizli</Text>
          <View style={styles.spectatorBadge}>
            <Text style={styles.spectatorText}>İzleyici — {activeReadyCount}/{totalActive} oyladı</Text>
          </View>
        </View>
        <FlatList
          data={photos}
          keyExtractor={(p) => `${p.ownerUid}/${p.index}`}
          renderItem={({ item }) => (
            <CurationCard
              photo={item}
              vote={undefined}
              onVote={() => {}}
            />
          )}
          contentContainerStyle={styles.list}
          style={styles.listContainer}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Küratörlük</Text>
        <Text style={styles.subtitle}>
          Fotoğrafları oyla — sahipleri gizli
        </Text>
        <Text style={styles.readyCount}>
          {activeReadyCount}/{totalActive} oyuncu oyladı
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
          <>
            <Button
              label={allReady ? 'Küratörlüğü Bitir' : `Küratörlüğü Bitir (${activeReadyCount}/${totalActive})`}
              onPress={handleFinalize}
              loading={finalizing}
              disabled={finalizing}
            />
            {afkTimeElapsed && (
              <Button
                label="Bekleyenleri Atla"
                variant="secondary"
                onPress={handleDropInactive}
                loading={skipping}
              />
            )}
          </>
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
  spectatorBadge: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  spectatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
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
