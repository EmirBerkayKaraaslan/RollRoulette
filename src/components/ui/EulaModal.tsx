import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface EulaModalProps {
  visible: boolean;
  onAccept: () => void;
}

export function EulaModal({ visible, onAccept }: EulaModalProps) {
  return (
    <Modal visible={visible} transparent={false} animationType="slide">
      <View style={styles.container}>
        <Text style={styles.title}>Kullanım Koşulları</Text>
        <Text style={styles.subtitle}>RollRoulette'e hoş geldin!</Text>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.body}>
            RollRoulette, oyuncuların kendi galeri fotoğraflarını ortak bir oyun havuzunda paylaştığı
            gerçek zamanlı bir parti oyunudur.{'\n\n'}

            <Text style={styles.bold}>Kabul ettiğin kurallar:{'\n'}</Text>

            {'• '}Yalnızca <Text style={styles.bold}>uygun içerik</Text> yükleyeceksin. Müstehcen,
            şiddet içeren, ırkçı veya hakaret edici fotoğraflar kesinlikle yasaktır.{'\n\n'}

            {'• '}Diğer oyuncuların fotoğraflarını izinsiz üçüncü taraflarla paylaşmayacaksın.{'\n\n'}

            {'• '}Platformu kötüye kullanmayacaksın; spam, taciz veya yanıltıcı içerik üretmeyeceksin.{'\n\n'}

            {'• '}Uygunsuz içerik tespit ettiğinde "Raporla" düğmesini kullanacaksın. Raporlar
            24 saat içinde incelenir ve gerekli aksiyonlar alınır.{'\n\n'}

            {'• '}İstediğin zaman hesabını ve tüm verilerini silebilirsin (Ayarlar → Hesabı Sil).{'\n\n'}

            Destek veya şikâyet için: {'support@rollroulette.app'}{'\n\n'}

            Bu uygulamayı kullanarak yukarıdaki koşulları kabul etmiş sayılırsın.
            By using this app, you agree to the above terms.
          </Text>
        </ScrollView>

        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
          <Text style={styles.acceptText}>Kabul Ediyorum</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Devam etmek için koşulları kabul etmelisiniz.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: -8,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 16,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: '#3C3C43',
  },
  bold: {
    fontWeight: '700',
    color: '#1C1C1E',
  },
  acceptBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
