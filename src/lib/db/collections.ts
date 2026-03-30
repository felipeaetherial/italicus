import { collection, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export function getTenantCollections(tenantId: string) {
	const tenantRef = doc(db, "tenants", tenantId);
	return {
		products: collection(tenantRef, "products"),
		technicalSheets: collection(tenantRef, "technicalSheets"),
		ingredients: collection(tenantRef, "ingredients"),
		customers: collection(tenantRef, "customers"),
		suppliers: collection(tenantRef, "suppliers"),
		sales: collection(tenantRef, "sales"),
		orders: collection(tenantRef, "orders"),
		stockEntries: collection(tenantRef, "stockEntries"),
		accountsPayable: collection(tenantRef, "accountsPayable"),
		accountsReceivable: collection(tenantRef, "accountsReceivable"),
		cashFlow: collection(tenantRef, "cashFlow"),
		wasteEntries: collection(tenantRef, "wasteEntries"),
	};
}

export const usersCollection = collection(db, "users");
export const tenantsCollection = collection(db, "tenants");

export function getUserRef(userId: string) {
	return doc(db, "users", userId);
}

export function getTenantRef(tenantId: string) {
	return doc(db, "tenants", tenantId);
}
