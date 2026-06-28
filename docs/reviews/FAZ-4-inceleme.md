# FAZ 4 İnceleme — Başmimar

**Karar:** ✅ **TAM ONAY — BİRLEŞTİRİLDİ** (tek tur, düzeltme gerekmedi).
`npx tsc --noEmit` (app) **exit 0**, `functions` build **exit 0** doğrulandı. Kapsam eksiksiz.

---

## ✅ Onaylanan (kaynak üzerinde doğrulandı)

### Host migrasyonu (#3, #4)
- **`migrateHost`:** `meta/hostId` üzerinde transaction → çok-istemci tetiğinde **tek kazanan**;
  mevcut host `isConnected===true` ise abort (idempotent); aksi halde **en eski bağlı non-spectator**
  yeni host; commit sonrası `isHost` flag'leri + `hostMigratedAt`. ✓
- **`useHostMigration`:** host kopuk → yalnız **en eski bağlı oyuncu** `HOST_GRACE_MS` sonrası
  tetikler (thundering-herd önler); host dönerse timer iptal. ✓
- **Sürücü devri kodsuz:** `game.tsx` `useHostMigration` bağlı; yeni host `isHost` üzerinden
  turları/curation'ı RTDB durumundan devralır. ✓

### Presence / Reconnect (#1, #2)
- **`usePresence` yeniden yazımı:** `/.info/connected` aboneliği → bağlantıda stale onDisconnect
  cancel + yeniden kur + `isConnected:true`; **AppState foreground** reconnect gibi davranıyor;
  heartbeat (`HEARTBEAT_MS`) yalnız bağlıyken; cleanup cancel+disconnect. ✓
- joinRoom idempotent yeniden-katılım rolü (oyuncu/spectator) korur. ✓

### Disconnect & AFK kapıları (#5)
- `startGame` / `startCuration` artık **bağlı + non-spectator** kümesiyle doğruluyor; `game.tsx`
  all-guessed filtresi de öyle → kopuk oyuncu kapıyı beklemez.
- **`dropInactive`:** host-only, `photo_select`/`curation` fazında bağlı-AFK oyuncuları
  `isSpectator+isAfk` yapar → kapı açılır. **N2 borcu kapandı.**

### Spectator (#6)
- `joinRoom`: `lobby` → oyuncu, mid-game → spectator, `ended` → reddet; spectator ayrı kapasite,
  kapı/skor dışı. `game.tsx`/`photo-select`/`curation` spectator salt-okunur.

### Takılma kurtarma (#7, #8)
- **`startRound` zombi:** claim placeholder'a `claimedAt`; `__claimed && status===undefined &&
  bayat(>CLAIM_TIMEOUT)` → üzerine yeniden claim. Gerçek/taze tur → no-op. ✓
- **Watchdog:** `game.tsx` host, `startedAt + ROUND_DURATION_MS + AFK_GRACE_MS` aşımında
  `revealRound` (sürücüsüz turu kurtarır), idempotent. ✓

### Güvenlik (#10)
- `isSpectator`, `isAfk` istemciden **immutable** (`newData.val()===data.val()`); `hostId`
  `meta .write:false` (CF-only). Faz 1–3 kuralları korunmuş.

### `tsc` app + functions **exit 0** (#11).

---

## 🟡 Kayda Geçen Notlar (blocker değil — RTDB doğası gereği kabul edilebilir)

- **N3 — migrateHost aday seçimi transaction dışı:** `players` snapshot transaction ÖNCESİ
  okunuyor; aday seçimi bu (olası bayat) snapshot'tan yapılıyor. RTDB transaction tek path
  (`meta/hostId`) ile sınırlı olduğundan bu **standart desen**. Nadir yarış (12s grace içinde
  aday kopması/host dönmesi) **kendini onarır** (useHostMigration yeni host kopuksa tekrar tetikler).
  Kabul edilebilir.
- **N4 — useHostMigration artık-tetikleyici-değil zamanlayıcısı:** başlatıcı rolü el değiştirirse
  eski başlatıcıda bekleyen timer kalabilir; `migrateHost` idempotent olduğu için zararsız.
- **N5 — usePresence `isCurrentlyConnected` kapanış değişkeni:** AppState-active-iken-offline
  anlık yanlış olabilir; `/.info/connected` düzeltir. Kozmetik.

---

## ⚠️ Statik doğrulanan, GERÇEK CİHAZDA test edilmesi ZORUNLU
Faz 4'ün kalbi runtime kopma davranışı; çalıştırma bende değil. Kullanıcı/İşçi bunları bir kez
koşmalı (İşçi test notunda mevcut):
1. **Kopma & kapı:** uçak modu → kopan oyuncu kapıyı bekletmemeli.
2. **Host migrasyonu:** host'u kapat → ~12s sonra host devretmeli, oyun sürmeli.
3. **Reconnect:** kopan cihaz dönünce `isConnected` true, tahmin/oy/foto + rol korunmalı.
4. **Regresyon:** blind + curated kopmasız tam tur (her iki mod) hâlâ çalışmalı.

---

## Kabul Kriterleri Durumu

| # | Kriter | Durum |
|---|---|---|
| 1 | Oyuncu kopması → kapı beklemez | ✓ (kod) — runtime test |
| 2 | Reconnect → rol/veri korunur | ✓ (kod) — runtime test |
| 3 | Host migrasyonu otomatik | ✓ (kod) — runtime test |
| 4 | Idempotent migrasyon (tek host) | ✓ (transaction) |
| 5 | AFK → host atlayabilir | ✓ |
| 6 | Spectator izole | ✓ |
| 7 | Zombi kurtarma | ✓ |
| 8 | Watchdog reveal | ✓ |
| 9 | Regresyon yok | ✓ (kod) — runtime test |
| 10 | Güvenlik (isSpectator/isAfk/hostId) | ✓ |
| 11 | tsc app + functions exit 0 | ✓ (doğrulandı) |

---

İkinci kez ilk turda temiz geçen faz. N3–N5 RTDB doğası gereği kabul edilen düşük notlar.
Runtime kopma/migrasyon/reconnect testleri cihazda bir kez koşulmalı (kalan tek doğrulama).
