import { httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { functions } from '@/src/services/firebase/config';

type ReportReason = 'inappropriate' | 'spam' | 'other';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  roomCode: string;
  photoUrl: string;
  photoOwnerId: string;
}

const REASONS: { key: ReportReason; label: string }[] = [
  { key: 'inappropriate', label: 'Uygunsuz içerik' },
  { key: 'spam', label: 'Spam' },
  { key: 'other', label: 'Diğer' },
];

export function ReportModal({ visible, onClose, roomCode, photoUrl, photoOwnerId }: ReportModalProps) {
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!selected || loading) return;
    setLoading(true);
    try {
      await httpsCallable(functions, 'reportContent')({
        code: roomCode,
        photoUrl,
        photoOwnerId,
        reason: selected,
      });
      setSelected(null);
      onClose();
      Alert.alert('Raporlandı', 'Raporun alındı. 24 saat içinde incelenecek.');
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Rapor gönderilemedi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Fotoğrafı Raporla</Text>
        <Text style={styles.subtitle}>Neden uygunsuz buldunuz?</Text>

        {REASONS.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.option, selected === r.key && styles.optionSelected]}
            onPress={() => setSelected(r.key)}
          >
            <Text style={[styles.optionText, selected === r.key && styles.optionTextSelected]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.submitBtn, (!selected || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selected || loading}
        >
          <Text style={styles.submitText}>{loading ? 'Gönderiliyor...' : 'Raporla'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>İptal</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  option: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionSelected: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  optionText: {
    fontSize: 15,
    color: '#3C3C43',
  },
  optionTextSelected: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 15,
    color: '#8E8E93',
  },
});
