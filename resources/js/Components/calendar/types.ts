/** One normalised item from GET /calendar/events (App\Services\Calendar\CalendarFeed). Times are local "YYYY-MM-DDTHH:mm". */
export type CalendarItem = {
    key: string;
    source: 'hearing' | 'appointment' | 'event' | 'task' | 'note';
    id: number;
    type: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    start: string;
    end: string;
    all_day: boolean;
    location: string | null;
    case: { id: number; title: string; reference: string } | null;
    client: string | null;
    lawyer: string | null;
    status: 'scheduled' | 'rescheduled' | 'completed' | 'cancelled';
    status_label: string;
    /** Old slot of a rescheduled hearing/appointment: shown faded, points to the new date. */
    ghost: boolean;
    moved_to: string | null;
    /** Earlier date this item replaced: shown struck through. */
    original_start: string | null;
    reason: string | null;
    url: string | null;
    manage_url: string | null;
    has_history: boolean;
    hearing: { id: number; hearing_time: string | null; assigned_lawyer_id: number | null } | null;
    recurrence: string;
    recurrence_label: string | null;
    visibility: string | null;
    owner: string | null;
    editable: EventForm | null;
    can: { edit: boolean; reschedule: boolean; cancel: boolean; complete?: boolean };
};

export type EventForm = {
    type: string;
    title: string;
    description: string | null;
    location: string | null;
    starts_at: string;
    ends_at: string | null;
    all_day: boolean;
    visibility: string;
    legal_case_id: number | null;
    client_id: number | null;
    assigned_to: number | null;
    recurrence: string;
    recurrence_interval: number;
    recurrence_until: string | null;
};

export type HistoryStep = { when: string | null; all_day: boolean; status: string; label: string; reason: string | null; action: string | null; by: string | null; at: string; current: boolean };

export type View = 'month' | 'week' | 'day' | 'agenda';
