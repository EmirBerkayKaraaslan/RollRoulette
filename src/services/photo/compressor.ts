import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_BYTES = 200 * 1024;
const LONG_EDGE = 512;

export async function compressImage(uri: string): Promise<string> {
  let quality = 0.8;

  while (quality > 0.1) {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: LONG_EDGE } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
    );

    const info = await FileSystem.getInfoAsync(result.uri);
    if (info.exists && info.size <= MAX_BYTES) {
      return result.uri;
    }

    quality -= 0.1;
  }

  // Last attempt at minimum quality
  const final = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: LONG_EDGE } }],
    { compress: 0.1, format: ImageManipulator.SaveFormat.JPEG },
  );
  return final.uri;
}
