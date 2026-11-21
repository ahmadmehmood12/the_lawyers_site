<?php

namespace App\Swagger;

/**
 * Client portal (account type client). Bookings, cancellations and reschedules notify the lawyer and client exactly like the web (in-app, email, WhatsApp, push).
 *
 * @OA\Get(
 *     path="/api/v1/client/dashboard",
 *     summary="Client dashboard",
 *     description="Stats, next hearings, upcoming appointments, my lawyers, court holidays.",
 *     operationId="clientDashboard",
 *     tags={"Client"},
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
 *                 @OA\Property(property="nextHearings", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="appointments", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="lawyers", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="courtHolidays", type="array", @OA\Items(type="string", example=""))
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
 *     path="/api/v1/client/cases",
 *     summary="My cases",
 *     description="Cases shared with me.",
 *     operationId="clientCases",
 *     tags={"Client"},
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
 *                 @OA\Property(property="cases", type="array", @OA\Items(type="string", example=""))
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
 *     path="/api/v1/client/cases/{id}",
 *     summary="Case detail",
 *     description="Client-visible hearings, timeline and shared documents.",
 *     operationId="clientCase",
 *     tags={"Client"},
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
 *                 @OA\Property(property="legalCase", type="object"),
 *                 @OA\Property(property="hearings", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="timeline", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="documents", type="array", @OA\Items(type="string", example=""))
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
 *     path="/api/v1/client/documents",
 *     summary="Shared documents",
 *     description="",
 *     operationId="clientDocuments",
 *     tags={"Client"},
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
 *                 @OA\Property(property="documents", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="cases", type="array", @OA\Items(type="string", example=""))
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
 *     path="/api/v1/client/invoices",
 *     summary="My invoices",
 *     description="",
 *     operationId="clientInvoices",
 *     tags={"Client"},
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
 *                 @OA\Property(property="invoices", type="array", @OA\Items(type="string", example=""))
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
 *     path="/api/v1/client/invoices/{id}",
 *     summary="Invoice detail",
 *     description="",
 *     operationId="clientInvoice",
 *     tags={"Client"},
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
 *     path="/api/v1/client/favourites",
 *     summary="Favourite lawyers",
 *     description="",
 *     operationId="clientFavourites",
 *     tags={"Client"},
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
 *                 @OA\Property(property="lawyers", type="array", @OA\Items(type="string", example=""))
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
 *     path="/api/v1/client/appointments",
 *     summary="My appointments",
 *     description="",
 *     operationId="clientAppointments",
 *     tags={"Client"},
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
 *                 @OA\Property(property="appointments", type="array", @OA\Items(type="string", example=""))
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
 * @OA\Post(
 *     path="/api/v1/client/lawyers/{slug}/book",
 *     summary="Book a consultation",
 *     description="starts_at must be one of /lawyers/{slug}/slots. The lawyer gets the request and the client a receipt.",
 *     operationId="clientBook",
 *     tags={"Client"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="slug", in="path", required=true, description="Lawyer slug", @OA\Schema(type="string", example="adv-ayesha-khan")),
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Book a consultation payload",
 *
 *         @OA\JsonContent(
 *             required={"starts_at", "mode"},
 *
 *             @OA\Property(property="starts_at", type="string", example="2026-11-23T17:00:00+05:00"),
 *             @OA\Property(property="mode", type="string", example="online"),
 *             @OA\Property(property="message", type="string", example="Need advice on a bail matter")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=201,
 *         description="Request sent. You will be notified when the lawyer confirms.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Request sent. You will be notified when the lawyer confirms."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="id", type="integer", example=608),
 *                 @OA\Property(property="starts_at", type="string", example="2026-11-23T17:00:00+05:00"),
 *                 @OA\Property(property="status", type="string", example="requested"),
 *                 @OA\Property(property="status_label", type="string", example="Requested"),
 *                 @OA\Property(property="mode", type="string", example="In person"),
 *                 @OA\Property(property="lawyer", type="string", example="Ayesha Khan"),
 *                 @OA\Property(property="cancellable", type="boolean", example=true),
 *                 @OA\Property(property="reschedulable", type="boolean", example=true)
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
 *             @OA\Property(property="message", type="string", example="This time is no longer available. Please choose another slot."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="starts_at", type="array", @OA\Items(type="string", example="This time is no longer available. Please choose another slot."))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=429,
 *         description="Too many attempts",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Too Many Attempts."),
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
 *     path="/api/v1/client/appointments/{id}/cancel",
 *     summary="Cancel appointment",
 *     description="Both parties are notified.",
 *     operationId="clientCancelAppointment",
 *     tags={"Client"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="id", in="path", required=true, description="Appointment id", @OA\Schema(type="integer", example=608)),
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Cancel appointment payload",
 *
 *         @OA\JsonContent(
 *             required={"reason"},
 *
 *             @OA\Property(property="reason", type="string", example="No longer needed")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Appointment cancelled.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Appointment cancelled."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="id", type="integer", example=608),
 *                 @OA\Property(property="starts_at", type="string", example="2026-11-23T17:00:00+05:00"),
 *                 @OA\Property(property="status", type="string", example="requested"),
 *                 @OA\Property(property="status_label", type="string", example="Requested"),
 *                 @OA\Property(property="mode", type="string", example="In person"),
 *                 @OA\Property(property="lawyer", type="string", example="Ayesha Khan"),
 *                 @OA\Property(property="cancellable", type="boolean", example=true),
 *                 @OA\Property(property="reschedulable", type="boolean", example=true)
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
 *             @OA\Property(property="message", type="string", example="The reason field is required."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="reason", type="array", @OA\Items(type="string", example="The reason field is required."))
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
 *     path="/api/v1/client/appointments/{id}/slots",
 *     summary="Free slots to reschedule",
 *     description="",
 *     operationId="clientAppointmentSlots",
 *     tags={"Client"},
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
 *                 @OA\Property(property="slots", type="array", @OA\Items(type="string", example="2026-11-24T11:00:00+05:00"))
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
 *     path="/api/v1/client/appointments/{id}/reschedule",
 *     summary="Request a new time",
 *     description="Creates a new requested appointment linked to the old one (cancelled); the lawyer must accept. Both parties are notified.",
 *     operationId="clientRescheduleAppointment",
 *     tags={"Client"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="id", in="path", required=true, description="Appointment id", @OA\Schema(type="integer", example=608)),
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Request a new time payload",
 *
 *         @OA\JsonContent(
 *             required={"starts_at"},
 *
 *             @OA\Property(property="starts_at", type="string", example="2026-11-24T11:00:00+05:00"),
 *             @OA\Property(property="reason", type="string", example="Clash with work")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="New time requested. The lawyer will confirm it.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="New time requested. The lawyer will confirm it."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="id", type="integer", example=608),
 *                 @OA\Property(property="starts_at", type="string", example="2026-11-23T17:00:00+05:00"),
 *                 @OA\Property(property="status", type="string", example="requested"),
 *                 @OA\Property(property="status_label", type="string", example="Requested"),
 *                 @OA\Property(property="mode", type="string", example="In person"),
 *                 @OA\Property(property="lawyer", type="string", example="Ayesha Khan"),
 *                 @OA\Property(property="cancellable", type="boolean", example=true),
 *                 @OA\Property(property="reschedulable", type="boolean", example=true)
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
 *             @OA\Property(property="message", type="string", example="This time is no longer available. Please choose another slot."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="starts_at", type="array", @OA\Items(type="string", example="This time is no longer available. Please choose another slot."))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=429,
 *         description="Too many attempts",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Too Many Attempts."),
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
 */
class ClientPortalControllerDocs {}
