"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === "auth/user-not-found") {
        setError("Nenhuma conta encontrada com este email.");
      } else if (firebaseError.code === "auth/invalid-email") {
        setError("Email inválido.");
      } else {
        setError(firebaseError.message || "Erro ao enviar email de recuperação.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-gold">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground">
          Enviaremos um link para redefinir sua senha
        </p>
      </div>

      {success ? (
        <div className="space-y-4">
          <p className="text-center text-sm text-green-600">
            Email enviado! Verifique sua caixa de entrada.
          </p>
          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-gold transition-colors"
            >
              Voltar ao login
            </Link>
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar link de recuperação"
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-gold transition-colors"
            >
              Voltar ao login
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
