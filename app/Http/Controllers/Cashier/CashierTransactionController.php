<?php

namespace App\Http\Controllers\Cashier;

use App\Http\Controllers\Controller;
use App\Models\CompanySetting;
use App\Models\Sales;
use App\Services\CashierActivityLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class CashierTransactionController extends Controller
{
    public function index(): Response
    {
        $this->authorize('viewOwnHistory', Sales::class);

        return Inertia::render('cashier/transactions/index', [
            'companySettings' => CompanySetting::first(),
        ]);
    }

    public function list(Request $request): JsonResponse
    {
        $this->authorize('viewOwnHistory', Sales::class);

        $user = Auth::user();
        $perPage = max(5, min((int) $request->integer('per_page', 15), 50));

        $query = Sales::query()
            ->with(['saleItems'])
            ->withCount('saleItems')
            ->where('user_id', $user->id)
            ->orderByDesc('created_at');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($builder) use ($search) {
                $builder->where('transaction_id', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('offline_sync_id', 'like', "%{$search}%");
            });
        }

        if ($request->filled('payment_method') && $request->query('payment_method') !== 'all') {
            $query->where('payment_method', $request->query('payment_method'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->query('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->query('date_to'));
        }

        $paginator = $query->paginate($perPage);

        $paginator->getCollection()->transform(fn (Sales $sale) => $this->formatTransactionSummary($sale));

        return response()->json($paginator);
    }

    public function show(Sales $sale): JsonResponse
    {
        $this->authorize('view', $sale);

        $sale->load(['saleItems.category']);

        return response()->json($this->formatTransactionDetail($sale));
    }

    public function logReprint(Request $request, Sales $sale): JsonResponse
    {
        $this->authorize('reprintReceipt', $sale);

        CashierActivityLogger::log(
            Auth::id(),
            'receipt_reprint',
            Sales::class,
            $sale->id,
            [
                'transaction_id' => $sale->transaction_id,
                'channel' => $request->input('channel', 'print'),
            ],
            $request,
        );

        return response()->json(['success' => true, 'message' => 'Receipt reprint logged.']);
    }

    public function resendReceipt(Request $request, Sales $sale): JsonResponse
    {
        $this->authorize('reprintReceipt', $sale);

        $validated = $request->validate([
            'email' => 'required|email|max:255',
        ]);

        $sale->load('saleItems');
        $company = CompanySetting::first();

        try {
            $body = $this->buildReceiptEmailBody($sale, $company);

            Mail::raw($body, function ($message) use ($validated, $company, $sale) {
                $message->to($validated['email'])
                    ->subject('Receipt '.$sale->transaction_id.' from '.($company?->company_name ?? config('app.name')));
            });

            CashierActivityLogger::log(
                Auth::id(),
                'receipt_resend',
                Sales::class,
                $sale->id,
                [
                    'transaction_id' => $sale->transaction_id,
                    'email' => $validated['email'],
                ],
                $request,
            );

            return response()->json([
                'success' => true,
                'message' => 'Receipt sent successfully.',
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to resend receipt', [
                'sale_id' => $sale->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to send receipt email. Please verify mail settings or try again later.',
            ], 422);
        }
    }

    private function formatTransactionSummary(Sales $sale): array
    {
        return [
            'id' => $sale->id,
            'transaction_id' => $sale->transaction_id,
            'reference' => $sale->offline_sync_id,
            'customer_name' => $sale->customer_name ?? 'Walk-in Customer',
            'payment_method' => $sale->payment_method,
            'status' => $sale->status,
            'sub_total' => (float) $sale->sub_total,
            'discount_amount' => (float) $sale->discount_amount,
            'grand_total' => (float) $sale->grand_total,
            'amount_paid' => (float) $sale->amount_paid,
            'change_amount' => (float) $sale->change_amount,
            'items_count' => (int) $sale->saleItems->sum('quantity'),
            'created_at' => $sale->created_at?->toIso8601String(),
            'created_at_formatted' => $sale->created_at?->format('M d, Y g:i A'),
        ];
    }

    private function formatTransactionDetail(Sales $sale): array
    {
        return [
            ...$this->formatTransactionSummary($sale),
            'discount_percentage' => (float) $sale->discount_percentage,
            'items' => $sale->saleItems->map(fn ($item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'category' => $item->category?->name,
                'quantity' => (int) $item->quantity,
                'price' => (float) $item->price,
                'subtotal' => (float) $item->total_amount,
            ])->values(),
        ];
    }

    private function buildReceiptEmailBody(Sales $sale, ?CompanySetting $company): string
    {
        $lines = [
            ($company?->company_name ?? config('app.name')).' — Receipt',
            'Transaction: '.$sale->transaction_id,
            'Date: '.Carbon::parse($sale->created_at)->format('M d, Y g:i A'),
            'Customer: '.($sale->customer_name ?? 'Walk-in Customer'),
            str_repeat('-', 40),
        ];

        foreach ($sale->saleItems as $item) {
            $lines[] = sprintf(
                '%s x%d  GHS %.2f',
                $item->product_name,
                $item->quantity,
                $item->total_amount
            );
        }

        $lines[] = str_repeat('-', 40);
        $lines[] = 'Subtotal: GHS '.number_format((float) $sale->sub_total, 2);
        $lines[] = 'Discount: GHS '.number_format((float) $sale->discount_amount, 2);
        $lines[] = 'Total: GHS '.number_format((float) $sale->grand_total, 2);
        $lines[] = 'Paid: GHS '.number_format((float) $sale->amount_paid, 2);
        $lines[] = 'Change: GHS '.number_format((float) $sale->change_amount, 2);
        $lines[] = 'Payment: '.ucfirst($sale->payment_method ?? 'cash');
        $lines[] = '';
        $lines[] = $company?->thank_you_message ?? 'Thank you for your purchase!';

        return implode("\n", $lines);
    }
}
