@extends('pdf.layout')
@section('content')
<div class="brand">
    <h1>{{ __('Court Diary') }} — {{ $date->translatedFormat('l, d F Y') }}</h1>
    <div class="muted">{{ $organization->name }}, {{ __('Prepared for :name', ['name' => $user->name]) }}, {{ now()->format('d M Y H:i') }}</div>
</div>
@if ($hearings->isEmpty())
    <p class="muted">{{ __('No hearings on this date.') }}</p>
@else
<table>
    <thead><tr>
        <th style="width: 12%">{{ __('Time') }}</th>
        <th style="width: 30%">{{ __('Case') }}</th>
        <th style="width: 22%">{{ __('Court / Judge') }}</th>
        <th style="width: 20%">{{ __('Purpose') }}</th>
        <th style="width: 16%">{{ __('Lawyer') }}</th>
    </tr></thead>
    <tbody>
    @foreach ($hearings as $h)
        <tr>
            <td>{{ $h->hearing_time ? substr($h->hearing_time, 0, 5) : '—' }}<br><span class="small muted">{{ $h->status->label() }}</span></td>
            <td><b>{{ $h->legalCase->title }}</b><br><span class="small muted">{{ $h->legalCase->case_number ?: $h->legalCase->reference }}</span>
                @if ($h->legalCase->clients->isNotEmpty())<br><span class="small">{{ $h->legalCase->clients->pluck('name')->implode(', ') }}</span>@endif</td>
            <td>{{ $h->court?->name ?? '—' }}@if ($h->judge?->name || $h->judge_name)<br><span class="small muted">{{ $h->judge?->name ?? $h->judge_name }}</span>@endif @if ($h->courtroom)<br><span class="small muted">{{ __('Room') }} {{ $h->courtroom }}</span>@endif</td>
            <td>{{ $h->purpose ?: $h->hearing_type?->label() }}@if ($h->preparation_notes)<br><span class="small muted">{{ \Illuminate\Support\Str::limit($h->preparation_notes, 120) }}</span>@endif</td>
            <td>{{ $h->assignedLawyer?->name ?? '—' }}</td>
        </tr>
    @endforeach
    </tbody>
</table>
@endif
<p class="small muted" style="margin-top: 8mm">{{ __('Confidential — for internal use of the chambers only.') }}</p>
@endsection
