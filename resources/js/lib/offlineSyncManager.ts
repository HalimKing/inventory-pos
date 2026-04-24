import axios, { AxiosError } from 'axios';
import { OfflineSale, posDatabase } from './database';

export interface SyncResult {
  success: boolean;
  totalSales: number;
  syncedSales: number;
  failedSales: number;
  errors: SyncError[];
}

export interface SyncError {
  saleId: string;
  message: string;
  timestamp: string;
}

class OfflineSyncManager {
  private isSyncing = false;
  private retryAttempts = 3;
  private retryDelay = 2000; // 2 seconds
  private syncListeners: Array<(result: SyncResult) => void> = [];

  /**
   * Register a listener for sync events
   */
  onSync(callback: (result: SyncResult) => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(result: SyncResult): void {
    this.syncListeners.forEach((callback) => {
      try {
        callback(result);
      } catch (error) {
        console.error('[OfflineSyncManager] Error in sync listener:', error);
      }
    });
  }

  /**
   * Start syncing offline sales
   */
  async syncOfflineSales(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.warn('[OfflineSyncManager] Sync already in progress');
      return {
        success: false,
        totalSales: 0,
        syncedSales: 0,
        failedSales: 0,
        errors: [
          {
            saleId: '',
            message: 'Sync already in progress',
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }

    this.isSyncing = true;
    console.log('[OfflineSyncManager] Starting sync');

    try {
      // Get all unsynced sales from IndexedDB
      await posDatabase.init();
      const unsyncedSales = await posDatabase.getUnsyncedSales();

      if (unsyncedSales.length === 0) {
        console.log('[OfflineSyncManager] No unsynced sales found');
        this.isSyncing = false;
        return {
          success: true,
          totalSales: 0,
          syncedSales: 0,
          failedSales: 0,
          errors: [],
        };
      }

      console.log(`[OfflineSyncManager] Found ${unsyncedSales.length} unsynced sales`);

      const result: SyncResult = {
        success: true,
        totalSales: unsyncedSales.length,
        syncedSales: 0,
        failedSales: 0,
        errors: [],
      };

      // Sync each sale
      for (const sale of unsyncedSales) {
        try {
          await this.syncSale(sale);
          result.syncedSales++;
        } catch (error) {
          result.success = false;
          result.failedSales++;

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({
            saleId: sale.id,
            message: errorMessage,
            timestamp: new Date().toISOString(),
          });

          // Update the sale with error message
          await posDatabase.updateSaleSyncStatus(sale.id, false, errorMessage);
        }
      }

      // Remove successfully synced sales from IndexedDB
      await posDatabase.deleteSyncedSales();

      console.log('[OfflineSyncManager] Sync completed', result);
      this.notifyListeners(result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[OfflineSyncManager] Sync failed:', error);

      const result: SyncResult = {
        success: false,
        totalSales: 0,
        syncedSales: 0,
        failedSales: 0,
        errors: [
          {
            saleId: '',
            message: `Sync failed: ${errorMessage}`,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      this.notifyListeners(result);
      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single sale with retry logic
   */
  private async syncSale(sale: OfflineSale, attempt = 1): Promise<void> {
    try {
      const response = await axios.post('/api/sales/sync', {
        sales: [this.prepareSaleForSync(sale)],
      });

      if (response.data.success) {
        console.log(`[OfflineSyncManager] Sale ${sale.id} synced successfully`);
        await posDatabase.updateSaleSyncStatus(sale.id, true);
      } else {
        throw new Error(response.data.message || 'Sync failed');
      }
    } catch (error) {
      console.error(`[OfflineSyncManager] Error syncing sale ${sale.id}:`, error);

      // Retry logic
      if (attempt < this.retryAttempts) {
        console.log(
          `[OfflineSyncManager] Retrying sale ${sale.id} (attempt ${attempt} of ${this.retryAttempts})`
        );
        await this.delay(this.retryDelay * attempt); // Exponential backoff
        return this.syncSale(sale, attempt + 1);
      }

      // All retries failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to sync after ${this.retryAttempts} attempts: ${errorMessage}`);
    }
  }

  /**
   * Prepare sale data for API submission
   */
  private prepareSaleForSync(sale: OfflineSale) {
    return {
      items: sale.items,
      subtotal: sale.subtotal,
      discount_amount: sale.discountAmount,
      discount_percentage: sale.discountPercentage,
      grand_total: sale.grandTotal,
      amount_paid: sale.amountPaid,
      payment_method: sale.paymentMethod,
      customer_name: sale.customerName,
      created_at: sale.createdAt,
      offline_id: sale.id, // Send offline ID for duplicate prevention
    };
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get sync status
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get unsynced sales count
   */
  async getUnsyncedSalesCount(): Promise<number> {
    await posDatabase.init();
    const unsyncedSales = await posDatabase.getUnsyncedSales();
    return unsyncedSales.length;
  }

  /**
   * Manually retry failed sales
   */
  async retryFailedSales(): Promise<SyncResult> {
    return this.syncOfflineSales();
  }
}

// Export singleton instance
export const offlineSyncManager = new OfflineSyncManager();
