export function paymentReminderEmail(params: {
	customerName: string;
	amount: string;
	dueDate: string;
	tenantName: string;
}): string {
	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#faf9f6">
<div style="text-align:center;padding:20px 0">
  <h1 style="color:#D4AF37;margin:0">${params.tenantName}</h1>
</div>
<div style="background:white;border-radius:8px;padding:24px;border:1px solid #e5e2da">
  <h2 style="color:#1a1a1a;margin-top:0">Lembrete de Pagamento</h2>
  <p>Olá <strong>${params.customerName}</strong>,</p>
  <p>Este é um lembrete de que você tem uma fatura pendente:</p>
  <div style="background:#f5f3ee;padding:16px;border-radius:8px;margin:16px 0;text-align:center">
    <p style="margin:0;color:#666;font-size:14px">Valor</p>
    <p style="margin:4px 0 0;font-size:24px;font-weight:bold;color:#D4AF37">R$ ${params.amount}</p>
    <p style="margin:8px 0 0;color:#666;font-size:14px">Vencimento: ${params.dueDate}</p>
  </div>
  <p style="color:#666;font-size:14px">Qualquer dúvida estamos à disposição.</p>
</div>
</body></html>`;
}
