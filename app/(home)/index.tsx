import { httpsCallable } from 'firebase/functions';
import { router } from 'expo-router';
import { functions } from '@/src/services/firebase/config';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useProfileStore } from '@/src/store/profileStore';
import { useRoomStore } from '@/src/store/roomStore';

export default function HomeScreen() {
  const nickname = useProfileStore((s) => s.nickname);
  const photoUrl = useProfileStore((s) => s.photoUrl);
  const uid = useProfileStore((s) => s.uid);
  const setRoom = useRoomStore((s) => s.setRoom);

  const [creating, setCreating] = useState(false);

  async function handleCreateRoom() {
    if (!uid) return;
    setCreating(true);
    try {
      const createRoom = httpsCallable<{ mode: 'blind' }, { code: string }>(functions, 'createRoom');
      const result = await createRoom({ mode: 'blind' });
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.profileRow} onPress={() => router.push('/(setup)')}>
          <Avatar uri={photoUrl} initials={nickname} size={44} />
          <View>
            <Text style={styles.nicknameLabel}>{nickname}</Text>
            <Text style={styles.editHint}>Düzenle</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>RollRoulette</Text>
        <Text style={styles.heroSub}>Kim kimin fotoğrafı?</Text>
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
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  actions: {
    gap: 14,
    paddingBottom: 24,
  },
});
