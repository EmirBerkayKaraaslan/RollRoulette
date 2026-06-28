# FAZ 3 PRD — Curated Mod (Grup Küratörlüğü) + Animasyonlar

> **Rol:** İşçi ajan bu kapsamı uygular, dışına çıkmaz. Faz 1 + Faz 2 altyapısı HAZIR ve
> **blind mod regresyona uğramamalı**. Anlaşılmayan nokta olursa kod yazmadan önce sorulur.
> **Önceki fazlar:** `docs/prd/FAZ-1.md`, `docs/prd/FAZ-2.md` + inceleme dokümanları.

---

## 0. Amaç

İki iş:
1. **Curated Mod (Grup Küratörlüğü):** oyuncular fotoğraflarını yükledikten sonra tüm havuz
   **anonim** gösterilir; herkes her fotoğrafa **beğen/ele** oyu verir; çoğunluk **onaylı set**
   belirler; turlar yalnız onaylı fotoğraflar üzerinden döner. (Tahmin mekaniği blind ile aynı:
   "kimin fotoğrafı".)
2. **Animasyonlar:** Faz 2'de işlevsel/minimal bırakılan oyun bileşenlerine Reanimated 4 cilası
   (reveal, skor, timer, leaderboard, geçişler).

**Faz 3 sonunda çalışan akış (curated):**
`Lobi (mod=curated) → Foto Seçim → Küratörlük (anonim oylama) → Onaylı Set → Tur N … → Sonuçlar`
**Blind akış Faz 2'deki gibi değişmeden çalışmaya devam eder.**

---

## 1. Ön Koşullar

- Faz 1 + Faz 2 birleştirilmiş ve çalışır (oda, lobi, foto havuzu, turlar, puanlama, reveal).
- Yeni bağımlılık **gerekmiyor** (Reanimated 4 + worklets Faz 1'de kurulu; animasyonlar mevcut
  paketle yapılır).

---

## 2. Sabitler (`src/services/game/constants.ts`'e eklenir)

| Sabit | Değer (öneri) | Açıklama |
|---|---|---|
| `CURATION_KEEP_RULE` | "keeps >= cuts" | Onay eşiği (beraberlik → DAHİL) |
| `MIN_APPROVED` | 3 | Onaylı foto tabanı; altına düşerse en yüksek skorlular tamamlanır |
| `ANIM_REVEAL_MS` | 500 | Reveal/kart açılış süresi |
| `ANIM_SCORE_MS` | 900 | Skor yükselme/sayma süresi |
| `ANIM_TIMER_PULSE_MS` | 600 | Son saniyelerde timer nabız |
| `TIMER_WARN_RATIO` | 0.25 | Kalan süre bu oranın altında → renk/uyarı |

> Tüm yeni sihirli sayılar burada. Mevcut Faz 2 sabitleri korunur.

---

## 3. RTDB Modeli — Faz 3 Eklemeleri

```
/rooms/{code}
  /meta
    mode: 'blind' | 'curated'          (Faz 1'de tanımlı; Faz 3'te curated kullanılır)
    status: ... | 'curation' | ...      ← YENİ ara durum (yalnız curated)
    curationDone: boolean               ← YENİ (finalizeCuration sonrası true)
  /game
    /photoPool/{uid}/{index}
      url, used, approved?: boolean      ← YENİ (curated; CF yazar)
    /curation                            ← YENİ alt ağaç (yalnız curated)
      /votes/{ownerUid}/{index}/{voterUid} : boolean   // true=beğen, false=ele
      /ready/{voterUid} : boolean                        // oyuncu oyunu gönderdi
```

> `RoomStatus`'a `'curation'` eklenir (`src/types/room.ts`). `PoolPhoto`'ya `approved?: boolean`
> eklenir (`src/types/game.ts`). Blind modda `curation`/`approved` kullanılmaz.

---

## 4. Durum Makinesi — Curated Dalı

```
lobby ──startGame(host)──▶ photo_select ──(tüm photosReady)──▶
   ├─ [blind]   startRound(1) ─────────────────────────────▶ playing → ... → ended
   └─ [curated] startCuration(host) ──▶ curation
                  (herkes oy verir → ready) ──▶ finalizeCuration(host)
                  (approved flag'leri + curationDone) ──▶ startRound(1) ──▶ playing → ... → ended
```

- **photo_select → curation:** yalnız curated, yalnız host, tüm `photosReady`.
- **curation → playing:** `finalizeCuration` (onay hesaplama) sonra host `startRound(1)`.
- Blind dalı **birebir Faz 2** — değişmez.

---

## 5. Cloud Functions

### 5.1 `createRoom.ts` (GÜNCELLE)
- Girdi `{ mode }` artık `'blind' | 'curated'` kabul eder (varsayılan `'blind'`).
- `meta.mode` buna göre yazılır. (Faz 2'de `'blind'` sabitti.)

### 5.2 `game/startCuration.ts` — `startCuration` (YENİ)
- Girdi `{ code }`. Çağıran = host. Doğrula: `mode === 'curated'`, `status === 'photo_select'`,
  tüm oyuncular `photosReady`.
- Etki: `meta.status = 'curation'`.

### 5.3 `game/finalizeCuration.ts` — `finalizeCuration` (YENİ)
- Girdi `{ code }`. Çağıran = host. Doğrula: `status === 'curation'`.
  (Tüm `curation/ready` true olmalı; host zorlayabilir — PRD host'a bırakır ama eksik oy
  "ele" sayılmaz, yalnız o oyuncunun oyu yok sayılır.)
- **Onay hesaplama (her foto için):** `votes/{ownerUid}/{index}` altındaki `true`/`false`
  say; `approved = (keeps >= cuts)` (`CURATION_KEEP_RULE`).
- **Taban koruması:** `approvedCount < MIN_APPROVED` ise, en yüksek (keeps - cuts) skorlu
  fotoğraflar `MIN_APPROVED`'a (veya havuz boyutuna) kadar onaylanır. Havuz zaten küçükse hepsi.
- `photoPool/{uid}/{index}/approved` flag'lerini **admin** yazar (istemci yazamaz).
- `meta.curationDone = true`. (Status'ü **playing yapmaz** — onu `startRound(1)` yapar.)

### 5.4 `game/startRound.ts` (GÜNCELLE — mod farkındalığı)
- **Round 1 ön koşulu:**
  - blind: `status === 'photo_select'`.
  - curated: `status === 'curation' && curationDone === true`.
- **Uygun foto filtresi:**
  - blind: `used === false`.
  - curated: `used === false && approved === true`.
- **totalRounds (round 1):** uygun foto sayısı → `min(eligibleCount, MAX_ROUNDS)` (tek kaynak
  burada; finalize hesaplamaz).
- Geri kalan mantık (atomik transaction claim + `used` işareti, idempotency, ended yolları)
  **Faz 2'deki gibi korunur**. Yalnız filtre + round-1 ön koşulu moda göre dallanır.

### 5.5 `functions/src/index.ts` (GÜNCELLE)
- `startCuration`, `finalizeCuration` export edilir.

> `submitGuess`, `revealRound` **değişmez** (tahmin/puanlama/reveal moddan bağımsız).

---

## 6. İstemci — Curated

### 6.1 Tipler
- `src/types/room.ts`: `RoomStatus`'a `'curation'`; `RoomMeta`'ya `curationDone?: boolean`.
- `src/types/game.ts`: `PoolPhoto`'ya `approved?: boolean`; `CurationVote = boolean`;
  `CurationState` (votes/ready türevleri) yardımcı tip.

### 6.2 RTDB ref'leri (`src/services/firebase/rtdb.ts`)
- `curationVotesRef(code)`, `curationVoteRef(code, ownerUid, index, voterUid)`,
  `curationReadyRef(code, uid)`.

### 6.3 Hook — `src/hooks/useCuration.ts` (YENİ)
- `/game/photoPool` (anonim liste) + `/game/curation/votes` + `/ready`'e abone.
- Döndürür: oylanacak fotoğraf listesi (kendi fotoğrafı işaretli), oy durumu, kaç oyuncu hazır.
- `castVote(ownerUid, index, keep)` ve `submitVotes()` (ready yazar).

### 6.4 Ekran — `app/room/[code]/curation.tsx` (YENİ)
- Tüm havuz **anonim** (sahip adı/avatarı YOK), **karıştırılmış** sırada `CurationCard` listesi.
- Kendi fotoğrafın: "📷 Senin fotoğrafın" rozeti, **oy verilemez** (kural #voter≠owner).
- Her diğer foto: 👍 Beğen / 👎 Ele toggle.
- "Oyumu Gönder" → tüm oylar + `ready/{uid}` yazılır (eksik oy "ele" sayılmaz, yok sayılır).
- Durum: `X/Y oyuncu oyladı`.
- **Host kontrolleri** (tüm ready olunca aktif):
  1. "Küratörlüğü Bitir" → `finalizeCuration`. Sonra onaylanan set özeti gösterilir
     (kaç foto dahil/elendi).
  2. "Turu Başlat" → `startRound(1)`.
- Host olmayan: "Host küratörlüğü tamamlıyor..." bekleme metni.

### 6.5 Bileşen — `src/components/game/CurationCard.tsx` (YENİ)
- Anonim foto + beğen/ele kontrolü; seçili durum görseli; kendi fotoğrafı kilitli durum.

### 6.6 Akış bağlama (GÜNCELLE)
- `app/(home)/index.tsx` (veya `lobby.tsx`): **mod seçimi** — host oda kurarken/lobide
  `blind | curated` seçer; `createRoom`'a `mode` geçer; lobide aktif mod gösterilir.
  (Tek yer seç: PRD önerisi **oda kurarken home'da**; lobide salt-okunur gösterim.)
- `app/room/[code]/photo-select.tsx`: host aksiyonu moda göre:
  - blind → "Turu Başlat" (`startRound(1)`) — Faz 2'deki gibi.
  - curated → "Küratörlüğe Geç" (`startCuration`).
- `app/room/[code]/_layout.tsx`: `status === 'curation'` → `curation` ekranına yönlendir
  (mevcut status→route eşlemesine ekle).

---

## 7. Animasyonlar (Reanimated 4 — mevcut bileşenlere cila)

> Yeni ağır bağımlılık yok. Worklet tabanlı, 60fps hedef. Animasyonlar **işlevi bozmadan**
> mevcut bileşenleri zenginleştirir. Ortak süreler §2 sabitlerinden.

| Bileşen | Animasyon |
|---|---|
| `CountdownTimer` | Akıcı ilerleme barı; `TIMER_WARN_RATIO` altında renk geçişi + son saniyelerde nabız |
| `RevealOverlay` | Açılışta kart-çevirme/ölçek + opaklık (`ANIM_REVEAL_MS`); doğru sahip vurgusu |
| `GuessButton` | Basışta scale; reveal'da doğru→yeşil, yanlış→kırmızı geçiş animasyonu |
| `ScorePopup` | Yükselen + sönümlenen puan; `AnimatedNumber` ile sayma (`ANIM_SCORE_MS`) |
| `Leaderboard` | Sıralama değişiminde yumuşak yer değiştirme + skor sayma |
| `PhotoCard` | Tur fotoğrafı giriş (fade/scale); yükleme placeholder geçişi |
| `CurationCard` | Beğen/ele dokunuş geri bildirimi (scale/renk) |
| Ekran geçişleri | photo_select→curation→game→results yumuşak geçiş (layout/Stack düzeyinde) |

- Yardımcı: `src/components/ui/AnimatedNumber.tsx` (YENİ) — sayı sayma; skor/leaderboard'da kullanılır.
- Opsiyonel ortak konfig: `src/utils/animations.ts` (easing/spring presetleri). Tek yerde tut.

> **Kapsam sınırı:** Animasyonlar **mevcut bileşenlerin** geliştirilmesidir; ekranların yeniden
> yazımı veya yeni navigasyon kütüphanesi **yok**. Reanimated 3'e düşürme **yok** (Faz 1 kararı: 4).

---

## 8. Güvenlik Kuralları — Faz 3 Eklemeleri (`database.rules.json`)

- `/game/photoPool/{uid}/{index}`:
  - Mevcut: sahibi yazar, `used` istemci yalnız `false`.
  - **EKLE:** `approved` istemci tarafından yazılamaz/değiştirilemez →
    validate: `!newData.hasChild('approved') || newData.child('approved').val() === data.child('approved').val()`.
    (Onay flag'ini yalnız `finalizeCuration` admin yazar.)
- `/game/curation`:
  - `.read`: oda üyesi.
  - `votes/{ownerUid}/{index}/{voterUid}`:
    `.write: auth.uid === $voterUid && $voterUid !== $ownerUid && <oda üyesi>`;
    `.validate: newData.isBoolean()`. (Kendi fotoğrafına oy **yok**.)
  - `ready/{uid}`: `.write: auth.uid === $uid && <oda üyesi>`, boolean validate.
- `meta` zaten `.write:false` → `mode`, `status`, `curationDone` istemciden yazılamaz (CF yazar). ✓

> Blind moda ait Faz 2 kuralları (`rounds`/`guesses` `.write:false`, `totalScore` immutable)
> **korunur**.

---

## 9. Kabul Kriterleri (Definition of Done)

1. **Mod seçimi:** host oda kurarken blind/curated seçebilir; lobide aktif mod görünür.
2. **Blind regresyon yok:** blind mod uçtan uca Faz 2'deki gibi çalışır (mod seçimi blind iken
   küratörlük adımı atlanır).
3. **Küratörlük geçişi:** curated'da tüm `photosReady` sonrası host "Küratörlüğe Geç" → herkes
   `curation` ekranına geçer.
4. **Anonimlik:** küratörlük ekranında fotoğraf sahibi gösterilmez; kendi fotoğrafına oy verilemez.
5. **Onay hesaplama:** oylar sonrası `keeps >= cuts` olan fotolar onaylanır; `MIN_APPROVED` tabanı
   korunur; **istemci `approved`/oy sayımını manipüle edemez** (CF + kural).
6. **Onaylı turlar:** turlar **yalnız onaylı** fotoğraflar üzerinden döner; `totalRounds` onaylı
   sayıdan hesaplanır.
7. **Senkron:** iki+ cihazda oy durumu, onay sonucu ve turlar gerçek zamanlı tutarlı.
8. **Animasyon — timer:** süre azaldıkça görsel uyarı; reveal/skor/leaderboard animasyonları akıcı,
   işlevi bozmuyor.
9. **Güvenlik:** istemci `approved`, başka oyuncunun oyu, `meta.curationDone` yazamaz (kural testi).
10. **TypeScript strict** temiz: `npx tsc --noEmit` (app) **ve** `functions` build exit 0.
11. **Az/0 onay edge:** çok az foto onaylanırsa `MIN_APPROVED` tabanıyla oyun yine de zarif başlar.

---

## 10. Kapsam Dışı (Faz 3'te YAPILMAYACAK)

- **Disconnect/AFK/host migrasyonu/reconnect** — Faz 4. (Curated'da host yine "sürücü"; host'un
  bağlı kaldığı varsayılır.)
- App Store/build/store cilası, ikon/splash — Faz 5.
- Yeni oyun modları (blind/curated dışında), takım modu vb. — kapsam dışı.
- Ses/haptik — opsiyonel, PRD zorunlu kılmaz (eklenirse minimal, hafif).

---

## 11. İşçiye Notlar / Gotcha'lar

1. **Blind moda dokunma riski:** `startRound` ve foto havuzu blind akışını bozma. Mod dallanmasını
   izole et; blind regresyon kabul kriteri #2 ile test edilir.
2. **Anonimlik istemci tarafı:** sahip adı UI'da gizlenir; sahibinin kendi fotoğrafını tanıması
   doğaldır — sadece **kendi fotoğrafına oyu** engelle (kural + UI).
3. **Onay/oy sayımı sunucuda:** `approved` flag'ini ve taban korumasını yalnız `finalizeCuration`
   yazar; istemci oy verir, **sayım/onay sunucuda**.
4. **`curationDone` ve round-1 ön koşulu:** curated round 1 yalnız `status==='curation' &&
   curationDone` iken; blind yalnız `status==='photo_select'` iken. Karıştırma.
5. **totalRounds tek kaynak:** yalnız `startRound` round-1 hesaplar (mod farkındalıklı). finalize
   hesaplamaz.
6. **Reanimated 4** korunur; animasyonlar işlevsel davranışı değiştirmez (yalnız görsel). Test
   sırasında reveal/skor/round geçişlerinin animasyon yüzünden **kilitlenmediğini** doğrula.
7. **Emülatörle geliştir**; iki cihazda hem blind hem curated tam tur testi yap.
8. **Soru çıkarsa kod yazmadan sor.** Kapsam dışına çıkma.

---

### Teslim Beklentisi
Hedef dosyalar oluşturulur/güncellenir, kabul kriterleri sağlanır, `npx tsc --noEmit` (app) temiz +
`functions` build exit 0, **blind regresyon testi** dahil kısa "ne yaptım / nasıl test edilir" notuyla
kod Başmimar'a getirilir.
