"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/providers/auth-provider";
import { listTeamMembers, inviteStaff } from "@/lib/actions/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  role: string;
  tenantRole?: string;
}

export default function ConfiguracoesPage() {
  const { user } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Invite dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "user">("user");
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const result = await listTeamMembers();
      if (result.success && result.data) {
        setMembers(result.data);
      }
    } catch {
      toast.error("Erro ao carregar membros da equipe");
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (user?.tenantId) {
      fetchMembers();
    } else {
      setLoadingMembers(false);
    }
  }, [user?.tenantId, fetchMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const result = await inviteStaff(inviteEmail.trim(), inviteRole);
      if (result.success) {
        toast.success("Convite enviado com sucesso!");
        setInviteEmail("");
        setInviteRole("user");
        setDialogOpen(false);
        fetchMembers();
      } else {
        toast.error(result.error || "Erro ao enviar convite");
      }
    } catch {
      toast.error("Erro inesperado ao enviar convite");
    } finally {
      setInviting(false);
    }
  };

  const getRoleBadge = (member: TeamMember) => {
    if (member.role === "owner") {
      return <Badge>Proprietário</Badge>;
    }
    if (member.tenantRole === "admin") {
      return <Badge variant="secondary">Admin</Badge>;
    }
    return <Badge variant="outline">Usuário</Badge>;
  };

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Gerencie sua fábrica e equipe"
      />

      <div className="space-y-8 p-6">
        {/* Section 1 - Factory Data */}
        {user?.tenantId && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">Dados da Fábrica</h2>
            <div className="rounded-lg border p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="text-sm font-medium">
                    {user.displayName || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <p className="text-sm font-medium">-</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="text-sm font-medium">-</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="text-sm font-medium">-</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground italic">
                Em breve: edição de dados
              </p>
            </div>
          </section>
        )}

        {/* Section 2 - Team */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Equipe</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Convidar membro</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar membro</DialogTitle>
                  <DialogDescription>
                    Envie um convite para um novo membro da equipe.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Função</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) =>
                        setInviteRole(v as "admin" | "user")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">Usuário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim()}
                  >
                    {inviting ? "Enviando..." : "Enviar convite"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {loadingMembers ? (
            <p className="text-sm text-muted-foreground">Carregando equipe...</p>
          ) : members.length === 0 ? (
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Nenhum membro encontrado. Convide alguém para sua equipe.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-4 border-b px-4 py-2 text-sm font-medium text-muted-foreground">
                <span>Nome</span>
                <span>Email</span>
                <span>Função</span>
              </div>
              {members.map((member) => (
                <div
                  key={member.id}
                  className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 border-b px-4 py-3 last:border-b-0"
                >
                  <span className="text-sm font-medium">
                    {member.displayName}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {member.email}
                  </span>
                  <span>{getRoleBadge(member)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
