"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { createTenant, checkSlugAvailability } from "@/lib/actions/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function OnboardingPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 fields
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Step 2 fields
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Redirect if user already has a tenantId
  useEffect(() => {
    if (!loading && user?.tenantId) {
      router.push("/dashboard");
    }
  }, [loading, user, router]);

  // Auto-generate slug from factory name
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    const timeout = setTimeout(async () => {
      try {
        const result = await checkSlugAvailability(slug);
        if (result.success && result.data) {
          setSlugAvailable(result.data.available);
        } else {
          setSlugAvailable(null);
        }
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      setCheckingSlug(false);
    };
  }, [slug]);

  const handleSlugChange = useCallback((value: string) => {
    setSlugManuallyEdited(true);
    setSlug(slugify(value));
  }, []);

  const handleNext = () => {
    if (!name.trim()) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!slug || slug.length < 3 || slugAvailable === false) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await createTenant({
        name: name.trim(),
        slug,
        businessName: name.trim(),
        cnpj: cnpj.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || "Erro ao criar fábrica");
        return;
      }

      await refreshUser();
      router.push("/dashboard");
    } catch {
      setError("Erro inesperado ao criar fábrica");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (user?.tenantId) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            {step === 1 ? "Dados da fábrica" : "Slug do portal B2B"}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "Preencha as informações da sua fábrica para começar."
              : "Defina o endereço do portal dos seus clientes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da fábrica *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Padaria São José"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  placeholder="Rua, número, cidade - estado"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleNext}
                disabled={!name.trim()}
              >
                Próximo
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug do portal</Label>
                <Input
                  id="slug"
                  placeholder="minha-fabrica"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                />
                {checkingSlug && (
                  <p className="text-sm text-muted-foreground">
                    Verificando disponibilidade...
                  </p>
                )}
                {!checkingSlug && slugAvailable === true && slug.length >= 3 && (
                  <p className="text-sm text-green-600">
                    Slug disponível
                  </p>
                )}
                {!checkingSlug && slugAvailable === false && (
                  <p className="text-sm text-destructive">
                    Este slug já está em uso. Escolha outro.
                  </p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Seus clientes vão acessar:{" "}
                <span className="font-medium text-foreground">
                  paotech.com.br/{slug || "..."}
                </span>
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                >
                  Voltar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    !slug ||
                    slug.length < 3 ||
                    slugAvailable === false ||
                    checkingSlug
                  }
                >
                  {submitting ? "Criando..." : "Criar fábrica"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
