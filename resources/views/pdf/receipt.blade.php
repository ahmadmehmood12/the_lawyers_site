@extends('pdf.layout')
@section('content')
@php($org = $payment->organization)
<div class="brand">
    <h1>{{ $org->name }}</h1>
    <div class="muted small">{{ $org->address }}, {{ $org->phone }}</div>
</div>
<table><tr>
    <td style="border:none"><h1>{{ __('PAYMENT RECEIPT') }}</h1></td>
    <td style="border:none" class="right"><span class="stamp">{{ __('PAID') }}</span></td>
</tr></table>
<table style="margin-top: 4mm">
    <tr><td style="width:35%"><b>{{ __('Receipt no.') }}</b></td><td>{{ $payment->receipt_number }}</td></tr>
    <tr><td><b>{{ __('Date') }}</b></td><td>{{ $payment->paid_on->format('d M Y') }}</td></tr>
    <tr><td><b>{{ __('Received from') }}</b></td><td>{{ $payment->client->name }}</td></tr>
    <tr><td><b>{{ __('Amount') }}</b></td><td><b>PKR {{ number_format($payment->amount, 2) }}</b></td></tr>
    <tr><td><b>{{ __('Payment method') }}</b></td><td>{{ $payment->method->label() }}@if ($payment->reference) — {{ __('Ref.') }} {{ $payment->reference }}@endif</td></tr>
    <tr><td><b>{{ __('Against invoice') }}</b></td><td>{{ $payment->invoice->number }} ({{ __('balance after payment: PKR :amount', ['amount' => number_format($payment->invoice->balance())]) }})</td></tr>
    @if ($payment->invoice->legalCase)<tr><td><b>{{ __('Matter') }}</b></td><td>{{ $payment->invoice->legalCase->title }}</td></tr>@endif
    @if ($payment->receiver)<tr><td><b>{{ __('Received by') }}</b></td><td>{{ $payment->receiver->name }}</td></tr>@endif
</table>
@if ($payment->refunds->isNotEmpty())
<h2>{{ __('Refunds') }}</h2>
<table>@foreach ($payment->refunds as $r)<tr><td>{{ $r->refunded_on->format('d M Y') }}</td><td>PKR {{ number_format($r->amount, 2) }}</td><td>{{ $r->reason }}</td></tr>@endforeach</table>
@endif
<p class="small muted" style="margin-top:10mm">{{ __('This is a computer-generated receipt and does not require a signature.') }}</p>
@endsection
