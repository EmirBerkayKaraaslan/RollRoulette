# RollRoulette — App Store Materyalleri (Taslak)

> **Not:** Bu belgeler taslaktır. Kullanıcı App Store Connect'te ilgili alanları doldururken
> bu içerikleri kopyalayabilir / düzenleyebilir.

---

## Temel Bilgiler

| Alan | Değer |
|---|---|
| Uygulama Adı | RollRoulette |
| Alt Başlık | Kimin fotoğrafı? |
| Kategori | Games → Party |
| İkincil Kategori | Social Networking |
| Yaş Derecesi | 12+ (UGC — kullanıcı görselleri) |
| Fiyat | Ücretsiz |
| Gizlilik Politikası URL | https://rollroulette.app/privacy |
| Destek URL | https://rollroulette.app/support |
| Pazarlama URL | https://rollroulette.app |

---

## Uygulama Açıklaması (TR)

```
RollRoulette — arkadaşlarınla oynanan eğlenceli bir tahmin oyunu!

Nasıl oynanır?
• 3-10 kişi aynı odada toplanır.
• Herkes kendi galerisinden fotoğraf ekler.
• Fotoğraflar karıştırılır ve ekrana gelir — kim bu?
• En hızlı doğru tahmin eden en çok puan kazanır.

Özellikler
• Blind Mod: Tüm fotoğraflar direkt turda kullanılır.
• Curated Mod: Oyuncular havuzu oylar; onaylananlar turda yer alır.
• Gerçek zamanlı: Saniyeler içinde oyuna gir.
• Lobi sohbeti: Oyun öncesi arkadaşlarınla yazış.
• Anlık sıralama: Kim kazandı, görelim!

Gizliliğin korunur — fotoğrafların yalnız aynı odadaki oyunculara görünür.
```

---

## Uygulama Açıklaması (EN)

```
RollRoulette — the hilarious photo-guessing party game!

How to play:
• Gather 3–10 players in the same room.
• Everyone adds photos from their own gallery.
• Photos are shuffled and shown one by one — who is this?
• Fastest correct guess wins the most points!

Features
• Blind Mode: All photos go straight into the game.
• Curated Mode: Players vote on the pool; approved photos make it to the rounds.
• Real-time: Join a game in seconds.
• Lobby chat: Chat with friends before the game starts.
• Live leaderboard: See who's winning!

Your privacy is protected — your photos are only visible to players in your room.
```

---

## Promosyon Metni (EN — 170 karakter max)

```
The photo party game your friends will love. Add your gallery pics, guess who's who, win points!
```

---

## Anahtar Kelimeler (100 karakter max, virgülle ayrılmış)

```
party game,photo game,friends,multiplayer,guess,fun,social,party,photo quiz,eğlence
```

---

## Yaş Derecesi Anketi

App Store Connect'te "Age Rating" bölümünde bu soruları bu şekilde cevapla:

| Soru | Cevap |
|---|---|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Sexual Content or Nudity | None |
| Profanity or Crude Humor | None |
| Alcohol, Tobacco, or Drug Use | None |
| Simulated Gambling | None |
| Horror or Fear Themes | None |
| User-Generated Content (UGC) | **Yes** |
| Unrestricted Web Access | None |

→ UGC seçimi nedeniyle yaş derecesi **12+** olarak belirlenir.

---

## App Privacy — Nutrition Label

App Store Connect → App Privacy'de beyan edilecekler:

### Toplanan Veriler

| Veri Türü | Kullanım | Kullanıcıyla İlişkilendirme |
|---|---|---|
| Kullanıcı Adı (nickname) | Uygulama İşlevselliği | Evet (anonim ID ile) |
| Fotoğraflar (oyun havuzu) | Uygulama İşlevselliği | Evet (anonim ID ile) |
| Profil fotoğrafı (avatar) | Uygulama İşlevselliği | Evet (anonim ID ile) |
| Kullanıcı ID (anonim Firebase ID) | Uygulama İşlevselliği | — |
| Kullanım verisi (lastActiveAt, gamesPlayed) | Uygulama İşlevselliği | Evet |

### Toplanmayan Veriler
- Konum, sağlık, finansal bilgi, iletişim, tarama geçmişi, arama geçmişi,
  hassas bilgi, teşhis verileri **toplanmaz**.
- Üçüncü taraf reklamcılık **yoktur**.
- Veriler **satılmaz**.

---

## Ekran Görüntüsü Gereksinimleri

App Store, şu boyutlarda ekran görüntüsü ister:

| Cihaz | Boyut |
|---|---|
| iPhone 6.9" (zorunlu) | 1320 × 2868 px |
| iPhone 6.5" (zorunlu) | 1242 × 2688 px |
| iPhone 5.5" (opsiyonel) | 1242 × 2208 px |

**Önerilen akış** (5-6 ekran görüntüsü):
1. Ana ekran (RollRoulette logosu + mod seçimi)
2. Lobi ekranı (oyuncu listesi + oda kodu)
3. Fotoğraf seçimi
4. Oyun ekranı (fotoğraf + tahmin butonları + sayaç)
5. Sonuç / leaderboard

---

## Gizlilik Politikası (Taslak Metin)

> Kullanıcı bu metni bir URL'de barındırmalıdır (örn. GitHub Pages, Notion, kişisel site).
> App Store'a URL girilmesi **zorunludur**.

---

**RollRoulette Gizlilik Politikası**

Son güncelleme: 2026-06-28

**Topladığımız Veriler**

RollRoulette şu verileri toplar ve işler:
- **Takma ad ve avatar:** Profilinizde görüntülenmek üzere siz oluşturursunuz.
- **Oyun fotoğrafları:** Bir oyun sırasında aynı odadaki oyuncularla paylaşılır;
  oyun sona erince erişim pratik olarak sınırlanır.
- **Anonim kullanıcı kimliği:** Firebase Anonymous Auth tarafından otomatik oluşturulur;
  kişisel bilgi içermez.
- **Kullanım verisi:** Oynanan oyun sayısı ve son aktif tarih.

**Üçüncü Taraf Hizmetler**

Firebase (Google) altyapısını kullanıyoruz: Authentication, Realtime Database, Firestore,
Storage, Cloud Functions. Firebase Gizlilik Politikası: https://firebase.google.com/support/privacy

**Veri Silme**

Uygulamada Ayarlar → Hesabı Sil seçeneğiyle tüm verilerinizi kalıcı olarak silebilirsiniz.

**UGC Moderasyon**

Uygunsuz içerik bildirimi için oyun ekranındaki ⚠ butonunu kullanın. Raporlar 24 saat içinde
incelenir. Destek: support@rollroulette.app

**İletişim**

support@rollroulette.app

---

## Hesap Silme (App Store Connect Requirement)

App Store, UGC içeren uygulamalarda **hesap silme** seçeneği zorunlu kılar.

RollRoulette'te bu: **Ayarlar → Hesabı ve Verileri Sil** (uygulama içi)

App Review notuna ekle:
> "Users can delete their account and all associated data from Settings → Delete Account.
>  This permanently removes their Firebase Auth account, Firestore profile, and Storage avatar."
