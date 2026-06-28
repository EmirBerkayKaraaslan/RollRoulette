# FAZ 1 PRD — Auth, Profil, Lobi, Chat

> **Rol:** Bu PRD İşçi (Worker) ajana verilir. İşçi yalnızca bu kapsamı uygular,
> kapsam dışına çıkmaz. Anlaşılmayan nokta olursa kod yazmadan önce sorulur.
> **Onaylı yığın:** Expo SDK 56 (RN New Arch), TypeScript strict, Expo Router v3,
> Zustand 5, Reanimated 4, Firebase 12 (Anonymous Auth + RTDB + Firestore + Storage),
> Cloud Functions (Node 20).

---

## 0. Amaç

Oyuncunun uygulamayı açıp **anonim giriş** yaptığı, **profil** (takma ad + avatar)
oluşturup cihazda kalıcı sakladığı, **oda kurabildiği / koda göre katılabildiği**,
**lobide** diğer oyuncuları gerçek zamanlı görüp **hazır** olabildiği ve **sohbet**
edebildiği temel iskeleti kurmak. Oyun mekaniği YOK (Faz 2).

**Faz 1 sonunda çalışan akış:**
`Açılış → (profil yoksa) Profil Kur → Ana Ekran → Oda Kur / Koda Katıl → Lobi (oyuncu listesi + hazır + chat)`

---

## 1. Ön Koşullar (Kullanıcı tarafından sağlanır)

İşçi bunları **oluşturamaz**; kullanıcıdan ister:

1. Firebase projesi (Auth → Anonymous **etkin**, Realtime Database **oluşturulmuş**,
   Firestore **oluşturulmuş**, Storage **oluşturulmuş**).
2. Web app config değerleri.
3. RTDB bölge URL'i (örn. `https://<proj>-default-rtdb.<region>.firebasedatabase.app`).

Bu değerler **`.env`** dosyasına `EXPO_PUBLIC_` öneki ile yazılır (Expo public env):

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
```

İşçi: `.env.example` dosyasını yukarıdaki anahtarlarla (değersiz) commit eder,
`.env`'i `.gitignore`'a ekler.

---

## 2. Eklenecek Bağımlılıklar

```
npx expo install @react-native-async-storage/async-storage
```

> Gerekçe: (a) profil kalıcılığı (Zustand persist), (b) **Firebase Auth kalıcılığı**
> RN'de `initializeAuth` + `getReactNativePersistence(AsyncStorage)` ister. Aksi halde
> her açılışta yeni anonim uid üretilir — kabul edilemez.

Cloud Functions tarafı (ayrı `functions/` workspace): `firebase-admin`, `firebase-functions` (v2).

---

## 3. Hedef Klasör Yapısı & Scaffold Temizliği

### 3.1 Silinecek (scaffold örneği)
- `app/(tabs)/` altındaki örnek sekmeler ve örnek ekranlar
- `components/` içindeki örnek demo bileşenler (ihtiyaç olmayanlar)
- Kullanılmayan örnek `constants` / örnek asset'ler

> Not: Reanimated/Expo Router çalışır kalsın; sadece **örnek içerik** temizlenir.

### 3.2 Faz 1'de oluşturulacak ağaç (yalnız bu faz dilimi)

```
app/
├── _layout.tsx                 # Root: auth init, profil yükleme, yönlendirme
├── index.tsx                   # Karar ekranı: profil var mı? setup/home'a yönlendir
├── (setup)/index.tsx           # Profil kur (takma ad + avatar)
├── (home)/index.tsx            # Ana ekran: Oda Kur / Koda Katıl + profil
├── (home)/join.tsx             # Oda kodu gir
└── room/[code]/
    ├── _layout.tsx             # Odaya abone ol; üye değilse çık
    └── lobby.tsx               # Oyuncu listesi + hazır + chat
src/
├── components/
│   ├── ui/                     # Button, Avatar, TextField, Screen
│   └── lobby/                  # PlayerCard, RoomCodeDisplay, ChatBubble, ChatInput
├── hooks/
│   ├── useAuth.ts
│   ├── useRoom.ts
│   ├── usePlayers.ts
│   ├── useChat.ts
│   └── usePresence.ts          # Faz 1'de SADECE temel: onDisconnect + lastSeen
├── services/
│   ├── firebase/
│   │   ├── config.ts
│   │   ├── auth.ts
│   │   ├── rtdb.ts
│   │   ├── firestore.ts
│   │   └── storage.ts
│   └── photo/
│       ├── picker.ts
│       ├── compressor.ts
│       └── uploader.ts
├── store/
│   ├── profileStore.ts
│   └── roomStore.ts
└── types/
    ├── room.ts
    ├── player.ts
    └── firebase.ts
functions/
├── src/
│   ├── index.ts
│   └── room/
│       ├── createRoom.ts
│       ├── joinRoom.ts
│       └── cleanupExpiredRooms.ts
├── package.json
└── tsconfig.json
firebase.json
firestore.rules
storage.rules
database.rules.json
```

> `game.ts`, `photo-select.tsx`, `game.tsx`, `results.tsx`, oyun hook/store/CF'leri
> **Faz 2+**. Faz 1'de oluşturulmaz (boş stub bile gerekmez).

### 3.3 tsconfig path alias
`@/*` → proje köküne map'lensin (scaffold zaten `@/*` verir; `src/` erişimi için
`@/src/*` veya doğrudan `@/*` ile `src` dahil edilecek şekilde ayarlanır). İşçi
tek bir tutarlı alias şeması seçip her yerde kullanır.

---

## 4. Tip Tanımları (`src/types`)

İşçi aşağıdaki **sözleşmeleri** birebir uygular (alan adları RTDB modeliyle aynı):

### `room.ts`
- `RoomStatus = 'lobby' | 'photo_select' | 'playing' | 'ended'`
- `GameMode = 'blind' | 'curated'`
- `RoomMeta`: `hostId: string`, `status: RoomStatus`, `mode: GameMode`,
  `totalRounds: number`, `currentRound: number`, `createdAt: number`, `expiresAt: number`
- `Room`: `code: string`, `meta: RoomMeta`, `players: Record<string, Player>`

### `player.ts`
- `Player`: `uid: string`, `nickname: string`, `photoUrl: string | null`,
  `isHost: boolean`, `isReady: boolean`, `isConnected: boolean`, `isSpectator: boolean`,
  `lastSeen: number`, `totalScore: number`, `joinedAt: number`

### `firebase.ts`
- `ChatMessage`: `uid: string`, `nickname: string`, `text: string`, `ts: number`
- `UserProfile` (Firestore `/users/{uid}`): `nickname: string`, `photoUrl: string | null`,
  `createdAt: number`, `lastActiveAt: number`, `gamesPlayed: number`

---

## 5. Firebase Servis Katmanı (`src/services/firebase`)

### `config.ts`
- `initializeApp` ile tekil app (HMR'de çift init koruması).
- **Auth:** `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`.
  (Web fallback gerekmez; hedef RN.)
- `getDatabase(app, DATABASE_URL)`, `getFirestore(app)`, `getStorage(app)` export edilir.
- Tüm değerler `.env`'den (`process.env.EXPO_PUBLIC_*`). Değer eksikse açılışta
  anlaşılır bir hata fırlat.

### `auth.ts`
- `ensureSignedIn(): Promise<string>` — oturum yoksa `signInAnonymously`, var olan/yeni
  uid döner.
- `subscribeAuth(cb: (uid: string | null) => void): Unsubscribe`.

### `rtdb.ts`
- Yol kurucu yardımcılar (tek kaynak): `roomRef(code)`, `metaRef(code)`,
  `playersRef(code)`, `playerRef(code, uid)`, `chatRef(code)`.
- Genel yardımcılar: `onValue`/`onChildAdded` sarmalayıcıları (tipli), `serverTimestamp` re-export.

### `firestore.ts`
- `upsertUserProfile(uid, data: Partial<UserProfile>): Promise<void>`.
- `touchLastActive(uid): Promise<void>`.

### `storage.ts`
- `uploadAvatar(uid, localUri): Promise<string>` — `avatars/{uid}.jpg` yoluna yükler,
  download URL döner.

---

## 6. Photo Servisi — Avatar (`src/services/photo`)

> Faz 1'de **yalnız avatar** (profil fotoğrafı). Oyun foto havuzu Faz 2.

### `picker.ts`
- `pickAvatar(): Promise<string | null>` — `expo-image-picker` ile tek görsel, kare kırpma
  (`allowsEditing`, `aspect:[1,1]`). İzin reddinde `null` + çağırana bilgi.

### `compressor.ts`
- `compressImage(uri, opts): Promise<string>` — `expo-image-manipulator`, hedef **<200KB**,
  uzun kenar ~512px (avatar için), JPEG kalite ayarlı. Boyut hedefi tutmuyorsa kaliteyi
  kademeli düşür.

### `uploader.ts`
- `processAndUploadAvatar(uid, localUri): Promise<string>` — pick sonrası compress→upload
  zinciri; download URL döner.

---

## 7. Zustand Store'lar (`src/store`)

### `profileStore.ts` (persist: AsyncStorage)
- State: `uid: string | null`, `nickname: string`, `photoUrl: string | null`,
  `hydrated: boolean`.
- Eylemler: `setProfile({nickname, photoUrl})`, `setUid(uid)`, `reset()`.
- `persist` middleware ile **nickname + photoUrl** kalıcı (uid auth'tan gelir, ayrıca
  saklanabilir). `hydrated` rehydrate tamamlanınca `true`.
- **Kritik kural #5:** uygulama kapanıp açılınca nickname + foto hatırlanır.

### `roomStore.ts` (persist YOK)
- State: `code: string | null`, `meta: RoomMeta | null`,
  `players: Record<string, Player>`, `myRole: 'host' | 'guest' | null`.
- Eylemler: `setRoom`, `setMeta`, `setPlayers`, `leave()`.
- Türetilmiş seçiciler: `selectPlayerList` (joinedAt'e göre sıralı), `selectIsHost`.

---

## 8. Hook'lar (`src/hooks`)

- **`useAuth`** — açılışta `ensureSignedIn`, uid'i `profileStore`'a yazar, auth durumunu döner.
- **`useRoom(code)`** — `/rooms/{code}/meta`'ya abone, `roomStore.setMeta`. Oda yoksa/expired
  ise `null` döndürür ve çağırana bildirir.
- **`usePlayers(code)`** — `/rooms/{code}/players`'a abone, `roomStore.setPlayers`.
- **`useChat(code)`** — `/rooms/{code}/chat` son N (örn. 50) mesaja abone (`limitToLast`),
  `sendMessage(text)` (boş/aşırı uzun filtreli, `ts: serverTimestamp`).
- **`usePresence(code, uid)`** — **temel sürüm:** bağlanınca `isConnected:true` +
  `onDisconnect().update({isConnected:false, lastSeen: serverTimestamp})`; periyodik
  `lastSeen` güncelleme. **AFK / host migrasyonu / reconnect kurtarma Faz 4.**

---

## 9. Ekranlar & Navigasyon (`app/`)

### `_layout.tsx` (root)
- `useAuth` + profil rehydrate beklenir; hazır olana kadar splash/spinner.
- Stack navigator; başlıklar gizli/native.

### `index.tsx`
- `hydrated` sonrası: `nickname` boşsa `(setup)`'a, doluysa `(home)`'a `redirect`.

### `(setup)/index.tsx` — Profil Kur
- Avatar seç (photo servis), takma ad gir (2–16 karakter, trim, boş olamaz).
- "Kaydet": `profileStore.setProfile` + Firestore `upsertUserProfile` + (foto seçildiyse)
  `processAndUploadAvatar`. Sonra `(home)`'a.

### `(home)/index.tsx` — Ana Ekran
- Profil özeti (avatar + nickname, "Düzenle" → setup).
- **Oda Kur**: `createRoom` CF çağrısı → dönen `code` ile `room/{code}/lobby`'ye git.
- **Koda Katıl**: `(home)/join`'e git.

### `(home)/join.tsx`
- 6 haneli kod girişi (Base36, büyük harfe normalize). `joinRoom` CF → başarıda
  `room/{code}/lobby`; hata (yok/expired/dolu/oyun başlamış) kullanıcıya gösterilir.

### `room/[code]/_layout.tsx`
- `useRoom(code)` + `usePlayers(code)` + `usePresence(code, uid)`.
- Oda geçersizse veya oyuncu üyesi değilse `(home)`'a geri.

### `room/[code]/lobby.tsx`
- `RoomCodeDisplay` (kopyala/paylaş), oyuncu listesi (`PlayerCard` × joinedAt sıralı),
  **Hazır** toggle (`players/{uid}/isReady` yaz), host göstergesi.
- Chat paneli (`ChatBubble` listesi + `ChatInput`).
- "Oyunu Başlat" butonu **yalnız host'ta görünür** ama Faz 1'de **disabled/placeholder**
  (gerçek başlatma Faz 2). En az 3 oyuncu kuralını UI'da göster, işlevi Faz 2'ye bırak.

---

## 10. UI Bileşenleri (`src/components`)

### `ui/`
- `Button` (primary/secondary/disabled, loading state)
- `Avatar` (url/initials fallback, boyut prop)
- `TextField` (label, hata, maxLength)
- `Screen` (SafeArea + tutarlı padding + KeyboardAvoiding)

### `lobby/`
- `PlayerCard` (avatar, nickname, host rozeti, hazır tik, bağlantı noktası)
- `RoomCodeDisplay` (büyük kod + kopyala)
- `ChatBubble` (kendi/başkası hizalama, nickname, metin, zaman)
- `ChatInput` (metin + gönder; gönderince temizle)

---

## 11. Cloud Functions (`functions/src`)

> v2 `onCall` (auth context'ten uid). İstemci `httpsCallable` ile çağırır.

### `room/createRoom.ts` — `createRoom`
- Girdi: `{ mode?: 'blind' }` (Faz 1 yalnız `blind`).
- **6 haneli Base36** kod üret; `/rooms/{code}/meta` üzerinde **transaction** ile benzersizlik
  (çakışırsa yeniden üret, max N deneme).
- Yazar: `meta { hostId=uid, status:'lobby', mode:'blind', totalRounds:0, currentRound:0,
  createdAt: now, expiresAt: now + TTL }` ve `players/{uid}` (isHost:true, joinedAt: now,
  nickname/photoUrl çağrıdan veya Firestore profilinden).
- Döner: `{ code }`.

### `room/joinRoom.ts` — `joinRoom`
- Girdi: `{ code, nickname, photoUrl }`.
- Doğrula: oda var, `status==='lobby'`, expired değil, oyuncu kapasitesi <10.
- `players/{uid}` ekle (isHost:false, isReady:false, joinedAt: now). Zaten üye ise idempotent.
- Hata kodları: `not-found`, `failed-precondition` (oyun başlamış/expired), `resource-exhausted` (dolu).

### `room/cleanupExpiredRooms.ts` — `cleanupExpiredRooms`
- **Scheduled** (örn. her 30 dk). `expiresAt < now` odaları siler.

### `index.ts`
- Üç fonksiyonu export eder.

> `startGame/startRound/submitGuess/revealRound/migrateHost` **Faz 2/4** — burada YOK.

---

## 12. Güvenlik Kuralları

### `database.rules.json` (RTDB) — Faz 1 kapsamı
- `/rooms/{code}/meta`: oda üyesi **okur**; **yazma yalnız Cloud Functions** (admin) —
  istemciden meta yazımı kapalı.
- `/rooms/{code}/players/{uid}`: ilgili oyuncu **yalnız kendi** kaydında `isReady`,
  `isConnected`, `lastSeen` günceller; `isHost/joinedAt/totalScore` istemciden yazılamaz.
- `/rooms/{code}/chat`: üye **okur**; üye kendi `uid`'iyle mesaj **ekler** (uid eşleşmesi,
  metin uzunluk sınırı, `ts` server-side).
- `/rooms/{code}/game/.../guesses/{uid}`: **`!data.exists()`** (bir kez yazılır) — kural
  iskeleti şimdi konur, kullanımı Faz 2.

### `firestore.rules`
- `/users/{uid}`: yalnız sahibi okur/yazar (`request.auth.uid == uid`).

### `storage.rules`
- `avatars/{uid}.jpg`: yalnız sahibi yazar; okuma herkese açık (avatarlar paylaşılır) veya
  auth'lu okuma — İşçi auth'lu okuma + sahibi yazma uygular.

### `firebase.json`
- `database`, `firestore`, `storage`, `functions` kuralları ve emülatör portları bağlanır.

---

## 13. Kabul Kriterleri (Definition of Done)

1. **Soğuk açılış:** profil yoksa Profil Kur ekranı; takma ad + (opsiyonel) avatar kaydedilir.
2. **Kalıcılık:** uygulamayı tamamen kapatıp aç → aynı nickname + avatar + **aynı uid** gelir
   (yeni anonim oturum açılmaz).
3. **Oda kurma:** Ana ekrandan oda kur → 6 haneli kod üretilir, lobiye girilir, host olarak görünür.
4. **Katılma:** ikinci cihaz/oturum koddan katılır → her iki tarafta oyuncu listesi **gerçek
   zamanlı** güncellenir.
5. **Hazır:** bir oyuncu Hazır olunca diğerlerinde anında yansır.
6. **Chat:** mesajlar her iki tarafta anında görünür, sıralı, kendi/başkası hizalı.
7. **Presence (temel):** uygulamayı kapatan oyuncu kısa süre içinde diğerlerinde "bağlı değil"
   görünür (`onDisconnect`).
8. **Güvenlik:** istemci başka oyuncunun kaydını veya meta'yı **yazamaz** (kural testi/manuel doğrulama).
9. **Geçersiz kod:** olmayan/expired koda katılma denemesi anlaşılır hata verir.
10. **TypeScript strict** hatasız derlenir; `npx tsc --noEmit` temiz.
11. Hedef klasör yapısı kurulmuş, scaffold örnek içerikleri temizlenmiş.

---

## 14. Kapsam Dışı (Faz 1'de YAPILMAYACAK)

- Oyun mekaniği: foto havuzu yükleme, turlar, timer, tahmin, puanlama, reveal (Faz 2)
- Curated mod, animasyonlar/Reanimated efektleri (Faz 3)
- AFK tespiti, reconnect kurtarma, **host migrasyonu**, spectator akışı (Faz 4)
- App Store / build / store cilası (Faz 5)
- Push bildirim, derin link (kapsam dışı)

---

## 15. İşçiye Notlar / Gotcha'lar

1. **Reanimated 4** kuruldu (CLAUDE.md "3" diyordu). Faz 1 ağır animasyon içermez; yalnız
   `react-native-reanimated`'ın plugin'inin `babel-preset-expo` üzerinden aktif olduğunu
   ve uygulamanın çalıştığını doğrula. API farkı çıkarsa Başmimar'a bildir, kendi başına
   sürüm düşürme.
2. **Auth kalıcılığı** RN'de `getReactNativePersistence(AsyncStorage)` olmadan çalışmaz —
   kabul kriteri #2 buna bağlı. Atlamak yok.
3. **Server zaman:** `createdAt/expiresAt/joinedAt/ts/lastSeen` her yerde **server timestamp**
   (CF'de `ServerValue.TIMESTAMP`, RTDB istemci yazımında `serverTimestamp()`).
4. **Oda kodu** yalnız Cloud Function'da üretilir (transaction ile benzersiz). İstemci kod uydurmaz.
5. **Meta yazımı istemciden kapalı.** Oda/oyuncu yaşam döngüsü CF + sınırlı istemci yazımı
   (yalnız kendi isReady/presence) ile yürür.
6. Emülatör ile geliştir (Auth/RTDB/Firestore/Storage/Functions emulator); gerçek projeye
   yazma riskini azalt. `firebase.json`'a emülatör portları ekle.
7. **Soru çıkarsa kod yazmadan sor.** Kapsam dışına çıkma.

---

### Teslim Beklentisi
İşçi, yukarıdaki ağacı kurar, kabul kriterlerini sağlar, `npx tsc --noEmit` temiz geçer,
kısa bir "ne yaptım / nasıl test edilir" notu ile kodu Başmimar'a getirir.
