"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  listTeamMembers,
  inviteStaff,
  getWhatsAppSettings,
  updateWhatsAppSettings,
} from "@/lib/actions/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface WhatsAppSettings {
  enabled: boolean;
  provider: string;
  instanceUrl: string;
  apiKey: string;
  adminPhone: string;
  notifications: Record<string, boolean>;
}

const defaultWhatsApp: WhatsAppSettings = {
  enabled: false,
  provider: "",
  instanceUrl: "",
  apiKey: "",
  adminPhone: "",
  notifications: {
    orderConfirmed: true,
    orderDelivered: true,
    paymentReminder: true,
    paymentOverdue: true,
    newB2bOrder: true,
  },
};

export default function ConfiguracoesPage() {
  const { user } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Invite dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "user">("user");
  const [inviting, setInviting] = useState(false);

  // WhatsApp state
  const [whatsApp, setWhatsApp] = useState<WhatsAppSettings>(defaultWhatsApp);
  const [loadingWhatsApp, setLoadingWhatsApp] = useState(true);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);

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

  const fetchWhatsApp = useCallback(async () => {
    try {
      const result = await getWhatsAppSettings();
      if (result.success && result.data) {
        setWhatsApp({
          ...defaultWhatsApp,
          ...result.data,
          notifications: {
            ...defaultWhatsApp.notifications,
            ...result.data.notifications,
          },
        });
      }
    } catch {
      // silently fail, use defaults
    } finally {
      setLoadingWhatsApp(false);
    }
  }, []);

  useEffect(() => {
    if (user?.tenantId) {
      fetchMembers();
      fetchWhatsApp();
    } else {
      setLoadingMembers(false);
      setLoadingWhatsApp(false);
    }
  }, [user?.tenantId, fetchMembers, fetchWhatsApp]);

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

  const handleSaveWhatsApp = async () => {
    setSavingWhatsApp(true);
    try {
      const result = await updateWhatsAppSettings(whatsApp);
      if (result.success) {
        toast.success("Configurações do WhatsApp salvas!");
      } else {
        toast.error(result.error || "Erro ao salvar configurações");
      }
    } catch {
      toast.error("Erro inesperado ao salvar configurações");
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const handleTestConnection = () => {
    toast.info("Teste de conexão ainda não implementado.");
  };

  const updateNotification = (key: string, value: boolean) => {
    setWhatsApp((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Gerencie sua fábrica e equipe"
      />

      <div className="p-6">
        <Tabs defaultValue="fabrica">
          <TabsList>
            <TabsTrigger value="fabrica">Fábrica</TabsTrigger>
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>

          {/* Tab 1 - Factory Data */}
          <TabsContent value="fabrica">
            <div className="space-y-8 pt-4">
              {user?.tenantId && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold">
                    Dados da Fábrica
                  </h2>
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
                        <p className="text-sm text-muted-foreground">
                          Telefone
                        </p>
                        <p className="text-sm font-medium">-</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Endereço
                        </p>
                        <p className="text-sm font-medium">-</p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground italic">
                      Em breve: edição de dados
                    </p>
                  </div>
                </section>
              )}
            </div>
          </TabsContent>

          {/* Tab 2 - Team */}
          <TabsContent value="equipe">
            <div className="space-y-8 pt-4">
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
                  <p className="text-sm text-muted-foreground">
                    Carregando equipe...
                  </p>
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
          </TabsContent>

          {/* Tab 3 - WhatsApp */}
          <TabsContent value="whatsapp">
            <div className="space-y-6 pt-4">
              {loadingWhatsApp ? (
                <p className="text-sm text-muted-foreground">
                  Carregando configurações...
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium">WhatsApp ativado</p>
                      <p className="text-xs text-muted-foreground">
                        Habilita notificações via WhatsApp para sua fábrica
                      </p>
                    </div>
                    <Switch
                      checked={whatsApp.enabled}
                      onCheckedChange={(checked) =>
                        setWhatsApp((prev) => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>

                  {whatsApp.enabled && (
                    <>
                      <div className="rounded-lg border p-4 space-y-4">
                        <h3 className="text-sm font-semibold">
                          Configuração da API
                        </h3>

                        <div className="space-y-2">
                          <Label htmlFor="wa-admin-phone">
                            Telefone do admin
                          </Label>
                          <Input
                            id="wa-admin-phone"
                            placeholder="5511999999999"
                            value={whatsApp.adminPhone}
                            onChange={(e) =>
                              setWhatsApp((prev) => ({
                                ...prev,
                                adminPhone: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="wa-provider">Provider</Label>
                          <Select
                            value={whatsApp.provider}
                            onValueChange={(v) =>
                              setWhatsApp((prev) => ({ ...prev, provider: v }))
                            }
                          >
                            <SelectTrigger id="wa-provider">
                              <SelectValue placeholder="Selecione o provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="evolution">
                                Evolution API
                              </SelectItem>
                              <SelectItem value="zapi">Z-API</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="wa-instance-url">
                            URL da instância
                          </Label>
                          <Input
                            id="wa-instance-url"
                            placeholder="https://api.example.com"
                            value={whatsApp.instanceUrl}
                            onChange={(e) =>
                              setWhatsApp((prev) => ({
                                ...prev,
                                instanceUrl: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="wa-api-key">API Key</Label>
                          <Input
                            id="wa-api-key"
                            type="password"
                            placeholder="Sua API Key"
                            value={whatsApp.apiKey}
                            onChange={(e) =>
                              setWhatsApp((prev) => ({
                                ...prev,
                                apiKey: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTestConnection}
                        >
                          Testar conexão
                        </Button>
                      </div>

                      <Separator />

                      <div className="rounded-lg border p-4 space-y-4">
                        <h3 className="text-sm font-semibold">Notificações</h3>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="notif-confirmed">
                            Pedido confirmado
                          </Label>
                          <Switch
                            id="notif-confirmed"
                            checked={
                              whatsApp.notifications.orderConfirmed ?? true
                            }
                            onCheckedChange={(v) =>
                              updateNotification("orderConfirmed", v)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="notif-delivered">
                            Pedido entregue
                          </Label>
                          <Switch
                            id="notif-delivered"
                            checked={
                              whatsApp.notifications.orderDelivered ?? true
                            }
                            onCheckedChange={(v) =>
                              updateNotification("orderDelivered", v)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="notif-reminder">
                            Lembrete de pagamento
                          </Label>
                          <Switch
                            id="notif-reminder"
                            checked={
                              whatsApp.notifications.paymentReminder ?? true
                            }
                            onCheckedChange={(v) =>
                              updateNotification("paymentReminder", v)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="notif-overdue">
                            Pagamento em atraso
                          </Label>
                          <Switch
                            id="notif-overdue"
                            checked={
                              whatsApp.notifications.paymentOverdue ?? true
                            }
                            onCheckedChange={(v) =>
                              updateNotification("paymentOverdue", v)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="notif-b2b">Novo pedido B2B</Label>
                          <Switch
                            id="notif-b2b"
                            checked={
                              whatsApp.notifications.newB2bOrder ?? true
                            }
                            onCheckedChange={(v) =>
                              updateNotification("newB2bOrder", v)
                            }
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={handleSaveWhatsApp}
                          disabled={savingWhatsApp}
                        >
                          {savingWhatsApp ? "Salvando..." : "Salvar configurações"}
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
