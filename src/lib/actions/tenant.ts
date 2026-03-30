"use server";

import { adminDb } from "@/lib/firebase/admin";
import { z } from "zod";
import {
	type ActionResult,
	actionResponse,
	actionError,
	nowISO,
} from "./db";
import { getAuthenticatedUser } from "./utils";

const CreateTenantInputSchema = z.object({
	name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
	slug: z
		.string()
		.min(3, "Slug deve ter pelo menos 3 caracteres")
		.regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
	businessName: z.string().min(2),
	cnpj: z.string().optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
});

/**
 * Create user doc in Firestore after Firebase Auth registration.
 * Called from client during registration flow.
 */
export async function createUserDoc(input: {
	uid: string;
	email: string;
	displayName: string;
}): Promise<ActionResult<{ userId: string }>> {
	try {
		const now = nowISO();
		await adminDb
			.collection("users")
			.doc(input.uid)
			.set({
				email: input.email,
				displayName: input.displayName,
				role: "owner",
				tenantId: "",
				createdAt: now,
				updatedAt: now,
			});

		return actionResponse({ userId: input.uid });
	} catch (e) {
		return actionError(e instanceof Error ? e.message : "Erro ao criar usuário");
	}
}

/**
 * Create tenant (factory) during onboarding.
 */
export async function createTenant(
	input: unknown,
): Promise<ActionResult<{ tenantId: string }>> {
	try {
		const user = await getAuthenticatedUser();

		if (user.tenantId) {
			return actionError("Você já possui uma fábrica cadastrada");
		}

		const parsed = CreateTenantInputSchema.safeParse(input);
		if (!parsed.success) {
			return actionError(parsed.error.issues[0].message);
		}

		const { name, slug, businessName, cnpj, phone, address } = parsed.data;

		// Check slug uniqueness
		const existingSlug = await adminDb
			.collection("tenants")
			.where("slug", "==", slug)
			.limit(1)
			.get();

		if (!existingSlug.empty) {
			return actionError("Este slug já está em uso. Escolha outro.");
		}

		const now = nowISO();
		const batch = adminDb.batch();

		// Create tenant
		const tenantRef = adminDb.collection("tenants").doc();
		batch.set(tenantRef, {
			name,
			slug,
			ownerId: user.userId,
			plan: "free",
			settings: {
				businessName,
				cnpj: cnpj || "",
				phone: phone || "",
				address: address || "",
				logo: "",
			},
			createdAt: now,
			updatedAt: now,
		});

		// Update user with tenantId
		const userRef = adminDb.collection("users").doc(user.userId);
		batch.update(userRef, {
			tenantId: tenantRef.id,
			tenantRole: "admin",
			updatedAt: now,
		});

		await batch.commit();

		return actionResponse({ tenantId: tenantRef.id });
	} catch (e) {
		return actionError(e instanceof Error ? e.message : "Erro ao criar fábrica");
	}
}

/**
 * Check if a slug is available.
 */
export async function checkSlugAvailability(
	slug: string,
): Promise<ActionResult<{ available: boolean }>> {
	try {
		const existing = await adminDb
			.collection("tenants")
			.where("slug", "==", slug)
			.limit(1)
			.get();

		return actionResponse({ available: existing.empty });
	} catch (e) {
		return actionError(e instanceof Error ? e.message : "Erro ao verificar slug");
	}
}

/**
 * Invite a staff member to the tenant.
 */
export async function inviteStaff(
	email: string,
	tenantRole: "admin" | "user",
): Promise<ActionResult<{ invited: boolean }>> {
	try {
		const user = await getAuthenticatedUser();
		if (user.role !== "owner" && user.tenantRole !== "admin") {
			return actionError("Apenas administradores podem convidar membros");
		}

		const now = nowISO();
		const tenantId = user.tenantId;

		// Check if user already exists
		const existingUsers = await adminDb
			.collection("users")
			.where("email", "==", email)
			.limit(1)
			.get();

		if (!existingUsers.empty) {
			const existingUser = existingUsers.docs[0];
			const existingData = existingUser.data();

			if (existingData.tenantId === tenantId) {
				return actionError("Este usuário já faz parte da sua equipe");
			}

			if (existingData.tenantId) {
				return actionError("Este usuário já pertence a outra fábrica");
			}

			// User exists but has no tenant — assign them
			await existingUser.ref.update({
				tenantId,
				role: "staff",
				tenantRole,
				updatedAt: now,
			});

			return actionResponse({ invited: true });
		}

		// User doesn't exist — create pending invite
		const inviteRef = adminDb
			.collection("tenants")
			.doc(tenantId)
			.collection("invites")
			.doc();

		await inviteRef.set({
			email,
			type: "staff",
			tenantRole,
			status: "pending",
			invitedBy: user.userId,
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			createdAt: now,
		});

		// TODO: Send invite email via Resend

		return actionResponse({ invited: true });
	} catch (e) {
		return actionError(e instanceof Error ? e.message : "Erro ao convidar membro");
	}
}

/**
 * Enable B2B access for a customer.
 */
export async function enableB2bAccess(
	customerId: string,
	email: string,
): Promise<ActionResult<{ invited: boolean }>> {
	try {
		const user = await getAuthenticatedUser();
		const tenantId = user.tenantId;
		const now = nowISO();

		// Check if email is already registered as b2b_client
		const existingUsers = await adminDb
			.collection("users")
			.where("email", "==", email)
			.limit(1)
			.get();

		if (!existingUsers.empty) {
			const existingUser = existingUsers.docs[0];
			const existingData = existingUser.data();

			if (existingData.role === "b2b_client") {
				// Link customer to existing b2b user
				const customerRef = adminDb
					.collection("tenants")
					.doc(tenantId)
					.collection("customers")
					.doc(customerId);

				await customerRef.update({
					isB2bEnabled: true,
					b2bUserId: existingUser.id,
					updatedAt: now,
				});

				return actionResponse({ invited: true });
			}

			return actionError(
				"Este email já está cadastrado com outro tipo de conta",
			);
		}

		// Create pending B2B invite
		const inviteRef = adminDb
			.collection("tenants")
			.doc(tenantId)
			.collection("invites")
			.doc();

		await inviteRef.set({
			email,
			type: "b2b",
			customerId,
			status: "pending",
			invitedBy: user.userId,
			expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
			createdAt: now,
		});

		// Update customer record
		const customerRef = adminDb
			.collection("tenants")
			.doc(tenantId)
			.collection("customers")
			.doc(customerId);

		await customerRef.update({
			isB2bEnabled: true,
			updatedAt: now,
		});

		// TODO: Send invite email via Resend

		return actionResponse({ invited: true });
	} catch (e) {
		return actionError(
			e instanceof Error ? e.message : "Erro ao habilitar acesso B2B",
		);
	}
}

/**
 * List team members of the current tenant.
 */
export async function listTeamMembers(): Promise<
	ActionResult<Array<{ id: string; email: string; displayName: string; role: string; tenantRole?: string }>>
> {
	try {
		const user = await getAuthenticatedUser();
		const snapshot = await adminDb
			.collection("users")
			.where("tenantId", "==", user.tenantId)
			.get();

		const members = snapshot.docs.map((doc) => {
			const data = doc.data();
			return {
				id: doc.id,
				email: data.email,
				displayName: data.displayName,
				role: data.role,
				tenantRole: data.tenantRole,
			};
		});

		return actionResponse(members);
	} catch (e) {
		return actionError(e instanceof Error ? e.message : "Erro ao listar equipe");
	}
}

/**
 * Process pending invite during registration.
 */
export async function processInvite(
	uid: string,
	email: string,
	displayName: string,
): Promise<ActionResult<{ processed: boolean; role: string; tenantId: string } | null>> {
	try {
		const now = nowISO();

		// Search all tenants for pending invites with this email
		const tenantsSnapshot = await adminDb.collection("tenants").get();

		for (const tenantDoc of tenantsSnapshot.docs) {
			const invitesSnapshot = await tenantDoc.ref
				.collection("invites")
				.where("email", "==", email)
				.where("status", "==", "pending")
				.limit(1)
				.get();

			if (invitesSnapshot.empty) continue;

			const invite = invitesSnapshot.docs[0];
			const inviteData = invite.data();

			// Check expiry
			if (inviteData.expiresAt && new Date(inviteData.expiresAt) < new Date()) {
				await invite.ref.update({ status: "expired" });
				continue;
			}

			const batch = adminDb.batch();

			if (inviteData.type === "staff") {
				// Create user as staff
				batch.set(adminDb.collection("users").doc(uid), {
					email,
					displayName,
					role: "staff",
					tenantId: tenantDoc.id,
					tenantRole: inviteData.tenantRole || "user",
					createdAt: now,
					updatedAt: now,
				});
			} else if (inviteData.type === "b2b") {
				// Create user as b2b_client
				batch.set(adminDb.collection("users").doc(uid), {
					email,
					displayName,
					role: "b2b_client",
					tenantId: tenantDoc.id,
					createdAt: now,
					updatedAt: now,
				});

				// Link customer to user
				if (inviteData.customerId) {
					const customerRef = tenantDoc.ref
						.collection("customers")
						.doc(inviteData.customerId);
					batch.update(customerRef, {
						b2bUserId: uid,
						isB2bEnabled: true,
						updatedAt: now,
					});
				}
			}

			// Mark invite as accepted
			batch.update(invite.ref, { status: "accepted", acceptedAt: now });

			await batch.commit();

			return actionResponse({
				processed: true,
				role: inviteData.type === "b2b" ? "b2b_client" : "staff",
				tenantId: tenantDoc.id,
			});
		}

		return actionResponse(null);
	} catch (e) {
		return actionError(e instanceof Error ? e.message : "Erro ao processar convite");
	}
}

/**
 * Update WhatsApp notification settings for the current tenant.
 */
export async function updateWhatsAppSettings(settings: {
	enabled: boolean;
	provider?: string;
	instanceUrl?: string;
	apiKey?: string;
	adminPhone?: string;
	notifications?: Record<string, boolean>;
}): Promise<ActionResult<{ updated: boolean }>> {
	try {
		const user = await getAuthenticatedUser();
		if (user.role !== "owner" && user.tenantRole !== "admin") {
			return actionError("Apenas administradores podem alterar configurações");
		}

		const tenantId = user.tenantId;
		const tenantRef = adminDb.collection("tenants").doc(tenantId);

		await tenantRef.update({
			"settings.whatsapp": {
				enabled: settings.enabled,
				provider: settings.provider || "",
				instanceUrl: settings.instanceUrl || "",
				apiKey: settings.apiKey || "",
				adminPhone: settings.adminPhone || "",
				notifications: settings.notifications || {},
			},
			updatedAt: nowISO(),
		});

		return actionResponse({ updated: true });
	} catch (e) {
		return actionError(
			e instanceof Error ? e.message : "Erro ao salvar configurações do WhatsApp",
		);
	}
}

/**
 * Get WhatsApp settings for the current tenant.
 */
export async function getWhatsAppSettings(): Promise<
	ActionResult<{
		enabled: boolean;
		provider: string;
		instanceUrl: string;
		apiKey: string;
		adminPhone: string;
		notifications: Record<string, boolean>;
	}>
> {
	try {
		const user = await getAuthenticatedUser();
		const tenantRef = adminDb.collection("tenants").doc(user.tenantId);
		const tenantDoc = await tenantRef.get();

		if (!tenantDoc.exists) {
			return actionError("Tenant não encontrado");
		}

		const data = tenantDoc.data()!;
		const whatsapp = data.settings?.whatsapp || {};

		return actionResponse({
			enabled: whatsapp.enabled || false,
			provider: whatsapp.provider || "",
			instanceUrl: whatsapp.instanceUrl || "",
			apiKey: whatsapp.apiKey || "",
			adminPhone: whatsapp.adminPhone || "",
			notifications: whatsapp.notifications || {},
		});
	} catch (e) {
		return actionError(
			e instanceof Error ? e.message : "Erro ao carregar configurações do WhatsApp",
		);
	}
}
