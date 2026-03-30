export const whatsappTemplates = {
	orderConfirmation: (
		customerName: string,
		orderNumber: string,
		deliveryDate: string,
		tenantName: string,
	) =>
		`Olá ${customerName}! 👋\n\nSeu pedido #${orderNumber} foi *confirmado* e será entregue em *${deliveryDate}*.\n\nObrigado pela preferência!\n_${tenantName}_`,

	orderReady: (
		customerName: string,
		orderNumber: string,
		tenantName: string,
	) =>
		`Olá ${customerName}!\n\nSeu pedido #${orderNumber} está *pronto pra entrega*! 🥖\n\n_${tenantName}_`,

	orderDelivered: (
		customerName: string,
		orderNumber: string,
		tenantName: string,
	) =>
		`${customerName}, seu pedido #${orderNumber} foi *entregue*! ✅\n\nQualquer dúvida é só chamar.\n_${tenantName}_`,

	paymentReminder: (
		customerName: string,
		amount: string,
		dueDate: string,
		tenantName: string,
	) =>
		`Olá ${customerName}!\n\nLembrete: você tem uma fatura de *R$ ${amount}* com vencimento em *${dueDate}*.\n\nQualquer dúvida estamos à disposição.\n_${tenantName}_`,

	paymentOverdue: (
		customerName: string,
		amount: string,
		daysOverdue: number,
		tenantName: string,
	) =>
		`Olá ${customerName}!\n\nSua fatura de *R$ ${amount}* está em atraso há *${daysOverdue} dias*.\n\nPor favor entre em contato pra regularizar.\n_${tenantName}_`,

	newB2bOrder: (
		customerName: string,
		total: string,
		deliveryDate: string,
	) =>
		`📦 *Novo pedido B2B*\n\nCliente: ${customerName}\nValor: R$ ${total}\nEntrega: ${deliveryDate}\n\nAcesse o painel pra confirmar.`,
};
