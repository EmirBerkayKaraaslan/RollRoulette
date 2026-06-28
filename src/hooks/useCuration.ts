import { set } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import {
  curationReadyPlayerRef,
  curationVoteRef,
  curationVotesRef,
  curationReadyRef,
  photoPoolRef,
  subscribeValue,
} from '@/src/services/firebase/rtdb';
import type { CurationPhoto, PoolPhoto } from '@/src/types/game';

export function useCuration(code: string, uid: string | null) {
  const [photos, setPhotos] = useState<CurationPhoto[]>([]);
  const [allVotes, setAllVotes] = useState<Record<string, Record<string, Record<string, boolean>>>>({});
  const [ready, setReady] = useState<Record<string, boolean>>({});
  // local pending votes (ownerUid/index → boolean)
  const [localVotes, setLocalVotes] = useState<Record<string, boolean>>({});
  const shuffleKeyRef = useRef<string>(code);

  // Subscribe photoPool
  useEffect(() => {
    if (!code) return;
    return subscribeValue<Record<string, Record<string, PoolPhoto>>>(
      photoPoolRef(code),
      (pool) => {
        if (!pool) { setPhotos([]); return; }
        const flat: CurationPhoto[] = [];
        for (const [ownerUid, photoMap] of Object.entries(pool)) {
          for (const [index, photo] of Object.entries(photoMap)) {
            flat.push({
              ownerUid,
              index,
              url: photo.url,
              approved: photo.approved,
              isOwn: ownerUid === uid,
            });
          }
        }
        // Deterministik karıştırma (ownerUid+index hash, kod-sabit)
        flat.sort((a, b) => {
          const ka = `${shuffleKeyRef.current}${a.ownerUid}${a.index}`;
          const kb = `${shuffleKeyRef.current}${b.ownerUid}${b.index}`;
          return ka > kb ? 1 : -1;
        });
        setPhotos(flat);
      },
    );
  }, [code, uid]);

  // Subscribe curation votes
  useEffect(() => {
    if (!code) return;
    return subscribeValue<Record<string, Record<string, Record<string, boolean>>>>(
      curationVotesRef(code),
      (v) => setAllVotes(v ?? {}),
    );
  }, [code]);

  // Subscribe ready flags
  useEffect(() => {
    if (!code) return;
    return subscribeValue<Record<string, boolean>>(
      curationReadyRef(code),
      (r) => setReady(r ?? {}),
    );
  }, [code]);

  function castVote(ownerUid: string, index: string, keep: boolean) {
    setLocalVotes((prev) => ({ ...prev, [`${ownerUid}/${index}`]: keep }));
  }

  async function submitVotes() {
    if (!uid) return;
    // Write all local votes to RTDB
    await Promise.all(
      Object.entries(localVotes).map(([key, keep]) => {
        const [ownerUid, index] = key.split('/');
        return set(curationVoteRef(code, ownerUid, index, uid), keep);
      }),
    );
    // Mark ready
    await set(curationReadyPlayerRef(code, uid), true);
  }

  const myVote = (ownerUid: string, index: string): boolean | undefined =>
    localVotes[`${ownerUid}/${index}`];

  const readyCount = Object.values(ready).filter(Boolean).length;
  const myReady = uid ? ready[uid] === true : false;

  // Aggregate keep/cut counts per photo (from server-side allVotes)
  const voteCounts = (ownerUid: string, index: string) => {
    const photoVotes = allVotes[ownerUid]?.[index] ?? {};
    let keeps = 0;
    let cuts = 0;
    for (const v of Object.values(photoVotes)) {
      if (v) keeps++; else cuts++;
    }
    return { keeps, cuts };
  };

  return {
    photos,
    localVotes,
    castVote,
    submitVotes,
    myVote,
    ready,
    readyCount,
    myReady,
    voteCounts,
  };
}
