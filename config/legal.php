<?php

/*
|--------------------------------------------------------------------------
| Legal platform configuration
|--------------------------------------------------------------------------
| Organization permission catalogue and default role matrix. Every
| organization-scoped authorization check goes through
| App\Services\Access\OrganizationAccess, which reads this file.
| See docs/Architecture/Authorization.md.
*/

return [

    'org_permissions' => [
        'cases.view_all', 'cases.view_assigned', 'cases.create', 'cases.update', 'cases.archive', 'cases.assign',
        'clients.view', 'clients.create', 'clients.update', 'clients.delete', 'clients.view_sensitive',
        'hearings.view', 'hearings.manage', 'hearings.record_outcome',
        'diary.view_all', 'tasks.manage', 'expenses.manage',
        'documents.view', 'documents.upload', 'documents.share', 'documents.delete', 'documents.view_confidential',
        'drafts.manage', 'drafts.approve',
        'finance.view', 'finance.invoice', 'finance.record_payment', 'finance.refund', 'finance.export',
        'appointments.manage', 'messages.client',
        'team.manage', 'organization.settings', 'analytics.view', 'ai.use', 'activity.view_all',
    ],

    'org_roles' => [
        'owner' => ['*'],
        'senior_advocate' => [
            'cases.view_all', 'cases.view_assigned', 'cases.create', 'cases.update', 'cases.archive', 'cases.assign',
            'clients.view', 'clients.create', 'clients.update', 'clients.view_sensitive',
            'hearings.view', 'hearings.manage', 'hearings.record_outcome',
            'diary.view_all', 'tasks.manage', 'expenses.manage',
            'documents.view', 'documents.upload', 'documents.share', 'documents.delete', 'documents.view_confidential',
            'drafts.manage', 'drafts.approve', 'finance.view', 'finance.invoice', 'finance.record_payment',
            'appointments.manage', 'messages.client', 'analytics.view', 'ai.use', 'activity.view_all',
        ],
        'associate_advocate' => [
            'cases.view_assigned', 'cases.create', 'cases.update',
            'clients.view', 'clients.create', 'clients.update',
            'hearings.view', 'hearings.manage', 'hearings.record_outcome',
            'tasks.manage', 'expenses.manage',
            'documents.view', 'documents.upload', 'documents.share', 'documents.view_confidential',
            'drafts.manage', 'appointments.manage', 'messages.client', 'ai.use',
        ],
        'junior_advocate' => [
            'cases.view_assigned', 'cases.update', 'clients.view',
            'hearings.view', 'hearings.manage', 'hearings.record_outcome',
            'tasks.manage', 'documents.view', 'documents.upload', 'drafts.manage', 'ai.use',
        ],
        'legal_assistant' => [
            'cases.view_assigned', 'clients.view', 'hearings.view', 'tasks.manage',
            'documents.view', 'documents.upload', 'drafts.manage',
        ],
        'clerk' => [
            'cases.view_all', 'clients.view', 'hearings.view', 'hearings.manage', 'hearings.record_outcome',
            'diary.view_all', 'tasks.manage', 'documents.view', 'documents.upload',
        ],
        'receptionist' => [
            'clients.view', 'clients.create', 'hearings.view', 'diary.view_all', 'appointments.manage',
        ],
        'accountant' => [
            'cases.view_all', 'clients.view', 'expenses.manage',
            'finance.view', 'finance.invoice', 'finance.record_payment', 'finance.refund', 'finance.export',
        ],
    ],

    /* Default reminder offsets (days before) when an organization has none configured. */
    'default_reminders' => [
        'hearing' => [7, 3, 1, 0],
        'appointment' => [1, 0],
        'payment' => [3, 0],
    ],

    'uploads' => [
        'max_kb' => (int) env('UPLOAD_MAX_KB', 20480),
        'document_mimes' => ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp'],
        'disk' => env('PRIVATE_DISK', 'local'),
    ],

    'invitation_ttl_days' => 7,
];
