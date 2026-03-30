export function staffInviteEmail(params: {
	inviterName: string;
	tenantName: string;
	registerUrl: string;
}): string {
	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#faf9f6">
<div style="text-align:center;padding:20px 0">
  <h1 style="color:#D4AF37;margin:0">${params.tenantName}</h1>
</div>
<div style="background:white;border-radius:8px;padding:24px;border:1px solid #e5e2da">
  <h2 style="color:#1a1a1a;margin-top:0">Convite para a equipe</h2>
  <p><strong>${params.inviterName}</strong> convidou você para fazer parte da equipe da <strong>${params.tenantName}</strong> no PaoTech.</p>
  <p>Clique no botão abaixo para criar sua conta:</p>
  <div style="text-align:center;margin:24px 0">
    <a href="${params.registerUrl}" style="background:#D4AF37;color:#1a1a1a;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Criar minha conta</a>
  </div>
  <p style="color:#666;font-size:14px">Este convite expira em 7 dias.</p>
</div>
</body></html>`;
}

export function b2bInviteEmail(params: {
	tenantName: string;
	registerUrl: string;
}): string {
	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#faf9f6">
<div style="text-align:center;padding:20px 0">
  <h1 style="color:#D4AF37;margin:0">${params.tenantName}</h1>
</div>
<div style="background:white;border-radius:8px;padding:24px;border:1px solid #e5e2da">
  <h2 style="color:#1a1a1a;margin-top:0">Acesso ao Portal de Pedidos</h2>
  <p>Você foi convidado para fazer pedidos diretamente pelo portal da <strong>${params.tenantName}</strong>.</p>
  <p>Crie sua conta para começar a fazer pedidos:</p>
  <div style="text-align:center;margin:24px 0">
    <a href="${params.registerUrl}" style="background:#D4AF37;color:#1a1a1a;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Criar minha conta</a>
  </div>
  <p style="color:#666;font-size:14px">Este convite expira em 30 dias.</p>
</div>
</body></html>`;
}
