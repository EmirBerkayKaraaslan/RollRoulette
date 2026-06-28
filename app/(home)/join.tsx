import { httpsCallable } from 'firebase/functions';
import { functions } from '@/src/services/firebase/config';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { useRoomStore } from '@/src/store/roomStore';

export default function JoinScreen() {
  const setRoom = useRoomStore((s) => s.setRoom);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleCodeChange(text: string) {
    setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
    setError('');
  }

  async function handleJoin() {
    if (code.length !== 6) {
      setError('6 haneli kod gir.');
      return;
    }

    setLoading(true);
    try {
      const joinRoom = httpsCallable<{ code: string }, { success: boolean }>(
        functions,
        'joinRoom',
      );
      await joinRoom({ code });
      setRoom(code, 'guest');
      router.replace(`/room/${code}/lobby`);
    } catch (e: any) {
      const code_ = e?.code ?? '';
      if (code_ === 'not-found') setError('Oda bulunamadı veya süresi dolmuş.');
      else if (code_ === 'failed-precondition') setError('Oyun başlamış, bu odaya giremezsin.');
      else if (code_ === 'resource-exhausted') setError('Oda dolu (maks 10 oyuncu).');
      else setError(e?.message ?? 'Katılım başarısız.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll style={styles.screen}>
      <Text style={styles.title}>Odaya Katıl</Text>
      <Text style={styles.subtitle}>Arkadaşından aldığın 6 haneli kodu gir.</Text>

      <TextField
        label="Oda Kodu"
        value={code}
        onChangeText={handleCodeChange}
        placeholder="ABC123"
        autoCapitalize="characters"
        autoCorrect={false}
        keyboardType="default"
        maxLength={6}
        error={error}
        style={styles.codeInput}
      />

      <Button label="Katıl" onPress={handleJoin} loading={loading} />
      <Button label="Geri" variant="secondary" onPress={() => router.back()} />
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
  codeInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
  },
});
