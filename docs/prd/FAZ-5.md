# FAZ 5 PRD — Cilalama + App Store Deploy (iOS)

> **Rol:** İşçi ajan bu kapsamı uygular, dışına çıkmaz. Faz 1–4 fonksiyonel olarak HAZIR ve
> **regresyona uğramamalı**. Anlaşılmayan/hesap-gerektiren nokta olursa kod yazmadan önce sorulur.
> **Önceki fazlar:** `docs/prd/FAZ-1..4.md` + inceleme dokümanları.
> **Hedef:** iOS App Store. Android opsiyonel (bu faz kapsamı dışı; config Android'i kırmamalı).

---

## 0. Amaç

Oyunu **yayına hazır** hale getirmek: üretim Firebase'e geçiş, app kimliği/ikon/splash/izinler,
UX cilası, **App Store UGC uyumu** (fotoğraf paylaşımı zorunlulukları), EAS build + TestFlight +
App Store submit. Yeni oyun özelliği YOK — yalnız cila + dağıtım + uyumluluk.

---

## 1. Ön Koşullar (KULLANICI sağlar — İşçi oluşturamaz)

1. **Apple Developer Program** üyeliği (99$/yıl) + App Store Connect erişimi.
2. **App Store Connect**'te uygulama kaydı (bundle id rezerve).
3. **Firebase ÜRETİM projesi** (emülatör değil): Auth(Anonymous), RTDB, Firestore, Storage,
   Functions etkin; ödeme planı (Functions için Blaze).
4. **EAS (Expo Application Services)** hesabı + `eas-cli` (kullanıcı `eas login`).
5. Üretim Firebase web config değerleri (Faz 1 `.env` anahtarları, **prod** değerleriyle).

> İşçi: hesap/proje açamaz. Bu adımlar için kullanıcıya net talimat verir; config/asset/kod hazırlar.

---

## 2. App Kimliği & Sürümleme (`app.json` / `app.config`)

- `name`: "RollRoulette", `slug`: "rollroulette", `scheme`: "rollroulette".
- `ios.bundleIdentifier`: örn. `com.<kullanıcı>.rollroulette` (kullanıcı onaylar).
- `version` (örn. "1.0.0"), `ios.buildNumber` ("1"); sürüm artışı stratejisi notu.
- `orientation: "portrait"`, `userInterfaceStyle`, `ios.supportsTablet: false` (telefon hedef).
- `newArchEnabled` korunur (Reanimated 4 için). `runtimeVersion`/updates politikası (EAS Update
  bu fazda zorunlu değil; OTA isteğe bağlı, kapsam dışı bırakılabilir).

---

## 3. İkon & Splash

- App ikonu (`assets/icon.png` 1024×1024, alfa-sız), `ios` ikon; adaptive icon Android için (opsiyonel).
- Splash: `expo-splash-screen` config (marka rengi + logo), Faz 1'deki `SplashScreen.preventAutoHide`/
  `hideAsync` akışıyla uyumlu.
- Marka paleti tek yerde (mevcut `#007AFF` vurgu); tutarlı kullanım.

> Asset üretimi: İşçi yer tutucu/temel marka asset'leri hazırlar; nihai görseller kullanıcı onayına.

---

## 4. İzin Metinleri (App Store reddini önler)

- **`NSPhotoLibraryUsageDescription`** (foto seçimi): açık, Türkçe+İngilizce gerekçe
  (örn. "Oyun havuzuna fotoğraf eklemek için galerine erişiyoruz.").
- `expo-image-picker` / `expo-media-library` plugin config'inde usage string'ler.
- Yalnız **gerçekten kullanılan** izinler istenir (gereksiz izin = ret). Kamera kullanılmıyorsa
  kamera izni istenmez.

---

## 5. Üretim Firebase'e Geçiş (emülatörden çıkış)

- `config.ts`: emülatör wiring zaten `__DEV__` korumalı → **production build'de otomatik prod**.
  Doğrula: release build'de `connect*Emulator` ÇAĞRILMIYOR.
- **Env yönetimi:** prod Firebase değerleri **EAS** üzerinden (EAS env vars / secrets) build'e
  enjekte edilir; `.env` repoya girmez (Faz 1 kuralı korunur). `app.config` env okuma yolu netleştirilir.
- **Kuralları & fonksiyonları deploy et:** `firebase deploy --only
  database,firestore,storage,functions` (prod proje). Functions Node 20 runtime.
- **Güvenlik kuralları gözden geçirme:** Faz 1–4 kuralları prod'da aktif; test/emülatör gevşekliği yok.
- Üretimde **anonim auth kalıcılığı** (Faz 1 AsyncStorage persistence) çalıştığını doğrula.

---

## 6. EAS Build Config (`eas.json`)

- Profiller: `development` (dev client), `preview` (internal/TestFlight), `production` (store).
- `production`: `ios` `autoIncrement` build number; release; prod env.
- iOS credentials: EAS managed signing (kullanıcı Apple hesabıyla); `eas build -p ios --profile production`.
- `eas submit -p ios` ile App Store Connect yüklemesi (App Store Connect API key / Apple ID).

---

## 7. UX Cilası (regresyon olmadan)

- **Yükleniyor durumları:** auth/rehydrate, oda kurma/katılma, foto upload (ilerleme), tur yükleniyor —
  tutarlı spinner/iskelet.
- **Boş durumlar:** boş chat, henüz oyuncu yok, foto seçilmedi — anlamlı boş-durum metinleri.
- **Hata & kurtarma:** ağ hatası, CF hatası, foto upload başarısızlığı → **anlaşılır mesaj + tekrar dene**.
  `Alert` yerine tutarlı hata bileşeni (toast/inline) tercih edilir; tek desen.
- **Bağlantı durumu göstergesi:** `/.info/connected` false iken küçük "çevrimdışı" bandı (Faz 4 presence ile).
- **Buton durumları:** çift-tıklama koruması, disabled/loading tutarlılığı (mevcut `Button` üzerinden).
- **Klavye/safe-area:** tüm ekranlarda `Screen` ile tutarlı (Faz 1 bileşeni).
- **Haptik/ses:** opsiyonel, hafif (tahmin/doğru-yanlış); zorunlu değil.
- Animasyonlar (Faz 3) prod'da akıcı; düşük cihazda kilitlenme yok (smoke).

---

## 8. App Store UGC Uyumu (ZORUNLU — fotoğraf paylaşımı gerektirir)

> RollRoulette kullanıcı fotoğraflarını ortak havuzda paylaşır → **UGC**. Apple Guideline 1.2
> bu mekanizmaları **şart koşar**; eksikse **ret**. Bu bölüm submission kapısıdır.

1. **EULA / Kullanım Koşulları:** ilk açılışta (profil kurulumda) "uygunsuz içerik yasak"
   sözleşmesi onayı; kabul AsyncStorage'da saklanır. Apple standart EULA veya özel ToS linki.
2. **İçerik bildirme (report):** oyun/curation/reveal ekranlarında bir fotoğrafı **bildir**
   aksiyonu → `reportContent` CF → `/reports/{pushId}` (raporlayan, oda, fotoğraf ref, sebep, ts).
   Raporlayan için fotoğraf **anında gizlenir**.
3. **Kullanıcı engelleme / çıkarma:** host bir oyuncuyu **odadan atabilir** (`kickPlayer` CF →
   `isSpectator`/remove); herkes odadan ayrılabilir. (Kalıcı global block ephemeral oda modelinde
   gerekmez; host moderasyonu + report yeterli — gerekçe submission notuna yazılır.)
4. **Moderasyon iletişimi:** destek/şikâyet e-postası (App Store Connect + uygulama içi "Hakkında").
5. **24 saat içinde aksiyon taahhüdü:** raporlanan içerik için süreç (manuel; `/reports` izlenir).

> Yeni CF'ler: `reportContent`, `kickPlayer`. Güvenlik: report yazımı yalnız kendi adına; kick
> yalnız host. `/reports` istemciye okuma kapalı (yalnız sahibi/CF).

### 8.1 Hesap/Veri Silme (Apple gerekliliği)
- Profil/veri **sıfırlama-silme** seçeneği (ayarlar): Firestore `/users/{uid}` + avatar Storage
  + yerel profil temizlenir. Anonim auth için "verimi sil" akışı (App Store account-deletion kuralı).

---

## 9. Gizlilik & Uyumluluk

- **App Privacy ("nutrition label"):** toplanan veri beyanı — anonim kullanıcı id, takma ad,
  yüklenen fotoğraflar (oyun içi paylaşılır), kullanım. App Store Connect'te doldurulur (kullanıcı),
  İşçi içerik taslağını hazırlar.
- **`PrivacyInfo.xcprivacy` (Privacy Manifest):** kullanılan API'ler (AsyncStorage/file timestamp
  vb.) için "required reason" beyanları; Expo/RN için gerekli manifest.
- **Gizlilik Politikası URL'i** (zorunlu): kullanıcı barındırır; İşçi taslak metin hazırlar.
- KVKK/GDPR notu: veri minimizasyonu, silme hakkı (§8.1 ile karşılanır).

---

## 10. Mağaza Materyalleri (İşçi taslak, kullanıcı doldurur)

- Ekran görüntüleri (gerekli iPhone boyutları), uygulama açıklaması, anahtar kelimeler, kategori
  (Games), yaş derecesi (UGC nedeniyle muhtemelen 12+/17+ — anketle belirlenir), promosyon metni.
- App Store Connect meta alanları taslağı.

---

## 11. Test Kapanışı (önceki fazların runtime borçları dahil)

- **TestFlight** ile gerçek cihazda tam regresyon:
  - Faz 2/3 smoke: blind + curated tam tur (foto upload, turlar, puanlama, reveal, leaderboard).
  - Faz 4 dayanıklılık: kopma & kapı, **host migrasyonu**, reconnect, spectator, zombi kurtarma.
  - Faz 5: izinler, ikon/splash, UGC report/kick, veri silme, çevrimdışı bandı.
- **Üretim Firebase**'e karşı (emülatör değil) en az bir tam oyun.
- Performans: soğuk açılış süresi, foto upload (<200KB doğrula), animasyon akıcılığı.

---

## 12. Build & Submit Akışı (belgelenir)

1. `eas build -p ios --profile production` (prod env + auto build number).
2. `eas submit -p ios` → App Store Connect.
3. TestFlight internal test → onay → App Store inceleme gönderimi.
4. README/`docs/`'a **release runbook** (sürüm artışı, build, submit adımları).

---

## 13. Kabul Kriterleri (Definition of Done)

1. **Üretim Firebase:** release build emülatöre BAĞLANMAZ; prod proje + deploy edilmiş
   rules/functions ile tam oyun çalışır.
2. **Kimlik/asset:** bundle id, sürüm, ikon, splash, izin metinleri yerinde; eksik-izin/asset
   reddi riski yok.
3. **UGC uyumu:** EULA onayı, içerik bildirme (report), host kick, veri silme, moderasyon iletişimi
   **mevcut ve çalışıyor**.
4. **Gizlilik:** App Privacy taslağı + Privacy Manifest + gizlilik politikası taslağı hazır.
5. **UX cilası:** yükleme/boş/hata durumları tutarlı; çevrimdışı bandı; çift-tıklama koruması.
6. **Regresyon yok:** Faz 1–4 işlevleri TestFlight'ta gerçek cihazda doğrulandı (blind+curated+
   dayanıklılık).
7. **Build:** `eas build -p ios --profile production` başarılı; TestFlight'a yüklendi.
8. **TypeScript strict** temiz: `npx tsc --noEmit` (app) **ve** `functions` build exit 0.
9. **Release runbook** belgelendi.

---

## 14. Kapsam Dışı (Faz 5'te YAPILMAYACAK)

- **Android / Google Play** yayını (config Android'i kırmasın ama Play submit bu faz değil).
- EAS Update / OTA güncelleme pipeline (opsiyonel, ayrı iş).
- Otomatik görüntü içerik moderasyonu (ML) — manuel report+kick yeterli; ML kapsam dışı.
- Analitik/telemetri, A/B test, kazanç (IAP/reklam).
- Yeni oyun modu/özellik.

---

## 15. İşçiye Notlar / Gotcha'lar

1. **UGC kapısı kritik:** report + kick + EULA + veri silme olmadan App Store **reddeder**. Bunları
   atlama; §8 submission ön koşuludur.
2. **İzin metni dili:** boş/eksik usage string = ret. Yalnız kullanılan izinleri iste.
3. **Emülatör sızıntısı yok:** release'de `__DEV__` false → prod Firebase. Build'de doğrula;
   yanlışlıkla emülatör host'u kalmasın.
4. **Env güvenliği:** prod Firebase değerleri EAS secret/env ile; `.env` ve anahtarlar repoya girmez.
5. **Regresyon:** cila değişiklikleri Faz 1–4 davranışını bozmamalı; özellikle presence/host
   migrasyon/puanlama akışlarına dokunma.
6. **Hesap gerektiren adımlar kullanıcının:** Apple/App Store Connect/Firebase prod/EAS hesapları.
   İşçi config+kod+taslak hazırlar, "şu adımı sen yap" diye net listeler.
7. **Yaş derecesi:** UGC → App Store anketinde dürüst doldur (muhtemelen yükselir).
8. **Soru çıkarsa kod yazmadan sor.** Kapsam dışına çıkma.

---

### Teslim Beklentisi
Kimlik/asset/izin/UGC/gizlilik/EAS config + UX cilası uygulanır; kabul kriterleri sağlanır;
`npx tsc --noEmit` (app) temiz + `functions` build exit 0; **TestFlight build** alınır;
release runbook + "kullanıcının yapması gereken hesap adımları" listesiyle Başmimar'a getirilir.
```
NOT: Bu faz "tamamlandı" sayımı, App Store onayını değil — TestFlight'a yüklenebilir, UGC/gizlilik
uyumlu, regresyonsuz bir production build'i kapsar. Mağaza onayı Apple inceleme süreci (harici).
```
