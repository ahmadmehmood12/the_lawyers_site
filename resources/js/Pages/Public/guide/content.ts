/**
 * User Guide content (Pages/Public/UserGuide.tsx). Each topic has a screenshot in
 * public/images/guide/{navy-gold|white-green}/{shot}.webp with numbered markers; `steps` follow
 * those numbers. Text is written without hyphens on purpose (house style for the guide).
 */
export type GuideTopic = {
    id: string;
    title: string;
    summary: string;
    shot?: string;
    steps?: string[];
    tips?: string[];
};
export type GuideSection = { id: string; title: string; audience: 'start' | 'lawyer' | 'firm' | 'client' | 'account'; intro: string; topics: GuideTopic[] };

export const guide: GuideSection[] = [
    {
        id: 'getting-started',
        title: 'Getting started',
        audience: 'start',
        intro: 'Create your account, confirm your email with a 6 digit code and open your workspace. A law firm is optional: every advocate gets their own chambers and can work alone.',
        topics: [
            {
                id: 'join-as-lawyer',
                title: 'Join as a lawyer',
                summary: 'Advocates sign up with their Bar details so the team can verify them later.',
                shot: 'register-lawyer',
                steps: [
                    'Open the website and choose Join as a Lawyer. Type your full name, email and mobile number.',
                    'Choose your Bar Council and type your enrollment number and CNIC. These are used only for verification.',
                    'Choose a password, then press Create account.',
                    'We email you a 6 digit code. Type it on the Verify your email page. If it does not arrive, press Send a new code after the timer ends.',
                ],
                tips: [
                    'You do not need a law firm. Your own chambers are created for you and you can start adding cases straight away.',
                    'Have a firm invite code? Open “Joining an existing law firm?” and paste it. You still keep your own chambers.',
                ],
            },
            {
                id: 'register-firm',
                title: 'Register a law firm',
                summary: 'Firm owners create the firm, then invite their advocates and staff.',
                shot: 'register-firm',
                steps: [
                    'Choose Register a Law Firm on the sign up page.',
                    'Type the firm name and registration number, then your own Bar details as the owner.',
                    'Confirm your email with the 6 digit code. The firm workspace opens with you as the owner.',
                ],
                tips: ['After signing in, go to Team to invite members and to Settings to add the firm logo and address.'],
            },
            {
                id: 'dashboard',
                title: 'Your dashboard',
                summary: 'The first page after signing in. It shows today in court, what is coming up and your open tasks.',
                shot: 'dashboard',
                steps: [
                    'Court Diary in the left menu opens today’s hearings, court by court.',
                    'Agenda lists what is coming up over the next days so nothing is missed.',
                ],
                tips: ['Use the switcher at the top of the menu to move between your own chambers and any firm you belong to.'],
            },
        ],
    },
    {
        id: 'daily-work',
        title: 'Lawyers: daily work',
        audience: 'lawyer',
        intro: 'Everything you do in court and in chambers: the diary, orders, cases, tasks, clients, documents, drafts and fees.',
        topics: [
            {
                id: 'court-diary',
                title: 'Create and use the court diary',
                summary: 'The diary is your cause list. Every hearing you schedule appears here on its date, with court, room, purpose and client.',
                shot: 'diary',
                steps: [
                    'Each card is one hearing. Press Record after the hearing to write down what happened.',
                    'Use the arrows to move a day back or forward, or switch to Week, Month or Agenda.',
                ],
                tips: [
                    'Hearings enter the diary automatically when you schedule them from a case. Use Diary note for anything else, such as a bar meeting.',
                    'Print / PDF gives you a clean cause list to carry to court.',
                ],
            },
            {
                id: 'record-order',
                title: 'Record the order at the bench',
                summary: 'Write the order and the next date from your phone before leaving court. It joins the case history and the client is told the next date.',
                shot: 'diary-record',
                steps: [
                    'Type the order passed by the court. Mark whether you and the client were present.',
                    'Tick Schedule the next hearing and pick the next date, time and purpose.',
                    'Press Save. The order is added to the case history and the next hearing appears in the diary.',
                ],
                tips: [
                    'Photograph or upload the court order to keep a copy with the hearing.',
                    'Saving again later creates an audited correction. The original entry is never overwritten.',
                    'If the client agreed to WhatsApp, they receive the next date in English and Urdu.',
                ],
            },
            {
                id: 'calendar',
                title: 'Calendar',
                summary: 'All hearings, appointments, tasks and diary notes in one calendar.',
                shot: 'calendar',
                steps: ['Today brings you back to the current date.', 'Switch between month, week and list views.'],
                tips: ['Click an entry to open it, reschedule it or see its history.'],
            },
            {
                id: 'cases',
                title: 'Find your cases',
                summary: 'Every case file you can access, with filters for status, court, type and lawyer.',
                shot: 'cases',
                steps: ['New case opens a blank case file.', 'Filter by status to see active, adjourned or disposed matters.'],
            },
            {
                id: 'new-case',
                title: 'Open a new case',
                summary: 'A case holds the parties, FIR, sections, court, judge, clients and the case team.',
                shot: 'case-create',
                steps: [
                    'Type a clear case title, for example State vs. Ali Raza.',
                    'Choose the case type, such as criminal, civil or family.',
                    'Choose the court, then the judge and courtroom if you know them.',
                ],
                tips: ['Link the client so they can follow the case in their portal, and add the lawyers working on it under Case team.'],
            },
            {
                id: 'case-file',
                title: 'Work inside a case file',
                summary: 'The case page is the whole matter: hearings, orders, documents, tasks, fees and notes.',
                shot: 'case-show',
                steps: [
                    'Schedule hearing adds the next date. It appears in the diary and the calendar.',
                    'Private notes stay inside your chambers and are never shown to clients.',
                    'Case team shows who is working on the matter.',
                ],
                tips: ['Client portal view shows exactly what your client can see.'],
            },
            {
                id: 'tasks',
                title: 'Tasks with the Kanban board',
                summary: 'Plan work before the next date. The board has columns for Open, In progress, Done and Cancelled.',
                shot: 'tasks-board',
                steps: ['New task creates a card.', 'Board shows the Kanban view. Drag a card to another column to change its status.'],
                tips: ['My tasks shows only your cards. All tasks shows the whole team.'],
            },
            {
                id: 'new-task',
                title: 'Create a task',
                summary: 'Give the task a title, an owner and a due date, and link it to a case if it belongs to one.',
                shot: 'task-create',
                steps: [
                    'Type what needs doing, for example Collect certified copy of FIR.',
                    'Assign it to yourself or a team member.',
                    'Pick the due date.',
                    'Press Save. The card appears in the Open column.',
                ],
            },
            {
                id: 'clients',
                title: 'Clients',
                summary: 'Everyone you represent, with their cases and contact details.',
                shot: 'clients',
                steps: ['New client opens the client form.'],
            },
            {
                id: 'new-client',
                title: 'Add a client',
                summary: 'Clients can be a person or a company.',
                shot: 'client-create',
                steps: [
                    'Choose whether the client is a person or a company.',
                    'Type the mobile number. It is used for WhatsApp reminders when the client agrees.',
                    'CNIC is optional and kept private.',
                ],
                tips: ['Invite the client to the portal so they can see their hearings, shared documents and invoices.'],
            },
            {
                id: 'documents',
                title: 'Document vault',
                summary: 'Private, versioned storage for every file. Every download is logged.',
                shot: 'documents',
                steps: ['Upload adds a file and links it to a case.'],
                tips: ['Mark sensitive files as confidential. Share a document with the client only when you choose.'],
            },
            {
                id: 'drafting',
                title: 'Legal drafting',
                summary: 'Draft bail applications, suits, notices and agreements from templates. The case fills in the parties, FIR and sections.',
                shot: 'drafts',
                steps: ['New draft starts a document from a template.'],
            },
            {
                id: 'new-draft',
                title: 'Draft from a template',
                summary: 'Choose a template and link the case, then edit the text in the editor.',
                shot: 'draft-create',
                steps: ['Pick a template, for example Post arrest bail under section 497.', 'Link the case so names, FIR and sections are filled in.'],
                tips: ['Export as PDF or Word. Send for review if a senior must approve it. Nothing is ever filed in court for you.'],
            },
            {
                id: 'invoices',
                title: 'Invoices and payments',
                summary: 'Bill clients, take part payments and issue numbered receipts.',
                shot: 'invoices',
                steps: ['New invoice bills a client for a case.', 'Export CSV downloads invoices for your accountant.'],
            },
            {
                id: 'record-payment',
                title: 'Record a payment and issue a receipt',
                summary: 'Open an invoice to record money received. A numbered receipt is created as PDF.',
                shot: 'invoice-show',
                steps: ['Press Record payment, type the amount, date and method (cash, bank transfer or cheque), then save.'],
                tips: ['Refunds and voided invoices keep a full audit trail.'],
            },
            {
                id: 'appointments',
                title: 'Appointments and consultations',
                summary: 'Clients book consultations from your public profile. You accept, decline or move them.',
                shot: 'appointments',
                steps: ['Consultation hours sets the days and times clients can book.'],
                tips: ['Both sides get email and WhatsApp updates when an appointment is accepted, moved or cancelled.'],
            },
            {
                id: 'messages',
                title: 'Messages',
                summary: 'Chat with clients and other lawyers. Ticks show sent, delivered and read.',
                shot: 'messages',
            },
            {
                id: 'ai',
                title: 'AI assistant',
                summary: 'Summaries, chronologies, translation and first drafts. Always check the result before you rely on it.',
                shot: 'ai',
                steps: ['Open assistant and choose what you need. Names from the case are masked.'],
            },
            { id: 'analytics', title: 'Analytics', summary: 'Cases by court and status, hearings held, workload and fees over the last 12 months.', shot: 'analytics' },
            { id: 'activity', title: 'Activity log', summary: 'Who did what and when, with the IP address, across your chambers.', shot: 'activity' },
        ],
    },
    {
        id: 'public-profile',
        title: 'Lawyers: your public profile',
        audience: 'lawyer',
        intro: 'Your profile appears in the lawyer directory. A complete, verified profile is what clients book.',
        topics: [
            {
                id: 'profile-identity',
                title: 'Photo and introduction',
                summary: 'The profile is filled in six short steps shown on the left.',
                shot: 'profile',
                steps: ['Upload a clear, recent photograph.', 'Write one line about your practice, for example Advocate High Court, criminal and family litigation.'],
                tips: ['Write your introduction in English and Urdu so every client can read it.'],
            },
            {
                id: 'profile-experience',
                title: 'Add education, experience and credentials',
                summary: 'Open Education & experience in the profile steps.',
                shot: 'profile-experience',
                steps: [
                    'Under Education, press Add and type the degree, institution and year.',
                    'Under Previous positions, press Add and type the position, chambers or organization and the years.',
                    'Under Publications & certifications, press Add, choose the type and type the title, issuer and year.',
                ],
                tips: ['Press Save and continue at the end. These details are self reported unless verified.'],
            },
            {
                id: 'verification',
                title: 'Get the Verified badge',
                summary: 'Our team checks your Bar enrollment before your profile shows Verified.',
                shot: 'verification',
                steps: ['Upload a scan of your Bar card or enrollment certificate as PDF or image, then press Submit for verification. This page shows your status.'],
                tips: ['Documents are locked while they are being reviewed. If more information is needed, you will see the reason here.'],
            },
            {
                id: 'articles',
                title: 'Write legal articles',
                summary: 'Articles appear in the legal library after review and show your name.',
                shot: 'articles',
                steps: ['New article opens the article editor.'],
            },
            {
                id: 'new-article',
                title: 'Write and submit an article',
                summary: 'The editor opens as its own page with room for the full article.',
                shot: 'article-create',
                steps: [
                    'Type a clear title.',
                    'Add tags one by one: type a tag and press Enter. Each tag becomes a small card you can remove with ×.',
                    'Save draft keeps working. Submit for review sends it to our team.',
                ],
                tips: ['Open any article from My articles to edit it. All its text, category and tags load ready to change.'],
            },
        ],
    },
    {
        id: 'law-firms',
        title: 'Law firms',
        audience: 'firm',
        intro: 'Firm owners manage the team, roles, firm details and the plan. Everything in the lawyer sections works the same inside a firm.',
        topics: [
            {
                id: 'team',
                title: 'Invite your team and give roles',
                summary: 'Add advocates and staff. Each role sees only what it needs.',
                shot: 'team',
                steps: ['Invite a member by email and choose their role.', 'Roles decide access: owner, senior advocate, associate, junior, legal assistant, clerk, receptionist and accountant.'],
                tips: ['Juniors and assistants see only the cases they are assigned to. The receptionist sees clients, the diary and appointments, but not case files.'],
            },
            {
                id: 'firm-settings',
                title: 'Firm details and directory listing',
                summary: 'Name, logo, address and contact details, and whether the firm appears in the public directory.',
                shot: 'settings',
                steps: ['Type the firm or chambers name as clients should see it.', 'Tick to list the firm in the public law firm directory.'],
                tips: ['Notification settings choose which events send email or WhatsApp to clients.'],
            },
            {
                id: 'billing',
                title: 'Plans and billing',
                summary: 'See your plan, upgrade and pay. If you reach a limit, an Upgrade window shows the next plan and its price.',
                shot: 'billing',
                tips: ['Nothing you have added is ever removed when a plan ends. Only adding more beyond the free limits is paused.'],
            },
        ],
    },
    {
        id: 'clients',
        title: 'Clients',
        audience: 'client',
        intro: 'Find a lawyer, book a consultation and follow your case, documents and invoices in your portal.',
        topics: [
            {
                id: 'find-lawyer',
                title: 'Find a lawyer',
                summary: 'Search verified advocates by name, city, court and practice area.',
                shot: 'find-lawyer',
                steps: ['Type a name or keyword, or use the filters.', 'Book appointment on a card starts a booking.'],
            },
            {
                id: 'lawyer-profile',
                title: 'Read a lawyer’s profile',
                summary: 'Experience, courts, fees, reviews and articles in one place.',
                shot: 'lawyer-profile',
                steps: ['Book a consultation opens the booking page.'],
            },
            {
                id: 'book-lawyer',
                title: 'Book a lawyer',
                summary: 'Choose a time and describe your matter. The lawyer accepts or suggests another time.',
                shot: 'portal-book',
                steps: [
                    'Choose online or at the chamber.',
                    'Write a few lines about your matter. Do not share passwords or confidential documents here.',
                    'Press Request appointment. You are told by email, and on WhatsApp if you agree, when the lawyer replies.',
                ],
            },
            { id: 'portal', title: 'Your portal', summary: 'Your next hearing, appointments, messages and invoices at a glance.', shot: 'portal' },
            { id: 'portal-cases', title: 'Follow your case', summary: 'See hearings and orders your lawyer shares with you, and the next date.', shot: 'portal-cases' },
            { id: 'portal-documents', title: 'Shared documents', summary: 'Download documents your lawyer has shared with you.', shot: 'portal-documents' },
            { id: 'portal-invoices', title: 'Invoices and receipts', summary: 'See what is due, what you have paid and download receipts.', shot: 'portal-invoices' },
            { id: 'portal-appointments', title: 'Your appointments', summary: 'Upcoming and past consultations. Ask for a new time if you cannot attend.', shot: 'portal-appointments' },
        ],
    },
    {
        id: 'account',
        title: 'Account and security',
        audience: 'account',
        intro: 'Keep your account safe and your details current.',
        topics: [
            {
                id: 'account-settings',
                title: 'Profile, password and two step sign in',
                summary: 'Change your photo, name, password and language, and see where you are signed in.',
                shot: 'account',
                steps: ['Turn on two factor authentication and scan the code with an authenticator app.'],
                tips: [
                    'Forgot your password? Choose Forgot password on the sign in page, type your email and enter the 6 digit code we send, then choose a new password.',
                    'Sign out other sessions if you used a shared computer.',
                ],
            },
        ],
    },
];
