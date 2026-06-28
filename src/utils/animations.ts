import { Easing } from 'react-native-reanimated';

export const easeOutCubic = Easing.out(Easing.cubic);
export const easeInOutCubic = Easing.inOut(Easing.cubic);

export const springConfig = {
  damping: 14,
  stiffness: 180,
  mass: 0.8,
};

export const revealSpring = {
  damping: 18,
  stiffness: 220,
  mass: 0.6,
};
