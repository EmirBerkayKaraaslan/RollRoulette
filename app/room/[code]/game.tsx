import { httpsCallable } from 'firebase/functions';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CountdownTimer } from '@/src/components/ui/CountdownTimer';
import { PhotoCard } from '@/src/components/game/PhotoCard';
import { GuessButton } from '@/src/components/game/GuessButton';
import { RevealOverlay } from '@/src/components/game/RevealOverlay';
import { ScorePopup } from '@/src/components/game/ScorePopup';
import { Screen } from '@/src/components/ui/Screen';
import { functions } from '@/src/services/firebase/config';
import { useProfileStore } from '@/src/store/profileStore';
import { useRoomStore, selectPlayerList, selectIsHost } from '@/src/store/roomStore';
import { useGameStore } from '@/src/store/gameStore';
import { useGameRound } from '@/src/hooks/useGameRound';
import { REVEAL_DISPLAY_MS } from '@/src/services/game/constants';

export default function GameScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const uid = useProfileStore((s) => s.uid);
  const meta = useRoomStore((s) => s.meta);
  const players = useRoomStore((s) => s.players);
  const playerList = useRoomStore(selectPlayerList);
  const isHost = useRoomStore(selectIsHost(uid));

  const currentRound = useGameStore((s) => s.currentRound);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const myGuess = useGameStore((s) => s.myGuess);
  const setMyGuess = useGameStore((s) => s.setMyGuess);

  const [submitting, setSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useGameRound(code);

  const isPhotoOwner = uid != null && currentRound?.photoOwnerId === uid;
  const revealed = currentRound?.status === 'revealed';

  // Update myGuess from RTDB when round loads
  useEffect(() => {
    if (!uid || !currentRound) return;
    const guess = currentRound.guesses?.[uid] ?? null;
    setMyGuess(guess);
    if (guess && guess.score > 0) setShowPopup(true);
  }, [currentRound, uid, setMyGuess]);

  const handleReveal = useCallback(async () => {
    if (!isHost || !roundNumber) return;
    try {
      await httpsCallable(functions, 'revealRound')({ code, roundNumber });
    } catch (e: any) {
      console.warn('revealRound error:', e?.message);
    }
  }, [isHost, code, roundNumber]);

  // After reveal, schedule next round
  useEffect(() => {
    if (!revealed || !isHost) return;
    revealTimerRef.current = setTimeout(async () => {
      const nextRound = roundNumber + 1;
      if (!meta) return;
      if (nextRound > meta.totalRounds) return; // ended — layout handles redirect
      try {
        await httpsCallable(functions, 'startRound')({ code, roundNumber: nextRound });
      } catch (e: any) {
        console.warn('startRound error:', e?.message);
      }
    }, REVEAL_DISPLAY_MS);

    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [revealed, isHost, code, roundNumber, meta]);

  // Check if all non-owner players guessed → trigger reveal
  useEffect(() => {
    if (!isHost || !currentRound || revealed) return;
    if (currentRound.status !== 'active') return;

    const guessablePlayers = playerList.filter(
      (p) => p.isConnected && p.uid !== currentRound.photoOwnerId,
    );
    const guessCount = Object.keys(currentRound.guesses ?? {}).length;
    if (guessablePlayers.length > 0 && guessCount >= guessablePlayers.length) {
      handleReveal();
    }
  }, [currentRound, playerList, isHost, revealed, handleReveal]);

  async function handleGuess(guessedPlayerId: string) {
    if (!uid || submitting || myGuess || !roundNumber) return;
    setSubmitting(true);
    try {
      await httpsCallable(functions, 'submitGuess')({
        code,
        roundNumber,
        guessedPlayerId,
      });
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Tahmin gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!currentRound) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.waitText}>Tur yükleniyor...</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.roundLabel}>
          Tur {roundNumber}/{meta?.totalRounds ?? '?'}
        </Text>
      </View>

      <CountdownTimer
        startedAt={currentRound.startedAt}
        onExpire={handleReveal}
      />

      <View style={styles.photoWrapper}>
        <PhotoCard url={currentRound.photoUrl} />
        {revealed && (
          <View style={styles.overlayWrapper}>
            <RevealOverlay round={currentRound} players={players} />
          </View>
        )}
        {showPopup && myGuess && (
          <ScorePopup score={myGuess.score} onDone={() => setShowPopup(false)} />
        )}
      </View>

      {isPhotoOwner ? (
        <View style={styles.ownerBanner}>
          <Text style={styles.ownerText}>Bu senin fotoğrafın — diğerleri tahmin ediyor</Text>
        </View>
      ) : (
        <ScrollView style={styles.guessList} contentContainerStyle={styles.guessListContent}>
          <Text style={styles.guessLabel}>Kim bu?</Text>
          {playerList
            .filter((p) => p.uid !== currentRound.photoOwnerId || revealed)
            .map((p) => (
              <GuessButton
                key={p.uid}
                player={p}
                onPress={() => handleGuess(p.uid)}
                locked={!!myGuess || submitting || revealed || isPhotoOwner}
                myGuess={myGuess}
                revealed={revealed}
                isPhotoOwner={p.uid === currentRound.photoOwnerId}
              />
            ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  roundLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photoWrapper: {
    paddingHorizontal: 20,
    position: 'relative',
  },
  overlayWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
  },
  ownerBanner: {
    margin: 20,
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    alignItems: 'center',
  },
  ownerText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  guessList: {
    flex: 1,
  },
  guessListContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  guessLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  waitText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});
