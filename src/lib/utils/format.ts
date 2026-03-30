export function formatCurrency(value: number): string {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(value);
}

export function formatDate(date: string | Date): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return new Intl.DateTimeFormat("pt-BR").format(d);
}

export function formatDateTime(date: string | Date): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(d);
}

export function formatPhone(phone: string): string {
	const digits = phone.replace(/\D/g, "");
	if (digits.length === 11) {
		return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
	}
	if (digits.length === 10) {
		return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
	}
	return phone;
}

export function formatCpfCnpj(value: string): string {
	const digits = value.replace(/\D/g, "");
	if (digits.length <= 11) {
		return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
	}
	return digits.replace(
		/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
		"$1.$2.$3/$4-$5",
	);
}

export function formatPercent(value: number): string {
	return `${value.toFixed(1).replace(".", ",")}%`;
}

export function todayISO(): string {
	return new Date().toISOString().split("T")[0];
}

export function getMonthRange(year: number, month: number) {
	const start = new Date(year, month - 1, 1).toISOString();
	const end = new Date(year, month, 0, 23, 59, 59).toISOString();
	return { start, end };
}
