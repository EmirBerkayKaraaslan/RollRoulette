import { httpsCallable } from 'firebase/functions';
import { router } from 'expo-router';
import { functions } from '@/src/services/firebase/config';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { OfflineBanner } from '@/src/components/ui/OfflineBanner';
import { Screen } from '@/src/components/ui/Screen';
import { SettingsModal } from '@/src/components/ui/SettingsModal';
import { useProfileStore } from '@/src/store/profileStore';
import { useRoomStore } from '@/src/store/roomStore';
import type { GameMode } from '@/src/types/room';

export default function HomeScreen() {
  const nickname = useProfileStore((s) => s.nickname);
  const photoUrl = useProfileStore((s) => s.photoUrl);
  const uid = useProfileStore((s) => s.uid);
  const setRoom = useRoomStore((s) => s.setRoom);

  const [creating, setCreating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('blind');
  const [settingsVisible, setSettingsVisible] = useState(false);

  async function handleCreateRoom() {
    if (!uid) return;
    setCreating(true);
    try {
      const createRoom = httpsCallable<{ mode: GameMode }, { code: string }>(functions, 'createRoom');
      const result = await createRoom({ mode: selectedMode });
      const { code } = result.data;
      setRoom(code, 'host');
      router.push(`/room/${code}/lobby`);
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Oda oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <OfflineBanner />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.profileRow} onPress={() => router.push('/(setup)')}>
          <Avatar uri={photoUrl} initials={nickname} size={44} />
          <View>
            <Text style={styles.nicknameLabel}>{nickname}</Text>
            <Text style={styles.editHint}>Düzenle</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.settingsBtn}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>RollRoulette</Text>
        <Text style={styles.heroSub}>Kim kimin fotoğrafı?</Text>
      </View>

      <View style={styles.modePicker}>
        <Text style={styles.modeLabel}>Oyun Modu</Text>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeOption, selectedMode === 'blind' && styles.modeOptionActive]}
            onPress={() => setSelectedMode('blind')}
          >
            <Text style={[styles.modeOptionText, selectedMode === 'blind' && styles.modeOptionTextActive]}>
              Blind
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeOption, selectedMode === 'curated' && styles.modeOptionActive]}
            onPress={() => setSelectedMode('curated')}
          >
            <Text style={[styles.modeOptionText, selectedMode === 'curated' && styles.modeOptionTextActive]}>
              Curated
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.modeDesc}>
          {selectedMode === 'blind'
            ? 'Tüm fotoğraflar direkt turda kullanılır.'
            : 'Oyuncular havuzu oylar; onaylananlar turda yer alır.'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="Oda Kur" onPress={handleCreateRoom} loading={creating} />
        <Button
          label="Koda Katıl"
          variant="secondary"
          onPress={() => router.push('/(home)/join')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingsBtn: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 22,
    color: '#8E8E93',
  },
  nicknameLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  editHint: {
    fontSize: 12,
    color: '#007AFF',
  },
  heroSection: {
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#007AFF',
    letterSpacing: -1,
  },
  heroSub: {
    fontSize: 18,
    color: '#8E8E93',
  },
  modePicker: {
    gap: 8,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 3,
  },
  modeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  modeOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  modeOptionTextActive: {
    color: '#007AFF',
  },
  modeDesc: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actions: {
    gap: 14,
    paddingBottom: 24,
  },
});
