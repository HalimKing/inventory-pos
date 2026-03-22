import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    Barcode,
    Check,
    CreditCard,
    DollarSign,
    Loader2,
    Minus,
    Percent,
    Plus,
    Printer,
    Search,
    ShoppingCart,
    Trash2,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

// Shadcn Components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    stock: number;
    barcode?: string | null;
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

interface CompanySettings {
    logo?: string;
    company_name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    return_policy?: string;
    thank_you_message?: string;
}

interface SalesProps {
    productsData: Product[];
    companySettings: CompanySettings;
}

interface CartItem extends Product {
    quantity: number;
}

interface TransactionData {
    items: Array<{
        product_id: string;
        quantity: number;
        price: number;
        subtotal: number;
        name: string;
    }>;
    customer_name: string;
    subtotal: number;
    discount_percentage?: number;
    discount_amount: number;
    total_amount: number;
    payment_method: 'cash' | 'card';
    amount_received: number;
    change_amount: number;
    transaction_id?: string;
    date?: string;
}

// Helper functions for localStorage
const CART_STORAGE_KEY = 'pos_cart_data';
const CUSTOMER_STORAGE_KEY = 'pos_customer_name';
const DISCOUNT_STORAGE_KEY = 'pos_discount';

const loadCartFromStorage = (availableProducts: Product[]): CartItem[] => {
    try {
        const storedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (!storedCart) return [];

        const parsedCart = JSON.parse(storedCart);

        // Validate and filter cart items against available products
        const validCart = parsedCart.filter((cartItem: CartItem) => {
            const productExists = availableProducts.find(
                (p) => p.id === cartItem.id,
            );
            return productExists && cartItem.quantity > 0;
        });

        // console.log('Loaded cart from storage:', validCart);
        return validCart;
    } catch (error) {
        console.error('Error loading cart from storage:', error);
        return [];
    }
};

const saveCartToStorage = (cart: CartItem[]) => {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        console.log('Saved cart to storage:', cart);
    } catch (error) {
        console.error('Error saving cart to storage:', error);
    }
};

const loadCustomerNameFromStorage = (): string => {
    try {
        return localStorage.getItem(CUSTOMER_STORAGE_KEY) || '';
    } catch (error) {
        console.error('Error loading customer name from storage:', error);
        return '';
    }
};

const saveCustomerNameToStorage = (name: string) => {
    try {
        localStorage.setItem(CUSTOMER_STORAGE_KEY, name);
    } catch (error) {
        console.error('Error saving customer name to storage:', error);
    }
};

const loadDiscountFromStorage = (): number => {
    try {
        const discount = localStorage.getItem(DISCOUNT_STORAGE_KEY);
        return discount ? parseFloat(discount) : 0;
    } catch (error) {
        console.error('Error loading discount from storage:', error);
        return 0;
    }
};

const saveDiscountToStorage = (discount: number) => {
    try {
        localStorage.setItem(DISCOUNT_STORAGE_KEY, discount.toString());
    } catch (error) {
        console.error('Error saving discount to storage:', error);
    }
};

const POSCashierInterface: React.FC<SalesProps> = ({
    productsData,
    companySettings,
}) => {
    // console.log('Initial products data:', productsData);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [discount, setDiscount] = useState(0);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(
        null,
    );
    const [amountReceived, setAmountReceived] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [allCategories, setAllCategories] = useState<string[]>(['All']);
    const [inventoryFilter, setInventoryFilter] = useState<
        'all' | 'perishable' | 'non-perishable'
    >('all');
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastTransaction, setLastTransaction] =
        useState<TransactionData | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [isCartLoaded, setIsCartLoaded] = useState(false);
    const [allProducts, setAllProducts] = useState<Product[]>(productsData);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const { auth } = usePage<SharedData>().props;

    const focusBarcodeInput = () => {
        window.requestAnimationFrame(() => {
            barcodeInputRef.current?.focus();
            barcodeInputRef.current?.select();
        });
    };

    const playScanSuccessSound = () => {
        try {
            const audioContext = new window.AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = 1000;
            gainNode.gain.value = 0.08;

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.09);
        } catch (error) {
            console.error('Unable to play scan sound:', error);
        }
    };

    // Load data from localStorage after productsData is available
    useEffect(() => {
        if (allProducts && productsData.length > 0 && !isCartLoaded) {
            const savedCart = loadCartFromStorage(allProducts);
            const savedCustomerName = loadCustomerNameFromStorage();
            const savedDiscount = loadDiscountFromStorage();

            setCart(savedCart);
            setCustomerName(savedCustomerName);
            setDiscount(savedDiscount);
            setIsCartLoaded(true);
        }
    }, [allProducts, isCartLoaded]);

    useEffect(() => {
        focusBarcodeInput();
    }, []);

    // Save cart to localStorage whenever cart changes
    useEffect(() => {
        if (isCartLoaded && cart.length > 0) {
            saveCartToStorage(cart);
        }
    }, [cart, isCartLoaded]);

    // Save customer name to localStorage whenever it changes
    useEffect(() => {
        if (isCartLoaded) {
            saveCustomerNameToStorage(customerName);
        }
    }, [customerName, isCartLoaded]);

    // Save discount to localStorage whenever it changes
    useEffect(() => {
        if (isCartLoaded) {
            saveDiscountToStorage(discount);
        }
    }, [discount, isCartLoaded]);

    const filteredProducts = allProducts.filter((product) => {
        const normalizedSearch = searchQuery.toLowerCase();
        const matchesSearch =
            product.name.toLowerCase().includes(normalizedSearch) ||
            (product.barcode ?? '').toLowerCase().includes(normalizedSearch);
        const matchesCategory =
            selectedCategory === 'All' || product.category === selectedCategory;
        const matchesInventoryType =
            inventoryFilter === 'all' ||
            (product.inventory_type ??
                (product.has_expiry ? 'perishable' : 'non-perishable')) ===
                inventoryFilter;

        return matchesSearch && matchesCategory && matchesInventoryType;
    });

    useEffect(() => {
        var url = '';
        if (auth.user?.role_id === 3) {
            url = '/cashier/sales/products/fetch-all-products';
        } else {
            url = '/admin/sales/products/fetch-all-products';
        }

        axios
            .get(url)
            .then((response) => {
                const categorySet = new Set<string>(['All']);

                response.data.forEach((item: any) => {
                    const categoryName = item?.category ?? item?.label;
                    if (
                        typeof categoryName === 'string' &&
                        categoryName.trim()
                    ) {
                        categorySet.add(categoryName);
                    }
                });

                setAllCategories(Array.from(categorySet));
            })
            .catch((error) => {
                console.error('Error fetching categories:', error);
            });
    }, []);

    const addToCart = (product: Product) => {
        if (product.stock <= 0) {
            alert(`${product.name} is out of stock.`);
            return;
        }

        if (product.is_expired) {
            alert(`${product.name} is expired and cannot be sold.`);
            return;
        }

        const existingItem = cart.find((item) => item.id === product.id);

        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                const updatedCart = cart.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                );
                setCart(updatedCart);
            }
        } else {
            const updatedCart = [...cart, { ...product, quantity: 1 }];
            setCart(updatedCart);
        }
    };

    const lookupProductByBarcode = async (inputBarcode: string) => {
        const scannedBarcode = inputBarcode.trim();

        if (!scannedBarcode) {
            return;
        }

        const localMatch = allProducts.find(
            (product) => product.barcode === scannedBarcode,
        );

        if (localMatch) {
            addToCart(localMatch);
            playScanSuccessSound();
            setBarcodeInput('');
            focusBarcodeInput();
            return;
        }

        setIsScanning(true);

        try {
            const response = await axios.get(
                `/api/products/barcode/${encodeURIComponent(scannedBarcode)}`,
            );

            const scannedProduct: Product = response.data;

            setAllProducts((previousProducts) => {
                const productExists = previousProducts.some(
                    (product) => product.id === scannedProduct.id,
                );

                if (productExists) {
                    return previousProducts.map((product) =>
                        product.id === scannedProduct.id
                            ? { ...product, ...scannedProduct }
                            : product,
                    );
                }

                return [...previousProducts, scannedProduct];
            });

            addToCart(scannedProduct);
            playScanSuccessSound();
            setBarcodeInput('');
            focusBarcodeInput();
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message =
                    error.response?.data?.message || 'Product not found';
                alert(message);
            } else {
                alert('Product not found');
            }

            setBarcodeInput('');
            focusBarcodeInput();
        } finally {
            setIsScanning(false);
        }
    };

    const removeFromCart = (productId: string) => {
        const updatedCart = cart.filter((item) => item.id !== productId);
        setCart(updatedCart);
    };

    const updateQuantity = (productId: string, newQuantity: number) => {
        const product = allProducts.find((p) => p.id === productId);
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else if (product && newQuantity <= product.stock) {
            const updatedCart = cart.map((item) =>
                item.id === productId
                    ? { ...item, quantity: newQuantity }
                    : item,
            );
            setCart(updatedCart);
        }
    };

    const calculateSubtotal = () => {
        return cart.reduce((sum, item) => {
            const price =
                typeof item.price === 'string'
                    ? parseFloat(item.price)
                    : item.price;
            return sum + price * item.quantity;
        }, 0);
    };

    const calculateDiscount = () => {
        return (calculateSubtotal() * discount) / 100;
    };

    const calculateTotal = () => {
        return calculateSubtotal() - calculateDiscount();
    };

    const calculateChange = () => {
        const received = parseFloat(amountReceived) || 0;
        return received - calculateTotal();
    };

    const clearCart = () => {
        setCart([]);
        setDiscount(0);
        setCustomerName('');
        setSearchQuery('');
        // Also clear from localStorage
        localStorage.removeItem(CART_STORAGE_KEY);
        localStorage.removeItem(CUSTOMER_STORAGE_KEY);
        localStorage.removeItem(DISCOUNT_STORAGE_KEY);
        console.log('Cart cleared from storage');
    };

    const handlePayment = () => {
        if (cart.length === 0) return;
        setShowPaymentModal(true);
    };

    const saveTransaction = async (): Promise<{
        success: boolean;
        transaction?: TransactionData;
    }> => {
        try {
            const transactionData: TransactionData = {
                items: cart.map((item) => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    price:
                        typeof item.price === 'string'
                            ? parseFloat(item.price)
                            : item.price,
                    subtotal:
                        (typeof item.price === 'string'
                            ? parseFloat(item.price)
                            : item.price) * item.quantity,
                    name: item.name,
                })),
                customer_name: customerName || 'Walk-in Customer',
                subtotal: calculateSubtotal(),
                discount_amount: calculateDiscount(),
                discount_percentage: discount,
                total_amount: calculateTotal(),
                payment_method: paymentMethod!,
                amount_received: parseFloat(amountReceived) || calculateTotal(),
                change_amount: paymentMethod === 'cash' ? calculateChange() : 0,
                transaction_id: `TXN-${Date.now()}`,
            };

            var transactionUrl = '';
            if (auth.user?.role_id === 3) {
                transactionUrl = '/cashier/sales/save/transaction';
            } else {
                transactionUrl = '/admin/sales/save/transaction';
            }

            const response = await axios.post(transactionUrl, transactionData, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') || '',
                },
            });

            if (response.status === 200) {
                console.log('Transaction saved successfully:', response.data);

                const savedTransaction = {
                    ...transactionData,
                    transaction_id:
                        response.data.transaction_id ||
                        transactionData.transaction_id,
                    date: new Date().toLocaleString(),
                };

                return { success: true, transaction: savedTransaction };
            } else {
                console.error('Failed to save transaction:', response.data);
                return { success: false };
            }
        } catch (error) {
            console.error('Error saving transaction:', error);
            if (axios.isAxiosError(error)) {
                const responseErrors = error.response?.data?.errors;
                if (Array.isArray(responseErrors) && responseErrors.length) {
                    alert(responseErrors.join('\n'));
                } else if (typeof error.response?.data?.message === 'string') {
                    alert(error.response.data.message);
                }
            }
            return { success: false };
        }
    };

    const fetchProducts = async () => {
        var url = '';
        if (auth.user?.role_id === 3) {
            url = '/cashier/sales/products/fetch-all-products';
        } else {
            url = '/admin/sales/products/fetch-all-products';
        }
        try {
            const response = await axios.get(url);
            console.log('raw response', response.data);
            setAllProducts(response.data);
        } catch (error) {
            console.error('Fetching Error', error);
        }
    };

    const printReceipt = (transaction: TransactionData) => {
        const receiptWindow = window.open('', '_blank');
        if (receiptWindow) {
            const formatPrice = (price: any): string => {
                const num =
                    typeof price === 'string' ? parseFloat(price) : price;
                return isNaN(num) ? '0.00' : num.toFixed(2);
            };

            const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${transaction.transaction_id}</title>
          <style>
            @media print {
              @page {
                margin: 0;
                size: auto;
              }
              body {
                margin: 0;
                padding: 20px 0;
                display: flex;
                justify-content: center;
                min-height: auto;
              }
              .receipt-container {
                margin: 0 auto;
                transform: translateY(0);
              }
            }
            
            @media screen {
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
            }
            
            .receipt-container {
              font-family: 'Courier New', monospace, Arial, sans-serif;
              font-size: 12px;
              max-width: 280px;
              width: 100%;
              background: white;
              padding: 20px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
              margin: 0 auto;
            }
            
            .store-info {
              text-align: center;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 1px dashed #000;
            }
            
            .receipt-title {
              text-align: center;
              margin: 10px 0;
              font-weight: bold;
              font-size: 14px;
            }
            
            .line {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
              padding: 1px 0;
            }
            
            .items-header {
              font-weight: bold;
              border-bottom: 1px solid #000;
              padding-bottom: 5px;
              margin: 10px 0 5px 0;
            }
            
            .total-line {
              font-weight: bold;
              border-top: 2px dashed #000;
              padding-top: 8px;
              margin-top: 8px;
            }
            
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px dashed #000;
            }
            
            .thank-you {
              text-align: center;
              font-weight: bold;
              margin: 15px 0;
              padding: 10px 0;
            }
            
            .button-container {
              text-align: center;
              margin-top: 20px;
            }
            
            button {
              padding: 10px 20px;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 12px;
              margin: 0 5px;
            }
            
            .print-btn {
              background: #007bff;
              color: white;
            }
            
            .close-btn {
              background: #6c757d;
              color: white;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <!-- Store Header -->
            <div class="store-info">
              <h2 style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">${companySettings.company_name}</h2>
              <p style="margin: 2px 0;">${companySettings.address}</p>
              <p style="margin: 2px 0;">Tel: ${companySettings.phone}</p>
              <p style="margin: 2px 0;">Email: ${companySettings.email}</p>
            </div>

            <!-- Receipt Title -->
            <div class="receipt-title">
              SALES RECEIPT
            </div>

            <!-- Transaction Info -->
            <div class="line">
              <span>Date:</span>
              <span>${transaction.date || new Date().toLocaleString()}</span>
            </div>
            <div class="line">
              <span>Receipt #:</span>
              <span>${transaction.transaction_id}</span>
            </div>
            <div class="line">
              <span>Customer:</span>
              <span>${transaction.customer_name}</span>
            </div>
            
            <!-- Items Header -->
            <div class="items-header">
              <div class="line">
                <span>ITEM</span>
                <span>QTY x PRICE</span>
                <span>TOTAL</span>
              </div>
            </div>
            
            <!-- Items List -->
            ${transaction.items
                .map(
                    (item) => `
              <div class="line">
                <span style="flex: 2; text-align: left;">${item.name}</span>
                <span style="flex: 1; text-align: center;">${item.quantity} x GHS${formatPrice(item.price)}</span>
                <span style="flex: 1; text-align: right;">GHS${formatPrice(item.subtotal)}</span>
              </div>
            `,
                )
                .join('')}
            
            <!-- Totals Section -->
            <div class="line">
              <span>Subtotal:</span>
              <span>GHS${formatPrice(transaction.subtotal)}</span>
            </div>
            
            ${
                transaction.discount_percentage &&
                transaction.discount_percentage > 0
                    ? `
              <div class="line">
                <span>Discount (${transaction.discount_percentage}%):</span>
                <span>-GHS${formatPrice(transaction.discount_amount)}</span>
              </div>
            `
                    : ''
            }
            
            <div class="line total-line">
              <span>TOTAL:</span>
              <span>GHS${formatPrice(transaction.total_amount)}</span>
            </div>
            
            <!-- Payment Info -->
            <div class="line">
              <span>Payment Method:</span>
              <span>${transaction.payment_method.toUpperCase()}</span>
            </div>
            
            ${
                transaction.payment_method === 'cash'
                    ? `
              <div class="line">
                <span>Amount Received:</span>
                <span>GHS${formatPrice(transaction.amount_received)}</span>
              </div>
              <div class="line">
                <span>Change:</span>
                <span>GHS${formatPrice(transaction.change_amount)}</span>
              </div>
            `
                    : ''
            }

            <!-- Thank You Message -->
            <div class="thank-you">
              THANK YOU FOR YOUR BUSINESS!
            </div>

            <!-- Footer -->
            <div class="footer">
              ${companySettings.return_policy?.length !== 0 ? `<p style="margin: 5px 0;">Return Policy: ${companySettings.return_policy}</p>` : ''}
              ${companySettings.thank_you_message?.length !== 0 ? `<p style="margin: 5px 0;">${companySettings.thank_you_message}</p>` : ''}
            </div>

            <!-- Print Buttons (Hidden when printing) -->
            <div class="button-container">
              <button class="print-btn" onclick="window.print()">Print Receipt</button>
              <button class="close-btn" onclick="window.close()">Close</button>
            </div>
          </div>
          
          <script>
            setTimeout(() => {
              window.print();
            }, 500);
          </script>
        </body>
      </html>
    `;

            receiptWindow.document.write(receiptContent);
            receiptWindow.document.close();
        }
    };

    const completeTransaction = async () => {
        if (cart.length === 0 || !paymentMethod) return;

        setIsProcessing(true);

        try {
            const result = await saveTransaction();

            if (result.success && result.transaction) {
                setLastTransaction(result.transaction);

                alert(
                    `Transaction completed successfully!\nTotal: GHS${calculateTotal().toFixed(2)}`,
                );

                const shouldPrint = window.confirm(
                    'Would you like to print the receipt?',
                );

                if (shouldPrint) {
                    setTimeout(() => {
                        printReceipt(result.transaction!);
                    }, 100);
                }
                fetchProducts();
                resetAfterTransaction();
            } else {
                alert('Failed to save transaction. Please try again.');
            }
        } catch (error) {
            console.error('Transaction error:', error);
            alert(
                'An error occurred while processing the transaction. Please try again.',
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const resetAfterTransaction = () => {
        setShowPaymentModal(false);
        setPaymentMethod(null);
        setAmountReceived('');
        clearCart(); // This will clear both state and localStorage
        setLastTransaction(null);
        setShowReceiptModal(false);
    };

    const handleDiscountChange = (value: string) => {
        const newDiscount = Math.min(100, Math.max(0, parseFloat(value) || 0));
        setDiscount(newDiscount);
    };

    const handleCustomerNameChange = (name: string) => {
        setCustomerName(name);
    };

    return (
        <div className="flex h-screen flex-col bg-background">
            <div className="flex flex-1 overflow-hidden">
                {/* Products Section */}
                <div className="flex flex-1 flex-col overflow-hidden p-6">
                    {/* Search and Categories */}
                    <div className="mb-6 space-y-4">
                        <div className="rounded-md border bg-card p-3">
                            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Barcode className="h-4 w-4" />
                                Barcode Scanner
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    ref={barcodeInputRef}
                                    type="text"
                                    placeholder="Scan or type barcode, then press Enter"
                                    value={barcodeInput}
                                    onChange={(e) =>
                                        setBarcodeInput(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            lookupProductByBarcode(
                                                barcodeInput,
                                            );
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    onClick={() =>
                                        lookupProductByBarcode(barcodeInput)
                                    }
                                    disabled={
                                        isScanning || !barcodeInput.trim()
                                    }
                                >
                                    {isScanning ? 'Scanning...' : 'Add'}
                                </Button>
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search products or scan barcode..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <ScrollArea className="pb-2 whitespace-nowrap">
                            <div className="space-y-2">
                                <Tabs
                                    value={selectedCategory}
                                    onValueChange={setSelectedCategory}
                                >
                                    <TabsList className="inline-flex h-10 rounded-md">
                                        {allCategories.map(
                                            (category, index) => (
                                                <TabsTrigger
                                                    key={index}
                                                    value={category}
                                                    className="whitespace-nowrap"
                                                >
                                                    {category}
                                                </TabsTrigger>
                                            ),
                                        )}
                                    </TabsList>
                                </Tabs>

                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                            inventoryFilter === 'all'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        onClick={() =>
                                            setInventoryFilter('all')
                                        }
                                    >
                                        All
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                            inventoryFilter === 'perishable'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        onClick={() =>
                                            setInventoryFilter('perishable')
                                        }
                                    >
                                        Perishable
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                            inventoryFilter === 'non-perishable'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        onClick={() =>
                                            setInventoryFilter('non-perishable')
                                        }
                                    >
                                        Non-perishable
                                    </Button>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Products Grid */}
                    <ScrollArea className="flex-1">
                        <div className="grid grid-cols-2 gap-4 p-1 md:grid-cols-3 lg:grid-cols-4">
                            {filteredProducts.map((product) => (
                                <Card
                                    key={product.id}
                                    className={`cursor-pointer transition-shadow hover:shadow-lg ${product.is_expired ? 'opacity-70' : ''}`}
                                >
                                    <Button
                                        variant="ghost"
                                        className="flex h-full w-full flex-col items-stretch p-0"
                                        disabled={product.is_expired}
                                        onClick={() => addToCart(product)}
                                    >
                                        <CardContent className="flex h-full flex-col p-4">
                                            <div className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-muted">
                                                {product.image ? (
                                                    <img
                                                        src={`storage/${product.image}`}
                                                        alt={product.name}
                                                        className="max-h-full max-w-full object-contain"
                                                    />
                                                ) : (
                                                    <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <h3 className="mb-1 truncate font-semibold text-foreground">
                                                    {product.name}
                                                </h3>
                                                <p className="mb-2 text-sm text-muted-foreground">
                                                    {product.category}
                                                </p>
                                                <div className="mb-2 flex flex-wrap gap-1">
                                                    {(product.inventory_type ??
                                                        (product.has_expiry
                                                            ? 'perishable'
                                                            : 'non-perishable')) ===
                                                    'perishable' ? (
                                                        <Badge variant="secondary">
                                                            Perishable
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">
                                                            Non-perishable
                                                        </Badge>
                                                    )}

                                                    {product.is_expired && (
                                                        <Badge variant="destructive">
                                                            Expired
                                                        </Badge>
                                                    )}

                                                    {!product.is_expired &&
                                                        product.is_near_expiry && (
                                                            <Badge variant="secondary">
                                                                Near Expiry
                                                            </Badge>
                                                        )}
                                                </div>

                                                {product.track_batch &&
                                                    product.selected_batch && (
                                                        <p className="mb-2 text-xs text-muted-foreground">
                                                            FEFO batch:{' '}
                                                            {
                                                                product
                                                                    .selected_batch
                                                                    .batch_number
                                                            }
                                                        </p>
                                                    )}
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-bold text-primary">
                                                    GHS{product.price}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    Stock: {product.stock}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Button>
                                </Card>
                            ))}
                        </div>
                        {filteredProducts.length === 0 && (
                            <div className="py-8 text-center">
                                <p className="text-muted-foreground">
                                    There are no products for this category!
                                </p>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Cart Section */}
                <div className="flex w-96 flex-col border-l bg-card">
                    {/* Cart Header */}
                    <div className="border-b p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <CardTitle className="text-lg">
                                Current Order
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearCart}
                                className="text-destructive hover:text-destructive/90"
                            >
                                Clear All
                            </Button>
                        </div>
                        <Input
                            type="text"
                            placeholder="Customer name (optional)"
                            value={customerName}
                            onChange={(e) =>
                                handleCustomerNameChange(e.target.value)
                            }
                            className="w-full"
                        />
                    </div>

                    {/* Cart Items */}
                    <ScrollArea className="flex-1 p-4">
                        {cart.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                                <ShoppingCart className="mb-4 h-16 w-16" />
                                <p className="text-sm">No items in cart</p>
                                {!isCartLoaded && (
                                    <p className="mt-2 text-xs">
                                        Loading cart...
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <Card key={item.id} className="p-3">
                                        <div className="mb-2 flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-sm font-semibold">
                                                    {item.name}
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    GHS{item.price} each
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    removeFromCart(item.id)
                                                }
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            item.quantity - 1,
                                                        )
                                                    }
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-8 text-center font-semibold">
                                                    {item.quantity}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            item.quantity + 1,
                                                        )
                                                    }
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <span className="font-bold">
                                                GHS
                                                {(
                                                    item.price * item.quantity
                                                ).toFixed(2)}
                                            </span>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Cart Summary */}
                    {cart.length > 0 && (
                        <div className="space-y-3 border-t p-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Subtotal
                                </span>
                                <span className="font-semibold">
                                    GHS{calculateSubtotal().toFixed(2)}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    placeholder="Discount %"
                                    value={discount || ''}
                                    onChange={(e) =>
                                        handleDiscountChange(e.target.value)
                                    }
                                    min="0"
                                    max="100"
                                    className="flex-1"
                                />
                            </div>

                            {discount > 0 && (
                                <div className="flex items-center justify-between text-sm text-green-600">
                                    <span>Discount ({discount}%)</span>
                                    <span>
                                        -GHS{calculateDiscount().toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <Separator />

                            <div className="flex items-center justify-between text-lg font-bold">
                                <span>Total</span>
                                <span className="text-primary">
                                    GHS{calculateTotal().toFixed(2)}
                                </span>
                            </div>

                            <Button
                                onClick={handlePayment}
                                className="w-full"
                                size="lg"
                            >
                                <CreditCard className="mr-2 h-5 w-5" />
                                Process Payment
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Payment</DialogTitle>
                    </DialogHeader>

                    <div className="mb-6 rounded-lg bg-primary/10 p-4">
                        <p className="mb-1 text-sm text-muted-foreground">
                            Total Amount
                        </p>
                        <p className="text-3xl font-bold text-primary">
                            GHS{calculateTotal().toFixed(2)}
                        </p>
                    </div>

                    <div className="mb-6">
                        <p className="mb-3 text-sm font-semibold">
                            Select Payment Method
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant={
                                    paymentMethod === 'cash'
                                        ? 'default'
                                        : 'outline'
                                }
                                onClick={() => setPaymentMethod('cash')}
                                className="flex h-auto flex-col gap-2 py-4"
                            >
                                <DollarSign className="h-8 w-8" />
                                <span className="font-semibold">Cash</span>
                            </Button>
                            <Button
                                variant={
                                    paymentMethod === 'card'
                                        ? 'default'
                                        : 'outline'
                                }
                                onClick={() => setPaymentMethod('card')}
                                className="flex h-auto flex-col gap-2 py-4"
                            >
                                <CreditCard className="h-8 w-8" />
                                <span className="font-semibold">Card</span>
                            </Button>
                        </div>
                    </div>

                    {paymentMethod === 'cash' && (
                        <div className="mb-6 space-y-2">
                            <label className="block text-sm font-semibold">
                                Amount Received
                            </label>
                            <Input
                                type="number"
                                value={amountReceived}
                                onChange={(e) =>
                                    setAmountReceived(e.target.value)
                                }
                                placeholder="0.00"
                                className="text-lg"
                            />
                            {parseFloat(amountReceived) >= calculateTotal() && (
                                <div className="mt-3 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                                    <p className="text-sm text-muted-foreground">
                                        Change
                                    </p>
                                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                        GHS{calculateChange().toFixed(2)}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            onClick={completeTransaction}
                            disabled={
                                !paymentMethod ||
                                (paymentMethod === 'cash' &&
                                    parseFloat(amountReceived) <
                                        calculateTotal()) ||
                                isProcessing
                            }
                            className="w-full"
                            size="lg"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-5 w-5" />
                                    Complete Transaction
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Modal */}
            <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Receipt Preview</DialogTitle>
                    </DialogHeader>

                    <div className="max-h-96 overflow-y-auto p-4">
                        <div className="text-center text-muted-foreground">
                            Receipt preview available in print view
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            onClick={() =>
                                lastTransaction && printReceipt(lastTransaction)
                            }
                            className="flex-1"
                        >
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowReceiptModal(false)}
                            className="flex-1"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Sales({ productsData, companySettings }: SalesProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="POS System" />
            <POSCashierInterface
                productsData={productsData}
                companySettings={companySettings}
            />
        </AppLayout>
    );
}
