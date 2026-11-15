<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Public\ReportedJudgmentController as PublicReportedJudgmentController;
use App\Models\ReportedJudgment;
use Illuminate\Http\Request;
use Inertia\Response;

class ReportedJudgmentController extends Controller
{
    public function __construct(private PublicReportedJudgmentController $judgments) {}

    public function index(Request $request): Response
    {
        return $this->judgments->index($request, 'workspace');
    }

    public function show(ReportedJudgment $judgment): Response
    {
        return $this->judgments->show($judgment, 'workspace');
    }
}
