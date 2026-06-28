import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ProfileState {
  uid: string | null;
  nickname: string;
  photoUrl: string | null;
  hydrated: boolean;
  setProfile: (data: { nickname: string; photoUrl: string | null }) => void;
  setUid: (uid: string) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      uid: null,
      nickname: '',
      photoUrl: null,
      hydrated: false,
      setProfile: ({ nickname, photoUrl }) => set({ nickname, photoUrl }),
      setUid: (uid) => set({ uid }),
      reset: () => set({ uid: null, nickname: '', photoUrl: null }),
    }),
    {
      name: 'rr-profile',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        uid: state.uid,
        nickname: state.nickname,
        photoUrl: state.photoUrl,
      }),
      onRehydrateStorage: () => () => {
        useProfileStore.setState({ hydrated: true });
      },
    },
  ),
);
