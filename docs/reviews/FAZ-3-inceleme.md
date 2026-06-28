# FAZ 3 İnceleme — Başmimar

**Karar:** ✅ **TAM ONAY — BİRLEŞTİRİLDİ** (tek tur, düzeltme gerekmedi).
`npx tsc --noEmit` (app) **exit 0**, `functions` build **exit 0** doğrulandı. Kapsam eksiksiz.

---

## ✅ Onaylanan (kaynak üzerinde doğrulandı)

### Curated Mod (Grup Küratörlüğü)
- **`createRoom`:** `mode: 'blind'|'curated'` parametresi + validasyon; `meta.mode` yazılıyor.
- **`startCuration`:** host + `mode==='curated'` + `status==='photo_select'` + bağlı oyuncular
  allReady doğrulaması → `status='curation'`. ✓
- **`finalizeCuration`:** oy sayımı **sunucuda** (keeps/cuts), `approved = keeps>=cuts`,
  `MIN_APPROVED` taban koruması (en yüksek skorlularla tamamlama), `approved` flag'leri + 
  `curationDone` **admin** yazımı. İstemci onayı manipüle edemez. ✓ (#5)
- **`startRound` (mod-farkındalıklı):** round-1 ön koşulu curated→`curation && curationDone`,
  blind→`photo_select`; uygunluk filtresi curated→`!used && approved`, blind→`!used`;
  `totalRounds` uygun sayıdan (tek kaynak). **Blind yolu birebir korunmuş** (atomik claim +
  used transaction + ended yolları aynen). ✓ (#2, #6)
- **Anonimlik (#4):** `CurationCard` sahip adı/avatarı göstermiyor; `useCuration` `isOwn` ile
  kendi fotoğrafını işaretliyor (oy butonu yok); deterministik karıştırma (sahip-sıralı değil).
- **Host akışı:** `photo-select` mod-farkındalıklı buton (curated→`startCuration`,
  blind→`startRound(1)`); `curation.tsx` iki adımlı host akışı (`finalizeCuration` →
  `curationDone` → `startRound(1)`); non-host bekleme metni. `_layout` curation route'u.

### Güvenlik (#9)
- `photoPool/.../approved`: istemci yazamaz/değiştiremez (`!newData.exists() || ===data`).
- `curation/votes`: `auth.uid===$voterUid && $voterUid!==$ownerUid` (kendi fotoğrafına oy yok,
  başkası adına oy yok), boolean validate.
- `curation/ready`: self-write boolean. `meta` `.write:false` → mode/status/curationDone CF-only.
- Faz 2 kuralları (`rounds`/`guesses` `.write:false`, `totalScore` immutable) korunmuş.

### Animasyonlar (#8)
- `CountdownTimer` (nabız/renk), `RevealOverlay` (fade/slide spring), `GuessButton`
  (scale + interpolateColor), `ScorePopup`/`Leaderboard` (`AnimatedNumber` sayma),
  `PhotoCard` (giriş), `CurationCard` (dokunuş). Tümü derleniyor, Reanimated 4 worklet desenleri.

### `tsc` app + functions **exit 0** (#10). 9 CF export. Kapsam dışı (Faz 4/5) korunmuş.

---

## 🟡 Kayda Geçen Notlar (blocker değil — düzeltme istemiyorum)

- **N1 — Oysuz fotoğraf varsayılan onaylı:** `keeps>=cuts` kuralında 0 oy → `0>=0` → DAHİL.
  Yani kimse oylamazsa tüm fotolar onaylanır. **Tasarım gereği** (beraberlik→dahil, şüpheden
  sanık yararlanır); PRD'ye uygun. Sadece bilgi.
- **N2 — Finalize allReady kapısı + disconnect:** `curation.tsx`'te ilerleme `readyCount/
  totalPlayers`. Bir oyuncu kopuk kalırsa readyCount tam sayıya ulaşmayabilir. `finalizeCuration`
  CF'i eksik oyu yok sayar (host zorlayabilir), ama UI kapısı `allReady`'ye bağlıysa host takılabilir.
  **Disconnect/AFK Faz 4 kapsamı** — orada presence ile birlikte ele alınmalı. Şimdilik
  tüm-bağlı varsayımıyla sorun yok.

---

## ⚠️ Statik doğrulanan, runtime smoke-test önerilen (kod doğru, çalıştırma bende değil)

- **#2 Blind regresyon:** kod yolu birebir korunmuş; yine de cihazda blind tam tur (küratörlük
  adımı **gelmemeli**) bir kez koşulmalı.
- **#8 Animasyon akıcılığı/kilitlenme:** bileşenler derleniyor; reveal/skor/round geçişlerinin
  animasyon yüzünden **kilitlenmediği** cihazda doğrulanmalı.

> İkisi de İşçinin test önerileri listesinde mevcut; kod düzeyinde engel yok.

---

## Kabul Kriterleri Durumu

| # | Kriter | Durum |
|---|---|---|
| 1 | Mod seçimi (home + lobi gösterim) | ✓ |
| 2 | Blind regresyon yok | ✓ (kod) — runtime smoke önerilir |
| 3 | Küratörlük geçişi | ✓ |
| 4 | Anonimlik + kendi oyu yok | ✓ |
| 5 | Onay/sayım sunucuda, manipüle edilemez | ✓ |
| 6 | Yalnız onaylı turlar + totalRounds | ✓ |
| 7 | Senkron | ✓ |
| 8 | Animasyonlar akıcı, işlevi bozmuyor | ✓ (kod) — runtime smoke önerilir |
| 9 | Güvenlik (approved/oy/curationDone) | ✓ |
| 10 | tsc app + functions exit 0 | ✓ (doğrulandı) |
| 11 | Az/0 onay edge (MIN_APPROVED) | ✓ |

---

İlk turda temiz geçen ilk faz. N1 bilgi, N2 Faz 4'e devredildi. Runtime blind + animasyon smoke
testi kullanıcı/İşçi tarafından bir kez koşulmalı.
