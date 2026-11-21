import type { ViewStyle } from 'react-native';

import { navy } from './colors';

export const shadows = {
  card: {
    shadowColor: navy[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  pop: {
    shadowColor: navy[900],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} satisfies Record<string, ViewStyle>;
