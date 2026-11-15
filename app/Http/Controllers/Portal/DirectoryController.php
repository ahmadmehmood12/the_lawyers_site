<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Public\FirmDirectoryController;
use App\Http\Controllers\Public\LawyerDirectoryController;
use App\Models\LawyerProfile;
use App\Models\Organization;
use Illuminate\Http\Request;
use Inertia\Response;

class DirectoryController extends Controller
{
    public function __construct(
        private LawyerDirectoryController $lawyerDirectory,
        private FirmDirectoryController $firmDirectory,
    ) {}

    public function lawyers(Request $request): Response
    {
        return $this->lawyerDirectory->index($request, 'portal');
    }

    public function lawyer(Request $request, LawyerProfile $lawyer): Response
    {
        return $this->lawyerDirectory->show($request, $lawyer, 'portal');
    }

    public function firms(Request $request): Response
    {
        return $this->firmDirectory->index($request, 'portal');
    }

    public function firm(Organization $firm): Response
    {
        return $this->firmDirectory->show($firm, 'portal');
    }
}
