"use client";

import { useState, useTransition } from "react";
import { useCustomers } from "@/lib/hooks/use-customers";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/lib/actions/customers";
import { enableB2bAccess } from "@/lib/actions/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatCpfCnpj, formatPhone } from "@/lib/utils/format";
import { maskCpfCnpj, maskPhone } from "@/lib/utils/masks";
import { MoreHorizontal } from "lucide-react";

interface CustomerForm {
  code: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isB2bEnabled: boolean;
  b2bEmail: string;
}

const emptyForm: CustomerForm = {
  code: "",
  name: "",
  cpfCnpj: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  isB2bEnabled: false,
  b2bEmail: "",
};

export default function ClientesPage() {
  const { data, loading, refetch } = useCustomers();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: any) {
    setEditingId(item.id);
    setForm({
      code: item.code || "",
      name: item.name || "",
      cpfCnpj: item.cpfCnpj ? maskCpfCnpj(item.cpfCnpj) : "",
      phone: item.phone ? maskPhone(item.phone) : "",
      email: item.email || "",
      address: item.address || "",
      notes: item.notes || "",
      isB2bEnabled: item.isB2bEnabled || false,
      b2bEmail: item.b2bEmail || item.email || "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    startTransition(async () => {
      const payload = {
        code: form.code,
        name: form.name,
        cpfCnpj: form.cpfCnpj.replace(/\D/g, ""),
        phone: form.phone.replace(/\D/g, ""),
        email: form.email,
        address: form.address,
        notes: form.notes,
        isB2bEnabled: form.isB2bEnabled,
      };

      let result;
      if (editingId) {
        result = await updateCustomer(editingId, payload);
      } else {
        result = await createCustomer(payload);
      }

      if (result.success) {
        const customerId = editingId || result.data?.id;
        // Enable B2B access if toggled on
        if (form.isB2bEnabled && form.b2bEmail.trim() && customerId) {
          const b2bResult = await enableB2bAccess(
            customerId,
            form.b2bEmail.trim(),
          );
          if (!b2bResult.success) {
            toast.error(
              b2bResult.error || "Cliente salvo, mas erro ao habilitar B2B",
            );
            setDialogOpen(false);
            refetch();
            return;
          }
        }
        toast.success(
          editingId ? "Cliente atualizado!" : "Cliente criado!",
        );
        setDialogOpen(false);
        refetch();
      } else {
        toast.error(result.error || "Erro ao salvar cliente");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCustomer(id);
      if (result.success) {
        toast.success("Cliente excluido!");
        setDeleteId(null);
        refetch();
      } else {
        toast.error(result.error || "Erro ao excluir cliente");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Cadastro de clientes"
        action={<Button onClick={openNew}>Novo Cliente</Button>}
      />

      <div className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : data.length === 0 ? (
          <EmptyState
            title="Nenhum cliente cadastrado"
            description="Adicione seu primeiro cliente."
            action={<Button onClick={openNew}>Novo Cliente</Button>}
          />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>B2B</TableHead>
                  <TableHead className="w-[60px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.code || "-"}
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      {item.cpfCnpj ? formatCpfCnpj(item.cpfCnpj) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.phone ? formatPhone(item.phone) : "-"}
                    </TableCell>
                    <TableCell>{item.email || "-"}</TableCell>
                    <TableCell>
                      {item.isB2bEnabled ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Desativado</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteId(item.id)}
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Altere os dados do cliente."
                : "Preencha os dados do novo cliente."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Codigo</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Ex: CLI-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input
                  value={form.cpfCnpj}
                  onChange={(e) =>
                    setForm({ ...form, cpfCnpj: maskCpfCnpj(e.target.value) })
                  }
                  placeholder="000.000.000-00"
                  maxLength={18}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: maskPhone(e.target.value) })
                  }
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@cliente.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Endereco</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Endereco completo"
              />
            </div>
            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observacoes opcionais..."
                rows={3}
              />
            </div>

            {/* B2B Toggle */}
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="b2bAccess"
                  checked={form.isB2bEnabled}
                  onChange={(e) =>
                    setForm({ ...form, isB2bEnabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="b2bAccess">Acesso B2B</Label>
              </div>
              {form.isB2bEnabled && (
                <div className="space-y-2">
                  <Label>Email para acesso B2B</Label>
                  <Input
                    type="email"
                    value={form.b2bEmail}
                    onChange={(e) =>
                      setForm({ ...form, b2bEmail: e.target.value })
                    }
                    placeholder="email@clienteb2b.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Um convite sera enviado para este email ao salvar.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !form.name.trim()}
            >
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este cliente? Esta acao nao pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isPending}
            >
              {isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
