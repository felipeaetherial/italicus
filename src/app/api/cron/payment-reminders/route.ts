import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import {
	sendPaymentReminder,
	sendOverdueNotice,
} from "@/lib/actions/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const tenantsSnap = await adminDb.collection("tenants").get();
		let reminders = 0;
		let overdues = 0;

		const today = new Date().toISOString().split("T")[0];
		const tomorrow = new Date(Date.now() + 86400000)
			.toISOString()
			.split("T")[0];
		const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

		for (const tenantDoc of tenantsSnap.docs) {
			const tenantId = tenantDoc.id;
			const settings = tenantDoc.data().settings || {};
			if (!settings.whatsapp?.enabled) continue;

			const arCol = adminDb
				.collection("tenants")
				.doc(tenantId)
				.collection("accountsReceivable");

			// Due tomorrow - send reminder
			const dueTomorrowSnap = await arCol
				.where("status", "==", "pendente")
				.where("dueDate", "==", tomorrow)
				.get();

			for (const doc of dueTomorrowSnap.docs) {
				await sendPaymentReminder(tenantId, doc.id);
				reminders++;
			}

			// Overdue - send notice (max once per week)
			const overdueSnap = await arCol
				.where("status", "==", "pendente")
				.get();

			for (const doc of overdueSnap.docs) {
				const data = doc.data();
				if ((data.dueDate as string) >= today) continue;

				const lastNotice = data.lastOverdueNotice as string | undefined;
				if (lastNotice && lastNotice > oneWeekAgo) continue;

				await sendOverdueNotice(tenantId, doc.id);
				overdues++;
			}
		}

		return NextResponse.json({
			success: true,
			reminders,
			overdues,
			timestamp: new Date().toISOString(),
		});
	} catch (e) {
		console.error("Cron payment-reminders error:", e);
		return NextResponse.json(
			{ error: "Internal error" },
			{ status: 500 },
		);
	}
}
