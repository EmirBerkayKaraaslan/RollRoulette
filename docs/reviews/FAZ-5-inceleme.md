# FAZ 5 İnceleme — Başmimar

**Karar:** ✅ **TAM ONAY — BİRLEŞTİRİLDİ** (tek tur). **Proje yol haritası tamamlandı.**
`npx tsc --noEmit` (app) **exit 0**, `functions` build **exit 0** doğrulandı.

> **"Tamamlandı" tanımı (PRD §13):** production build + TestFlight + UGC/gizlilik uyumu +
> regresyonsuz kod. **App Store onayı** Apple inceleme süreci (harici) ve **hesap/build/deploy
> adımları kullanıcının** (aşağıda).

---

## ✅ Onaylanan (kaynak üzerinde doğrulandı)

### UGC Uyumu — submission kapısı (#3) — EN KRİTİK
- **`reportContent`:** oda üyesi + kendi içeriğini raporlayamaz; sebep validasyonu;
  Firestore `/reports`'a admin yazımı. ✓
- **`kickPlayer`:** host-only; `lobby`→tamamen kaldır, oyun sırasında→`isSpectator+isConnected:false`.
  Kendini atamaz. ✓
- **`deleteAccount`:** self-uid; Firestore profili + Storage avatar (try/catch) + **Auth hesabı**
  silinir → **Apple account-deletion gerekliliği karşılanıyor**. ✓
- **EULA:** `(setup)` ekranında `rr-eula-v1` ile gate; yeni kurulumda ilk açılış = setup. ✓
- **ReportModal** (game ⚠), **SettingsModal** (destek/gizlilik/veri silme), **OfflineBanner**. ✓

### Gizlilik & Mağaza Hazırlığı (#2, #4)
- `/reports` Firestore kuralı `allow read, write: if false` → istemci tamamen kapalı (yalnız CF).
- `app.json`: bundleId `com.rollroulette.app`, buildNumber, `supportsTablet:false`, newArch,
  **privacy manifest** (UserDefaults + FileTimestamp), **izin metinleri TR+EN**, **kamera istenmiyor**.
- `eas.json` (dev/preview/production + autoIncrement + submit), `docs/RELEASE.md`,
  `docs/STORE-MATERIALS.md`.

### Üretim Firebase (#1) & Regresyon (#6)
- `config.ts` emülatör wiring `__DEV__ && isFirstInit` → **release build emülatöre bağlanmaz**. ✓
- Faz 1–4 davranışına dokunulmamış (UX cila katmanı + yeni CF'ler additive).

### `tsc` app + functions **exit 0** (#8). 9→12 CF (reportContent/kickPlayer/deleteAccount eklendi).

---

## 🟡 Kayda Geçen Notlar (blocker değil)

- **F1 — `deleteAccount` oda-temizleme sorgusu verimsiz:** `orderByChild('players/${uid}/uid')`
  **dinamik derin path** (her uid için ayrı, `.indexOn` tanımlanamaz). Admin SDK kuralları/index'i
  zorlamadığından **çalışır ama tüm `/rooms`'u tarar** (ölçekte verimsiz, uyarı loglayabilir).
  **Kritik silme (profil+avatar+Auth) doğru** → Apple uyumu sağlanıyor; oda üyeliği zaten TTL ile
  temizleniyor. Öneri (Faz sonrası): silmeyi kullanıcının aktif oda referansından yürüt veya TTL'e
  bırak. Submission engeli değil.
- **F2 — Kick sonrası yeniden katılım:** lobby'de atılan oyuncu banlist olmadığından hemen yeniden
  katılabilir. Ephemeral oda modelinde PRD host-moderasyonu yeterli saymıştı; düşük.
- **F3 — EULA kapsamı:** EULA `(setup)`'ta (yeni kullanıcı). v1.0 lansmanında herkes yeni → sorun yok.
  `rr-eula-v1` versiyonlama hazır; ileride profili olan kullanıcıya da göstermek için kök-gate
  düşünülebilir.

---

## ⚠️ Kullanıcının Yürüteceği (kod-dışı, gerçek-dünya — bende çalıştırılamaz)
1. App Store Connect'te bundle id ile uygulama kaydı.
2. Firebase **üretim** projesi + Blaze + EAS secrets (`docs/RELEASE.md`).
3. `eas.json` submit bloğu (appleId/ascAppId/appleTeamId).
4. `firebase deploy --only database,firestore,storage,functions` (prod).
5. `eas build -p ios --profile production` → `eas submit -p ios`.
6. App Store Connect: ekran görüntüleri, App Privacy, gizlilik politikası URL, yaş derecesi.
7. Gizlilik politikasını gerçek URL'de barındır.
8. **TestFlight runtime regresyonu** (Faz 2/3/4 smoke + Faz 5 UGC/izin/offline) — önceki fazların
   tüm runtime borçlarının kapatıldığı yer.

---

## Kabul Kriterleri Durumu

| # | Kriter | Durum |
|---|---|---|
| 1 | Üretim Firebase, emülatör sızıntısı yok | ✓ |
| 2 | Kimlik/asset/izin | ✓ |
| 3 | UGC (EULA/report/kick/veri-silme/iletişim) | ✓ |
| 4 | Gizlilik (privacy manifest + nutrition + politika taslağı) | ✓ |
| 5 | UX cilası (yükleme/boş/hata/offline) | ✓ |
| 6 | Regresyon yok | ✓ (kod) — TestFlight'ta runtime |
| 7 | EAS production build → TestFlight | ⏳ kullanıcı (config hazır) |
| 8 | tsc app + functions exit 0 | ✓ (doğrulandı) |
| 9 | Release runbook | ✓ (`docs/RELEASE.md`) |

---

## 🏁 Proje Durumu — 5/5 Faz Tamamlandı
Faz 1 (Auth/Lobi/Chat) · Faz 2 (Oyun Motoru) · Faz 3 (Curated+Animasyon) · Faz 4 (Dayanıklılık) ·
Faz 5 (Cila+Deploy) — tümü Başmimar onaylı, birleştirilmiş. Kalan: kullanıcının hesap/build/deploy
adımları + TestFlight runtime regresyonu + Apple inceleme.
