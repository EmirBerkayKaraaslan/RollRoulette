# FAZ 4 PRD — Dayanıklılık: Disconnect, AFK, Host Migrasyonu, Spectator

> **Rol:** İşçi ajan bu kapsamı uygular, dışına çıkmaz. Faz 1–3 altyapısı HAZIR ve
> **blind + curated akışları regresyona uğramamalı**. Anlaşılmayan nokta olursa kod yazmadan
> önce sorulur. **Önceki fazlar:** `docs/prd/FAZ-1..3.md` + inceleme dokümanları.

---

## 0. Amaç

Oyunun **gerçek hayatta kopan bağlantılara** dayanması:
1. **Disconnect:** bir oyuncu kopunca oyun durmaz; kopuk oyuncu kapılarda (gate) sayılmaz.
2. **Reconnect:** kopan oyuncu döndüğünde presence yeniden kurulur, mevcut faza geri oturur.
3. **AFK:** bağlı ama hareketsiz oyuncu fazları kilitlemez; host bekleyenleri atlayabilir.
4. **Host migrasyonu:** host koparsa **otomatik** en eski bağlı oyuncuya devredilir; oyun
   "sürücüsüz" kalmaz.
5. **Spectator:** oyun başladıktan sonra katılan (veya atlanan) oyuncu **izleyici** olur.
6. **Takılma kurtarma:** yarım kalan tur (`__claimed` zombi) ve sürücüsüz tur kendini onarır.

**Önceki fazların "host bağlı kalır" varsayımı bu fazda KALDIRILIYOR.**

---

## 1. Ön Koşullar

- Faz 1–3 birleştirilmiş ve çalışır.
- Yeni bağımlılık **gerekmiyor**. RTDB `/.info/connected` ve `onDisconnect` kullanılır
  (Faz 1 presence temeli genişletilir).

---

## 2. Sabitler (`src/services/game/constants.ts`'e eklenir)

| Sabit | Değer (öneri) | Açıklama |
|---|---|---|
| `DISCONNECT_GRACE_MS` | 8000 | Kopuğu "gitti" saymadan önce debounce (flapping önler) |
| `HOST_GRACE_MS` | 12000 | Host kopuk kalınca migrasyon tetik eşiği |
| `AFK_GRACE_MS` | 30000 | Faz kapısı bekleyen bağlı oyuncu için süre; sonra host atlayabilir |
| `CLAIM_TIMEOUT_MS` | 8000 | `__claimed` zombi turu bayat sayma eşiği |
| `HEARTBEAT_MS` | 15000 | `lastSeen` nabız aralığı (Faz 1'deki 30s'ten sıkılaştırılır) |

---

## 3. RTDB Modeli — Faz 4 Eklemeleri / Kullanımları

```
/rooms/{code}
  /meta
    hostId               (var; migrateHost transaction ile değişir)
    hostMigratedAt?      ← YENİ (son migrasyon zamanı, bilgi/debounce)
  /players/{uid}
    isConnected, lastSeen (var; presence sıkılaştırılır)
    isSpectator          ← ARTIK KULLANILIYOR (mid-game join / atlanan)
    isAfk?: boolean      ← YENİ (faz kapısında atlanan bağlı oyuncu; bilgi amaçlı)
    isHost               (migrateHost ile devredilir)
  /game/rounds/{n}
    __claimed?, claimedAt?  ← claimedAt YENİ (zombi kurtarma için)
```

> `Player` tipine `isAfk?: boolean`. `RoomMeta`'ya `hostMigratedAt?: number`.
> Round claim placeholder'ına `claimedAt: ServerValue.TIMESTAMP`.

---

## 4. Presence Sıkılaştırma (`src/hooks/usePresence.ts` — YENİDEN YAZ)

Faz 1 temeli (onDisconnect + heartbeat + cancel) korunur, ÜstÜne:
- **`/.info/connected`'a abone ol.** Bağlantı `true` olduğunda:
  - `onDisconnect(playerRef).cancel()` (eski handler'ı temizle) → yeniden kur:
    `onDisconnect().update({ isConnected:false, lastSeen: serverTimestamp })`.
  - `isConnected:true`, `lastSeen` güncelle (reconnect kurtarma).
- **Heartbeat** `HEARTBEAT_MS`'te `lastSeen` günceller (yalnız bağlıyken).
- Uygulama arka plana/öne geçişinde (AppState) presence'i tazele (öne gelince reconnect gibi davran).
- Cleanup'ta `cancel()` + `isConnected:false`.

> **Amaç:** kopuk→dönen oyuncu, `isConnected` doğru şekilde `false→true` salınır; bayat
> onDisconnect başka odaya yazmaz.

---

## 5. Host Migrasyonu

### 5.1 `functions/src/game/migrateHost.ts` — `migrateHost` (YENİ)
- Girdi `{ code }`. Çağıran: herhangi bir **bağlı oda üyesi**.
- **Transaction `meta/hostId`:**
  - Mevcut host'un presence'ını oku. Host `isConnected===true` ise → **abort** (host iyi, gerek yok).
  - Aksi halde yeni host = `isConnected===true && !isSpectator` oyuncular arasında **en küçük
    `joinedAt`** → `hostId = newHostUid`.
  - Bağlı uygun oyuncu yoksa → abort (migrasyon yapılamaz; §8 boş-oda kurtarma devreye girer).
- Commit sonrası: `players/{eskiHost}/isHost=false`, `players/{yeniHost}/isHost=true`,
  `meta/hostMigratedAt = ServerValue.TIMESTAMP` (multi-path update).
- **Idempotent:** hostId zaten bağlı bir host'a işaret ediyorsa abort → no-op.

### 5.2 İstemci tetik — `src/hooks/useHostMigration.ts` (YENİ)
- Host'un presence'ını izle. `players[hostId].isConnected === false` **`HOST_GRACE_MS`** boyunca
  sürerse `migrateHost({ code })` çağır.
- **Deterministik başlatıcı:** gürültüyü azaltmak için çağrıyı **en eski bağlı non-spectator
  oyuncu** (yeni host adayı) yapar; o da kopmuşsa bir sonraki. (CF transaction zaten tek kazananı
  garanti eder; bu yalnız optimizasyon.)

### 5.3 Sürücü devri
- Tüm sürücü aksiyonları (`startRound`, `revealRound`, `startCuration`, `finalizeCuration`,
  next-round) zaten `isHost`'a bağlı ve **idempotent**. Migrasyon sonrası yeni host'un istemcisi
  RTDB durumundan (meta.currentRound, round.status) devralır; mevcut tur/curation kaldığı yerden
  ilerler. **Yeni kod yok — yalnız `isHost`'ın migrasyonla değişmesi yeterli.**
- **Watchdog (§8):** yeni host, devraldığında aktif ama süresi çoktan dolmuş bir tur görürse
  reveal eder; reveal'da kalmış turu bir sonrakine taşır.

---

## 6. Disconnect & AFK — Faz Kapıları

### 6.1 Kapılar yalnız **bağlı, non-spectator** oyuncuları sayar
Aşağıdaki "herkes hazır mı" hesapları **`isConnected && !isSpectator`** ile yapılır
(kopuk oyuncu otomatik kapı dışı):
- Lobi: "Oyunu Başlat" (`startGame` CF zaten min oyuncu; bağlı sayıyla doğrula).
- `photo-select`: tüm `photosReady` → host "Turu Başlat"/"Küratörlüğe Geç".
- `curation`: tüm `ready` → host finalize. **(N2 düzeltmesi)**
- `game`: tüm non-owner tahmin etti (zaten `isConnected` filtresi vardı — korunur).

İlgili CF'ler (`startGame`, `startCuration`) bağlı oyuncu kümesiyle doğrulama yapacak şekilde
güncellenir.

### 6.2 AFK — bağlı ama hareketsiz
- **Round:** timer zaten sınırlıyor (host süre dolunca reveal). AFK oyuncu o tur 0 alır. Ek iş yok.
- **photo_select / curation:** bağlı ama aksiyonu tamamlamayan oyuncu kapıyı kilitleyebilir.
  Çözüm — host'a özel **"Bekleyenleri Atla"** (after `AFK_GRACE_MS`):
  - `functions/src/game/dropInactive.ts` — `dropInactive` (YENİ): host CF. Mevcut faza göre
    aksiyonu tamamlamamış **bağlı** oyuncuları `isSpectator=true, isAfk=true` yapar → kapı açılır.
    (Kopuklar zaten kapı dışı; bu yalnız bağlı-AFK için.)
  - UI: host'ta, kapı bekliyor ve `AFK_GRACE_MS` geçtiyse buton görünür.
- **isSpectator / isAfk istemciden yazılamaz** (yalnız CF) — kural §10.

### 6.3 N2 düzeltmesi (Faz 3 borcu)
`curation.tsx`'te finalize kapısı artık **bağlı** oyuncuların `ready` durumuna bakar; kopuk oyuncu
beklenmez. Bağlı-AFK için "Bekleyenleri Atla" → `dropInactive`.

---

## 7. Spectator (İzleyici) Akışı

### 7.1 `functions/src/room/joinRoom.ts` (GÜNCELLE)
- `status === 'lobby'` → normal oyuncu (mevcut davranış).
- `status ∈ {photo_select, curation, playing}` → **spectator** olarak ekle
  (`isSpectator:true`, `isHost:false`). `status === 'ended'` → reddet (`failed-precondition`).
- Spectator'lar **MIN_PLAYERS / 10 kapasite / kapı hesaplarına dahil değil** (ayrı sayılır;
  spectator için ayrı bir makul üst sınır, örn. +10).

### 7.2 İstemci — spectator salt-okunur
- `game.tsx`: spectator ise tahmin butonları yok, "İzliyorsun" rozeti; reveal/leaderboard görünür.
- `photo-select.tsx` / `curation.tsx`: spectator için yükleme/oylama yok, "İzleyici" durumu.
- Leaderboard: spectator'lar puanlamada yok (veya ayrı "İzleyiciler" bölümü).
- Reconnect: kopup dönen oyuncu **rolünü korur** (oyuncuysa oyuncu, spectator'sa spectator);
  presence yeniden kurulur, gönderdiği tahmin/oy/foto kalıcıdır.

---

## 8. Takılma Kurtarma (Stuck-Game Recovery)

### 8.1 `startRound` zombi `__claimed` kurtarma (GÜNCELLE)
- Claim placeholder'ına `claimedAt: ServerValue.TIMESTAMP` ekle.
- Round claim transaction'ında: `existing` yalnız `{__claimed:true}` (gerçek tur verisi yok) **ve**
  `now - claimedAt > CLAIM_TIMEOUT_MS` ise → bayat zombi kabul et, **üzerine yeniden claim** et
  (beklenmedik exception'da kalan zombiyi onarır). Gerçek (status'lü) tur varsa yine no-op.

### 8.2 Watchdog reveal (istemci, host)
- Host (migrasyon sonrası dahil): aktif tur `startedAt + ROUND_DURATION_MS + AFK_GRACE_MS`'i
  geçmiş ve hâlâ `active` ise → `revealRound` çağır (sürücüsüz kalmış turu kurtarır). Idempotent.

### 8.3 Boş oda
- `migrateHost` bağlı uygun host bulamazsa (herkes kopuk): oda olduğu gibi kalır; `expiresAt`
  dolunca `cleanupExpiredRooms` temizler (mevcut). Ek olarak: tüm oyuncular `isConnected===false`
  ve süre geçmişse cleanup bunları da kapsar (gerekirse `cleanupExpiredRooms` koşulunu genişlet).

---

## 9. Cloud Functions Özeti

| Fonksiyon | Durum | İş |
|---|---|---|
| `migrateHost` | YENİ | Host devri (transaction, idempotent) |
| `dropInactive` | YENİ | Host: bağlı-AFK oyuncuları spectator yap (kapı açar) |
| `joinRoom` | GÜNCELLE | Mid-game → spectator |
| `startGame` / `startCuration` | GÜNCELLE | Kapı doğrulaması "bağlı, non-spectator" kümesiyle |
| `startRound` | GÜNCELLE | `claimedAt` + zombi kurtarma |
| `index.ts` | GÜNCELLE | `migrateHost`, `dropInactive` export |

> `submitGuess`, `revealRound`, `finalizeCuration`, `createRoom`, `cleanupExpiredRooms`
> mantığı korunur (yalnız `cleanupExpiredRooms` §8.3 için isteğe bağlı genişler).

---

## 10. Güvenlik Kuralları — Faz 4 Eklemeleri (`database.rules.json`)

- `players/{uid}`:
  - **`isSpectator`** istemciden **değiştirilemez** (yalnız CF) →
    `.validate: newData.val() === data.val()` (mevcut `isHost`/`joinedAt`/`totalScore` deseni).
  - **`isAfk`** istemciden yazılamaz (yalnız CF) → aynı immutable desen.
  - `isConnected`/`lastSeen` self-write korunur (presence). `isHost` zaten immutable (migrateHost
    admin yazar).
- `meta` zaten `.write:false` → `hostId`, `hostMigratedAt` CF-only. ✓
- Faz 1–3 kuralları korunur.

---

## 11. Kabul Kriterleri (Definition of Done)

1. **Oyuncu kopması:** bir oyuncu kapanınca diğerlerinde kısa sürede "bağlı değil"; faz kapıları
   onu beklemez, oyun devam eder.
2. **Reconnect:** kopan oyuncu dönünce `isConnected` true olur, mevcut faza/ekrana geri oturur;
   gönderdiği tahmin/oy/foto kaybolmaz; rolü (oyuncu/spectator) korunur.
3. **Host migrasyonu:** host kapanınca `HOST_GRACE_MS` içinde host **otomatik** en eski bağlı
   oyuncuya geçer; yeni host turları/curation'ı sürdürür; oyun kilitlenmez.
4. **Idempotent migrasyon:** birden çok istemci tetiklese de **tek** yeni host olur (transaction).
5. **AFK:** bağlı ama aksiyon almayan oyuncu `photo_select`/`curation`'ı süresiz kilitlemez;
   host `AFK_GRACE_MS` sonrası "Bekleyenleri Atla" ile ilerleyebilir.
6. **Spectator:** oyun başladıktan sonra katılan kişi izleyici olur; tahmin/oy/foto veremez;
   reveal/leaderboard'u görür; kapı/skor hesabına girmez.
7. **Zombi kurtarma:** yarım kalan `__claimed` tur `CLAIM_TIMEOUT_MS` sonrası kurtarılır; oyun
   takılmaz.
8. **Watchdog:** sürücüsüz kalan aktif tur (süre aşımı) host tarafından reveal edilir.
9. **Regresyon yok:** blind + curated normal (kopmasız) akışlar Faz 2/3'teki gibi çalışır.
10. **Güvenlik:** istemci `isSpectator`/`isAfk`/`hostId` yazamaz (kural testi).
11. **TypeScript strict** temiz: `npx tsc --noEmit` (app) **ve** `functions` build exit 0.

---

## 12. Kapsam Dışı (Faz 4'te YAPILMAYACAK)

- App Store build, ikon/splash, mağaza metinleri, sürümleme — Faz 5.
- Push bildirimleri ("sıra sende", "host ayrıldı") — kapsam dışı (Faz 5'te değerlendirilebilir).
- Analitik/telemetri, çökme raporlama — kapsam dışı.
- Yeni oyun modu/özellik — kapsam dışı.
- Tam otomatik AFK tespiti (etkileşim izleme) — bu fazda host-yardımlı + timer yeterli;
  agresif idle-tracking yapılmaz.

---

## 13. İşçiye Notlar / Gotcha'lar

1. **Idempotency + transaction** her dayanıklılık aksiyonunun temeli: `migrateHost` (tek host),
   `startRound` zombi kurtarma, watchdog reveal hep güvenli tekrar edilebilir olmalı.
2. **Presence flapping:** `DISCONNECT_GRACE_MS` ile debounce; her ağ titremesinde migrasyon/atma
   tetikleme.
3. **Sürücü devri kodsuz:** migrasyon sonrası akış `isHost` üzerinden kendiliğinden devralır;
   yeni sürücü mantığı yazma — yalnız `isHost`'ın doğru değişmesini sağla.
4. **N2 borcu kapanıyor:** curation finalize kapısı bağlı `ready` ile; bağlı-AFK için `dropInactive`.
5. **Spectator izolasyonu:** spectator hiçbir yazma yapmamalı (foto/oy/tahmin); kapı ve skor
   hesaplarından dışla.
6. **Blind + curated regresyon:** dayanıklılık eklemeleri normal akışı bozmamalı (kabul #9).
   Kopmasız iki-cihaz tam tur (her iki mod) hâlâ çalışmalı.
7. **Emülatörle test:** bağlantı kesme senaryosu için cihazı uçak moduna al / uygulamayı kapat;
   host migrasyonunu host'u kapatarak doğrula.
8. **Soru çıkarsa kod yazmadan sor.** Kapsam dışına çıkma.

---

### Teslim Beklentisi
Hedef dosyalar oluşturulur/güncellenir, kabul kriterleri sağlanır, `npx tsc --noEmit` (app) temiz +
`functions` build exit 0, **regresyon (kopmasız) + dayanıklılık (kopma/host migrasyon/spectator)**
senaryolarının nasıl test edildiğini içeren kısa notla kod Başmimar'a getirilir.
