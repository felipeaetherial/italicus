"use server";

import { adminDb } from "@/lib/firebase/admin";
import { tenantCollection } from "./db";
import { sendWhatsApp } from "@/lib/whatsapp";
import { whatsappTemplates } from "@/lib/whatsapp/templates";
import { formatCurrency } from "@/lib/utils/format";

async function getTenantWhatsAppConfig(tenantId: string) {
	const tenantDoc = await adminDb.collection("tenants").doc(tenantId).get();
	if (!tenantDoc.exists) return null;

	const data = tenantDoc.data()!;
	const settings = data.settings || {};
	const whatsapp = settings.whatsapp;

	if (!whatsapp?.enabled) return null;

	return {
		tenantName: data.name as string,
		adminPhone: whatsapp.adminPhone as string,
		notifications: whatsapp.notifications || {},
	};
}

async function getCustomerPhone(
	tenantId: string,
	customerId: string,
): Promise<string | null> {
	const customerDoc = await tenantCollection(tenantId, "customers")
		.doc(customerId)
		.get();
	if (!customerDoc.exists) return null;
	return (customerDoc.data()?.phone as string) || null;
}

export async function sendOrderNotification(
	tenantId: string,
	type: "confirmed" | "ready" | "delivered",
	orderId: string,
) {
	try {
		const config = await getTenantWhatsAppConfig(tenantId);
		if (!config) return;

		const orderDoc = await tenantCollection(tenantId, "orders")
			.doc(orderId)
			.get();
		if (!orderDoc.exists) return;

		const order = orderDoc.data()!;
		const customerName = order.customerName as string;
		const customerId = order.customerId as string;
		const phone = await getCustomerPhone(tenantId, customerId);
		if (!phone) return;

		const orderNumber = orderId.slice(-6).toUpperCase();
		const { tenantName } = config;

		let message: string;
		let notifKey: string;

		switch (type) {
			case "confirmed":
				notifKey = "orderConfirmed";
				message = whatsappTemplates.orderConfirmation(
					customerName,
					orderNumber,
					order.productionDate as string,
					tenantName,
				);
				break;
			case "ready":
				notifKey = "orderConfirmed";
				message = whatsappTemplates.orderReady(
					customerName,
					orderNumber,
					tenantName,
				);
				break;
			case "delivered":
				notifKey = "orderDelivered";
				message = whatsappTemplates.orderDelivered(
					customerName,
					orderNumber,
					tenantName,
				);
				break;
		}

		if (!config.notifications[notifKey]) return;

		await sendWhatsApp(phone, message);
	} catch (e) {
		console.error("Failed to send order notification:", e);
	}
}

export async function sendPaymentReminder(
	tenantId: string,
	receivableId: string,
) {
	try {
		const config = await getTenantWhatsAppConfig(tenantId);
		if (!config?.notifications.paymentReminder) return;

		const arDoc = await tenantCollection(tenantId, "accountsReceivable")
			.doc(receivableId)
			.get();
		if (!arDoc.exists) return;

		const ar = arDoc.data()!;
		const customerId = ar.customerId as string;
		const phone = await getCustomerPhone(tenantId, customerId);
		if (!phone) return;

		const message = whatsappTemplates.paymentReminder(
			ar.customerName as string,
			formatCurrency(ar.amount as number).replace("R$\u00a0", ""),
			ar.dueDate as string,
			config.tenantName,
		);

		await sendWhatsApp(phone, message);
	} catch (e) {
		console.error("Failed to send payment reminder:", e);
	}
}

export async function sendOverdueNotice(
	tenantId: string,
	receivableId: string,
) {
	try {
		const config = await getTenantWhatsAppConfig(tenantId);
		if (!config?.notifications.paymentOverdue) return;

		const arDoc = await tenantCollection(tenantId, "accountsReceivable")
			.doc(receivableId)
			.get();
		if (!arDoc.exists) return;

		const ar = arDoc.data()!;
		const customerId = ar.customerId as string;
		const phone = await getCustomerPhone(tenantId, customerId);
		if (!phone) return;

		const dueDate = new Date(ar.dueDate as string);
		const daysOverdue = Math.floor(
			(Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
		);

		const message = whatsappTemplates.paymentOverdue(
			ar.customerName as string,
			formatCurrency(ar.amount as number).replace("R$\u00a0", ""),
			daysOverdue,
			config.tenantName,
		);

		await sendWhatsApp(phone, message);

		// Mark last notice date to avoid spamming
		await arDoc.ref.update({ lastOverdueNotice: new Date().toISOString() });
	} catch (e) {
		console.error("Failed to send overdue notice:", e);
	}
}

export async function notifyAdminNewB2bOrder(
	tenantId: string,
	orderId: string,
) {
	try {
		const config = await getTenantWhatsAppConfig(tenantId);
		if (!config?.notifications.newB2bOrder || !config.adminPhone) return;

		const orderDoc = await tenantCollection(tenantId, "orders")
			.doc(orderId)
			.get();
		if (!orderDoc.exists) return;

		const order = orderDoc.data()!;
		const message = whatsappTemplates.newB2bOrder(
			order.customerName as string,
			formatCurrency(order.totalAmount as number).replace("R$\u00a0", ""),
			order.productionDate as string,
		);

		await sendWhatsApp(config.adminPhone, message);
	} catch (e) {
		console.error("Failed to notify admin:", e);
	}
}
