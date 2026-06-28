import { httpsCallable } from 'firebase/functions';
import { update } from 'firebase/database';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { pickGamePhotos } from '@/src/services/photo/picker';
import { uploadPhotoPool } from '@/src/services/photo/poolUploader';
import { playerRef } from '@/src/services/firebase/rtdb';
import { functions } from '@/src/services/firebase/config';
import { useProfileStore } from '@/src/store/profileStore';
import { useRoomStore, selectPlayerList, selectIsHost } from '@/src/store/roomStore';
import { useGameStore } from '@/src/store/gameStore';
import { useHostMigration } from '@/src/hooks/useHostMigration';
import { PHOTOS_PER_PLAYER, AFK_GRACE_MS } from '@/src/services/game/constants';
import type { GameMode } from '@/src/types/room';

export default function PhotoSelectScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const uid = useProfileStore((s) => s.uid);
  const players = useRoomStore((s) => s.players);
  const playerList = useRoomStore(selectPlayerList);
  const isHost = useRoomStore(selectIsHost(uid));
  const mode: GameMode = useRoomStore((s) => s.meta?.mode ?? 'blind');
  const setPoolUploadProgress = useGameStore((s) => s.setPoolUploadProgress);

  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [starting, setStarting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [afkTimeElapsed, setAfkTimeElapsed] = useState(false);
  const afkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useHostMigration(code, uid);

  const isSpectator = uid != null && players[uid]?.isSpectator === true;

  // Gate: only connected, non-spectator players matter
  const connectedActive = playerList.filter((p) => p.isConnected && !p.isSpectator);
  const allReady = connectedActive.length > 0 && connectedActive.every((p) => p.photosReady);

  // AFK timer: starts when gate is stuck (host has uploaded but others haven't)
  const gateStuck = isHost && done && !allReady && connectedActive.length > 0;

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

  async function handlePick() {
    const uris = await pickGamePhotos();
    if (uris.length === 0) return;
    setSelectedUris(uris);
  }

  async function handleHostAction() {
    setStarting(true);
    try {
      if (mode === 'curated') {
        await httpsCallable(functions, 'startCuration')({ code });
      } else {
        await httpsCallable(functions, 'startRound')({ code, roundNumber: 1 });
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'İşlem başarısız.');
    } finally {
      setStarting(false);
    }
  }

  async function handleUpload() {
    if (!uid || selectedUris.length === 0) return;
    setUploading(true);
    try {
      await uploadPhotoPool(uid, code, selectedUris, (uploaded, total) => {
        setPoolUploadProgress({ uploaded, total });
      });
      await update(playerRef(code, uid), { photosReady: true });
      setDone(true);
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Yükleme başarısız.');
    } finally {
      setUploading(false);
      setPoolUploadProgress(null);
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

  // Spectator: read-only view
  if (isSpectator) {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.title}>Fotoğraf Seçimi</Text>
        <View style={styles.spectatorBanner}>
          <Text style={styles.spectatorTitle}>İzleyici</Text>
          <Text style={styles.spectatorSubtitle}>
            Oyuncular fotoğraflarını yükliyor...
          </Text>
        </View>
        <View style={styles.playerStatus}>
          {connectedActive.map((p) => (
            <View key={p.uid} style={styles.playerRow}>
              <Text style={styles.playerName}>{p.nickname}</Text>
              <Text style={p.photosReady ? styles.ready : styles.waiting}>
                {p.photosReady ? 'Hazır' : 'Bekleniyor...'}
              </Text>
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Fotoğraf Seç</Text>
      <Text style={styles.subtitle}>
        {PHOTOS_PER_PLAYER} fotoğraf seç — bunlar oyun sırasında havuza katılacak.
      </Text>

      {selectedUris.length > 0 && (
        <FlatList
          data={selectedUris}
          keyExtractor={(uri) => uri}
          horizontal
          style={styles.preview}
          contentContainerStyle={styles.previewContent}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.thumb} />
          )}
        />
      )}

      {!done && (
        <View style={styles.actions}>
          <Button
            label={selectedUris.length > 0 ? `${selectedUris.length} fotoğraf seçildi — Değiştir` : 'Galeriden Seç'}
            variant="secondary"
            onPress={handlePick}
            disabled={uploading}
          />
          {selectedUris.length === PHOTOS_PER_PLAYER && (
            <Button
              label="Yükle ve Hazır Ol"
              onPress={handleUpload}
              loading={uploading}
            />
          )}
          {selectedUris.length > 0 && selectedUris.length < PHOTOS_PER_PLAYER && (
            <Text style={styles.warnText}>
              {PHOTOS_PER_PLAYER} fotoğraf seçmelisin ({selectedUris.length} seçildi)
            </Text>
          )}
        </View>
      )}

      {done && (
        <View style={styles.doneSection}>
          <Text style={styles.doneText}>Fotoğrafların yüklendi!</Text>
          {allReady ? (
            isHost ? (
              <Button
                label={mode === 'curated' ? 'Küratörlüğe Geç' : 'Turu Başlat'}
                onPress={handleHostAction}
                loading={starting}
              />
            ) : (
              <Text style={styles.waitText}>Host turu başlatıyor...</Text>
            )
          ) : (
            <>
              <Text style={styles.waitText}>
                {connectedActive.filter((p) => p.photosReady).length}/{connectedActive.length} oyuncu hazır
              </Text>
              {isHost && afkTimeElapsed && (
                <Button
                  label="Bekleyenleri Atla"
                  variant="secondary"
                  onPress={handleDropInactive}
                  loading={skipping}
                />
              )}
            </>
          )}
        </View>
      )}

      <View style={styles.playerStatus}>
        {connectedActive.map((p) => (
          <View key={p.uid} style={styles.playerRow}>
            <Text style={styles.playerName}>{p.nickname}</Text>
            <Text style={p.photosReady ? styles.ready : styles.waiting}>
              {p.photosReady ? 'Hazır' : 'Bekleniyor...'}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 20,
    gap: 16,
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
  spectatorBanner: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  spectatorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8E8E93',
  },
  spectatorSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  preview: {
    flexGrow: 0,
  },
  previewContent: {
    gap: 8,
  },
  thumb: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#E5E5EA',
  },
  actions: {
    gap: 10,
  },
  doneSection: {
    gap: 6,
    alignItems: 'center',
  },
  doneText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34C759',
  },
  waitText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  playerStatus: {
    gap: 8,
    marginTop: 8,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  playerName: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  ready: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
  },
  waiting: {
    fontSize: 14,
    color: '#8E8E93',
  },
  warnText: {
    fontSize: 13,
    color: '#FF9500',
    textAlign: 'center',
  },
});
