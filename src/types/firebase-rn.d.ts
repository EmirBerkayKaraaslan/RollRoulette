// Metro çalışma zamanında firebase/auth'ı RN bundle'ına çözer.
// TypeScript, getReactNativePersistence'ı bu paketten görmez;
// augmentation ile eklenmiştir.
export {};

declare module 'firebase/auth' {
  import type { Persistence } from '@firebase/auth';
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
