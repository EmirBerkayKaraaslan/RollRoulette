import * as Clipboard from 'expo-clipboard';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

interface RoomCodeDisplayProps {
  code: string;
}

export function RoomCodeDisplay({ code }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Oda Kodu</Text>
      <Text style={styles.code}>{code}</Text>
      <Pressable style={styles.copyBtn} onPress={handleCopy}>
        <Text style={styles.copyLabel}>{copied ? 'Kopyalandı!' : 'Kopyala'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  code: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 8,
    color: '#007AFF',
  },
  copyBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5F0FF',
  },
  copyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});
