import { cn } from "@/lib/utils";

interface LogoProps {
	className?: string;
	size?: "sm" | "md" | "lg";
	variant?: "light" | "dark";
}

export function Logo({ className, size = "md", variant = "dark" }: LogoProps) {
	const sizes = {
		sm: { width: 120, height: 40 },
		md: { width: 160, height: 52 },
		lg: { width: 220, height: 72 },
	};

	const { width, height } = sizes[size];
	const textColor = variant === "dark" ? "#D4AF37" : "#1a1a1a";
	const subTextColor = variant === "dark" ? "#C5A028" : "#444444";

	return (
		<svg
			viewBox="0 0 220 72"
			width={width}
			height={height}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn(className)}
			aria-label="Italicus Pane & Pasta"
		>
			{/* Main title - ITALICUS */}
			<text
				x="110"
				y="36"
				textAnchor="middle"
				fontFamily="Georgia, 'Times New Roman', serif"
				fontSize="30"
				fontWeight="400"
				letterSpacing="8"
				fill={textColor}
			>
				ITALICUS
			</text>

			{/* Italian flag tricolor line */}
			<rect x="30" y="44" width="52" height="2.5" rx="1" fill="#009246" />
			<rect x="84" y="44" width="52" height="2.5" rx="1" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="0.3" />
			<rect x="138" y="44" width="52" height="2.5" rx="1" fill="#CE2B37" />

			{/* Subtitle - PANE & PASTA */}
			<text
				x="110"
				y="60"
				textAnchor="middle"
				fontFamily="Georgia, 'Times New Roman', serif"
				fontSize="11"
				fontWeight="400"
				letterSpacing="5"
				fill={subTextColor}
			>
				PANE &amp; PASTA
			</text>
		</svg>
	);
}

export function LogoIcon({ className, variant = "dark" }: { className?: string; variant?: "light" | "dark" }) {
	const textColor = variant === "dark" ? "#D4AF37" : "#1a1a1a";

	return (
		<svg
			viewBox="0 0 36 36"
			width={36}
			height={36}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn(className)}
			aria-label="Italicus"
		>
			{/* Letter I */}
			<text
				x="18"
				y="26"
				textAnchor="middle"
				fontFamily="Georgia, 'Times New Roman', serif"
				fontSize="26"
				fontWeight="400"
				fill={textColor}
			>
				I
			</text>
			{/* Mini tricolor bar */}
			<rect x="6" y="30" width="8" height="1.5" rx="0.5" fill="#009246" />
			<rect x="14" y="30" width="8" height="1.5" rx="0.5" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="0.2" />
			<rect x="22" y="30" width="8" height="1.5" rx="0.5" fill="#CE2B37" />
		</svg>
	);
}
