import { Product as OfflineProduct, posDatabase } from './database';

export interface SalesCatalogProduct {
    id: string;
    name: string;
    category?: string;
    barcode?: string | null;
    stock: number;
    price: number;
    image?: string;
    has_expiry?: boolean;
    track_batch?: boolean;
    track_serial?: boolean;
    expiry_date?: string | null;
    is_expired?: boolean;
    is_near_expiry?: boolean;
    inventory_type?: 'perishable' | 'non-perishable';
    selected_batch?: {
        id: number;
        batch_number: string;
        expiry_date: string;
    } | null;
}

function deriveStockStatus(
    product: SalesCatalogProduct,
): OfflineProduct['status'] {
    if (product.is_expired) {
        return 'expired';
    }
    if (product.stock <= 0) {
        return 'out-of-stock';
    }
    if (product.is_near_expiry) {
        return 'near-expiry';
    }
    return 'in-stock';
}

export function mapSalesProductToOfflineProduct(
    product: SalesCatalogProduct,
): OfflineProduct {
    return {
        id: String(product.id),
        name: product.name,
        barcode: product.barcode ?? null,
        category_id: '',
        category_name: product.category ?? '',
        totalQuantity: product.stock,
        quantityLeft: product.stock,
        quantitySold: 0,
        expiryDate: product.expiry_date ?? null,
        status: deriveStockStatus(product),
        sellingPrice: product.price,
        trackBatch: product.track_batch,
        hasExpiry: product.has_expiry,
    };
}

export function mapOfflineProductToSalesProduct(
    product: OfflineProduct,
): SalesCatalogProduct {
    return {
        id: product.id,
        name: product.name,
        category: product.category_name,
        barcode: product.barcode,
        stock: product.quantityLeft,
        price: product.sellingPrice,
        has_expiry: product.hasExpiry,
        track_batch: product.trackBatch,
        expiry_date: product.expiryDate,
        is_expired: product.status === 'expired',
        is_near_expiry: product.status === 'near-expiry',
        inventory_type: product.hasExpiry ? 'perishable' : 'non-perishable',
    };
}

export async function mergeProductsIntoCache(
    products: SalesCatalogProduct[],
): Promise<void> {
    if (products.length === 0) {
        return;
    }

    await posDatabase.init();

    const existing = await posDatabase.getAllProducts();
    const existingById = new Map(existing.map((product) => [product.id, product]));

    const merged = products.map((product) => {
        const mapped = mapSalesProductToOfflineProduct(product);
        const cached = existingById.get(mapped.id);

        if (cached) {
            mapped.quantitySold = cached.quantitySold;
            if (cached.quantityLeft < mapped.quantityLeft) {
                mapped.quantityLeft = cached.quantityLeft;
            }
        }

        return mapped;
    });

    await posDatabase.saveProducts(merged);
}

export async function cacheAllSalesProducts(
    fetchPage: (
        page: number,
    ) => Promise<{ data: SalesCatalogProduct[]; last_page: number }>,
): Promise<void> {
    let page = 1;
    let lastPage = 1;
    const allProducts: SalesCatalogProduct[] = [];

    do {
        const result = await fetchPage(page);
        allProducts.push(...result.data);
        lastPage = result.last_page;
        page += 1;
    } while (page <= lastPage);

    await mergeProductsIntoCache(allProducts);
}

export async function filterCachedProducts(options: {
    search?: string;
    categoryLabel?: string;
    inventoryType?: 'all' | 'perishable' | 'non-perishable';
}): Promise<SalesCatalogProduct[]> {
    await posDatabase.init();

    let products = await posDatabase.getAllProducts();

    if (options.search?.trim()) {
        const query = options.search.trim().toLowerCase();
        products = products.filter(
            (product) =>
                product.name.toLowerCase().includes(query) ||
                product.barcode?.toLowerCase().includes(query) ||
                product.category_name.toLowerCase().includes(query),
        );
    }

    if (options.categoryLabel) {
        products = products.filter(
            (product) => product.category_name === options.categoryLabel,
        );
    }

    if (options.inventoryType === 'perishable') {
        products = products.filter((product) => product.hasExpiry);
    } else if (options.inventoryType === 'non-perishable') {
        products = products.filter((product) => !product.hasExpiry);
    }

    return products.map(mapOfflineProductToSalesProduct);
}
