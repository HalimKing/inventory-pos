import { DBSchema, IDBPDatabase, openDB } from 'idb';

export interface Product {
  id: string;
  name: string;
  barcode?: string | null;
  category_id: string;
  category_name: string;
  totalQuantity: number;
  quantityLeft: number;
  quantitySold: number;
  expiryDate: string | null;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired' | 'near-expiry';
  sellingPrice: number;
  costPrice?: number;
  profit?: number;
  trackBatch?: boolean;
  hasExpiry?: boolean;
}

export interface OfflineSale {
  id: string;
  items: OfflineSaleItem[];
  subtotal: number;
  discountAmount: number;
  discountPercentage: number;
  grandTotal: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: string;
  customerName: string;
  createdAt: string;
  synced: boolean;
  syncedAt?: string;
  errorMessage?: string;
}

export interface OfflineSaleItem {
  productId: string;
  productName: string;
  categoryId: string;
  quantity: number;
  price: number;
  totalAmount: number;
  profit: number;
  quantityLeft: number;
  quantitySold: number;
  expiryDate?: string | null;
}

export interface PosDatabase extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: {
      'by-barcode': string;
      'by-category': string;
      'by-name': string;
    };
  };
  offline_sales: {
    key: string;
    value: OfflineSale;
    indexes: {
      'by-synced': boolean;
      'by-created-at': string;
    };
  };
}

class PosDatabase {
  private db: IDBPDatabase<PosDatabase> | null = null;
  private readonly dbName = 'pos-inventory-db';
  private readonly dbVersion = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<PosDatabase>(this.dbName, this.dbVersion, {
      upgrade(db) {
        // Create products store
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('by-barcode', 'barcode');
          productStore.createIndex('by-category', 'category_id');
          productStore.createIndex('by-name', 'name');
        }

        // Create offline sales store
        if (!db.objectStoreNames.contains('offline_sales')) {
          const saleStore = db.createObjectStore('offline_sales', { keyPath: 'id' });
          saleStore.createIndex('by-synced', 'synced');
          saleStore.createIndex('by-created-at', 'createdAt');
        }
      },
    });
  }

  async saveProducts(products: Product[]): Promise<void> {
    if (!this.db) await this.init();

    const tx = this.db!.transaction('products', 'readwrite');
    for (const product of products) {
      await tx.store.put(product);
    }
    await tx.done;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('products', id);
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    if (!this.db) await this.init();
    return this.db!.getFromIndex('products', 'by-barcode', barcode);
  }

  async searchProducts(query: string): Promise<Product[]> {
    if (!this.db) await this.init();

    const allProducts = await this.db!.getAll('products');
    const lowerQuery = query.toLowerCase();

    return allProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(lowerQuery) ||
        product.barcode?.toLowerCase().includes(lowerQuery) ||
        product.category_name.toLowerCase().includes(lowerQuery)
    );
  }

  async getAllProducts(): Promise<Product[]> {
    if (!this.db) await this.init();
    return this.db!.getAll('products');
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('products', 'by-category', categoryId);
  }

  async clearProducts(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear('products');
  }

  // Offline Sales Operations
  async saveOfflineSale(sale: OfflineSale): Promise<string> {
    if (!this.db) await this.init();

    const id = sale.id || this.generateId();
    const saleWithId: OfflineSale = { ...sale, id };

    await this.db!.put('offline_sales', saleWithId);
    return id;
  }

  async getOfflineSale(id: string): Promise<OfflineSale | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('offline_sales', id);
  }

  async getUnsyncedSales(): Promise<OfflineSale[]> {
    if (!this.db) await this.init();
    const allSales = await this.db!.getAll('offline_sales');
    return allSales.filter(sale => !sale.synced);
  }

  async getAllOfflineSales(): Promise<OfflineSale[]> {
    if (!this.db) await this.init();
    return this.db!.getAll('offline_sales');
  }

  async updateSaleSyncStatus(id: string, synced: boolean, errorMessage?: string): Promise<void> {
    if (!this.db) await this.init();

    const sale = await this.db!.get('offline_sales', id);
    if (sale) {
      sale.synced = synced;
      sale.syncedAt = synced ? new Date().toISOString() : undefined;
      sale.errorMessage = errorMessage;
      await this.db!.put('offline_sales', sale);
    }
  }

  async deleteOfflineSale(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('offline_sales', id);
  }

  async clearOfflineSales(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear('offline_sales');
  }

  async deleteSyncedSales(): Promise<void> {
    if (!this.db) await this.init();

    const syncedSales = await this.getUnsyncedSales();
    const tx = this.db!.transaction('offline_sales', 'readwrite');

    for (const sale of syncedSales) {
      if (sale.synced) {
        await tx.store.delete(sale.id);
      }
    }
    await tx.done;
  }

  private generateId(): string {
    return `sale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getDBStats(): Promise<{ productsCount: number; unsyncedSalesCount: number }> {
    if (!this.db) await this.init();

    const productsCount = await this.db!.count('products');
    const unsyncedSalesCount = (await this.getUnsyncedSales()).length;

    return { productsCount, unsyncedSalesCount };
  }
}

// Export singleton instance
export const posDatabase = new PosDatabase();
