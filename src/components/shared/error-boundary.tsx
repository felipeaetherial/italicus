"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error) {
		console.error("ErrorBoundary caught:", error);
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback;

			return (
				<div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
					<AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
					<h2 className="text-xl font-semibold mb-2">Algo deu errado</h2>
					<p className="text-muted-foreground mb-6 max-w-md">
						Ocorreu um erro inesperado. Tente recarregar a página.
					</p>
					<Button
						onClick={() => {
							this.setState({ hasError: false, error: null });
							window.location.reload();
						}}
					>
						Tentar novamente
					</Button>
				</div>
			);
		}

		return this.props.children;
	}
}
