import { v4 as uuidv4 } from 'uuid';
import { OfflineSale, OfflineSaleItem, posDatabase } from './database';

export interface SaveOfflineSaleParams {
  items: OfflineSaleItem[];
  subtotal: number;
  discountAmount: number;
  discountPercentage: number;
  grandTotal: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: string;
  customerName: string;
}

class OfflineSalesStore {
  /**
   * Save a sale for offline processing
   */
  async saveSale(params: SaveOfflineSaleParams): Promise<string> {
    await posDatabase.init();

    const sale: OfflineSale = {
      id: uuidv4(),
      items: params.items,
      subtotal: params.subtotal,
      discountAmount: params.discountAmount,
      discountPercentage: params.discountPercentage,
      grandTotal: params.grandTotal,
      amountPaid: params.amountPaid,
      changeAmount: params.changeAmount,
      paymentMethod: params.paymentMethod,
      customerName: params.customerName,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    const id = await posDatabase.saveOfflineSale(sale);
    console.log('[OfflineSalesStore] Sale saved:', id);

    // Update local inventory
    await this.updateLocalInventory(params.items);

    return id;
  }

  /**
   * Update local inventory when a sale is completed offline
   */
  private async updateLocalInventory(items: OfflineSaleItem[]): Promise<void> {
    await posDatabase.init();

    for (const item of items) {
      const product = await posDatabase.getProduct(item.productId);
      if (product) {
        product.quantityLeft = Math.max(0, product.quantityLeft - item.quantity);
        product.quantitySold += item.quantity;
        await posDatabase.saveProducts([product]);
      }
    }
  }

  /**
   * Get a sale by ID
   */
  async getSale(id: string): Promise<OfflineSale | undefined> {
    await posDatabase.init();
    return posDatabase.getOfflineSale(id);
  }

  /**
   * Get all offline sales
   */
  async getAllSales(): Promise<OfflineSale[]> {
    await posDatabase.init();
    return posDatabase.getAllOfflineSales();
  }

  /**
   * Get unsynced sales
   */
  async getUnsyncedSales(): Promise<OfflineSale[]> {
    await posDatabase.init();
    return posDatabase.getUnsyncedSales();
  }

  /**
   * Delete a sale
   */
  async deleteSale(id: string): Promise<void> {
    await posDatabase.init();
    await posDatabase.deleteOfflineSale(id);
  }

  /**
   * Clear all offline sales
   */
  async clearAllSales(): Promise<void> {
    await posDatabase.init();
    await posDatabase.clearOfflineSales();
  }

  /**
   * Get offline sales statistics
   */
  async getStats(): Promise<{
    totalSales: number;
    unsyncedSales: number;
    syncedSales: number;
    totalAmount: number;
  }> {
    await posDatabase.init();
    const allSales = await posDatabase.getAllOfflineSales();

    const totalSales = allSales.length;
    const unsyncedSales = allSales.filter((s) => !s.synced).length;
    const syncedSales = allSales.filter((s) => s.synced).length;
    const totalAmount = allSales.reduce((sum, sale) => sum + sale.grandTotal, 0);

    return {
      totalSales,
      unsyncedSales,
      syncedSales,
      totalAmount,
    };
  }

  /**
   * Check if there are unsynced sales
   */
  async hasUnsyncedSales(): Promise<boolean> {
    await posDatabase.init();
    const unsyncedSales = await posDatabase.getUnsyncedSales();
    return unsyncedSales.length > 0;
  }
}

// Export singleton instance
export const offlineSalesStore = new OfflineSalesStore();
