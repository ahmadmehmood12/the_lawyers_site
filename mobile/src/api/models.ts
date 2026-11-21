/** Shapes returned by the Laravel /api/v1 endpoints (see Swagger at /api/documentation). */

export type Envelope<T> = { status: 'Success' | 'Failed'; message: string; timestamp: string; data: T; meta?: PageMeta; errors?: Record<string, string[]> };
export type PageMeta = { current_page: number; last_page: number; per_page: number; total: number; unread?: number };
export type Page<T> = { items: T[]; meta: PageMeta };
/** Laravel paginator as Inertia serializes it (workspace lists). */
export type LaravelPage<T> = { data: T[]; current_page: number; last_page: number; total: number; per_page: number };
export type Option<V = string | number> = { value: V; label: string };

export type Area = 'client' | 'lawyer' | 'firm' | 'admin';

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  account_type: 'client' | 'lawyer' | 'staff' | 'platform';
  area: Area;
  locale: 'en' | 'ur';
  email_verified: boolean;
  two_factor_enabled: boolean;
  lawyer_profile_slug: string | null;
  organization: { id: number; name: string; type: 'solo' | 'firm'; logo_url: string | null; role: string | null; permissions: string[] } | null;
  unread: { notifications: number; messages: number; appointments: number };
};

export type LoginResult = { two_factor: true; challenge_token: string } | { two_factor: false; token: string; token_type: 'Bearer'; user: User };

export type Specialization = { slug: string; name: string; description?: string | null; icon?: string | null; count?: number };

export type LawyerCard = {
  slug: string;
  name: string;
  headline: string | null;
  photo_url: string | null;
  city: string | null;
  specializations: { slug: string; name: string }[];
  bar_council: string | null;
  category_label: string | null;
  years_experience: number | null;
  languages: string[];
  courts: string[];
  firm: { name: string; slug: string } | null;
  fee_min: number | null;
  fee_max: number | null;
  offers_online: boolean;
  offers_in_person: boolean;
  accepting_clients: boolean;
  verified: boolean;
  rating: number | null;
  rating_count: number;
  cases_handled?: number;
  cases_completed?: number;
};

export type LawyerProfile = {
  lawyer: LawyerCard & {
    bio: string | null;
    enrollment_number: string | null;
    chamber_address: string | null;
    public_phone: string | null;
    public_email: string | null;
    province: string | null;
    district: string | null;
    educations: { degree: string; institution: string; year: number | null }[];
    experiences: { position: string; organization: string; start_year: number | null; end_year: number | null; is_current: boolean; description: string | null }[];
    credentials: { type: string; title: string; issuer: string | null; year: number | null; url: string | null }[];
    verified_at: string | null;
    firms: { name: string; slug: string }[];
    reviews: { id: number; rating: number; title: string | null; comment: string; author: string; response: string | null; created_at: string }[];
  };
  stats: { cases_recorded: number; active_cases: number; courts_represented: number };
  isFavourite: boolean;
  canBook: boolean;
};

export type FirmCard = { slug: string; name: string; city: string | null; logo_url: string | null; members: number; founded_year: number | null; excerpt: string; focus: string[] };
export type FirmProfile = {
  firm: FirmCard & { description: string | null; address: string | null; phone: string | null; email: string | null; website: string | null };
  lawyers: { slug: string; name: string; headline: string | null; verified: boolean; photo_url: string | null; specializations: string[] }[];
};

export type CourtHoliday = { id: number; title: string; starts_on: string; ends_on: string; days: number; kind: string };
export type Home = { specializations: Specialization[]; stats: { lawyers: number; verified: number; firms: number }; courtHolidays: CourtHoliday[]; lawyers: LawyerCard[]; firms: FirmCard[] };
export type Slots = { lawyer: { slug: string; name: string; fee: number | null; accepting: boolean }; slots: { starts_at: string; mode: string }[]; modes: Option<string>[] };

export type ClientAppointment = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  status_label: string;
  mode: string;
  mode_value: string;
  lawyer: string;
  lawyer_avatar: string | null;
  meeting_link: string | null;
  cancellable: boolean;
  reschedulable: boolean;
  cancellation_reason: string | null;
  rescheduled_from: string | null;
};

export type Hearing = {
  id: number;
  hearing_date: string;
  hearing_time: string | null;
  status: string;
  status_label: string;
  purpose: string | null;
  court: string | null;
  case?: { id: number; title: string; reference?: string; case_number?: string } | null;
  client_note?: string | null;
  order_passed?: string | null;
  next_hearing_date?: string | null;
};

export type ClientDashboard = { stats: { cases: number; upcoming: number; documents: number; due: number }; nextHearings: Hearing[]; appointments: ClientAppointment[]; lawyers: { name: string; slug: string | null }[]; courtHolidays: CourtHoliday[] };
export type ClientCase = { id: number; title: string; case_number: string | null; status: string; status_label: string; court: string | null; organization: string; lawyers: string[]; next_hearing_at: string | null };
export type ClientCaseDetail = {
  legalCase: { id: number; title: string; case_number: string | null; case_type: string; status: string; status_label: string; stage: string | null; court: string | null; organization: string; summary: string | null; filing_date: string | null; lawyers: { id: number; name: string; slug: string | null }[] };
  hearings: Hearing[];
  timeline: { id: number; title: string; description: string | null; occurred_at: string }[];
  documents: { id: number; title: string; category: string; mime: string | null; size: number | null; updated_at: string }[];
};
export type ClientInvoice = { id: number; number: string; issue_date: string; due_date: string | null; total: string; amount_paid: string; balance: string; status: string; status_label: string; organization: string; case: string | null };

export type WorkspaceAppointment = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  status_label: string;
  mode: string;
  mode_label: string;
  contact_name: string | null;
  contact_phone: string | null;
  client_id: number | null;
  lawyer: string;
  client_message: string | null;
  lawyer_notes: string | null;
  meeting_link: string | null;
  fee: string | null;
  cancellation_reason: string | null;
};

export type Task = { id: number; title: string; due_date: string | null; overdue: boolean; priority_label: string; status_label: string; case: { id: number; title: string } | null };
export type WorkspaceDashboard = {
  stats: { totalCases: number; activeCases: number; todayHearings: number; upcomingHearings: number; pendingTasks: number; clients: number | null; consultationRequests: number | null; unreadMessages: number; outstanding: number | null; monthRevenue: number | null };
  index: { documents: number | null; draftsInReview: number | null; appointmentsUpcoming: number; invoicesOverdue: number | null; ordersThisMonth: number };
  todayHearings: Hearing[];
  upcoming: Hearing[];
  tasks: Task[];
  breakdown: { bySpecialization: { label: string; value: number }[]; byCourt: { label: string; value: number }[] };
  activity: { id: number; sentence: string; actor: string | null; actor_avatar: string | null; created_at: string }[];
  profile: { verification_status: string; verification_label: string; is_public: boolean } | null;
  courtHolidays: CourtHoliday[];
};
export type WorkspaceCase = { id: number; reference: string; title: string; case_number: string | null; case_type_label: string; status: string; status_label: string; priority: string; priority_label: string; court: string | null; clients: string[]; lawyers: string[]; next_hearing_at: string | null };
export type WorkspaceClient = { id: number; name: string; type: string; company_name: string | null; phone: string | null; email: string | null; city: string | null; cases_count: number; has_portal: boolean; avatar_url: string | null };
export type TeamMember = { id: number; user_id: number; name: string; avatar_url: string | null; email: string; phone: string | null; role: string; role_label: string; status: string; status_label: string; is_owner: boolean; joined_at: string | null };
export type AppNotification = { id: string; data: { title: string; body: string; url?: string | null; icon?: string; event?: string }; read_at: string | null; created_at: string };
export type Preferences = { events: string[]; channels: Option<string>[]; defaults: Record<string, boolean>; preferences: { event: string; channel: string; enabled: boolean }[]; whatsapp_consent: boolean };
export type AvailabilitySlot = { id?: number; weekday: number; starts_at: string; ends_at: string; mode: 'online' | 'in_person' | 'both' };
