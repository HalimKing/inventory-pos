export interface CompanySettings {
    logo?: string;
    company_name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    return_policy?: string;
    thank_you_message?: string;
}

export interface ReceiptItem {
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
}

export interface ReceiptTransaction {
    transaction_id: string;
    date?: string;
    customer_name: string;
    items: ReceiptItem[];
    subtotal: number;
    discount_percentage?: number;
    discount_amount: number;
    total_amount: number;
    payment_method: string;
    amount_received: number;
    change_amount: number;
}

export function formatPrice(price: string | number): string {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return Number.isNaN(num) ? '0.00' : num.toFixed(2);
}

export function buildReceiptHtml(
    transaction: ReceiptTransaction,
    companySettings?: CompanySettings | null,
): string {
    const companyName = companySettings?.company_name ?? 'POS Store';
    const thankYou =
        companySettings?.thank_you_message ?? 'Thank you for your purchase!';

    const itemRows = transaction.items
        .map(
            (item) => `
        <div class="line">
          <span>${item.name} x${item.quantity}</span>
          <span>GHS ${formatPrice(item.subtotal)}</span>
        </div>`,
        )
        .join('');

    return `<!DOCTYPE html>
<html>
  <head>
    <title>Receipt ${transaction.transaction_id}</title>
    <style>
      @media print {
        @page { margin: 0; size: auto; }
        body { margin: 0; padding: 20px 0; }
      }
      body {
        font-family: 'Courier New', monospace, Arial, sans-serif;
        font-size: 12px;
        display: flex;
        justify-content: center;
        background: #f5f5f5;
        margin: 0;
        min-height: 100vh;
      }
      .receipt-container {
        max-width: 280px;
        width: 100%;
        background: white;
        padding: 20px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        margin: 20px auto;
      }
      .store-info { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
      .receipt-title { text-align: center; font-weight: bold; font-size: 14px; margin: 10px 0; }
      .line { display: flex; justify-content: space-between; margin: 4px 0; }
      .items-header { font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin: 10px 0 5px; }
      .total-line { font-weight: bold; border-top: 2px dashed #000; padding-top: 8px; margin-top: 8px; }
      .footer, .thank-you { text-align: center; margin-top: 15px; }
      .button-container { text-align: center; margin-top: 20px; }
      .print-btn, .close-btn { padding: 8px 16px; cursor: pointer; margin: 0 4px; }
      @media print {
        .button-container,
        .print-btn,
        .close-btn,
        .no-print {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .receipt-container { box-shadow: none !important; }
      }
    </style>
  </head>
  <body>
    <div class="receipt-container">
      <div class="store-info">
        <strong>${companyName}</strong><br/>
        ${companySettings?.address ?? ''}<br/>
        ${companySettings?.phone ? `Tel: ${companySettings.phone}` : ''}<br/>
        ${companySettings?.email ?? ''}
      </div>
      <div class="receipt-title">SALES RECEIPT</div>
      <div class="line"><span>Receipt #:</span><span>${transaction.transaction_id}</span></div>
      <div class="line"><span>Date:</span><span>${transaction.date ?? new Date().toLocaleString()}</span></div>
      <div class="line"><span>Customer:</span><span>${transaction.customer_name}</span></div>
      <div class="items-header"><span>Item</span><span>Amount</span></div>
      ${itemRows}
      <div class="line"><span>Subtotal:</span><span>GHS ${formatPrice(transaction.subtotal)}</span></div>
      <div class="line"><span>Discount:</span><span>GHS ${formatPrice(transaction.discount_amount)}</span></div>
      <div class="line total-line"><span>Total:</span><span>GHS ${formatPrice(transaction.total_amount)}</span></div>
      <div class="line"><span>Paid:</span><span>GHS ${formatPrice(transaction.amount_received)}</span></div>
      <div class="line"><span>Change:</span><span>GHS ${formatPrice(transaction.change_amount)}</span></div>
      <div class="line"><span>Payment:</span><span>${transaction.payment_method.toUpperCase()}</span></div>
      <div class="thank-you">${thankYou}</div>
      ${companySettings?.return_policy ? `<div class="footer">${companySettings.return_policy}</div>` : ''}
    </div>
    <div class="button-container no-print">
      <button type="button" class="print-btn" onclick="window.print()">Print Receipt</button>
      <button type="button" class="close-btn" onclick="window.close()">Close</button>
    </div>
  </body>
</html>`;
}

export function printReceipt(
    transaction: ReceiptTransaction,
    companySettings?: CompanySettings | null,
): void {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) {
        return;
    }

    receiptWindow.document.write(buildReceiptHtml(transaction, companySettings));
    receiptWindow.document.close();
}

export async function downloadReceiptPdf(
    transaction: ReceiptTransaction,
    companySettings?: CompanySettings | null,
): Promise<void> {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
    ]);

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.innerHTML = buildReceiptHtml(transaction, companySettings)
        .replace('<!DOCTYPE html>', '')
        .replace(/<\/?html[^>]*>/g, '')
        .replace(/<\/?head[^>]*>[\s\S]*?<\/head>/g, '')
        .replace(/<\/?body[^>]*>/g, '');

    document.body.appendChild(container);

    const target = container.querySelector('.receipt-container') as HTMLElement;
    const canvas = await html2canvas(target, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 120 + transaction.items.length * 5],
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`receipt-${transaction.transaction_id}.pdf`);

    document.body.removeChild(container);
}

export function mapSaleToReceipt(transaction: {
    transaction_id: string;
    customer_name: string;
    sub_total: number;
    discount_amount: number;
    discount_percentage?: number;
    grand_total: number;
    amount_paid: number;
    change_amount: number;
    payment_method: string;
    created_at_formatted?: string;
    items: Array<{
        product_name: string;
        quantity: number;
        price: number;
        subtotal: number;
    }>;
}): ReceiptTransaction {
    return {
        transaction_id: transaction.transaction_id,
        date: transaction.created_at_formatted,
        customer_name: transaction.customer_name,
        items: transaction.items.map((item) => ({
            name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
        })),
        subtotal: transaction.sub_total,
        discount_percentage: transaction.discount_percentage,
        discount_amount: transaction.discount_amount,
        total_amount: transaction.grand_total,
        payment_method: transaction.payment_method,
        amount_received: transaction.amount_paid,
        change_amount: transaction.change_amount,
    };
}
