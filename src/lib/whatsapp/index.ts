export interface WhatsAppProvider {
	sendText(
		phone: string,
		message: string,
	): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export function formatPhone(phone: string): string {
	const digits = phone.replace(/\D/g, "");
	if (digits.startsWith("55")) return digits;
	if (digits.length === 11 || digits.length === 10) return `55${digits}`;
	return digits;
}

let provider: WhatsAppProvider | null = null;

export async function getWhatsAppProvider(): Promise<WhatsAppProvider | null> {
	if (provider) return provider;

	const url = process.env.EVOLUTION_API_URL;
	const key = process.env.EVOLUTION_API_KEY;
	const instance = process.env.EVOLUTION_INSTANCE;

	if (url && key && instance) {
		const { EvolutionProvider } = await import("./evolution");
		provider = new EvolutionProvider(url, key, instance);
		return provider;
	}

	return null;
}

export async function sendWhatsApp(
	phone: string,
	message: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const wp = await getWhatsAppProvider();
		if (!wp) return { success: false, error: "WhatsApp não configurado" };

		const formatted = formatPhone(phone);
		return wp.sendText(formatted, message);
	} catch (e) {
		return {
			success: false,
			error: e instanceof Error ? e.message : "Erro ao enviar WhatsApp",
		};
	}
}
