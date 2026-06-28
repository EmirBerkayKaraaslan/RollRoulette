# FAZ 2 PRD — Oyun Motoru: Blind Mod, Foto Havuzu, Timer, Puanlama, Reveal

> **Rol:** İşçi ajan bu kapsamı uygular, dışına çıkmaz. Faz 1 altyapısı (auth, profil,
> lobi, chat, RTDB servisleri, store/hook desenleri) HAZIR ve değiştirilmez — yalnız
> üstüne inşa edilir. Anlaşılmayan nokta olursa kod yazmadan önce sorulur.
> **Önceki faz:** `docs/prd/FAZ-1.md` + `docs/reviews/FAZ-1-inceleme.md`.

---

## 0. Amaç

Lobiden başlayıp **blind mod** bir oyunu uçtan uca oynatmak:
host oyunu başlatır → her oyuncu galeriden fotoğraf seçip **önceden** havuza yükler →
turlar sırayla bir fotoğraf gösterir → oyuncular **kimin fotoğrafı** olduğunu tahmin eder →
süreye göre **sunucu puanlar** → tur açıklanır (reveal) → tüm turlar bitince **sonuç tablosu**.

**Faz 2 sonunda çalışan akış:**
`Lobi → (host: Oyunu Başlat) → Foto Seçim (batch upload) → Tur N: Foto + Timer + Tahmin →
Reveal + Skor → … → Sonuçlar (Leaderboard)`

---

## 1. Ön Koşullar

- Faz 1 birleştirilmiş ve çalışır durumda (oda kur/katıl, lobi, presence, chat).
- Firebase Storage kuralları avatar dışında **oyun fotoğrafları** için genişletilecek (bkz. §9).
- Yeni bağımlılık **gerekmiyor** (expo-image-picker/-media-library/-image-manipulator Faz 1'de kurulu).
  - Çoklu seçim için `expo-image-picker`'ın `allowsMultipleSelection` özelliği kullanılır.

---

## 2. Oyun Sabitleri (tek dosyada, `src/services/game/constants.ts`)

| Sabit | Değer (öneri) | Açıklama |
|---|---|---|
| `MIN_PLAYERS` | 3 | Oyun başlatma alt sınırı |
| `PHOTOS_PER_PLAYER` | 3 | Her oyuncunun havuza katacağı foto sayısı (sabit) |
| `MAX_ROUNDS` | 15 | Tur üst sınırı (havuz büyükse kırpılır) |
| `ROUND_DURATION_MS` | 20000 | Tur süresi (timer) |
| `REVEAL_DISPLAY_MS` | 4000 | Reveal ekranı bekleme süresi (sonra sonraki tur) |
| `SCORE_BASE` | 10000 | Puan tabanı |

> Sabitler tek yerde; sihirli sayı dağıtma yok.

---

## 3. RTDB Modeli — Faz 2 Eklemeleri

Faz 1'deki `/rooms/{code}` altına eklenir (CLAUDE.md modeliyle birebir):

```
/rooms/{code}
  /meta
    status: 'lobby' | 'photo_select' | 'playing' | 'ended'   (Faz 1'de tanımlı)
    totalRounds, currentRound                                  (Faz 2'de kullanılır)
  /players/{uid}
    photosReady: boolean        ← YENİ (foto yüklemesi bitti mi)
    totalScore: number          (Faz 1'de var, Faz 2'de CF günceller)
  /game
    /photoPool/{uid}/{index}
      url: string, used: boolean
    /rounds/{n}
      photoUrl, photoOwnerId, startedAt, revealedAt,
      status: 'active' | 'revealed'
      /guesses/{uid}
        guessedPlayerId, submittedAt, score, isCorrect
```

> `photosReady` Faz 1 `Player` tipine eklenir (opsiyonel alan). Diğer alanlar değişmez.

---

## 4. Oyun Durum Makinesi (state machine)

```
lobby ──startGame(host)──▶ photo_select ──(tüm oyuncular photosReady)──▶
   startRound(1) ──▶ playing ⇄ [round active → guesses → revealRound]
   ──(currentRound == totalRounds, son reveal)──▶ ended
```

Geçiş kuralları:
- **lobby → photo_select:** yalnız host, `playerCount >= MIN_PLAYERS`.
- **photo_select → playing:** ilk `startRound` çağrısında; `totalRounds` havuzdan hesaplanır.
- **round active → revealed:** tüm bağlı non-owner oyuncular tahmin etti **veya** timer doldu.
- **playing → ended:** son tur reveal edildiğinde veya havuz tükendiğinde.

---

## 5. Cloud Functions (`functions/src/game/`)

> Tümü v2 `onCall`. Hesaplama ve zaman damgaları **yalnız sunucuda**. İstemci sinyal gönderir.
> Skor/isCorrect/zaman istemciden **asla** yazılmaz.

### 5.1 `startGame.ts` — `startGame`
- Girdi: `{ code }`.
- Doğrula: çağıran = `meta.hostId`, `status === 'lobby'`, `playerCount >= MIN_PLAYERS`.
- Etki: `meta.status = 'photo_select'`. (İsteğe bağlı: tüm `isReady` true şartı — host'a bırakılır,
  PRD zorunlu kılmaz.)
- Hata: `permission-denied` (host değil), `failed-precondition` (durum/oyuncu sayısı).

### 5.2 `startRound.ts` — `startRound`
- Girdi: `{ code, roundNumber }`.
- Çağıran = host.
- **İlk tur (`meta.currentRound === 0`):** `status === 'photo_select'` doğrula; havuzdaki toplam
  foto sayısını say; `totalRounds = min(totalPhotos, MAX_ROUNDS)`; `status = 'playing'`.
- **Sonraki turlar:** önceki tur `status === 'revealed'` olmalı; `roundNumber === currentRound + 1`.
- Foto seçimi (**transaction**): `photoPool` içinde `used === false` bir foto seç (sahip dağılımı
  adil — round-robin/rastgele); `used = true` yap. `rounds/{n}` yaz:
  `{ photoUrl, photoOwnerId, startedAt: ServerValue.TIMESTAMP, revealedAt: null, status: 'active' }`.
  `meta.currentRound = n`.
- Kullanılabilir foto yoksa veya `n > totalRounds`: `meta.status = 'ended'`.
- Idempotent: aynı `roundNumber` tekrar çağrılırsa ikinci foto tüketme **yok** (transaction guard).

### 5.3 `submitGuess.ts` — `submitGuess`
- Girdi: `{ code, roundNumber, guessedPlayerId }`.
- Doğrula: `status === 'playing'`, `rounds/{n}.status === 'active'`, çağıran oda üyesi,
  çağıran **!== `photoOwnerId`** (sahibi tahmin etmez), `guesses/{uid}` **yok**.
- **Transaction** `guesses/{uid}` (`!data.exists()` — kritik kural #2).
- Sunucu: `now = serverTime`; `submittedAt = now`;
  `isCorrect = (guessedPlayerId === photoOwnerId)`;
  `score = isCorrect ? max(0, SCORE_BASE - (now - startedAt) / 1000) : 0`
  (formül CLAUDE.md ile birebir; `startedAt` server-yazımlı sayı).
- Yaz: `{ guessedPlayerId, submittedAt, score, isCorrect }`.
- Hata: `failed-precondition` (tur aktif değil / sahibi / zaten tahmin etti).

### 5.4 `revealRound.ts` — `revealRound`
- Girdi: `{ code, roundNumber }`.
- Çağıran: host (sürücü). **Idempotent**: `rounds/{n}.status` transaction — zaten `revealed` ise no-op.
- Etki: `revealedAt = ServerValue.TIMESTAMP`, `status = 'revealed'`.
- **Skor toplama:** bu turun her `guesses/{uid}.score` değerini `players/{uid}/totalScore`'a
  **transaction** ile ekle (çift sayımı önlemek için reveal yalnız bir kez çalışır — idempotency şart).
- Son tur (`roundNumber >= totalRounds`): `meta.status = 'ended'`.

### 5.5 `functions/src/index.ts`
- Yeni 4 fonksiyonu export et (Faz 1'in 3 oda fonksiyonuna ek). `migrateHost` **Faz 4** — burada YOK.

---

## 6. Tur Akışı Orkestrasyonu (kim neyi tetikler)

- **Host istemci** turun "sürücüsü"dür:
  - Foto seçim bitince (tüm oyuncular `photosReady`) host `startRound(1)` çağırır.
  - Timer dolunca **veya** tüm bağlı non-owner tahmin edince host `revealRound(n)` çağırır.
  - `REVEAL_DISPLAY_MS` sonra host `startRound(n+1)` çağırır.
- CF'ler **idempotent/transaction** olduğundan çift tetikleme güvenlidir.
- **Not:** Host kopması/migrasyonu Faz 2 kapsamı **değil** (Faz 4). Faz 2'de host'un bağlı
  kaldığı varsayılır. Bu, PRD'de bilinçli bir sınırlamadır.

---

## 7. İstemci Tarafı

### 7.1 Tipler — `src/types/game.ts` (YENİ)
- `RoundStatus = 'active' | 'revealed'`
- `Round`: `photoUrl, photoOwnerId, startedAt, revealedAt, status, guesses: Record<string, Guess>`
- `Guess`: `guessedPlayerId, submittedAt, score, isCorrect`
- `PoolPhoto`: `url, used`
- `Player`'a `photosReady?: boolean` eklenir (`src/types/player.ts` güncelle).

### 7.2 Foto Servisi — havuz upload (`src/services/photo/`)
- Mevcut `picker/compressor/uploader` yeniden kullanılır; **batch** sarmalayıcı eklenir:
  - `pickGamePhotos(max)` — `allowsMultipleSelection`, en fazla `PHOTOS_PER_PLAYER`.
  - `uploadPhotoPool(uid, code, uris[])` — her foto compress (<200KB) → Storage
    `rooms/{code}/pool/{uid}/{index}.jpg` → `photoPool/{uid}/{index} = { url, used:false }`.
    Yükleme **photo_select fazında, tur başında değil** (kritik kural #1).
  - İlerleme geri bildirimi (yüklenen/toplam) çağırana raporlanır.

### 7.3 Store — `src/store/gameStore.ts` (YENİ)
- State: `phase` (meta.status türevi), `currentRound: Round | null`, `roundNumber`,
  `myGuess: Guess | null`, `timeLeftMs`, `poolUploadProgress`, `leaderboard: Player[]`.
- Eylemler: `setRound`, `setMyGuess`, `setPhase`, `reset()`.
- Faz 1 `roomStore` ile çakışma yok; oyun-özel durum burada.

### 7.4 Hook'lar
- **`useGameRound(code)`** — `/game/rounds/{currentRound}`'a abone; round + guesses akışı;
  reveal durumunu yansıtır.
- **`useServerTime()`** — RTDB `/.info/serverTimeOffset`'e abone; `serverNow()` döndürür.
  Timer **sunucu saatine** göre hesaplanır (istemci saati değil).
- **`usePhotoPool(code)`** — havuz doluluk/`photosReady` durumları (foto seçim ekranı için).
- Faz 1 `useRoom/usePlayers/useChat/usePresence` aynen kullanılır.

### 7.5 Ekranlar (`app/room/[code]/`)
- **`photo-select.tsx`** (YENİ): galeriden `PHOTOS_PER_PLAYER` seç → önizleme → "Yükle" →
  ilerleme → bitince `players/{uid}/photosReady = true`. Tüm oyuncular hazır olunca host'ta
  "Turu Başlat" aktif olur; host olmayanlar "host bekleniyor" görür.
- **`game.tsx`** (YENİ): üstte `CountdownTimer`, ortada `PhotoCard` (geçerli tur fotoğrafı),
  altta oyuncu listesi `GuessButton` olarak.
  - Sahibi isen: foto yerine "📸 Bu senin fotoğrafın" durumu, tahmin yok, bekleme.
  - Tahmin edince buton kilitlenir, "tahminin gönderildi" + (reveal'a kadar) skor gizli.
  - Reveal gelince `RevealOverlay` + `ScorePopup`.
- **`results.tsx`** (YENİ): `status === 'ended'` olduğunda `Leaderboard` (totalScore'a göre sıralı),
  "Tekrar Oyna" (lobiye döndür / yeni oda) ve "Ana Ekran".
- **`room/[code]/_layout.tsx`** güncelle: `meta.status`'a göre otomatik yönlendirme
  (photo_select→photo-select, playing→game, ended→results). Lobi → game geçişini host'un
  `startGame`'i tetikler.
- **Lobi (`lobby.tsx`) güncelle:** Faz 1'deki disabled "Oyunu Başlat" artık host'ta `startGame`
  CF'sini çağırır (`MIN_PLAYERS` kontrolü UI + CF'de).

### 7.6 Bileşenler
- `src/components/ui/CountdownTimer.tsx` — `startedAt + ROUND_DURATION_MS - serverNow()`; bitince
  `onExpire`. Reanimated ile yumuşak ilerleme (ağır animasyon Faz 3).
- `src/components/game/PhotoCard.tsx` — tur fotoğrafı (yüklenirken placeholder).
- `src/components/game/GuessButton.tsx` — oyuncu avatarı + nickname; seçilebilir/kilitli/doğru-yanlış durumları.
- `src/components/game/RevealOverlay.tsx` — doğru sahip + herkesin tahmini + skorları.
- `src/components/game/ScorePopup.tsx` — bu turda kazanılan puan animasyonu.
- `src/components/game/Leaderboard.tsx` — sıralı oyuncu + toplam skor.

---

## 8. Puanlama (CLAUDE.md ile birebir)

```
score = max(0, SCORE_BASE - (submittedAt - startedAt) / 1000)   // yalnız doğru tahminde
```
- `startedAt`, `submittedAt`: her ikisi de CF içinde sunucu zamanı.
- **Yalnızca sunucuda** hesaplanır; istemci `score`/`isCorrect` yazamaz (güvenlik kuralı §9).
- Yanlış tahmin: `score = 0`.

> **Mimari not (İşçi uygulasın, tartışma açmasın):** formül saniyede 1 puan düşürür
> (20 sn turda en fazla ~20 puan fark). Bu CLAUDE.md kararıdır; Faz 2'de aynen uygulanır.
> Denge ayarı gerekiyorsa Başmimar Faz 3/5'te yeniden değerlendirir.

---

## 9. Güvenlik Kuralları — Faz 2 Güncellemeleri

### `database.rules.json`
- `/game/photoPool/{uid}`: sahibi **yazar** (`auth.uid === $uid`), oda üyesi **okur**;
  `url` string, `used` boolean doğrulaması. `used` alanını istemci `true` yapamaz (yalnız CF) —
  yani `photoPool/{uid}/{i}/used` istemci yazımına **kapalı**, foto oluşturma sahibe açık.
- `/game/rounds`: oda üyesi **okur**; `.write: false` (yalnız CF/admin).
- `/game/rounds/{n}/guesses/{uid}`: **`.write: false`** — Faz 1'deki istemci-yazımlı iskelet
  **CF-only**'a sıkılaştırılır. Puanlama sunucuda olduğundan tahmin yalnız `submitGuess` CF ile
  yazılır; istemci doğrudan yazamaz (skor/zaman manipülasyonu kapalı). **Bu, Faz 1 kuralının
  bilinçli revizyonudur.**
- `/players/{uid}/photosReady`: sahibi boolean yazar (Faz 1 self-write deseniyle uyumlu,
  `data.exists()` koruması korunur). `totalScore` istemci yazımına **kapalı** (yalnız CF).

### `storage.rules`
- `rooms/{code}/pool/{uid}/{index}.jpg`: sahibi (`auth.uid === $uid`) yazar; oda üyesi/auth'lu okur.
  (Avatar kuralı Faz 1'den korunur.)

---

## 10. Kabul Kriterleri (Definition of Done)

1. **Başlatma:** host lobide "Oyunu Başlat"a basınca `<3` oyuncuda engellenir, `>=3`'te
   tüm oyuncular foto-seçim ekranına geçer.
2. **Ön yükleme:** her oyuncu `PHOTOS_PER_PLAYER` foto seçip yükler; yüklemeler **foto_select
   fazında** tamamlanır (tur başında ağ beklemesi yok — kritik kural #1).
3. **Tur akışı:** host turu başlatınca tüm oyuncularda **aynı foto** ve **senkron timer** görünür.
4. **Sahibi istisnası:** fotoğrafın sahibi o turda tahmin edemez, "senin fotoğrafın" durumu görür.
5. **Tahmin/skor:** tahmin **bir kez** gönderilir; skor **sunucuda** hesaplanır; istemciden
   skor/zaman yazımı kural ile reddedilir (doğrulama).
6. **Reveal:** süre dolunca ya da herkes tahmin edince doğru sahip + herkesin tahmini + puanlar
   gösterilir; `totalScore` **çift sayım olmadan** güncellenir (reveal idempotent).
7. **Senkron:** iki cihazda tur/skor/reveal gerçek zamanlı tutarlı.
8. **Bitiş:** son turdan sonra `status='ended'`, Leaderboard doğru sırada.
9. **Güvenlik:** istemci `rounds`/`guesses`/`totalScore`/`used` yazamaz (manuel/kural testi).
10. **TypeScript strict** temiz: `npx tsc --noEmit` (app) **ve** `functions` build exit 0.
11. Foto havuzu tükenirse oyun zarif şekilde erken biter (crash yok).

---

## 11. Kapsam Dışı (Faz 2'de YAPILMAYACAK)

- **Curated mod** (oyuncuların foto onayı/küratörlük) — Faz 3.
- Gelişmiş **animasyonlar/geçişler** (kart çevirme, skor coşkusu) — Faz 3 (Faz 2'de minimal/işlevsel).
- **Disconnect/AFK/host migrasyonu/reconnect** — Faz 4. Faz 2 host'un bağlı kaldığını varsayar.
- App Store/build cilası — Faz 5.

---

## 12. İşçiye Notlar / Gotcha'lar

1. **Kritik kural #1:** fotoğraflar tur başında DEĞİL, foto_select fazında yüklenir. Tur
   başlarken yalnız `photoUrl` referansı gösterilir; ağ yüklemesi olmaz.
2. **Kritik kural #2:** `guesses/{uid}` bir kez yazılır — CF'de transaction `!data.exists()`.
3. **Zaman:** `startedAt/submittedAt/revealedAt` hepsi sunucu zamanı. Timer istemcide
   `/.info/serverTimeOffset` ile düzeltilir; istemci saatine güvenme.
4. **Idempotency:** `startRound`/`revealRound` host istemciden birden çok tetiklenebilir;
   foto tüketimi ve skor toplama **tam bir kez** olmalı (transaction guard).
5. **Sahibi tahmin etmez:** hem UI hem CF bunu zorlar.
6. **Güvenlik revizyonu:** Faz 1'deki `guesses` istemci-yazımlı kuralı CF-only'a sıkılaştırılıyor;
   `totalScore` ve `used` istemciye kapalı. Bunu atlama.
7. **Host bağımlılığı** Faz 2'de kabul edilen sınırlama; "host kaçtı" senaryosunu çözmeye çalışma
   (Faz 4). Ama CF'leri idempotent yaz ki Faz 4 migrasyonu üstüne otursun.
8. **Emülatörle geliştir** (Faz 1'deki `__DEV__` wiring). İki simülatör/cihazla tam tur testi yap.
9. **Soru çıkarsa kod yazmadan sor.** Kapsam dışına çıkma.

---

### Teslim Beklentisi
Hedef dosyalar oluşturulur, kabul kriterleri sağlanır, `npx tsc --noEmit` (app) temiz +
`functions` build exit 0, kısa "ne yaptım / nasıl test edilir" notuyla kod Başmimar'a getirilir.
