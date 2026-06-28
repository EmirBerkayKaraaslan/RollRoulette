# FAZ 1 İnceleme — Başmimar

**Karar:** ✅ **TAM ONAY — BİRLEŞTİRİLDİ** (2. tur).
`npx tsc --noEmit` (app) temiz; `functions` build exit 0. Klasör ağacı PRD ile birebir. Kapsam eksiksiz.

> **2. tur sonucu:** Z1, Z2, T1, R1, R2, R3 İşçi tarafından doğru uygulandı (her biri kaynak
> üzerinde doğrulandı). Ek olarak Başmimar **FN1**'i çözdü: `functions/tsconfig.json`'a
> `rootDir: "src"` eklendi, build-artifact'ları için `functions/.gitignore` (`lib/`,
> `node_modules/`) oluşturuldu. Functions kendi TS 5.9.3'ü ile temiz derleniyor.
> Açık not: emülatör host'u `localhost` → Android emülatöründe `10.0.2.2` gerekecek (Faz 4 dayanıklılık ile ele alınacak).

---

### İlk tur kararı (tarihsel): 🟡 KOŞULLU ONAY

---

## ✅ Onaylanan (sağlam)

- **Auth kalıcılığı** (config.ts): `initializeAuth` + `getReactNativePersistence(AsyncStorage)`,
  HMR koruması `getApps()` ile. Kriter #2 temeli doğru.
- **createRoom**: Base36 6 hane, `transaction` ile benzersizlik, `ServerValue.TIMESTAMP`,
  profil Firestore'dan, 4h TTL. ✓
- **joinRoom**: not-found / failed-precondition / resource-exhausted ayrımı, idempotent
  yeniden katılım, kapasite <10, status & expiry kontrolü. ✓
- **Güvenlik (kısmî)**: `meta` istemciye `.write:false`; başka oyuncunun düğümü yazılamaz;
  `guesses/{uid}` `!data.exists()` iskeleti yerinde; Firestore/Storage sahip-yalnız. ✓
- **Chat**: `limitToLast`, ts'e göre sıralı, uid eşleşme + 200 karakter kuralı. ✓
- Server timestamp her yerde tutarlı; tipler RTDB modeliyle uyumlu.

---

## 🔴 Zorunlu Düzeltmeler (birleştirme öncesi)

### Z1 — Güvenlik: istemci joinRoom CF'sini atlayıp odaya kendini ekleyebiliyor
`database.rules.json` → `players/$uid/.write` koşulu:
```
".write": "auth != null && auth.uid === $uid"
```
Bu, oyuncunun **var olmayan** kendi düğümünü doğrudan yazmasına izin verir → joinRoom'un
kapasite (<10), `status==='lobby'` ve expiry kontrolleri **tamamen atlanır**. Kötü niyetli
(veya hatalı) istemci dolu/oyun başlamış odaya kod biliyorsa girebilir.

**Düzeltme:** istemci yazımını yalnız **güncellemeye** kısıtla (oluşturma CF'de kalsın,
admin kuralları zaten bypass eder):
```
".write": "auth != null && auth.uid === $uid && data.exists()"
```
presence/isReady düğüm zaten CF tarafından oluşturulduktan sonra çalıştığı için uyumlu.

### Z2 — profileStore `hydrated` doğrudan mutasyonu abonelere bildirmiyor
```ts
onRehydrateStorage: () => (state) => { if (state) state.hydrated = true; }
```
Doğrudan mutasyon zustand abonelerini **uyandırmaz**. `app/index.tsx` yalnız `hydrated`+
`nickname`'e bağlı; rehydrate bitince yeniden render tetiklenmeyebilir → **soğuk açılışta
spinner'da takılma** riski (Kriter #1/#2 kritik yolu).

**Düzeltme:** callback'te store API ile yaz:
```ts
onRehydrateStorage: () => () => {
  useProfileStore.setState({ hydrated: true });
}
```

---

## 🟠 Test Akışı Boşluğu (teslim notuyla çelişiyor)

### T1 — Emülatör bağlantısı (wiring) yok
Teslim notu "firebase emulators:start" diyor ama `config.ts`'te hiçbir
`connectAuthEmulator / connectDatabaseEmulator / connectFirestoreEmulator /
connectFunctionsEmulator / connectStorageEmulator` çağrısı yok. Bu haliyle uygulama
**production projesine** bağlanır; emülatör kullanılmaz.

**Düzeltme (biri):**
- `config.ts`'e `__DEV__` (veya `EXPO_PUBLIC_USE_EMULATOR`) korumalı `connect*Emulator`
  çağrıları ekle, **veya**
- Emülatör iddiasını teslim notundan kaldırıp gerçek proje ile test akışı yaz.

> Not: `getFunctions()` varsayılan bölge `us-central1`. Functions farklı bölgeye deploy
> edilirse `getFunctions(app, '<region>')` gerekir.

---

## 🟡 Önerilen (bu faz veya not olarak)

- **R1 — roomStore hiç temizlenmiyor:** `leave()` tanımlı ama çağrılmıyor; `setRoom`
  `players`'ı sıfırlamıyor. Odadan çıkışta stale `players` kalır; `room/[code]/_layout`
  guard'ı (`!players[uid]` → home'a at) yükleme penceresinde yanlış tetikleyebilir.
  Öneri: room `_layout` unmount'ta `leave()`, `setRoom`'da `players:{}`.
- **R2 — joinRoom istemci nickname/photoUrl'e güveniyor**, createRoom ise Firestore'dan
  alıyor. Tutarlılık için joinRoom da Firestore profilinden okuyabilir.
- **R3 — usePresence:** kullanılmayan `set` import'u; `onDisconnect().cancel()`
  cleanup'ta çağrılmıyor (stale handler başka odaya yazabilir — tam çözüm Faz 4, şimdilik not).

---

## Kabul Kriterleri Durumu

| # | Kriter | Durum |
|---|---|---|
| 1 | Soğuk açılış → setup | ⚠️ Z2 riskine bağlı |
| 2 | Kalıcılık (uid+profil) | ⚠️ Z2 riskine bağlı (auth tarafı ✓) |
| 3 | Oda kurma | ✓ |
| 4 | Gerçek zamanlı liste | ✓ |
| 5 | Hazır senkron | ✓ |
| 6 | Chat | ✓ |
| 7 | Presence (temel) | ✓ |
| 8 | Güvenlik (başka kayıt/meta) | ✓ — ama Z1 self-join açığı |
| 9 | Geçersiz kod hatası | ✓ |
| 10 | tsc strict temiz | ✓ (doğrulandı) |
| 11 | Yapı + scaffold temizliği | ✓ |

---

## İşçiye talimat
Z1, Z2, T1'i düzelt; R1–R3'ü ya uygula ya da neden ertelendiğini not düş. Düzeltme sonrası
`npx tsc --noEmit` tekrar temiz geçsin ve kısa "ne değişti" notuyla geri getir.
