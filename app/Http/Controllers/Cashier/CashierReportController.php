<?php

namespace App\Http\Controllers\Cashier;

use App\Http\Controllers\Controller;
use App\Models\Sales;
use App\Models\SaleItem;
use App\Services\CashierActivityLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CashierReportController extends Controller
{
    public function index(): Response
    {
        $this->authorize('viewOwnReports', Sales::class);

        return Inertia::render('cashier/reports/index');
    }

    public function data(Request $request): JsonResponse
    {
        $this->authorize('viewOwnReports', Sales::class);

        $period = $request->query('period', 'daily');
        $user = Auth::user();
        [$start, $end] = $this->resolvePeriodRange($period, $request);

        $salesQuery = Sales::query()
            ->where('user_id', $user->id)
            ->whereBetween('created_at', [$start, $end]);

        $totalSales = (clone $salesQuery)->sum('grand_total');
        $totalTransactions = (clone $salesQuery)->count();
        $averageTicket = $totalTransactions > 0 ? $totalSales / $totalTransactions : 0;

        $itemsSold = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.user_id', $user->id)
            ->whereBetween('sales.created_at', [$start, $end])
            ->sum('sale_items.quantity');

        $performanceTrend = $this->buildPerformanceTrend($user->id, $start, $end, $period);

        $paymentBreakdown = Sales::query()
            ->where('user_id', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->select('payment_method', DB::raw('COUNT(*) as count'), DB::raw('SUM(grand_total) as amount'))
            ->groupBy('payment_method')
            ->get()
            ->map(fn ($row) => [
                'method' => ucfirst($row->payment_method ?? 'unknown'),
                'count' => (int) $row->count,
                'amount' => (float) $row->amount,
            ])
            ->values();

        $topProducts = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.user_id', $user->id)
            ->whereBetween('sales.created_at', [$start, $end])
            ->select(
                'sale_items.product_name',
                DB::raw('SUM(sale_items.quantity) as quantity'),
                DB::raw('SUM(sale_items.total_amount) as revenue')
            )
            ->groupBy('sale_items.product_name')
            ->orderByDesc('quantity')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->product_name,
                'quantity' => (int) $row->quantity,
                'revenue' => (float) $row->revenue,
            ])
            ->values();

        return response()->json([
            'period' => $period,
            'range' => [
                'from' => $start->toDateString(),
                'to' => $end->toDateString(),
            ],
            'summary' => [
                'total_sales' => (float) $totalSales,
                'total_transactions' => (int) $totalTransactions,
                'average_ticket' => round((float) $averageTicket, 2),
                'items_sold' => (int) $itemsSold,
            ],
            'performance_trend' => $performanceTrend,
            'payment_breakdown' => $paymentBreakdown,
            'top_products' => $topProducts,
        ]);
    }

    public function logExport(Request $request): JsonResponse
    {
        $this->authorize('exportOwnReports', Sales::class);

        $validated = $request->validate([
            'format' => 'required|in:pdf,excel',
            'period' => 'required|in:daily,weekly,monthly,custom',
        ]);

        CashierActivityLogger::log(
            Auth::id(),
            'report_export',
            'cashier_report',
            null,
            [
                'format' => $validated['format'],
                'period' => $validated['period'],
                'date_from' => $request->input('date_from'),
                'date_to' => $request->input('date_to'),
            ],
            $request,
        );

        return response()->json(['success' => true]);
    }

    private function resolvePeriodRange(string $period, Request $request): array
    {
        if ($period === 'custom' && $request->filled('date_from') && $request->filled('date_to')) {
            return [
                Carbon::parse($request->query('date_from'))->startOfDay(),
                Carbon::parse($request->query('date_to'))->endOfDay(),
            ];
        }

        return match ($period) {
            'weekly' => [now()->startOfWeek(), now()->endOfDay()],
            'monthly' => [now()->startOfMonth(), now()->endOfDay()],
            default => [now()->startOfDay(), now()->endOfDay()],
        };
    }

    private function buildPerformanceTrend(int $userId, Carbon $start, Carbon $end, string $period): array
    {
        $driver = DB::connection()->getDriverName();

        if ($period === 'daily') {
            $hourExpression = $driver === 'sqlite'
                ? "CAST(strftime('%H', created_at) AS INTEGER)"
                : 'HOUR(created_at)';

            $rows = Sales::query()
                ->where('user_id', $userId)
                ->whereBetween('created_at', [$start, $end])
                ->select(
                    DB::raw("{$hourExpression} as bucket"),
                    DB::raw('SUM(grand_total) as sales'),
                    DB::raw('COUNT(*) as transactions')
                )
                ->groupBy('bucket')
                ->orderBy('bucket')
                ->get()
                ->keyBy(fn ($row) => (int) $row->bucket);

            $trend = [];
            for ($hour = 0; $hour < 24; $hour++) {
                $row = $rows->get($hour);
                $trend[] = [
                    'label' => Carbon::createFromTime($hour)->format('g A'),
                    'sales' => (float) ($row->sales ?? 0),
                    'transactions' => (int) ($row->transactions ?? 0),
                ];
            }

            return $trend;
        }

        $dateExpression = $driver === 'sqlite'
            ? "date(created_at)"
            : 'DATE(created_at)';

        $rows = Sales::query()
            ->where('user_id', $userId)
            ->whereBetween('created_at', [$start, $end])
            ->select(
                DB::raw("{$dateExpression} as bucket"),
                DB::raw('SUM(grand_total) as sales'),
                DB::raw('COUNT(*) as transactions')
            )
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->keyBy('bucket');

        $trend = [];
        $cursor = $start->copy()->startOfDay();
        while ($cursor <= $end) {
            $key = $cursor->toDateString();
            $row = $rows->get($key);
            $trend[] = [
                'label' => $cursor->format($period === 'monthly' ? 'M d' : 'D'),
                'sales' => (float) ($row->sales ?? 0),
                'transactions' => (int) ($row->transactions ?? 0),
            ];
            $cursor->addDay();
        }

        return $trend;
    }
}
