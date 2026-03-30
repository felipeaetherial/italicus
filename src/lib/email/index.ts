import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend | null {
	if (resend) return resend;
	const key = process.env.RESEND_API_KEY;
	if (!key) return null;
	resend = new Resend(key);
	return resend;
}

export async function sendEmail(
	to: string,
	subject: string,
	html: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const r = getResend();
		if (!r) return { success: false, error: "Email não configurado" };

		await r.emails.send({
			from: "PaoTech <noreply@paotech.com.br>",
			to,
			subject,
			html,
		});

		return { success: true };
	} catch (e) {
		console.error("Email send error:", e);
		return {
			success: false,
			error: e instanceof Error ? e.message : "Erro ao enviar email",
		};
	}
}
