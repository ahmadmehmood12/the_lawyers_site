# Product Overview

Da Barrister mobile is the companion app for the existing Laravel/Inertia web
platform. The web platform and its MySQL database are the source of truth. The
app must not duplicate business rules or introduce local data as production data.

## Verified platform audiences

- **Clients** (`account_type=client`) — portal routes under `/portal`.
- **Lawyers / firm staff** (`account_type=lawyer|staff`) — workspace routes under
  `/dashboard`, `/cases`, `/diary`, `/appointments`, etc.
- **Law firm owners and teams** — the same workspace routes, scoped by
  `current_organization_id` and organization permissions from `config/legal.php`.
- **Platform staff** — admin routes under `/admin`, guarded by Spatie roles and
  permissions from `database/seeders/PlatformRolesSeeder.php`.

Organization roles (`config/legal.php`): `owner`, `senior_advocate`,
`associate_advocate`, `junior_advocate`, `legal_assistant`, `clerk`,
`receptionist`, `accountant`. Platform roles: `super_admin`, `admin`,
`verification_officer`, `support`, `finance_admin`.

## Verified web modules

Public discovery: lawyer directory, law firm directory, practice areas,
judgments, articles, pricing, FAQs, contact, CMS pages.

Client portal: dashboard, cases, shared documents, invoices/receipts,
appointments (cancel/reschedule/slots), booking, favourites, messages.

Workspace: dashboard, court diary, calendar, cases, clients, tasks, messages,
document vault, drafts, legal forms, AI assistant, invoices/payments, analytics,
activity, team, public lawyer profile, articles, judgments, billing, settings.

Admin: dashboard, analytics, users, verification, organizations, appointments,
reference data, content, plans, payment methods, notifications, roles, audit,
support, settings (including mobile app configuration).

## Current product constraint

`routes/api.php` contains only webhooks, judgment import endpoints, and
`GET /api/app/config`. There is no REST API and no API token guard. Fortify uses
the session `web` guard; Google sign-in is a session redirect flow. Per product
decision, the mobile work is client-only: verified contracts are integrated,
all other modules are documented as backend gaps, and no fake data is used in
production mode.

## Target user journeys

1. Guest: launch → onboarding → app config → discover lawyers/firms → sign in
   (blocked until an API exists).
2. Client: dashboard → shared cases/hearings → appointments → documents →
   invoices/receipts → messages.
3. Lawyer: dashboard → cause list → diary/calendar → case detail → clients →
   appointment requests → documents → fees → profile/settings.
4. Firm: overview → team → cases → workload → financial overview → settings.

Status of each journey is tracked in `IMPLEMENTATION_STATUS.md`.
