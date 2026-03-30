"use client";

import { useState, useTransition } from "react";
import { useSuppliers } from "@/lib/hooks/use-suppliers";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/actions/suppliers";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface SupplierForm {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  notes: string;
}

const emptyForm: SupplierForm = {
  name: "",
  cnpj: "",
  phone: "",
  email: "",
  address: "",
  contactPerson: "",
  notes: "",
};

export default function FornecedoresPage() {
  const { data, loading, refetch } = useSuppliers();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: any) {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      cnpj: item.cnpj ? maskCpfCnpj(item.cnpj) : "",
      phone: item.phone ? maskPhone(item.phone) : "",
      email: item.email || "",
      address: item.address || "",
      contactPerson: item.contactPerson || "",
      notes: item.notes || "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    startTransition(async () => {
      const payload = {
        ...form,
        cnpj: form.cnpj.replace(/\D/g, ""),
        phone: form.phone.replace(/\D/g, ""),
      };
      let result;
      if (editingId) {
        result = await updateSupplier(editingId, payload);
      } else {
        result = await createSupplier(payload);
      }
      if (result.success) {
        toast.success(
          editingId ? "Fornecedor atualizado!" : "Fornecedor criado!",
        );
        setDialogOpen(false);
        refetch();
      } else {
        toast.error(result.error || "Erro ao salvar fornecedor");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteSupplier(id);
      if (result.success) {
        toast.success("Fornecedor excluido!");
        setDeleteId(null);
        refetch();
      } else {
        toast.error(result.error || "Erro ao excluir fornecedor");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        description="Cadastro de fornecedores"
        action={<Button onClick={openNew}>Novo Fornecedor</Button>}
      />

      <div className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : data.length === 0 ? (
          <EmptyState
            title="Nenhum fornecedor cadastrado"
            description="Adicione seu primeiro fornecedor."
            action={<Button onClick={openNew}>Novo Fornecedor</Button>}
          />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="w-[60px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {item.cnpj ? formatCpfCnpj(item.cnpj) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.phone ? formatPhone(item.phone) : "-"}
                    </TableCell>
                    <TableCell>{item.email || "-"}</TableCell>
                    <TableCell>{item.contactPerson || "-"}</TableCell>
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
              {editingId ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Altere os dados do fornecedor."
                : "Preencha os dados do novo fornecedor."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome do fornecedor"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={form.cnpj}
                  onChange={(e) =>
                    setForm({ ...form, cnpj: maskCpfCnpj(e.target.value) })
                  }
                  placeholder="00.000.000/0000-00"
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@fornecedor.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Pessoa de Contato</Label>
                <Input
                  value={form.contactPerson}
                  onChange={(e) =>
                    setForm({ ...form, contactPerson: e.target.value })
                  }
                  placeholder="Nome do contato"
                />
              </div>
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
            <DialogTitle>Excluir Fornecedor</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este fornecedor? Esta acao nao pode
              ser desfeita.
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
