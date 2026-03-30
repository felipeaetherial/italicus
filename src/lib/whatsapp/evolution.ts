import type { WhatsAppProvider } from "./index";

export class EvolutionProvider implements WhatsAppProvider {
	constructor(
		private baseUrl: string,
		private apiKey: string,
		private instance: string,
	) {}

	async sendText(
		phone: string,
		message: string,
	): Promise<{ success: boolean; messageId?: string; error?: string }> {
		try {
			const res = await fetch(
				`${this.baseUrl}/message/sendText/${this.instance}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						apikey: this.apiKey,
					},
					body: JSON.stringify({
						number: phone,
						text: message,
					}),
				},
			);

			if (!res.ok) {
				const body = await res.text();
				return { success: false, error: `Evolution API: ${res.status} - ${body}` };
			}

			const data = await res.json();
			return { success: true, messageId: data?.key?.id };
		} catch (e) {
			return {
				success: false,
				error: e instanceof Error ? e.message : "Erro na Evolution API",
			};
		}
	}
}
