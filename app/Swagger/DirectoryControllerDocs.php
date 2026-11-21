<?php

namespace App\Swagger;

/**
 * Public discovery: home, practice areas, lawyers (with specializations), law firms, free consultation slots, favourites.
 *
 * @OA\Get(
 *     path="/api/v1/home",
 *     summary="Home screen",
 *     description="Practice areas with lawyer counts, platform stats, court holidays, top 10 listed lawyers and 6 firms.",
 *     operationId="directoryHome",
 *     tags={"Directory"},
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
 *                 @OA\Property(property="specializations", type="array", @OA\Items(type="string", example="Criminal Law")),
 *                 @OA\Property(property="stats", type="object"),
 *                 @OA\Property(property="courtHolidays", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="lawyers", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="firms", type="array", @OA\Items(type="string", example=""))
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
 *     path="/api/v1/specializations",
 *     summary="Practice areas",
 *     description="Active practice areas with the number of listed lawyers.",
 *     operationId="directorySpecializations",
 *     tags={"Directory"},
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
 *                 @OA\Property(property="id", type="integer", example=1),
 *                 @OA\Property(property="slug", type="string", example="criminal-law"),
 *                 @OA\Property(property="name", type="string", example="Criminal Law"),
 *                 @OA\Property(property="lawyers_count", type="integer", example=42)
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
 *     path="/api/v1/lawyers/filters",
 *     summary="Lawyer search filters",
 *     description="Cities, provinces, courts, practice areas, bar councils and languages.",
 *     operationId="directoryFilters",
 *     tags={"Directory"},
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
 *                 @OA\Property(property="cities", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="courts", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="specializations", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="languages", type="array", @OA\Items(type="string", example="Urdu"))
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
 *     path="/api/v1/lawyers",
 *     summary="Find lawyers",
 *     description="Listed lawyers, verified first. Each item includes specializations, fee, experience, rating, courts and firm.",
 *     operationId="directoryLawyers",
 *     tags={"Directory"},
 *
 *     @OA\Parameter(name="search", in="query", required=false, description="Name or headline", @OA\Schema(type="string", example="Khan")),
 *     @OA\Parameter(name="specialization", in="query", required=false, description="Practice area slug", @OA\Schema(type="string", example="criminal-law")),
 *     @OA\Parameter(name="city", in="query", required=false, description="City slug", @OA\Schema(type="string", example="lahore")),
 *     @OA\Parameter(name="court", in="query", required=false, description="Court id", @OA\Schema(type="integer", example=3)),
 *     @OA\Parameter(name="experience", in="query", required=false, description="Minimum years", @OA\Schema(type="integer", example=5)),
 *     @OA\Parameter(name="fee_max", in="query", required=false, description="Max consultation fee (PKR)", @OA\Schema(type="integer", example=5000)),
 *     @OA\Parameter(name="online", in="query", required=false, description="Online consultations only", @OA\Schema(type="string", example="1")),
 *     @OA\Parameter(name="verified", in="query", required=false, description="Verified only", @OA\Schema(type="string", example="1")),
 *     @OA\Parameter(name="sort", in="query", required=false, description="rating | experience", @OA\Schema(type="string", example="rating")),
 *     @OA\Parameter(name="per_page", in="query", required=false, description="1-30", @OA\Schema(type="integer", example=12)),
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
 *                 @OA\Property(property="slug", type="string", example="adv-ayesha-khan"),
 *                 @OA\Property(property="name", type="string", example="Adv. Ayesha Khan"),
 *                 @OA\Property(property="headline", type="string", example="Criminal & family lawyer"),
 *                 @OA\Property(property="photo_url", type="string", example="https://…/photo.jpg"),
 *                 @OA\Property(property="city", type="string", example="Lahore"),
 *                 @OA\Property(property="specializations", type="array", @OA\Items(type="string", example="Criminal Law")),
 *                 @OA\Property(property="years_experience", type="integer", example=12),
 *                 @OA\Property(property="fee_min", type="integer", example=3000),
 *                 @OA\Property(property="verified", type="boolean", example=true),
 *                 @OA\Property(property="rating", type="number", example=4.8),
 *                 @OA\Property(property="rating_count", type="integer", example=21),
 *                 @OA\Property(property="cases_handled", type="integer", example=120)
 *             )),
 *             @OA\Property(property="meta", type="object", @OA\Property(property="current_page", type="integer", example=1), @OA\Property(property="last_page", type="integer", example=5), @OA\Property(property="per_page", type="integer", example=12), @OA\Property(property="total", type="integer", example=58))
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
 *     path="/api/v1/lawyers/{slug}",
 *     summary="Lawyer profile",
 *     description="Full public profile: bio, education, experience, courts, firms, credentials, reviews, articles and stats.",
 *     operationId="directoryLawyer",
 *     tags={"Directory"},
 *
 *     @OA\Parameter(name="slug", in="path", required=true, description="Lawyer slug", @OA\Schema(type="string", example="adv-ayesha-khan")),
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
 *                 @OA\Property(property="lawyer", type="object"),
 *                 @OA\Property(property="articles", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="stats", type="object"),
 *                 @OA\Property(property="isFavourite", type="boolean", example=false),
 *                 @OA\Property(property="canBook", type="boolean", example=true)
 *             )
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
 *     path="/api/v1/lawyers/{slug}/slots",
 *     summary="Free consultation slots",
 *     description="30-minute slots for the next 14 days and the modes the lawyer offers.",
 *     operationId="directoryLawyerSlots",
 *     tags={"Directory"},
 *
 *     @OA\Parameter(name="slug", in="path", required=true, description="Lawyer slug", @OA\Schema(type="string", example="adv-ayesha-khan")),
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
 *                 @OA\Property(property="lawyer", type="object"),
 *                 @OA\Property(property="slots", type="array", @OA\Items(type="string", example="2026-11-23T17:00:00+05:00")),
 *                 @OA\Property(property="modes", type="array", @OA\Items(type="string", example="online"))
 *             )
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
 *     path="/api/v1/firms",
 *     summary="Find law firms",
 *     description="Public law firms with their focus practice areas.",
 *     operationId="directoryFirms",
 *     tags={"Directory"},
 *
 *     @OA\Parameter(name="search", in="query", required=false, description="Firm name", @OA\Schema(type="string", example="Khan")),
 *     @OA\Parameter(name="city", in="query", required=false, description="City slug", @OA\Schema(type="string", example="karachi")),
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
 *                 @OA\Property(property="slug", type="string", example="khan-associates"),
 *                 @OA\Property(property="name", type="string", example="Khan & Associates"),
 *                 @OA\Property(property="city", type="string", example="Karachi"),
 *                 @OA\Property(property="logo_url", type="string", example="https://…/logo.png"),
 *                 @OA\Property(property="members", type="integer", example=8),
 *                 @OA\Property(property="focus", type="array", @OA\Items(type="string", example="Corporate Law")),
 *                 @OA\Property(property="excerpt", type="string", example="Full-service corporate firm")
 *             )),
 *             @OA\Property(property="meta", type="object", @OA\Property(property="current_page", type="integer", example=1), @OA\Property(property="last_page", type="integer", example=5), @OA\Property(property="per_page", type="integer", example=12), @OA\Property(property="total", type="integer", example=58))
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
 *     path="/api/v1/firms/{slug}",
 *     summary="Law firm profile",
 *     description="Firm details and its listed lawyers with specializations.",
 *     operationId="directoryFirm",
 *     tags={"Directory"},
 *
 *     @OA\Parameter(name="slug", in="path", required=true, description="Firm slug", @OA\Schema(type="string", example="khan-associates")),
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
 *                 @OA\Property(property="firm", type="object"),
 *                 @OA\Property(property="lawyers", type="array", @OA\Items(type="string", example=""))
 *             )
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
 *     path="/api/v1/lawyers/{slug}/favourite",
 *     summary="Toggle favourite lawyer",
 *     description="",
 *     operationId="directoryToggleFavourite",
 *     tags={"Directory"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="slug", in="path", required=true, description="Lawyer slug", @OA\Schema(type="string", example="adv-ayesha-khan")),
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
 *                 @OA\Property(property="is_favourite", type="boolean", example=true)
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
 */
class DirectoryControllerDocs {}
