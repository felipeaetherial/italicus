"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useRouter } from "next/navigation";
import {
	signInWithEmail,
	signUpWithEmail,
	signOut as firebaseSignOut,
	resetPassword as firebaseResetPassword,
	getIdToken,
} from "@/lib/firebase/auth";

interface AuthUser {
	userId: string;
	email: string;
	displayName: string;
	role: "owner" | "staff" | "b2b_client";
	tenantId: string;
	tenantRole?: "admin" | "user";
}

interface AuthContextType {
	user: AuthUser | null;
	loading: boolean;
	error: string | null;
	login: (email: string, password: string) => Promise<void>;
	register: (email: string, password: string, name: string) => Promise<void>;
	logout: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const refreshUser = useCallback(async () => {
		try {
			const res = await fetch("/api/auth/verify");
			const data = await res.json();
			if (data.authenticated && data.user) {
				setUser(data.user);
			} else {
				setUser(null);
			}
		} catch {
			setUser(null);
		}
	}, []);

	useEffect(() => {
		refreshUser().finally(() => setLoading(false));
	}, [refreshUser]);

	const login = useCallback(
		async (email: string, password: string) => {
			setError(null);
			try {
				await signInWithEmail(email, password);
				const idToken = await getIdToken();
				if (!idToken) throw new Error("Falha ao obter token");

				const res = await fetch("/api/auth/session", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ idToken }),
				});

				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "Falha no login");

				if (data.user) {
					setUser(data.user);
					if (!data.user.tenantId) {
						router.push("/onboarding");
					} else if (data.user.role === "b2b_client") {
						router.push("/catalogo");
					} else {
						router.push("/dashboard");
					}
				} else {
					// User doc doesn't exist yet — needs onboarding
					router.push("/onboarding");
				}
			} catch (e) {
				const msg =
					e instanceof Error ? e.message : "Erro ao fazer login";
				setError(msg);
				throw e;
			}
		},
		[router],
	);

	const register = useCallback(
		async (email: string, password: string, name: string) => {
			setError(null);
			try {
				const credential = await signUpWithEmail(email, password, name);
				const idToken = await getIdToken();
				if (!idToken) throw new Error("Falha ao obter token");

				// Create user doc via session endpoint
				const res = await fetch("/api/auth/session", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ idToken }),
				});

				if (!res.ok) {
					const data = await res.json();
					throw new Error(data.error || "Falha ao criar sessão");
				}

				// Create user doc in Firestore via server action
				const { createUserDoc } = await import("@/lib/actions/tenant");
				await createUserDoc({
					uid: credential.user.uid,
					email: credential.user.email || email,
					displayName: name,
				});

				await refreshUser();
				router.push("/onboarding");
			} catch (e) {
				const msg =
					e instanceof Error ? e.message : "Erro ao criar conta";
				setError(msg);
				throw e;
			}
		},
		[router, refreshUser],
	);

	const logout = useCallback(async () => {
		try {
			await fetch("/api/auth/session", { method: "DELETE" });
			await firebaseSignOut();
			setUser(null);
			router.push("/login");
		} catch (e) {
			console.error("Logout error:", e);
		}
	}, [router]);

	const resetPasswordFn = useCallback(async (email: string) => {
		setError(null);
		try {
			await firebaseResetPassword(email);
		} catch (e) {
			const msg =
				e instanceof Error
					? e.message
					: "Erro ao enviar email de recuperação";
			setError(msg);
			throw e;
		}
	}, []);

	const value = useMemo(
		() => ({
			user,
			loading,
			error,
			login,
			register,
			logout,
			resetPassword: resetPasswordFn,
			refreshUser,
		}),
		[user, loading, error, login, register, logout, resetPasswordFn, refreshUser],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
