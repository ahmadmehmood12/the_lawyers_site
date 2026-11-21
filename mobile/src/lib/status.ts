import type { BadgeTone } from '@/components';

/** Badge colour for any backend status value (appointments, cases, hearings, invoices, tasks). */
export function statusTone(status: string | null | undefined): BadgeTone {
  switch (status) {
    case 'confirmed':
    case 'completed':
    case 'paid':
    case 'won':
    case 'decided':
    case 'held':
    case 'active':
      return 'success';
    case 'requested':
    case 'pending':
    case 'scheduled':
    case 'issued':
    case 'partially_paid':
    case 'in_progress':
    case 'open':
      return 'warning';
    case 'cancelled':
    case 'declined':
    case 'no_show':
    case 'lost':
    case 'void':
    case 'overdue':
    case 'adjourned':
      return 'danger';
    case 'rescheduled':
      return 'accent';
    default:
      return 'neutral';
  }
}
