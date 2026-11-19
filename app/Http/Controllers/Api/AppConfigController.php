<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Mobile\MobileAppConfig;
use Illuminate\Http\JsonResponse;

/**
 * Public configuration the mobile apps fetch on launch: app name/icon, the
 * current iOS/Android versions and store links, minimum supported versions,
 * force-update and maintenance flags. No secrets or user data. GET /api/app/config
 */
class AppConfigController extends Controller
{
    public function __invoke(MobileAppConfig $config): JsonResponse
    {
        return response()->json($config->publicPayload());
    }
}
