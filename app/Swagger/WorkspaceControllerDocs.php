<?php

namespace App\Swagger;

/**
 * Lawyer / law firm workspace (account types lawyer and staff; organization roles and permissions apply exactly as on the web).
 *
 * @OA\Get(
 *     path="/api/v1/workspace/dashboard",
 *     summary="Workspace dashboard",
 *     description="KPIs, today's hearings, upcoming hearings, tasks, breakdowns, activity.",
 *     operationId="workspaceDashboard",
 *     tags={"Workspace"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="stats", type="object"),
 *                 @OA\Property(property="todayHearings", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="upcoming", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="tasks", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="breakdown", type="object"),
 *                 @OA\Property(property="activity", type="array", @OA\Items(type="string", example=""))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/v1/workspace/cases",
 *     summary="Cases",
 *     description="Cases visible to me, 20 per page, with the web filters.",
 *     operationId="workspaceCases",
 *     tags={"Workspace"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="search", in="query", required=false, description="Title, number, reference, FIR, client", @OA\Schema(type="string", example="bail")),
 *     @OA\Parameter(name="status", in="query", required=false, description="Status or open", @OA\Schema(type="string", example="open")),
 *     @OA\Parameter(name="court_id", in="query", required=false, description="Court", @OA\Schema(type="integer", example=3)),
 *     @OA\Parameter(name="page", in="query", required=false, description="Page", @OA\Schema(type="integer", example=1)),
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="cases", type="object"),
 *                 @OA\Property(property="filters", type="object"),
 *                 @OA\Property(property="options", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/v1/workspace/cases/{id}",
 *     summary="Case detail",
 *     description="Everything the web case page shows (hearings, parties, documents, tasks, timeline...).",
 *     operationId="workspaceCase",
 *     tags={"Workspace"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="id", in="path", required=true, description="Case id", @OA\Schema(type="integer", example=12)),
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="legalCase", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Not found (or belongs to another account / organization)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Not found."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/v1/workspace/diary",
 *     summary="Court diary",
 *     description="Hearings and diary entries for a day/week/month.",
 *     operationId="workspaceDiary",
 *     tags={"Workspace"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="date", in="query", required=false, description="Day", @OA\Schema(type="string", example="2026-11-23")),
 *     @OA\Parameter(name="view", in="query", required=false, description="day | week | month", @OA\Schema(type="string", example="day")),
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="hearings", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="entries", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="monthCounts", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/v1/workspace/clients",
 *     summary="Clients",
 *     description="",
 *     operationId="workspaceClients",
 *     tags={"Workspace"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="search", in="query", required=false, description="Name, phone, CNIC", @OA\Schema(type="string", example="Malik")),
 *     @OA\Parameter(name="page", in="query", required=false, description="Page", @OA\Schema(type="integer", example=1)),
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="clients", type="object"),
 *                 @OA\Property(property="kpis", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/v1/workspace/clients/{id}",
 *     summary="Client detail",
 *     description="",
 *     operationId="workspaceClient",
 *     tags={"Workspace"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="id", in="path", required=true, description="Client id", @OA\Schema(type="integer", example=4)),
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="client", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Not found (or belongs to another account / organization)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Not found."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/v1/workspace/invoices",
 *     summary="Invoices",
 *     description="Requires finance permission.",
 *     operationId="workspaceInvoices",
 *     tags={"Workspace"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="invoices", type="object"),
 *                 @OA\Property(property="summary", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/v1/workspace/invoices/{id}",
 *     summary="Invoice detail",
 *     description="",
 *     operationId="workspaceInvoice",
 *     tags={"Workspace"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="id", in="path", required=true, description="Invoice id", @OA\Schema(type="integer", example=5)),
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="invoice", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Not found (or belongs to another account / organization)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Not found."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/v1/workspace/team",
 *     summary="Team",
 *     description="Members, invitations, roles and permissions of the organization.",
 *     operationId="workspaceTeam",
 *     tags={"Workspace"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="members", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="invitations", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="roles", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="isFirm", type="boolean", example=true)
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/v1/workspace/appointments",
 *     summary="Appointments",
 *     description="My appointments, or the organization's with appointments.manage.",
 *     operationId="workspaceAppointments",
 *     tags={"Workspace appointments"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="scope", in="query", required=false, description="upcoming | requests | past", @OA\Schema(type="string", example="upcoming")),
 *     @OA\Parameter(name="lawyer_id", in="query", required=false, description="Filter by lawyer (managers)", @OA\Schema(type="integer", example=3)),
 *     @OA\Parameter(name="page", in="query", required=false, description="Page", @OA\Schema(type="integer", example=1)),
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="array", @OA\Items(type="object",
 *                 @OA\Property(property="id", type="integer", example=608),
 *                 @OA\Property(property="starts_at", type="string", example="2026-11-23T17:00:00+05:00"),
 *                 @OA\Property(property="ends_at", type="string", example="2026-11-23T17:30:00+05:00"),
 *                 @OA\Property(property="status", type="string", example="confirmed"),
 *                 @OA\Property(property="mode", type="string", example="in_person"),
 *                 @OA\Property(property="contact_name", type="string", example="Sana Malik"),
 *                 @OA\Property(property="lawyer", type="string", example="Ayesha Khan"),
 *                 @OA\Property(property="client_message", type="string", example="Need advice on bail"),
 *                 @OA\Property(property="meeting_link", type="string", example="https://meet.example.com/x")
 *             )),
 *             @OA\Property(property="meta", type="object", @OA\Property(property="current_page", type="integer", example=1), @OA\Property(property="last_page", type="integer", example=5), @OA\Property(property="per_page", type="integer", example=12), @OA\Property(property="total", type="integer", example=58))
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Post(
 *     path="/api/v1/workspace/appointments",
 *     summary="Add appointment",
 *     description="Confirmed straight away; the client is notified.",
 *     operationId="workspaceStoreAppointment",
 *     tags={"Workspace appointments"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Add appointment payload",
 *
 *         @OA\JsonContent(
 *             required={"starts_at", "duration", "mode"},
 *
 *             @OA\Property(property="client_id", type="integer", example=4),
 *             @OA\Property(property="contact_name", type="string", example="Walk-in client"),
 *             @OA\Property(property="contact_phone", type="string", example="03001234567"),
 *             @OA\Property(property="lawyer_id", type="integer", example=3),
 *             @OA\Property(property="starts_at", type="string", example="2026-11-24T11:00:00+05:00"),
 *             @OA\Property(property="duration", type="integer", example=30),
 *             @OA\Property(property="mode", type="string", example="in_person"),
 *             @OA\Property(property="fee", type="number", example=3000),
 *             @OA\Property(property="meeting_link", type="string", example="https://meet.example.com/x"),
 *             @OA\Property(property="lawyer_notes", type="string", example="Bring FIR copy")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=201,
 *         description="Appointment added.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Appointment added."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="id", type="integer", example=608),
 *                 @OA\Property(property="starts_at", type="string", example="2026-11-23T17:00:00+05:00"),
 *                 @OA\Property(property="ends_at", type="string", example="2026-11-23T17:30:00+05:00"),
 *                 @OA\Property(property="status", type="string", example="confirmed"),
 *                 @OA\Property(property="mode", type="string", example="in_person"),
 *                 @OA\Property(property="contact_name", type="string", example="Sana Malik"),
 *                 @OA\Property(property="lawyer", type="string", example="Ayesha Khan"),
 *                 @OA\Property(property="client_message", type="string", example="Need advice on bail"),
 *                 @OA\Property(property="meeting_link", type="string", example="https://meet.example.com/x")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="The starts at field must be a date after now."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="starts_at", type="array", @OA\Items(type="string", example="The starts at field must be a date after now."))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/v1/workspace/appointments/{id}",
 *     summary="Appointment detail",
 *     description="",
 *     operationId="workspaceAppointment",
 *     tags={"Workspace appointments"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="id", in="path", required=true, description="Appointment id", @OA\Schema(type="integer", example=608)),
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="id", type="integer", example=608),
 *                 @OA\Property(property="starts_at", type="string", example="2026-11-23T17:00:00+05:00"),
 *                 @OA\Property(property="ends_at", type="string", example="2026-11-23T17:30:00+05:00"),
 *                 @OA\Property(property="status", type="string", example="confirmed"),
 *                 @OA\Property(property="mode", type="string", example="in_person"),
 *                 @OA\Property(property="contact_name", type="string", example="Sana Malik"),
 *                 @OA\Property(property="lawyer", type="string", example="Ayesha Khan"),
 *                 @OA\Property(property="client_message", type="string", example="Need advice on bail"),
 *                 @OA\Property(property="meeting_link", type="string", example="https://meet.example.com/x")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Not found (or belongs to another account / organization)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Not found."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Post(
 *     path="/api/v1/workspace/appointments/{id}/status",
 *     summary="Accept / decline / cancel / complete",
 *     description="status: confirmed | declined | cancelled | completed | no_show. reason required for declined/cancelled. Notifications as on the web.",
 *     operationId="workspaceTransitionAppointment",
 *     tags={"Workspace appointments"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="id", in="path", required=true, description="Appointment id", @OA\Schema(type="integer", example=608)),
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Accept / decline / cancel / complete payload",
 *
 *         @OA\JsonContent(
 *             required={"status"},
 *
 *             @OA\Property(property="status", type="string", example="confirmed"),
 *             @OA\Property(property="reason", type="string", example="Court clash"),
 *             @OA\Property(property="meeting_link", type="string", example="https://meet.example.com/x")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Appointment updated.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Appointment updated."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="id", type="integer", example=608),
 *                 @OA\Property(property="starts_at", type="string", example="2026-11-23T17:00:00+05:00"),
 *                 @OA\Property(property="ends_at", type="string", example="2026-11-23T17:30:00+05:00"),
 *                 @OA\Property(property="status", type="string", example="confirmed"),
 *                 @OA\Property(property="mode", type="string", example="in_person"),
 *                 @OA\Property(property="contact_name", type="string", example="Sana Malik"),
 *                 @OA\Property(property="lawyer", type="string", example="Ayesha Khan"),
 *                 @OA\Property(property="client_message", type="string", example="Need advice on bail"),
 *                 @OA\Property(property="meeting_link", type="string", example="https://meet.example.com/x")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Not found (or belongs to another account / organization)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Not found."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="This status change is not allowed."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="status", type="array", @OA\Items(type="string", example="This status change is not allowed."))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Post(
 *     path="/api/v1/workspace/appointments/{id}/reschedule",
 *     summary="Reschedule appointment",
 *     description="Lawyer reschedules are confirmed immediately; both parties are notified.",
 *     operationId="workspaceRescheduleAppointment",
 *     tags={"Workspace appointments"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="id", in="path", required=true, description="Appointment id", @OA\Schema(type="integer", example=608)),
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Reschedule appointment payload",
 *
 *         @OA\JsonContent(
 *             required={"starts_at"},
 *
 *             @OA\Property(property="starts_at", type="string", example="2026-11-24T11:00:00+05:00"),
 *             @OA\Property(property="reason", type="string", example="Court hearing")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Appointment rescheduled.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Appointment rescheduled."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="id", type="integer", example=608),
 *                 @OA\Property(property="starts_at", type="string", example="2026-11-23T17:00:00+05:00"),
 *                 @OA\Property(property="ends_at", type="string", example="2026-11-23T17:30:00+05:00"),
 *                 @OA\Property(property="status", type="string", example="confirmed"),
 *                 @OA\Property(property="mode", type="string", example="in_person"),
 *                 @OA\Property(property="contact_name", type="string", example="Sana Malik"),
 *                 @OA\Property(property="lawyer", type="string", example="Ayesha Khan"),
 *                 @OA\Property(property="client_message", type="string", example="Need advice on bail"),
 *                 @OA\Property(property="meeting_link", type="string", example="https://meet.example.com/x")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Not found (or belongs to another account / organization)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Not found."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Only open appointments can be rescheduled."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="starts_at", type="array", @OA\Items(type="string", example="Only open appointments can be rescheduled."))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/v1/workspace/availability",
 *     summary="Working hours",
 *     description="Weekly slots and upcoming days off (lawyers only).",
 *     operationId="workspaceAvailability",
 *     tags={"Workspace appointments"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="slots", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="holidays", type="array", @OA\Items(type="string", example=""))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Put(
 *     path="/api/v1/workspace/availability",
 *     summary="Save working hours",
 *     description="Replaces the weekly slots. weekday 0=Sunday..6=Saturday; mode online | in_person | both.",
 *     operationId="workspaceUpdateAvailability",
 *     tags={"Workspace appointments"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Save working hours payload",
 *
 *         @OA\JsonContent(
 *             required={"slots"},
 *
 *             @OA\Property(property="slots", type="array", @OA\Items(type="string", example="{""weekday"":1,""starts_at"":""10:00"",""ends_at"":""13:00"",""mode"":""both""}"))
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="slots", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="holidays", type="array", @OA\Items(type="string", example=""))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="The slots.0.ends_at field must be a date after slots.0.starts_at."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="slots.0.ends_at", type="array", @OA\Items(type="string", example="The slots.0.ends_at field must be a date after slots.0.starts_at."))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 */
class WorkspaceControllerDocs {}
