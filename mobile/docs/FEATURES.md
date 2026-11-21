# Feature Mapping

Status values: `Live` (verified endpoint integrated), `UI demo` (screen exists but
only with `EXPO_PUBLIC_DEMO_MODE=1`), `Blocked` (web feature exists, no API).

| Web feature | Mobile screen(s) | Required API | Roles | Status |
|---|---|---|---|---|
| App config / maintenance | Splash | `GET /api/app/config` | public | Live |
| Onboarding | Onboarding | none | public | Live (local first-launch state) |
| Login/register/forgot/reset/Google | Login, Register, ForgotPassword | `/api/v1/auth/*` | public | Blocked; UI demo |
| Lawyer discovery + filters + list/grid | FindLawyers, Home | `GET /api/v1/lawyers` | public/client | Blocked; UI demo with debounced search, area/city/experience/fee/verified filters, list/grid views |
| Lawyer profile/reviews | LawyerProfile | `GET /api/v1/lawyers/{slug}` | public/client | Blocked; UI demo |
| Firm discovery/profile | Home, new firm profile route | `GET /api/v1/firms` | public/client | Blocked; UI demo |
| Practice areas | FindLawyers chips | `GET /api/v1/specializations` | public | Blocked; UI demo |
| Booking consultation | BookAppointment | slots + book endpoints | client | Blocked; UI demo |
| Lawyer dashboard KPIs | LawyerHome | `GET /api/v1/dashboard` | lawyer/staff | Blocked; UI demo |
| Client dashboard | ClientHome | `GET /api/v1/dashboard` | client | Blocked; UI demo |
| Firm dashboard/analytics | FirmDashboard, Analytics | `GET /api/v1/dashboard`, analytics | lawyer/staff | Blocked; UI demo |
| Cases + details + timeline | LawyerCases, ClientCases, FirmCases, CaseDetail | `GET /api/v1/cases`, detail, timeline | all | Blocked; UI demo |
| Court diary + hearings | CourtDiary, CaseDetail | `GET /api/v1/diary`, hearings | lawyer/client | Blocked; UI demo |
| Full calendar | CourtDiary (agenda), calendar screen pending | `GET /api/v1/calendar-events` | all | Blocked |
| Clients/profiles | Clients, ClientDetail | `GET /api/v1/clients` | lawyer/staff | Blocked; UI demo |
| Appointments + accept/reject/reschedule/cancel | Appointment screens | appointment endpoints | all | Blocked; UI demo |
| Meetings/consultations | AppointmentDetail | appointment endpoints | all | Blocked; UI demo |
| Fees/payments/receipts | Finance, ClientPayments | invoice/payment endpoints | all | Blocked; UI demo |
| PDF receipts/documents | Documents, Finance | document/invoice PDF endpoints | all | Blocked; UI demo |
| WhatsApp/email preferences | NotificationPrefs | `GET/PUT /api/v1/notification-preferences` | authenticated | Blocked; UI demo |
| Lawyer profile/professional info | EditProfile, LawyerMore | `GET/PUT /api/v1/me` | lawyer | Blocked; UI demo |
| Firm management/team/roles | FirmTeam, RolesPermissions, TeamMemberDetail | team/roles endpoints | owner/staff | Blocked; UI demo |
| Legal document vault | Documents | document endpoints | lawyer/client | Blocked; UI demo |
| AI legal assistant | AI screen pending | `POST /api/v1/ai/run` | lawyer with `ai.use` | Blocked |
| Judgment search/detail/saved/download | Judgments screens pending | judgment endpoints | public/auth | Blocked |
| Settings/security/account | Settings, EditProfile | account endpoints | authenticated | Blocked; UI demo |
| Notifications | NotificationsScreen | `GET /api/v1/notifications` | authenticated | Blocked; UI demo |
| Messages | Messages screen pending | conversation endpoints | authenticated | Blocked |

Every `Blocked` row has proposed endpoint details in `API_INTEGRATION.md`.
No production screen uses mock data; demo data is isolated behind
`EXPO_PUBLIC_DEMO_MODE=1`.
