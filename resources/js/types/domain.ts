export type HearingSummary = {
    id: number;
    hearing_date: string;
    hearing_time: string | null;
    hearing_type: string | null;
    hearing_type_label: string | null;
    purpose: string | null;
    status: string;
    status_label: string;
    court: string | null;
    court_id: number | null;
    judge: string | null;
    courtroom: string | null;
    assigned_lawyer: string | null;
    assigned_lawyer_id: number | null;
    preparation_notes: string | null;
    visible_to_client: boolean;
    has_outcome: boolean;
    case?: { id: number; title: string; reference: string; case_number?: string | null };
    clients?: { name: string; phone: string | null }[];
    /** Set when this hearing replaced an earlier date (rescheduled). */
    rescheduled_from?: { id: number; hearing_date: string; hearing_time: string | null; reason: string | null } | null;
    /** Set on the old row when it was moved. */
    rescheduled_to?: { id: number; hearing_date: string; hearing_time: string | null } | null;
    reschedule_reason?: string | null;
    cancellation_reason?: string | null;
};

export type TaskItem = {
    id: number;
    title: string;
    description: string | null;
    due_date: string | null;
    overdue: boolean;
    priority: string;
    priority_label: string;
    status: string;
    status_label: string;
    assignee: string | null;
    assigned_to: number | null;
    case: { id: number; title: string; reference: string } | null;
    legal_case_id: number | null;
};

export type SelectOption = { value: string | number; label: string; [key: string]: unknown };
