import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { pickAvatar } from '@/src/services/photo/picker';
import { processAndUploadAvatar } from '@/src/services/photo/uploader';
import { upsertUserProfile } from '@/src/services/firebase/firestore';
import { useProfileStore } from '@/src/store/profileStore';

export default function SetupScreen() {
  const uid = useProfileStore((s) => s.uid);
  const setProfile = useProfileStore((s) => s.setProfile);

  const [nickname, setNickname] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handlePickAvatar() {
    const uri = await pickAvatar();
    if (uri) setPhotoUri(uri);
  }

  async function handleSave() {
    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 16) {
      setError('Takma ad 2-16 karakter olmalı.');
      return;
    }
    if (!uid) return;

    setError('');
    setLoading(true);

    try {
      let photoUrl: string | null = null;
      if (photoUri) {
        photoUrl = await processAndUploadAvatar(uid, photoUri);
      }

      setProfile({ nickname: trimmed, photoUrl });
      await upsertUserProfile(uid, {
        nickname: trimmed,
        photoUrl,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        gamesPlayed: 0,
      });

      router.replace('/(home)');
    } catch (e) {
      Alert.alert('Hata', 'Profil kaydedilemedi. Tekrar dene.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll style={styles.screen}>
      <Text style={styles.title}>Profilini Kur</Text>
      <Text style={styles.subtitle}>Arkadaşların seni bu isimle görecek.</Text>

      <TouchableOpacity style={styles.avatarBtn} onPress={handlePickAvatar}>
        <Avatar uri={photoUri} initials={nickname || '?'} size={96} />
        <Text style={styles.avatarHint}>Fotoğraf seç (isteğe bağlı)</Text>
      </TouchableOpacity>

      <TextField
        label="Takma Ad"
        value={nickname}
        onChangeText={setNickname}
        placeholder="Adın ne?"
        maxLength={16}
        autoCorrect={false}
        error={error}
      />

      <View style={styles.spacer} />

      <Button label="Kaydet" onPress={handleSave} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
  },
  avatarBtn: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  avatarHint: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
});
