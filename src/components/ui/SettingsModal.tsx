import { httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { functions } from '@/src/services/firebase/config';
import { useProfileStore } from '@/src/store/profileStore';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const reset = useProfileStore((s) => s.reset);
  const [deleting, setDeleting] = useState(false);

  function handleSupport() {
    Linking.openURL('mailto:support@rollroulette.app?subject=RollRoulette Destek');
  }

  function handlePrivacy() {
    Linking.openURL('https://rollroulette.app/privacy');
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Hesabı Sil',
      'Tüm verilerini (profil, avatarın) kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ],
    );
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await httpsCallable(functions, 'deleteAccount')({});
      // Yerel verileri temizle
      reset();
      await AsyncStorage.multiRemove(['rr-profile', 'rr-eula-v1']);
      onClose();
      // Root layout auth hook yeni anonim kullanıcı oluşturup setup'a yönlendirir
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Hesap silinemedi. Tekrar dene.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Ayarlar</Text>

          <TouchableOpacity style={styles.row} onPress={handleSupport}>
            <Text style={styles.rowLabel}>Destek & Şikâyet</Text>
            <Text style={styles.rowHint}>support@rollroulette.app</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handlePrivacy}>
            <Text style={styles.rowLabel}>Gizlilik Politikası</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} disabled={deleting}>
            <Text style={[styles.rowLabel, styles.danger]}>
              {deleting ? 'Siliniyor...' : 'Hesabı ve Verileri Sil'}
            </Text>
            <Text style={styles.rowHint}>Geri alınamaz</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 44,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
    gap: 2,
  },
  rowLabel: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  rowHint: {
    fontSize: 12,
    color: '#8E8E93',
  },
  danger: {
    color: '#FF3B30',
  },
  divider: {
    height: 16,
  },
  closeBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
});
