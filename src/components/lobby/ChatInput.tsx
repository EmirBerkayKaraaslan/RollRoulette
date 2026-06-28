import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState('');

  function handleSend() {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Mesaj yaz..."
        placeholderTextColor="#8E8E93"
        returnKeyType="send"
        onSubmitEditing={handleSend}
        maxLength={200}
        blurOnSubmit={false}
      />
      <Pressable
        style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!text.trim()}
      >
        <Text style={styles.sendLabel}>Gönder</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C7C7CC',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#000',
    backgroundColor: '#F2F2F7',
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#007AFF',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
