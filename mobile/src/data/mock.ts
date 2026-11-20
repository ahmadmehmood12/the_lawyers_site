import type { AppNotification, Appointment, Client, DocumentFile, Hearing, Invoice, Lawyer, LegalCase, Payment, Task, TeamMember } from './types';

/** Realistic sample data for the prototype (Pakistani courts, names and case types). */

export const lawyers: Lawyer[] = [
  {
    id: 'lw1', name: 'Ayesha Tariq', firm: 'Tariq & Associates', city: 'Lahore', avatar: null,
    practiceAreas: ['Family', 'Civil', 'Property'], experienceYears: 12, rating: 4.9, reviews: 184,
    consultationFee: 5000, languages: ['Urdu', 'English', 'Punjabi'], verified: true, enrollment: 'LHC-2012-4471',
    bio: 'Advocate of the High Court specialising in family and property disputes, with a focus on swift mediation and clear client communication.',
    courts: ['Lahore High Court', 'District Courts, Lahore'], responseTime: 'Usually within 2 hours',
  },
  {
    id: 'lw2', name: 'Bilal Ahmed Khan', firm: 'Khan Law Chambers', city: 'Karachi', avatar: null,
    practiceAreas: ['Corporate', 'Banking', 'Tax'], experienceYears: 18, rating: 4.8, reviews: 221,
    consultationFee: 8000, languages: ['Urdu', 'English'], verified: true, enrollment: 'SHC-2006-1180',
    bio: 'Corporate counsel advising banks and listed companies on regulatory, banking and taxation matters before the Sindh High Court.',
    courts: ['Sindh High Court', 'Supreme Court of Pakistan'], responseTime: 'Usually within 4 hours',
  },
  {
    id: 'lw3', name: 'Fatima Noor', firm: null, city: 'Islamabad', avatar: null,
    practiceAreas: ['Criminal', 'Human Rights'], experienceYears: 9, rating: 4.7, reviews: 96,
    consultationFee: 4000, languages: ['Urdu', 'English'], verified: true, enrollment: 'IHC-2015-2203',
    bio: 'Criminal defence and human-rights advocate practising before the Islamabad High Court and sessions courts.',
    courts: ['Islamabad High Court', 'Sessions Court, Islamabad'], responseTime: 'Usually within a day',
  },
  {
    id: 'lw4', name: 'Usman Rafiq', firm: 'Rafiq Legal', city: 'Lahore', avatar: null,
    practiceAreas: ['Labour', 'Service', 'Constitutional'], experienceYears: 14, rating: 4.6, reviews: 142,
    consultationFee: 6000, languages: ['Urdu', 'English', 'Punjabi'], verified: true, enrollment: 'LHC-2010-3391',
    bio: 'Service and constitutional litigation, representing government servants and private employees in writ jurisdiction.',
    courts: ['Lahore High Court', 'Federal Service Tribunal'], responseTime: 'Usually within 3 hours',
  },
  {
    id: 'lw5', name: 'Sana Abbas', firm: 'Tariq & Associates', city: 'Lahore', avatar: null,
    practiceAreas: ['Family', 'Guardianship'], experienceYears: 6, rating: 4.8, reviews: 61,
    consultationFee: 3500, languages: ['Urdu', 'English'], verified: true, enrollment: 'LHC-2018-5590',
    bio: 'Associate focusing on guardianship, custody and khula matters, known for a calm, client-first approach.',
    courts: ['Family Court, Lahore'], responseTime: 'Usually within 2 hours',
  },
  {
    id: 'lw6', name: 'Hamza Sheikh', firm: 'Khan Law Chambers', city: 'Karachi', avatar: null,
    practiceAreas: ['Intellectual Property', 'Corporate'], experienceYears: 10, rating: 4.5, reviews: 78,
    consultationFee: 7000, languages: ['Urdu', 'English'], verified: false, enrollment: 'SHC-2014-4420',
    bio: 'Advises start-ups and SMEs on trademarks, licensing and company formation.',
    courts: ['Sindh High Court'], responseTime: 'Usually within a day',
  },
];

export const clients: Client[] = [
  { id: 'cl1', name: 'Imran Yousaf', phone: '+92 300 1234567', email: 'imran.yousaf@example.com', city: 'Lahore', cases: 2, since: '2023', outstanding: 45000, avatar: null },
  { id: 'cl2', name: 'Zainab Malik', phone: '+92 321 2345678', email: 'zainab.malik@example.com', city: 'Lahore', cases: 1, since: '2024', outstanding: 0, avatar: null },
  { id: 'cl3', name: 'Rashid Mehmood', phone: '+92 333 3456789', email: 'rashid.m@example.com', city: 'Sheikhupura', cases: 1, since: '2024', outstanding: 20000, avatar: null },
  { id: 'cl4', name: 'Nadia Hussain', phone: '+92 345 4567890', email: 'nadia.h@example.com', city: 'Lahore', cases: 1, since: '2025', outstanding: 0, avatar: null },
  { id: 'cl5', name: 'Orient Textiles Ltd.', phone: '+92 42 35881234', email: 'legal@orienttex.com', city: 'Faisalabad', cases: 3, since: '2022', outstanding: 180000, avatar: null },
  { id: 'cl6', name: 'Kamran Aziz', phone: '+92 301 5678901', email: 'kamran.aziz@example.com', city: 'Lahore', cases: 1, since: '2025', outstanding: 12000, avatar: null },
];

export const cases: LegalCase[] = [
  {
    id: 'cs1', reference: 'FC-4471/2025', title: 'Imran Yousaf v. Zainab Malik', court: 'Family Court, Lahore', type: 'Family — Maintenance',
    status: 'active', stage: 'Evidence', progress: 55, clientId: 'cl1', clientName: 'Imran Yousaf', lawyers: ['Ayesha Tariq', 'Sana Abbas'],
    nextHearing: '2026-11-26', filedOn: '2025-03-14', parties: { petitioner: 'Imran Yousaf', respondent: 'Zainab Malik' },
    description: 'Petition for maintenance and recovery of dowry articles; evidence of the petitioner under way.',
  },
  {
    id: 'cs2', reference: 'Writ-21229/2025', title: 'Rashid Mehmood v. Province of Punjab', court: 'Lahore High Court', type: 'Constitutional — Service',
    status: 'active', stage: 'Arguments', progress: 70, clientId: 'cl3', clientName: 'Rashid Mehmood', lawyers: ['Usman Rafiq'],
    nextHearing: '2026-11-24', filedOn: '2025-06-02', parties: { petitioner: 'Rashid Mehmood', respondent: 'Province of Punjab & others' },
    description: 'Writ petition challenging a departmental penalty; final arguments fixed before the Division Bench.',
  },
  {
    id: 'cs3', reference: 'CS-889/2024', title: 'Orient Textiles Ltd. v. United Bank', court: 'Sindh High Court', type: 'Banking — Recovery',
    status: 'pending', stage: 'Pleadings', progress: 30, clientId: 'cl5', clientName: 'Orient Textiles Ltd.', lawyers: ['Bilal Ahmed Khan'],
    nextHearing: '2026-12-01', filedOn: '2024-11-20', parties: { petitioner: 'Orient Textiles Ltd.', respondent: 'United Bank Ltd.' },
    description: 'Suit resisting a banking recovery claim; written statement filed, framing of issues awaited.',
  },
  {
    id: 'cs4', reference: 'Cr-1016/2025', title: 'The State v. Kamran Aziz', court: 'Sessions Court, Lahore', type: 'Criminal — Bail',
    status: 'active', stage: 'Bail', progress: 40, clientId: 'cl6', clientName: 'Kamran Aziz', lawyers: ['Fatima Noor'],
    nextHearing: '2026-11-25', filedOn: '2025-09-18', parties: { petitioner: 'The State', respondent: 'Kamran Aziz' },
    firNumber: 'FIR 245/2025, PS Model Town', description: 'Post-arrest bail application; reply of the prosecution awaited.',
  },
  {
    id: 'cs5', reference: 'Suit-342/2024', title: 'Nadia Hussain v. DHA Lahore', court: 'Civil Court, Lahore', type: 'Civil — Property',
    status: 'won', stage: 'Decided', progress: 100, clientId: 'cl4', clientName: 'Nadia Hussain', lawyers: ['Ayesha Tariq'],
    filedOn: '2024-02-10', parties: { petitioner: 'Nadia Hussain', respondent: 'DHA Lahore' },
    description: 'Suit for declaration of ownership; decreed in favour of the plaintiff.',
  },
  {
    id: 'cs6', reference: 'CP-1120/2025', title: 'Orient Textiles Ltd. v. FBR', court: 'Sindh High Court', type: 'Tax — Constitutional',
    status: 'on_hold', stage: 'Stay', progress: 20, clientId: 'cl5', clientName: 'Orient Textiles Ltd.', lawyers: ['Bilal Ahmed Khan', 'Hamza Sheikh'],
    nextHearing: '2026-12-08', filedOn: '2025-08-01', parties: { petitioner: 'Orient Textiles Ltd.', respondent: 'Federal Board of Revenue' },
    description: 'Constitutional petition against a tax demand; interim stay granted, hearing adjourned.',
  },
];

export const hearings: Hearing[] = [
  { id: 'h1', caseId: 'cs2', caseReference: 'Writ-21229/2025', caseTitle: 'Rashid Mehmood v. Province of Punjab', court: 'Lahore High Court', judge: 'Hon’ble Mr. Justice A. Raza', date: '2026-11-24', time: '09:30', purpose: 'Final arguments', status: 'scheduled' },
  { id: 'h2', caseId: 'cs4', caseReference: 'Cr-1016/2025', caseTitle: 'The State v. Kamran Aziz', court: 'Sessions Court, Lahore', judge: 'Addl. Sessions Judge', date: '2026-11-25', time: '11:00', purpose: 'Bail arguments', status: 'scheduled' },
  { id: 'h3', caseId: 'cs1', caseReference: 'FC-4471/2025', caseTitle: 'Imran Yousaf v. Zainab Malik', court: 'Family Court, Lahore', judge: 'Judge Family Court', date: '2026-11-26', time: '10:15', purpose: 'Evidence of petitioner', status: 'scheduled' },
  { id: 'h4', caseId: 'cs3', caseReference: 'CS-889/2024', caseTitle: 'Orient Textiles Ltd. v. United Bank', court: 'Sindh High Court', judge: 'Hon’ble Mr. Justice S. Memon', date: '2026-12-01', time: '09:00', purpose: 'Framing of issues', status: 'scheduled' },
  { id: 'h5', caseId: 'cs1', caseReference: 'FC-4471/2025', caseTitle: 'Imran Yousaf v. Zainab Malik', court: 'Family Court, Lahore', judge: 'Judge Family Court', date: '2026-11-12', time: '10:00', purpose: 'Issues framed', status: 'done', outcome: 'Issues framed; case adjourned for evidence.' },
  { id: 'h6', caseId: 'cs6', caseReference: 'CP-1120/2025', caseTitle: 'Orient Textiles Ltd. v. FBR', court: 'Sindh High Court', judge: 'Division Bench', date: '2026-12-08', time: '09:45', purpose: 'Stay application', status: 'scheduled' },
];

export const appointments: Appointment[] = [
  { id: 'ap1', lawyerId: 'lw1', lawyerName: 'Ayesha Tariq', clientId: 'cl1', clientName: 'Imran Yousaf', date: '2026-11-23', time: '16:00', mode: 'in_person', status: 'confirmed', fee: 5000, purpose: 'Review maintenance case progress' },
  { id: 'ap2', lawyerId: 'lw1', lawyerName: 'Ayesha Tariq', clientId: 'cl4', clientName: 'Nadia Hussain', date: '2026-11-24', time: '12:30', mode: 'online', status: 'pending', fee: 5000, purpose: 'Advice on property mutation' },
  { id: 'ap3', lawyerId: 'lw3', lawyerName: 'Fatima Noor', clientId: 'cl6', clientName: 'Kamran Aziz', date: '2026-11-22', time: '18:00', mode: 'online', status: 'confirmed', fee: 4000, purpose: 'Bail strategy discussion' },
  { id: 'ap4', lawyerId: 'lw2', lawyerName: 'Bilal Ahmed Khan', clientId: 'cl5', clientName: 'Orient Textiles Ltd.', date: '2026-11-20', time: '15:00', mode: 'in_person', status: 'completed', fee: 8000, purpose: 'Banking recovery suit briefing' },
  { id: 'ap5', lawyerId: 'lw5', lawyerName: 'Sana Abbas', clientId: 'cl2', clientName: 'Zainab Malik', date: '2026-11-19', time: '11:00', mode: 'in_person', status: 'cancelled', fee: 3500, purpose: 'Custody consultation' },
  { id: 'ap6', lawyerId: 'lw1', lawyerName: 'Ayesha Tariq', clientId: 'cl1', clientName: 'Imran Yousaf', date: '2026-11-28', time: '17:00', mode: 'online', status: 'pending', fee: 5000, purpose: 'Follow-up consultation' },
];

export const documents: DocumentFile[] = [
  { id: 'd1', name: 'Maintenance petition.pdf', caseReference: 'FC-4471/2025', type: 'pdf', sizeKb: 420, uploadedOn: '2025-03-14', sharedWithClient: true },
  { id: 'd2', name: 'Nikahnama (certified).pdf', caseReference: 'FC-4471/2025', type: 'pdf', sizeKb: 1180, uploadedOn: '2025-03-16', sharedWithClient: true },
  { id: 'd3', name: 'Writ petition draft.docx', caseReference: 'Writ-21229/2025', type: 'docx', sizeKb: 96, uploadedOn: '2025-06-01', sharedWithClient: false },
  { id: 'd4', name: 'Bank statement 2024.pdf', caseReference: 'CS-889/2024', type: 'pdf', sizeKb: 2320, uploadedOn: '2024-11-18', sharedWithClient: false },
  { id: 'd5', name: 'FIR copy.jpg', caseReference: 'Cr-1016/2025', type: 'image', sizeKb: 640, uploadedOn: '2025-09-18', sharedWithClient: true },
  { id: 'd6', name: 'Decree sheet.pdf', caseReference: 'Suit-342/2024', type: 'pdf', sizeKb: 310, uploadedOn: '2025-01-22', sharedWithClient: true },
];

export const invoices: Invoice[] = [
  { id: 'in1', number: 'INV-2026-041', clientId: 'cl1', clientName: 'Imran Yousaf', amount: 45000, paid: 0, status: 'unpaid', issuedOn: '2026-11-10', dueOn: '2026-11-30', items: [{ description: 'Professional fee — maintenance case', amount: 40000 }, { description: 'Court fee and miscellaneous', amount: 5000 }] },
  { id: 'in2', number: 'INV-2026-038', clientId: 'cl5', clientName: 'Orient Textiles Ltd.', amount: 180000, paid: 90000, status: 'partial', issuedOn: '2026-10-28', dueOn: '2026-11-28', items: [{ description: 'Retainer — banking suit', amount: 150000 }, { description: 'Drafting and filing', amount: 30000 }] },
  { id: 'in3', number: 'INV-2026-033', clientId: 'cl4', clientName: 'Nadia Hussain', amount: 60000, paid: 60000, status: 'paid', issuedOn: '2026-09-15', dueOn: '2026-09-30', items: [{ description: 'Professional fee — property suit', amount: 60000 }] },
  { id: 'in4', number: 'INV-2026-029', clientId: 'cl3', clientName: 'Rashid Mehmood', amount: 20000, paid: 0, status: 'overdue', issuedOn: '2026-10-01', dueOn: '2026-10-20', items: [{ description: 'Consultation and drafting', amount: 20000 }] },
  { id: 'in5', number: 'INV-2026-044', clientId: 'cl6', clientName: 'Kamran Aziz', amount: 12000, paid: 0, status: 'unpaid', issuedOn: '2026-11-18', dueOn: '2026-12-02', items: [{ description: 'Bail application fee', amount: 12000 }] },
];

export const payments: Payment[] = [
  { id: 'pm1', receiptNumber: 'RCT-2026-120', clientName: 'Orient Textiles Ltd.', amount: 90000, method: 'bank', date: '2026-11-05', invoiceNumber: 'INV-2026-038' },
  { id: 'pm2', receiptNumber: 'RCT-2026-118', clientName: 'Nadia Hussain', amount: 60000, method: 'card', date: '2026-09-20', invoiceNumber: 'INV-2026-033' },
  { id: 'pm3', receiptNumber: 'RCT-2026-109', clientName: 'Imran Yousaf', amount: 15000, method: 'easypaisa', date: '2026-08-11', invoiceNumber: 'INV-2026-021' },
  { id: 'pm4', receiptNumber: 'RCT-2026-101', clientName: 'Zainab Malik', amount: 25000, method: 'cash', date: '2026-07-30', invoiceNumber: 'INV-2026-014' },
];

export const tasks: Task[] = [
  { id: 't1', title: 'File rejoinder in banking suit', caseReference: 'CS-889/2024', assignee: 'Bilal Ahmed Khan', due: '2026-11-23', status: 'in_progress', priority: 'high' },
  { id: 't2', title: 'Prepare evidence affidavit', caseReference: 'FC-4471/2025', assignee: 'Sana Abbas', due: '2026-11-25', status: 'todo', priority: 'high' },
  { id: 't3', title: 'Collect certified bail order', caseReference: 'Cr-1016/2025', assignee: 'Fatima Noor', due: '2026-11-27', status: 'todo', priority: 'medium' },
  { id: 't4', title: 'Draft written arguments', caseReference: 'Writ-21229/2025', assignee: 'Usman Rafiq', due: '2026-11-22', status: 'in_progress', priority: 'medium' },
  { id: 't5', title: 'Send fee reminder to client', caseReference: 'INV-2026-029', assignee: 'Office', due: '2026-11-21', status: 'done', priority: 'low' },
  { id: 't6', title: 'Book cause-list check for Monday', assignee: 'Office', due: '2026-11-24', status: 'todo', priority: 'low' },
];

export const notifications: AppNotification[] = [
  { id: 'n1', kind: 'hearing', title: 'Hearing tomorrow', body: 'Writ-21229/2025 — final arguments at 09:30, Lahore High Court.', time: '2h ago', read: false },
  { id: 'n2', kind: 'appointment', title: 'Appointment confirmed', body: 'Your consultation with Ayesha Tariq is confirmed for 23 Nov, 4:00 PM.', time: '5h ago', read: false },
  { id: 'n3', kind: 'payment', title: 'Payment received', body: 'Rs 90,000 received against INV-2026-038 from Orient Textiles Ltd.', time: 'Yesterday', read: true },
  { id: 'n4', kind: 'document', title: 'New document shared', body: 'Decree sheet.pdf was shared with you on Suit-342/2024.', time: '2 days ago', read: true },
  { id: 'n5', kind: 'message', title: 'New message', body: 'Fatima Noor: Please bring the original FIR copy to our meeting.', time: '3 days ago', read: true },
  { id: 'n6', kind: 'system', title: 'Case updated', body: 'Stage of FC-4471/2025 changed to Evidence.', time: '4 days ago', read: true },
];

export const team: TeamMember[] = [
  { id: 'tm1', name: 'Ayesha Tariq', designation: 'Partner', role: 'lawyer', email: 'ayesha@tariqlaw.pk', activeCases: 14, status: 'active', avatar: null },
  { id: 'tm2', name: 'Sana Abbas', designation: 'Associate', role: 'associate', email: 'sana@tariqlaw.pk', activeCases: 9, status: 'active', avatar: null },
  { id: 'tm3', name: 'Usman Rafiq', designation: 'Senior Associate', role: 'lawyer', email: 'usman@tariqlaw.pk', activeCases: 11, status: 'active', avatar: null },
  { id: 'tm4', name: 'Hassan Javed', designation: 'Paralegal', role: 'paralegal', email: 'hassan@tariqlaw.pk', activeCases: 0, status: 'active', avatar: null },
  { id: 'tm5', name: 'Mariam Qureshi', designation: 'Office Manager', role: 'staff', email: 'mariam@tariqlaw.pk', activeCases: 0, status: 'invited', avatar: null },
];

export const practiceAreas = ['Family', 'Civil', 'Criminal', 'Property', 'Corporate', 'Banking', 'Tax', 'Labour', 'Service', 'Constitutional', 'Intellectual Property', 'Human Rights'];
export const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'];

/** Who each demo role is "signed in" as, so screens can scope the sample data. */
export const currentClientId = 'cl1';
export const currentClientName = 'Imran Yousaf';
export const currentLawyerName = 'Ayesha Tariq';
export const currentFirm = 'Tariq & Associates';

