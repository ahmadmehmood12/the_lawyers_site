import type { LucideIcon } from 'lucide-react';
import {
    Activity, BadgeCheck, CalendarRange, Clapperboard, Mail, Quote, UsersRound, BarChart3, Bell, BookOpen, Briefcase, Building2, CalendarClock, CalendarDays, ClipboardList, CreditCard, FileSignature, FileText, Gavel, Heart,
    LayoutDashboard, Landmark, MapPinned, MessageSquare, Newspaper, Receipt, ScrollText, Search, Settings, ShieldCheck, Sparkles, Star, Tags, UserCog, Users, Wallet, AlertOctagon, Globe, Inbox, KeyRound,
} from 'lucide-react';

export type NavItem = { label: string; route: string; icon: LucideIcon; match?: string; permission?: string; platform?: string; mobile?: boolean; firmOnly?: boolean; lawyerOnly?: boolean };
export type NavGroup = { label?: string; items: NavItem[] };

export const workspaceNav: NavGroup[] = [
    {
        items: [
            { label: 'Dashboard', route: 'dashboard', icon: LayoutDashboard, mobile: true },
            { label: 'Court Diary', route: 'diary.index', icon: CalendarDays, match: 'diary.*', permission: 'hearings.view', mobile: true },
            { label: 'Calendar', route: 'calendar.index', icon: CalendarRange, match: 'calendar.*' },
            { label: 'Cases', route: 'cases.index', icon: Briefcase, match: 'cases.*', mobile: true },
            { label: 'Clients', route: 'clients.index', icon: Users, match: 'clients.*', permission: 'clients.view' },
            { label: 'Tasks', route: 'tasks.index', icon: ClipboardList, match: 'tasks.*' },
            { label: 'Appointments', route: 'appointments.index', icon: CalendarClock, match: 'appointments.*', permission: 'appointments.manage' },
            { label: 'Messages', route: 'messages.index', icon: MessageSquare, match: 'messages.*', permission: 'messages.client', mobile: true },
        ],
    },
    {
        label: 'Documents',
        items: [
            { label: 'Document Vault', route: 'documents.index', icon: FileText, match: 'documents.*', permission: 'documents.view' },
            { label: 'Legal Drafting', route: 'drafts.index', icon: FileSignature, match: 'drafts.*', permission: 'drafts.manage' },
            { label: 'AI Assistant', route: 'ai.index', icon: Sparkles, match: 'ai.*', permission: 'ai.use' },
        ],
    },
    {
        label: 'Practice',
        items: [
            { label: 'Invoices & Payments', route: 'invoices.index', icon: Wallet, match: 'invoices.*', permission: 'finance.view' },
            { label: 'Analytics', route: 'analytics.index', icon: BarChart3, match: 'analytics.*', permission: 'analytics.view' },
            { label: 'Activity', route: 'activity.index', icon: Activity, match: 'activity.*' },
            { label: 'Team', route: 'team.index', icon: UserCog, match: 'team.*', permission: 'team.manage' },
            { label: 'Public Profile', route: 'lawyer.profile.edit', icon: BadgeCheck, match: 'lawyer.profile.*', lawyerOnly: true },
            { label: 'Articles', route: 'lawyer.articles.index', icon: Newspaper, match: 'lawyer.articles.*', lawyerOnly: true },
            { label: 'Billing', route: 'billing.index', icon: CreditCard, match: 'billing.*', permission: 'organization.settings' },
            { label: 'Settings', route: 'settings.organization', icon: Settings, match: 'settings.*' },
        ],
    },
];

export const portalNav: NavGroup[] = [
    {
        items: [
            { label: 'Dashboard', route: 'portal.dashboard', icon: LayoutDashboard, mobile: true },
            { label: 'Calendar', route: 'calendar.index', icon: CalendarRange, match: 'calendar.*' },
            { label: 'My Cases', route: 'portal.cases.index', icon: Briefcase, match: 'portal.cases.*', mobile: true },
            { label: 'Documents', route: 'portal.documents.index', icon: FileText, match: 'portal.documents.*' },
            { label: 'Messages', route: 'portal.messages.index', icon: MessageSquare, match: 'portal.messages.*', mobile: true },
            { label: 'Appointments', route: 'portal.appointments.index', icon: CalendarClock, match: 'portal.appointments.*' },
            { label: 'Invoices', route: 'portal.invoices.index', icon: Receipt, match: 'portal.invoices.*' },
            { label: 'Find a Lawyer', route: 'lawyers.index', icon: Search, mobile: true },
            { label: 'Favourites', route: 'portal.favourites', icon: Heart },
        ],
    },
];

export const adminNav: NavGroup[] = [
    {
        items: [
            { label: 'Dashboard', route: 'admin.dashboard', icon: LayoutDashboard, mobile: true },
            { label: 'Calendar', route: 'calendar.index', icon: CalendarRange, match: 'calendar.*' },
            { label: 'Users', route: 'admin.users.index', icon: Users, match: 'admin.users.*', platform: 'users.view', mobile: true },
            { label: 'Verification', route: 'admin.verifications.index', icon: ShieldCheck, match: 'admin.verifications.*', platform: 'verification.review', mobile: true },
            { label: 'Organizations', route: 'admin.organizations.index', icon: Building2, match: 'admin.organizations.*', platform: 'organizations.view' },
            { label: 'Appointments', route: 'admin.appointments.index', icon: CalendarClock, match: 'admin.appointments.*', platform: 'organizations.view' },
        ],
    },
    {
        label: 'Directory',
        items: [
            { label: 'Courts', route: 'admin.courts.index', icon: Landmark, match: 'admin.courts.*', platform: 'reference.manage' },
            { label: 'Judges', route: 'admin.judges.index', icon: Gavel, match: 'admin.judges.*', platform: 'reference.manage' },
            { label: 'Specializations', route: 'admin.specializations.index', icon: Tags, match: 'admin.specializations.*', platform: 'reference.manage' },
            { label: 'Geography', route: 'admin.geography.index', icon: MapPinned, match: 'admin.geography.*', platform: 'reference.manage' },
        ],
    },
    {
        label: 'Content',
        items: [
            { label: 'Templates', route: 'admin.templates.index', icon: ScrollText, match: 'admin.templates.*', platform: 'templates.manage' },
            { label: 'Articles', route: 'admin.articles.index', icon: Newspaper, match: 'admin.articles.*', platform: 'content.moderate' },
            { label: 'Reviews', route: 'admin.reviews.index', icon: Star, match: 'admin.reviews.*', platform: 'content.moderate' },
            { label: 'Testimonials', route: 'admin.testimonials.index', icon: Quote, match: 'admin.testimonials.*', platform: 'content.moderate' },
            { label: 'Video Reviews', route: 'admin.video-reviews.index', icon: Clapperboard, match: 'admin.video-reviews.*', platform: 'content.moderate' },
            { label: 'Team & Founders', route: 'admin.team.index', icon: UsersRound, match: 'admin.team.*', platform: 'content.moderate' },
            { label: 'Feedback & Messages', route: 'admin.feedback.index', icon: Inbox, match: 'admin.feedback.*', platform: 'support.manage' },
            { label: 'Complaints', route: 'admin.complaints.index', icon: AlertOctagon, match: 'admin.complaints.*', platform: 'support.manage' },
            { label: 'Website Pages', route: 'admin.pages.index', icon: Globe, match: 'admin.pages.*', platform: 'content.moderate' },
        ],
    },
    {
        label: 'Platform',
        items: [
            { label: 'Plans & Subscriptions', route: 'admin.plans.index', icon: CreditCard, match: 'admin.plans.*', platform: 'billing.manage' },
            { label: 'Payment Methods', route: 'admin.payment-methods.index', icon: Landmark, match: 'admin.payment-methods.*', platform: 'billing.manage' },
            { label: 'Plan Payments', route: 'admin.payments.index', icon: Receipt, match: 'admin.payments.*', platform: 'billing.manage' },
            { label: 'Notifications', route: 'admin.notifications.index', icon: Bell, match: 'admin.notifications.*', platform: 'settings.manage' },
            { label: 'Email Templates', route: 'admin.email-templates.index', icon: Mail, match: 'admin.email-templates.*', platform: 'settings.manage' },
            { label: 'Roles & Permissions', route: 'admin.roles.index', icon: KeyRound, match: 'admin.roles.*', platform: 'roles.manage' },
            { label: 'Audit Log', route: 'admin.audit.index', icon: BookOpen, match: 'admin.audit.*', platform: 'audit.view' },
            { label: 'Settings', route: 'admin.settings.edit', icon: Settings, match: 'admin.settings.*', platform: 'settings.manage' },
        ],
    },
];
