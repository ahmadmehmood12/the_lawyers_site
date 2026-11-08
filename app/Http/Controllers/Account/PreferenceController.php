<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PreferenceController extends Controller
{
    public function locale(Request $request): RedirectResponse
    {
        $validated = $request->validate(['locale' => ['required', Rule::in(['en', 'ur'])]]);

        $request->session()->put('locale', $validated['locale']);
        $request->user()?->forceFill(['locale' => $validated['locale']])->save();

        return back();
    }

    public function theme(Request $request): RedirectResponse
    {
        $validated = $request->validate(['theme' => ['required', Rule::in(['light', 'dark', 'system'])]]);

        $request->user()->forceFill(['theme' => $validated['theme']])->save();

        return back();
    }
}
