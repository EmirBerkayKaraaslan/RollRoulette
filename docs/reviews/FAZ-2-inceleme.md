# FAZ 2 İnceleme — Başmimar

**Karar:** ✅ **TAM ONAY — BİRLEŞTİRİLDİ** (2. tur).
`npx tsc --noEmit` (app) **exit 0**, `functions` build **exit 0** doğrulandı. Kapsam eksiksiz.

> **2. tur sonucu:** B1, S1, L1, L3, L4 İşçi tarafından doğru uygulandı (her biri kaynak üzerinde
> doğrulandı):
> - **B1:** `photo-select`'e host "Turu Başlat" butonu → `startRound(1)`; non-host bekleme metni.
> - **S1:** `startRound` çift transaction (tur yuvası `__claimed` rezervi + `used` atomik işaret);
>   çakışma/boş-havuz yollarında claim geri alınıyor. Faz 4 migrasyonuna hazır.
> - **L1:** `submitGuess` `result.committed` kontrolü. **L3:** `gameStore.setRound` yalnız tur
>   değişiminde `myGuess` sıfırlıyor. **L4:** tam `PHOTOS_PER_PLAYER` zorlaması.
>
> **Faz 4 için not (blocker değil):** `startRound` claim ile gerçek yazım arasında beklenmedik bir
> exception olursa `rounds/{n}` `{__claimed:true}` zombisi kalabilir (bilinen hata yolları temizliyor,
> yalnız beklenmedik throw için geçerli). Faz 4 dayanıklılık turunda ele alınacak.

---

### İlk tur kararı (tarihsel): 🟡 KOŞULLU ONAY

---

## ✅ Onaylanan (sağlam — kaynak üzerinde doğrulandı)

- **Puanlama güvenliği (#5):** `submitGuess` skoru **sunucuda** hesaplıyor (`now=Date.now()` server
  saati, formül CLAUDE.md ile birebir), `guesses/{uid}` transaction + `!exists`. İstemci skor/zaman
  yazamaz.
- **Güvenlik kuralları (#9):** `rounds` ve `guesses` `.write:false` (yalnız CF); `players/totalScore`
  istemciye **immutable**; `photoPool/.../used` istemci yalnız `false` yazabiliyor (true → yalnız CF).
  Faz 1'deki gevşek `guesses` kuralı doğru şekilde CF-only'a sıkılaştırılmış.
- **Reveal idempotency / çift sayım yok (#6):** `revealRound` status'ü transaction ile `revealed`
  yapıyor; yalnız **ilk** committed çağrı skor topluyor. Sonraki çağrılar no-op → `totalScore` çift
  sayılmıyor. Tasarım doğru.
- **Sahibi istisnası (#4):** hem UI (banner + guess listfrom filtrelenmiş) hem CF (`photoOwnerId===uid`
  reddi) zorluyor.
- **Orkestrasyon:** host-only reveal, all-guessed tespiti (bağlı non-owner sayısı) + timer-expire,
  hepsi idempotent CF'lerle korunuyor.
- **Sunucu saati (#3 temeli):** `useServerTime` + `CountdownTimer` `/.info/serverTimeOffset` ile.
- `tsc` app + functions **temiz** (#10).

---

## 🔴 Zorunlu Düzeltme (birleştirme öncesi)

### B1 — `photo-select` ekranında oyunu başlatan host aksiyonu YOK → oyun kilitleniyor
`photo-select.tsx`: tüm oyuncular `photosReady` olunca yalnızca **"Tüm oyuncular hazır!"** metni
gösteriliyor; host'un `startRound(1)`'i tetikleyecek **hiçbir buton/efekt yok**. Sonuç:
`photo_select → playing` geçişi hiç olmaz, oyun foto-seçim ekranında **takılı kalır**.
(İşçinin teslim notunda sorduğu nokta tam da bu.)

**Düzeltme — evet, ekle (PRD §7.5 zaten bunu şart koşuyordu):**
- `photo-select.tsx`'e **host'a özel "Turu Başlat" butonu** ekle; `allReady` olunca **aktif**,
  değilse disabled.
- Butona basınca `httpsCallable(functions, 'startRound')({ code, roundNumber: 1 })`.
- Host olmayanlar butonu görmez; "Host turu başlatıyor..." metni kalır (zaten var).
- **Otomatik tetik değil, açık host butonu** — PRD'nin "host sürücü" modeliyle tutarlı, host kontrolü
  korunur, çift tetik riski yok.

> Bu blocker #1 (uçtan uca akış) ve #3 (tur akışı) kabul kriterlerini bağlıyor.

---

## 🟠 Güçlü Öneri (şimdi düzelt — PRD §5.2/§12.4 uyumu + Faz 4 hazırlığı)

### S1 — `startRound` atomik değil (check-then-act)
`startRound.ts` idempotency'yi `roundRef.get()` + `exists()` kontrolü, ardından ayrı `set()` ile
sağlıyor; `used=true` de düz `.set()` (transaction değil). PRD §5.2/§12.4 **transaction tabanlı**
idempotency ve "foto tüketimi tam bir kez" şart koşuyordu. Tek-host-sürücü (Faz 2) varsayımında
pratik risk düşük, ama:
- İki eşzamanlı `startRound(n)` çağrısı `exists()` kontrolünü birlikte geçip iki foto tüketebilir /
  turu üst üste yazabilir.
- **Faz 4 host migrasyonu** birden çok sürücü demek — o zaman bu yarış gerçek olur.

**Düzeltme:** tur oluşturmayı `roundRef.transaction(...)` içine al (varsa abort), fotoğraf
rezervasyonunu da aynı atomik akışa bağla. Şimdi düzeltmek Faz 4'ü kolaylaştırır.

---

## 🟡 Düşük / Notlar (uygula ya da neden ertelendiğini yaz)

- **L1 — `submitGuess` abort yolu:** transaction abort olsa bile `{success, score}` dönüyor (önceki
  `exists()` kontrolü nadir kılıyor). `result.committed` kontrol edilebilir.
- **L2 — `photoPool` yeniden yazımı:** sahibi kendi foto düğümünü `used:false` ile yeniden yazıp
  kullanılmış fotoğrafı tekrar havuza sürebilir (kurallar `used===false` yazımına izin veriyor).
  Sertleştirme: tur başladıktan sonra havuz yazımını kilitle (sonraki faz).
- **L3 — `setRound` her tur-güncellemesinde `myGuess:null`:** başka oyuncu tahmin edince round
  objesi değişir → `myGuess` anlık sıfırlanıp efektle yeniden türetilir → guess butonlarında kısa
  kilit-açılma titremesi. Kozmetik.
- **L4 — Foto sayısı zorlanmıyor:** kullanıcı `PHOTOS_PER_PLAYER`'dan az yükleyip "hazır" olabilir.
  Zarif çalışır ama "sabit 3" kuralından sapar; min sayı zorlanabilir.

---

## Kabul Kriterleri Durumu

| # | Kriter | Durum |
|---|---|---|
| 1 | Başlatma (≥3) → foto-seçim | ✓ (lobi startGame) |
| 2 | Ön yükleme (foto_select fazında) | ✓ |
| 3 | Tur akışı + senkron timer | ⚠️ **B1'e bağlı** (başlatılamıyor) |
| 4 | Sahibi istisnası | ✓ |
| 5 | Tahmin/skor sunucuda, istemci yazamaz | ✓ |
| 6 | Reveal + çift sayım yok | ✓ |
| 7 | İki cihaz senkron | ✓ (B1 sonrası test edilmeli) |
| 8 | Bitiş + Leaderboard | ✓ |
| 9 | Güvenlik (rounds/guesses/totalScore/used) | ✓ |
| 10 | tsc app + functions exit 0 | ✓ (doğrulandı) |
| 11 | Havuz tükenince zarif bitiş | ✓ (startRound ended yolu) |

---

## İşçiye talimat
**B1'i ekle** (host "Turu Başlat" butonu → `startRound(1)`). **S1'i düzelt** (transaction). L1–L4'ü
uygula ya da ertelemeyi not düş. Sonra `tsc` (app) + functions build tekrar temiz geçsin, iki cihazda
tam tur testi yapıp kısa "ne değişti" notuyla getir.
