/**
 * Domain types for the prototype. They mirror the web app's models
 * (legal_cases, clients, hearings, appointments, lawyer_profiles, invoices,
 * tasks, notifications, …) closely enough to swap mock data for a real
 * Laravel/Sanctum API later with minimal change.
 */

export type Role = 'client' | 'lawyer' | 'firm';

export type CaseStatus = 'active' | 'pending' | 'won' | 'lost' | 'closed' | 'on_hold';
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
export type AppointmentMode = 'online' | 'in_person';
export type InvoiceStatus = 'paid' | 'unpaid' | 'partial' | 'overdue';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export type Person = {
  id: string;
  name: string;
  avatar?: string | null;
};

export type Lawyer = Person & {
  firm?: string | null;
  city: string;
  practiceAreas: string[];
  experienceYears: number;
  rating: number;
  reviews: number;
  consultationFee: number;
  languages: string[];
  verified: boolean;
  enrollment: string;
  bio: string;
  courts: string[];
  responseTime: string;
};

export type Client = Person & {
  phone: string;
  email: string;
  city: string;
  cases: number;
  since: string;
  outstanding: number;
};

export type LegalCase = {
  id: string;
  reference: string;
  title: string;
  court: string;
  type: string;
  status: CaseStatus;
  stage: string;
  progress: number;
  clientId: string;
  clientName: string;
  lawyers: string[];
  nextHearing?: string;
  filedOn: string;
  parties: { petitioner: string; respondent: string };
  firNumber?: string;
  description: string;
};

export type Hearing = {
  id: string;
  caseId: string;
  caseReference: string;
  caseTitle: string;
  court: string;
  judge: string;
  date: string;
  time: string;
  purpose: string;
  status: 'scheduled' | 'done' | 'adjourned';
  outcome?: string;
};

export type Appointment = {
  id: string;
  lawyerId: string;
  lawyerName: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  mode: AppointmentMode;
  status: AppointmentStatus;
  fee: number;
  purpose: string;
};

export type DocumentFile = {
  id: string;
  name: string;
  caseReference?: string;
  type: 'pdf' | 'docx' | 'image';
  sizeKb: number;
  uploadedOn: string;
  sharedWithClient: boolean;
};

export type InvoiceItem = { description: string; amount: number };
export type Invoice = {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  amount: number;
  paid: number;
  status: InvoiceStatus;
  issuedOn: string;
  dueOn: string;
  items: InvoiceItem[];
};

export type Payment = {
  id: string;
  receiptNumber: string;
  clientName: string;
  amount: number;
  method: 'cash' | 'bank' | 'card' | 'easypaisa';
  date: string;
  invoiceNumber: string;
};

export type Task = {
  id: string;
  title: string;
  caseReference?: string;
  assignee: string;
  due: string;
  status: TaskStatus;
  priority: Priority;
};

export type AppNotification = {
  id: string;
  kind: 'hearing' | 'appointment' | 'payment' | 'document' | 'message' | 'system';
  title: string;
  body: string;
  time: string;
  read: boolean;
};

export type TeamMember = Person & {
  designation: string;
  role: 'lawyer' | 'associate' | 'paralegal' | 'staff' | 'admin';
  email: string;
  activeCases: number;
  status: 'active' | 'invited' | 'inactive';
};
