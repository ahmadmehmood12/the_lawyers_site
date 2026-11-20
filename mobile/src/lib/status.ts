import type { BadgeTone } from '@/components';
import type { AppointmentStatus, CaseStatus, InvoiceStatus, Priority, TaskStatus } from '@/data/types';
import { titleCase } from './format';

export function caseTone(status: CaseStatus): BadgeTone {
  return { active: 'info', pending: 'warning', won: 'success', lost: 'danger', closed: 'neutral', on_hold: 'warning' }[status] as BadgeTone;
}

export function appointmentTone(status: AppointmentStatus): BadgeTone {
  return { pending: 'warning', confirmed: 'success', completed: 'info', cancelled: 'danger', rescheduled: 'accent' }[status] as BadgeTone;
}

export function invoiceTone(status: InvoiceStatus): BadgeTone {
  return { paid: 'success', unpaid: 'warning', partial: 'info', overdue: 'danger' }[status] as BadgeTone;
}

export function taskTone(status: TaskStatus): BadgeTone {
  return { todo: 'neutral', in_progress: 'info', done: 'success' }[status] as BadgeTone;
}

export function priorityTone(priority: Priority): BadgeTone {
  return { low: 'neutral', medium: 'warning', high: 'danger' }[priority] as BadgeTone;
}

export const label = titleCase;
