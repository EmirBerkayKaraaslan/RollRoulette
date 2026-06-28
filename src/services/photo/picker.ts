import * as ImagePicker from 'expo-image-picker';
import { PHOTOS_PER_PLAYER } from '@/src/services/game/constants';

export async function pickAvatar(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

export async function pickGamePhotos(): Promise<string[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: PHOTOS_PER_PLAYER,
    quality: 1,
  });

  if (result.canceled) return [];
  return result.assets.map((a) => a.uri);
}
