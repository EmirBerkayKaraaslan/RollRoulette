import { httpsCallable } from 'firebase/functions';
import { update } from 'firebase/database';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
import { PHOTOS_PER_PLAYER } from '@/src/services/game/constants';

export default function PhotoSelectScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const uid = useProfileStore((s) => s.uid);
  const players = useRoomStore((s) => s.players);
  const playerList = useRoomStore(selectPlayerList);
  const isHost = useRoomStore(selectIsHost(uid));
  const setPoolUploadProgress = useGameStore((s) => s.setPoolUploadProgress);

  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [starting, setStarting] = useState(false);

  const myPlayer = uid ? players[uid] : null;
  const allReady = playerList.length > 0 && playerList.every((p) => p.photosReady);

  async function handlePick() {
    const uris = await pickGamePhotos();
    if (uris.length === 0) return;
    setSelectedUris(uris);
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

  async function handleUpload() {
    if (!uid || selectedUris.length === 0) return;
    setUploading(true);
    try {
      await uploadPhotoPool(uid, code, selectedUris, (uploaded, total) => {
        setPoolUploadProgress({ uploaded, total });
      });
      // photosReady = true
      await update(playerRef(code, uid), { photosReady: true });
      setDone(true);
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Yükleme başarısız.');
    } finally {
      setUploading(false);
      setPoolUploadProgress(null);
    }
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
                label="Turu Başlat"
                onPress={handleStartRound}
                loading={starting}
              />
            ) : (
              <Text style={styles.waitText}>Host turu başlatıyor...</Text>
            )
          ) : (
            <Text style={styles.waitText}>
              {playerList.filter((p) => p.photosReady).length}/{playerList.length} oyuncu hazır
            </Text>
          )}
        </View>
      )}

      <View style={styles.playerStatus}>
        {playerList.map((p) => (
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
