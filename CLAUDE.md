# RollRoulette — Başmimar Oturumu

## Bu Oturumun Rolü

Sen bu oturumda **BAŞMIMAR (Yönetici)**sın.

### Yapacakların
- Faz PRD'si yaz (İşçi ajanlara verilecek)
- İşçiden gelen kodu incele
- Onay / düzeltme kararı ver
- Dosya ağacını güncelle
- Bir sonraki faza geç

### Yapmayacakların
- Üretim kodu yazma
- Component implementasyonu yapma
- Code snippet yapıştırma

### Çalışma Protokolü
1. Kullanıcı "Faz X PRD'sini yaz" der
2. Sen Markdown PRD çıkarırsın
3. Kullanıcı PRD'yi İşçi ajana kopyalar
4. İşçi kodu yazar, kullanıcı kodu sana getirir
5. Sen inceler, onay veya düzeltme istersin
6. Onaylanan kodda "Faz X bitti, dosya ağacını güncelle, Faz X+1'e geç" dersin

---

## Oyun Konsepti

RollRoulette: 3-10 oyuncunun kendi galeri fotoğraflarını ortak havuza katıp birbirini tahmin ettiği gerçek zamanlı mobil parti oyunu.

---

## Onaylı Teknoloji Yığını

| Katman | Karar |
|---|---|
| Framework | React Native + Expo SDK 51+ (TypeScript strict) |
| Routing | Expo Router v3 |
| State | Zustand |
| Animasyon | React Native Reanimated 3 |
| Galeri | expo-image-picker + expo-media-library |
| Görüntü sıkıştırma | expo-image-manipulator (hedef: <200KB/foto) |
| Auth | Firebase Anonymous Auth |
| Oyun durumu (realtime) | Firebase Realtime Database (RTDB) |
| Kullanıcı profilleri | Firestore |
| Dosya depolama | Firebase Storage |
| Sunucu mantığı | Cloud Functions (Node.js 20) |

---

## Klasör Yapısı

```
rollroulette/
├── app/                          # Expo Router ekranlar
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (setup)/index.tsx
│   ├── (home)/index.tsx
│   ├── (home)/join.tsx
│   └── room/[code]/
│       ├── _layout.tsx
│       ├── lobby.tsx
│       ├── photo-select.tsx
│       ├── game.tsx
│       └── results.tsx
├── src/
│   ├── components/
│   │   ├── ui/          # Button, Avatar, CountdownTimer, Modal
│   │   ├── lobby/       # PlayerCard, ChatBubble, ChatInput, RoomCodeDisplay
│   │   └── game/        # PhotoCard, GuessButton, RevealOverlay, ScorePopup, Leaderboard
│   ├── hooks/
│   │   ├── useRoom.ts
│   │   ├── usePlayers.ts
│   │   ├── useGameRound.ts
│   │   ├── useChat.ts
│   │   ├── usePresence.ts
│   │   └── useServerTime.ts
│   ├── services/
│   │   ├── firebase/    # config, auth, rtdb, firestore, storage
│   │   └── photo/       # picker, compressor, uploader
│   ├── store/
│   │   ├── profileStore.ts
│   │   ├── roomStore.ts
│   │   └── gameStore.ts
│   └── types/
│       ├── room.ts
│       ├── player.ts
│       ├── game.ts
│       └── firebase.ts
├── functions/src/
│   ├── room/            # createRoom, joinRoom, cleanupExpiredRooms
│   └── game/            # startGame, startRound, submitGuess, revealRound, migrateHost
├── app.json
├── firebase.json
├── firestore.rules
├── storage.rules
└── database.rules.json
```

---

## RTDB Veri Modeli

```
/rooms/{6-digit-code}
  /meta
    hostId, status (lobby|photo_select|playing|ended),
    mode (blind|curated), totalRounds, currentRound,
    createdAt, expiresAt
  /players/{uid}
    nickname, photoUrl, isHost, isReady, isConnected,
    isSpectator, lastSeen, totalScore, joinedAt
  /chat/{pushId}
    uid, nickname, text, ts
  /game
    /photoPool/{uid}/{index}  → url, used
    /rounds/{n}
      photoUrl, photoOwnerId, startedAt, revealedAt, status
      /guesses/{uid}
        guessedPlayerId, submittedAt, score, isCorrect
```

```
/users/{uid}  ← Firestore
  nickname, photoUrl, createdAt, lastActiveAt, gamesPlayed
```

---

## Puanlama Formülü

```
score = max(0, 10.000 - (submittedAt - startedAt) / 1000)
```

`startedAt` ve `submittedAt` Cloud Functions içinde `ServerValue.TIMESTAMP` — sunucu taraflı, manipülasyona kapalı.

---

## Kritik Mimari Kararlar

1. **Ön yükleme**: Fotoğraflar tur başında değil lobi/seçim fazında yüklenir
2. **Güvenlik**: `guesses/{uid}` sadece bir kez yazılabilir (`!data.exists()`)
3. **Host migrasyonu**: `joinedAt` sırasına göre, RTDB transaction ile
4. **Oda kodu**: 6 haneli Base36, transaction ile benzersizlik
5. **Profil kalıcılığı**: AsyncStorage — uygulama kapansa bile hatırlanır

---

## Faz Durumu

| Faz | Kapsam | Durum |
|---|---|---|
| 1 | Auth, Profil, Lobi, Chat | ✅ TAMAMLANDI — Z1/Z2/T1/R1-R3 + FN1 build düzeltildi, app+functions tsc temiz |
| 2 | Oyun Motoru: Blind Mod, Timer, Puanlama | Başlamadı |
| 3 | Curated Mod + Animasyonlar | Başlamadı |
| 4 | Dayanıklılık: Disconnect, AFK, Host migrasyon | Başlamadı |
| 5 | Cilalama + App Store Deploy | Başlamadı |
