# Offline POS Mode Implementation Guide

## Overview

The POS system now supports full offline mode, allowing cashiers to continue processing sales even without internet connectivity. All offline transactions are automatically synced to the server when connectivity is restored.

## Features Implemented

### 1. **Progressive Web App (PWA)**

- **Location**: `public/manifest.json`
- Enables installation as a standalone app
- Allows app to work offline with cached assets
- Includes app icons, shortcuts, and metadata

### 2. **Service Worker**

- **Location**: `public/sw.js`
- Implements smart caching strategies:
    - **Cache-first** for static assets (CSS, JS, images)
    - **Network-first** for HTML pages
    - **Network-first** for API requests with cache fallback
- Provides offline fallback UI
- Automatically cleans up old caches on update

### 3. **IndexedDB Storage**

- **Location**: `resources/js/lib/database.ts`
- Stores products locally for offline searching
- Stores offline sales for later sync
- Object stores:
    - `products`: All product data with indexes for barcode, category, and name search
    - `offline_sales`: Sales created while offline

### 4. **Online/Offline Detection**

- **Location**: `resources/js/hooks/useOnlineStatus.ts`
- Hooks: `useOnlineStatus()` and `useConnectivityStatus()`
- Detects connection status changes
- Provides real-time status updates

### 5. **Offline Sales Management**

- **Location**: `resources/js/lib/offlineSalesStore.ts`
- Save sales to IndexedDB when offline
- Update local inventory
- Query and manage offline sales
- Get statistics

### 6. **Sync Manager**

- **Location**: `resources/js/lib/offlineSyncManager.ts`
- Automatically syncs when connection returns
- Includes retry logic with exponential backoff
- Tracks sync progress
- Prevents duplicate submissions
- Event listeners for sync status

### 7. **UI Components**

- **Location**: `resources/js/components/OfflineModeIndicator.tsx`
- **OfflineModeIndicator**: Shows online/offline status badge
- **OfflineNotificationBanner**: Shows banner when offline
- **OfflineStatusPanel**: Shows connection status and sync info

### 8. **Enhanced Sales Page**

- **Location**: `resources/js/pages/sales/index.tsx`
- Integrated offline detection
- Saves transactions to IndexedDB when offline
- Shows offline status indicator
- Displays sync notifications
- Seamless online/offline transaction processing

### 9. **Backend Sync Endpoint**

- **Location**: `app/Http/Controllers/SalesController.php`
- Method: `syncOfflineSales()`
- Accepts multiple offline sales
- Validates stock before saving
- Prevents duplicate submissions using `offline_sync_id`
- Updates inventory on sync
- Returns sync results

### 10. **Database Migration**

- **Location**: `database/migrations/2026_03_22_100008_add_offline_sync_fields_to_sales.php`
- Adds `offline_sync_id` column (unique) to sales table
- Adds `synced_at` column to track sync timestamp

## Installation & Setup

### 1. Run Database Migration

```bash
php artisan migrate
```

This adds offline sync fields to the Sales table.

### 2. Register Service Worker

Add to your app.tsx or app layout:

```typescript
useEffect(() => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration);
            })
            .catch((error) => {
                console.error('Service Worker registration failed:', error);
            });
    }
}, []);
```

This is typically already in your app initialization.

### 3. Configure API Route

The sync endpoint is available at:

```
POST /api/sales/sync
```

Protected by middleware: `role:supper admin,admin,cashier`

## Usage

### For Users (Cashiers)

1. **Offline Mode Indicator**
    - Green "Online" badge when connected
    - Red "Offline Mode" badge when disconnected
    - Yellow warning when there are unsynced sales

2. **Creating a Sale Offline**
    - POS works exactly as normal
    - System detects offline status
    - Sale is saved to local storage instead
    - Notification shows: "💾 Sale saved offline. It will be synced when connection is restored."

3. **Automatic Sync**
    - When connection is restored, sync automatically starts
    - Notification shows: "🟢 Connection restored. Syncing offline sales..."
    - Successful sales show: "✅ Successfully synced X sale(s)"
    - Failed sales show error message

4. **Manual Sync**
    - Click "Sync Now" button to manually trigger sync
    - Status panel shows unsynced sales count

### For Developers

#### Offline Detection

```typescript
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function MyComponent() {
  const { isOnline, isOffline, status } = useOnlineStatus();

  return <div>{status === 'online' ? '🟢' : '🔴'}</div>;
}
```

#### IndexedDB Operations

```typescript
import { posDatabase } from '@/lib/database';

// Initialize
await posDatabase.init();

// Save products
await posDatabase.saveProducts(productArray);

// Search products
const results = await posDatabase.searchProducts('search term');

// Get product by barcode
const product = await posDatabase.getProductByBarcode('12345');

// Save offline sale
const saleId = await posDatabase.saveOfflineSale(saleData);

// Get unsynced sales
const unsyncedSales = await posDatabase.getUnsyncedSales();
```

#### Manage Sync

```typescript
import { offlineSyncManager } from '@/lib/offlineSyncManager';
import { useSyncManager } from '@/lib/useSyncManager';

// Manual trigger
const result = await offlineSyncManager.syncOfflineSales();

// Listen to sync events
offlineSyncManager.onSync((result) => {
  console.log('Sync completed:', result);
});

// Use hook for auto-sync
function MyComponent() {
  const { isSyncing, unsyncedCount, manualSync } = useSyncManager();

  return (
    <>
      <p>Unsynced: {unsyncedCount}</p>
      <button onClick={manualSync} disabled={isSyncing}>
        {isSyncing ? 'Syncing...' : 'Sync'}
      </button>
    </>
  );
}
```

## API Endpoint Details

### POST /api/sales/sync

**Request:**

```json
{
    "sales": [
        {
            "items": [
                {
                    "product_id": "uuid",
                    "product_name": "Product Name",
                    "quantity": 5,
                    "price": 100.0,
                    "category_id": "uuid",
                    "total_amount": 500.0,
                    "profit": 50.0
                }
            ],
            "subtotal": 500.0,
            "discount_amount": 50.0,
            "discount_percentage": 10,
            "grand_total": 450.0,
            "amount_paid": 500.0,
            "payment_method": "cash",
            "customer_name": "John Doe",
            "created_at": "2026-03-22T10:30:00",
            "offline_id": "unique-offline-id"
        }
    ]
}
```

**Response (Success):**

```json
{
    "success": true,
    "synced_count": 1,
    "failed_count": 0,
    "errors": []
}
```

**Response (Partial Failure):**

```json
{
    "success": false,
    "synced_count": 1,
    "failed_count": 1,
    "errors": [
        {
            "offline_id": "unique-offline-id",
            "message": "Insufficient stock for Product Name"
        }
    ]
}
```

## Error Handling

### Automatic Retry Logic

- Retries failed syncs up to 3 times
- Exponential backoff: 2s, 4s, 8s
- Keeps failed sales in IndexedDB for manual retry

### Duplicate Prevention

- Each offline sale has a unique `offline_sync_id`
- Server checks for duplicates before processing
- If a duplicate is detected and already processed, it's counted as successful

### Stock Validation

- Server validates stock availability during sync
- Failed sync includes stock error message
- Sales remain in local storage for retry when stock is replenished

## Performance Optimization

1. **Caching Strategy**
    - Static assets cached permanently
    - Pages cached after first load
    - API responses cached for offline access

2. **IndexedDB**
    - Efficient indexing for barcode and category search
    - Lazy loading of products
    - Batch operations for sync

3. **Sync Process**
    - Only syncs unsynced sales
    - Continues on partial failures
    - Removes successfully synced sales from storage

## Testing Offline Mode

### Enable Offline Mode (DevTools)

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. POS will now operate in offline mode

### Simulate Connection Restoration

1. Uncheck "Offline" in DevTools Network tab
2. Sync will automatically trigger
3. Check console for sync progress

### Manual Testing

1. Navigate to POS page
2. Check "Offline" in DevTools
3. Create a sale - should see "saved offline" notification
4. Uncheck "Offline" - should see sync notification
5. Check browser console for logs

## Database Tables

### Sales Table Changes

New columns added:

- `offline_sync_id` (string, unique, nullable): ID from offline sale
- `synced_at` (timestamp, nullable): When the sale was synced from offline

## Configuration

### Service Worker Cache Duration

Edit `public/sw.js` to change cache behavior:

- Line ~110: Modify `addAll()` for static assets
- Line ~150: Modify `handleStaticAsset()` for cache duration

### Sync Retry Settings

Edit `resources/js/lib/offlineSyncManager.ts`:

- Line ~18: `retryAttempts` (default: 3)
- Line ~19: `retryDelay` (default: 2000ms)

### Product Sync Frequency

Edit `resources/js/pages/sales/index.tsx`:

- Line ~330: Modify fetch interval

## Limitations & Considerations

1. **Offline Product Updates**
    - Products are only updated when online
    - Use "Refresh Products" button to manually update

2. **Stock Validation**
    - Local stock updates are approximate
    - Server performs final validation on sync
    - Multiple offline cashiers may cause stock conflicts

3. **Batch Expiry**
    - Batch selection is not guaranteed offline
    - Server may select different batch based on current inventory

4. **Payment Methods**
    - Both cash and card payments are recordable offline
    - Card validation happens only online (if implemented)

## Security Considerations

1. **Authentication**
    - Offline sales only created by logged-in users
    - User ID stored with each offline sale
    - Sync requires active session

2. **Data Validation**
    - All data re-validated on server during sync
    - Prevents tampering with IndexedDB data
    - Stock checks prevent invalid overselling

3. **Duplicate Prevention**
    - Offline ID prevents recurring submissions
    - Server-side check ensures no duplicates

## Browser Support

- Chrome/Chromium 40+
- Firefox 55+
- Safari 12.1+
- Edge 18+

Requires IndexedDB and Service Worker support.

## Troubleshooting

### Sales Not Syncing

1. Check browser console for errors
2. Verify internet connection (should see green badge)
3. Check "Offline" is not enabled in DevTools
4. Try manual sync via "Sync Now" button

### Service Worker Not Registering

1. Ensure site is served over HTTPS (or localhost)
2. Check browser console for registration errors
3. Clear site data and refresh

### Products Not Loading Offline

1. Refresh page while online to cache products
2. Check IndexedDB in DevTools
3. Products must be fetched while online before going offline

### Sync Stuck

1. Check network tab in DevTools
2. Verify API endpoint is reachable
3. Check server logs for errors
4. Try manual sync retry

## Future Enhancements

1. Background sync API for more reliable syncing
2. Conflict resolution for multi-terminal scenarios
3. Partial sync (syncing specific sales)
4. Local analytics while offline
5. Offline customer database
6. Receipt printing offline
7. Barcode generation offline

## Support & Maintenance

For issues or improvements:

1. Check browser console logs
2. Verify server logs
3. Test with offline enabled/disabled
4. Clear browser cache if issues persist

## References

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Online/Offline Detection](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
