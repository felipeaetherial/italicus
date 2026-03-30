export function orderConfirmationEmail(params: {
	customerName: string;
	orderNumber: string;
	deliveryDate: string;
	items: { name: string; quantity: number; unitPrice: number }[];
	total: number;
	tenantName: string;
}): string {
	const itemRows = params.items
		.map(
			(i) =>
				`<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">R$ ${i.unitPrice.toFixed(2)}</td></tr>`,
		)
		.join("");

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#faf9f6">
<div style="text-align:center;padding:20px 0">
  <h1 style="color:#D4AF37;margin:0">${params.tenantName}</h1>
</div>
<div style="background:white;border-radius:8px;padding:24px;border:1px solid #e5e2da">
  <h2 style="color:#1a1a1a;margin-top:0">Pedido Confirmado!</h2>
  <p>Olá <strong>${params.customerName}</strong>,</p>
  <p>Seu pedido <strong>#${params.orderNumber}</strong> foi confirmado e será entregue em <strong>${params.deliveryDate}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead><tr style="background:#f5f3ee"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px;text-align:center">Qtd</th><th style="padding:8px;text-align:right">Preço</th></tr></thead>
    <tbody>${itemRows}</tbody>
    <tfoot><tr><td colspan="2" style="padding:8px;font-weight:bold">Total</td><td style="padding:8px;text-align:right;font-weight:bold;color:#D4AF37">R$ ${params.total.toFixed(2)}</td></tr></tfoot>
  </table>
  <p style="color:#666;font-size:14px">Obrigado pela preferência!</p>
</div>
</body></html>`;
}
