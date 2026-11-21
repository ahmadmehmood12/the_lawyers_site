import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';

import type { ClientTabsParamList, LawyerTabsParamList } from './types';

/** Typed hooks so a tab screen can switch to a sibling tab. */
export function useClientTabNavigation(): BottomTabNavigationProp<ClientTabsParamList> {
  return useNavigation<BottomTabNavigationProp<ClientTabsParamList>>();
}

export function useLawyerTabNavigation(): BottomTabNavigationProp<LawyerTabsParamList> {
  return useNavigation<BottomTabNavigationProp<LawyerTabsParamList>>();
}
