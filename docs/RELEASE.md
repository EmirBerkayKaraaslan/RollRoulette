# RollRoulette — Release Runbook

## Ön Koşullar (Kullanıcı Sağlar)

| Gereksinim | Nereden |
|---|---|
| Apple Developer Program | developer.apple.com (~99$/yıl) |
| App Store Connect uygulaması | appstoreconnect.apple.com |
| Firebase üretim projesi | console.firebase.google.com |
| EAS hesabı | expo.dev |

### Firebase Üretim Projesi Hazırlama

1. Firebase Console → Yeni proje oluştur (veya mevcut dev projesini kullan)
2. **Blaze (pay-as-you-go) planına geç** (Cloud Functions için zorunlu)
3. Şu servisleri etkinleştir: Anonymous Auth, RTDB, Firestore, Storage, Cloud Functions
4. Project Settings → Web uygulaması → Config değerlerini kopyala
5. Bu değerleri **EAS secrets** olarak kaydet:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_DATABASE_URL --value "..."
```

### Firebase Kurallarını ve Functions'ı Deploy Et

```bash
firebase use <PROD_PROJECT_ID>
firebase deploy --only database,firestore,storage,functions
```

### `eas.json` Güncelle

`eas.json` içindeki env bloklarının **boş string** olduğuna dikkat et — EAS secrets bu değerleri
otomatik enjekte eder. `submit.production` bloğundaki yer tutucuları doldur:

```json
"appleId": "gerçek_apple_id@example.com",
"ascAppId": "App Store Connect'teki App ID (sayı)",
"appleTeamId": "10-haneli Team ID"
```

---

## Bundle Identifier

`app.json`'daki `ios.bundleIdentifier` şu an `"com.rollroulette.app"`.
App Store Connect'te bu ID'yi rezerve et. Farklı bir ID kullanmak istersen:

1. `app.json` → `ios.bundleIdentifier` güncelle
2. App Store Connect'te aynı bundle ID ile kayıt oluştur

---

## İlk Build ve TestFlight

```bash
# 1. EAS'e giriş yap
eas login

# 2. iOS production build başlat (ilk seferde Apple credentials sorar)
eas build -p ios --profile production

# 3. Build tamamlanınca App Store Connect'e yükle
eas submit -p ios --latest

# 4. App Store Connect → TestFlight → Internal Testing → build'i etkinleştir
```

EAS managed signing kullanır; Apple Distribution sertifikasını ve Provisioning Profile'ı otomatik oluşturur.

---

## Sürüm Artış Stratejisi

- `app.json` `version`: kullanıcıya görünen sürüm (örn. "1.0.0", "1.1.0")
  → **anlamlı değişiklikler ve bug fix sürümlerinde** elle artır
- `app.json` `ios.buildNumber` & `eas.json` `autoIncrement: true`:
  → EAS her build'de otomatik artırır; elle dokunma

---

## Tekrar Sürüm Çıkarma (Sonraki Sürümler)

```bash
# 1. app.json version'ı artır (örn. "1.0.0" → "1.1.0")
# 2. Production build al
eas build -p ios --profile production
# 3. Submit et
eas submit -p ios --latest
# 4. App Store Connect → yeni versiyonu hazırla ve gönder
```

---

## TestFlight Regresyon Kontrol Listesi

TestFlight build alındıktan sonra **gerçek cihazda** şunları doğrula:

### Faz 1–2 Smoke
- [ ] İlk açılışta EULA modalı görünüyor
- [ ] Profil kurulumu tamamlanıyor (nickname + avatar)
- [ ] Oda kur → lobi görünüyor, kod paylaşılabilir
- [ ] Koda katıl → 2. cihazdan giriş
- [ ] Chat çalışıyor
- [ ] Blind mod: foto seç → oyun başlat → tüm turlar → leaderboard → sonuç

### Faz 3 Smoke
- [ ] Curated mod: foto seç → kuratör oylama → onaylanan fotolar turda

### Faz 4 Dayanıklılık
- [ ] Host bağlantıyı keser → host migrasyonu → oyun devam eder
- [ ] AFK oyuncu → spectator olur → oyun devam eder
- [ ] Oyun ortasında yeni oyuncu katılır → spectator
- [ ] Reconnect: bağlantı tekrar açılır → oyuna devam

### Faz 5 UGC & Cila
- [ ] Production Firebase'e bağlanıyor (emülatör değil — Firestore/RTDB adreslerini logda doğrula)
- [ ] İzin metni: galeri izni isteniyor, kamera izni istenmiyor
- [ ] İkon ve splash ekranı görünüyor
- [ ] Offline banner: uçak modu → kırmızı bant görünüyor
- [ ] Lobby → host kick → hedef oyuncu ana ekrana dönüyor
- [ ] Game → report → modal açılıyor → sebep seçilip gönderiliyor
- [ ] Ayarlar → Hesabı Sil → onay → profil sıfırlanıyor → EULA ekranı tekrar gösteriliyor

---

## Firebase Rapor İzleme

Raporlanan içerikler Firestore `/reports` koleksiyonunda:

```
Firebase Console → Firestore → reports
```

Her belge:
- `reporterUid`, `roomCode`, `photoUrl`, `photoOwnerId`
- `reason` (inappropriate | spam | other)
- `status` (pending → reviewed/removed)
- `ts` (zaman damgası)

24 saat SLA: raporu `status: "reviewed"` olarak işaretle veya gerekli aksiyonu al.

---

## App Store Connect Submission Adımları

1. TestFlight testleri tamamlandı
2. App Store Connect → Uygulamam → Yeni Sürüm (+)
3. Ekran görüntüleri yükle (en az iPhone 6.5" ve 5.5")
4. Açıklama, anahtar kelimeler, kategori, yaş derecesi doldur
   → bkz. `docs/STORE-MATERIALS.md`
5. App Privacy → veri türleri beyan et
   → bkz. `docs/STORE-MATERIALS.md` § Privacy Nutrition Label
6. "İncelemeye Gönder"

---

## Sık Sorulan Sorunlar

| Sorun | Çözüm |
|---|---|
| Build'de emülatör'e bağlanıyor | `__DEV__` production'da `false` olmalı — EAS production profiliyle build alındığını doğrula |
| Functions deploy başarısız | Blaze planına geçildiğinden emin ol |
| Galeri izni reddedildi | `app.json` plugin config'indeki usage string'leri kontrol et |
| Apple signing hatası | `eas credentials -p ios` ile credentials'ı yenile |
