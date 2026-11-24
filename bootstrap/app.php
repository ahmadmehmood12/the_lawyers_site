<?php

use App\Http\Middleware\ApiWebBridge;
use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\EnsureAccountType;
use App\Http\Middleware\EnsureApiAccountIsActive;
use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\EnsureOrganizationContext;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RecordPageVisit;
use App\Http\Middleware\SetLocale;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            SetLocale::class,
            EnsureAccountIsActive::class,
            EnsureEmailIsVerified::class,
            HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'workspace' => EnsureOrganizationContext::class,
            'account' => EnsureAccountType::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'track-visits' => RecordPageVisit::class,
            'api.active' => EnsureApiAccountIsActive::class,
            'api.web' => ApiWebBridge::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'webhooks/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => ($request->is('api/*') && ! $request->is('api/documentation')) || $request->expectsJson(),
        );

        // Mobile API (api/v1): every error uses the {status, message, timestamp, errors} envelope.
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/v1/*')) {
                return null;
            }

            [$code, $message, $errors] = match (true) {
                $e instanceof ValidationException => [422, $e->getMessage(), $e->errors()],
                $e instanceof AuthenticationException => [401, __('Unauthenticated.'), null],
                $e instanceof AuthorizationException => [$e->status() ?? 403, $e->getMessage() ?: __('This action is unauthorized.'), null],
                $e instanceof ModelNotFoundException => [404, __('Not found.'), null],
                $e instanceof HttpExceptionInterface => [$e->getStatusCode(), $e->getMessage() ?: (SymfonyResponse::$statusTexts[$e->getStatusCode()] ?? 'Error'), null],
                default => [500, __('Something went wrong'), config('app.debug') ? $e->getMessage() : null],
            };

            return response()->json(array_filter([
                'status' => 'Failed',
                'message' => $message,
                'timestamp' => now()->format('Y-m-d H:i:s'),
                'errors' => $errors,
            ], fn ($v) => $v !== null), $code, $e instanceof HttpExceptionInterface ? $e->getHeaders() : []);
        });
    })->create();
