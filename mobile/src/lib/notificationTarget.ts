import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';

import type { Role } from '@/data/types';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Where a notification (push tap or in-app list) should open, from its {event, url}:
 * message → that conversation; appointment → appointments; case/hearing → the case; else the list.
 */
export function openNotificationTarget(nav: Pick<NavigationContainerRefWithCurrent<RootStackParamList>, 'navigate'>, data: { event?: unknown; url?: unknown }, role: Role | null): void {
  const event = String(data.event ?? '');
  const url = String(data.url ?? '');
  const conversation = url.match(/messages\/(\d+)/)?.[1];
  const legalCase = url.match(/cases\/(\d+)/)?.[1];

  if (event === 'message' && conversation) {
    nav.navigate('Thread', { id: Number(conversation), title: 'Conversation' });
  } else if (event === 'appointment') {
    role === 'client' ? nav.navigate('ClientTabs', { screen: 'ClientAppointments' } as never) : nav.navigate('Appointments');
  } else if (legalCase && (event === 'hearing_reminder' || event === 'hearing_update' || event === 'case_update')) {
    nav.navigate('CaseDetail', { id: Number(legalCase) });
  } else {
    nav.navigate('Notifications');
  }
}
