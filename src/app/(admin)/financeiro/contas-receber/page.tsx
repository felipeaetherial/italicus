"use client";

import { useState, useMemo, useTransition } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { useAccountsReceivable } from "@/lib/hooks/use-accounts-receivable";
import {
  createAccountReceivable,
  updateAccountReceivable,
  deleteAccountReceivable,
  receiveAccountReceivable,
} from "@/lib/actions/financial";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, formatDate, todayISO } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORY_LABELS: Record<string, string> = {
  venda: "Venda",
  servico: "Servico",
  outro: "Outro",
};

const PERIOD_OPTIONS = [
  { value: "30", label: "Ultimos 30 dias" },
  { value: "60", label: "Ultimos 60 dias" },
  { value: "90", label: "Ultimos 90 dias" },
  { value: "365", label: "Ultimo ano" },
];

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

const emptyForm = {
  description: "",
  customerName: "",
  amount: "",
  dueDate: "",
  category: "venda",
  notes: "",
};

export default function ContasReceberPage() {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [period, setPeriod] = useState("90");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const dateRange = useMemo(() => getDateRange(Number(period)), [period]);

  const { data, loading, error, refetch } = useAccountsReceivable({
    status: statusFilter !== "todos" ? statusFilter : undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const filteredData = useMemo(() => {
    if (categoryFilter === "todos") return data;
    return data.filter((item: any) => item.category === categoryFilter);
  }, [data, categoryFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const today = todayISO();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalPendente = 0;
    let vencidasCount = 0;
    let vencidasTotal = 0;
    let recebidasMes = 0;

    for (const item of data) {
      if (item.status === "pendente") {
        totalPendente += item.amount || 0;
        if (item.dueDate < today) {
          vencidasCount++;
          vencidasTotal += item.amount || 0;
        }
      }
      if (item.status === "recebido" && item.receiptDate) {
        const d = new Date(item.receiptDate);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          recebidasMes += item.amount || 0;
        }
      }
    }

    return { totalPendente, vencidasCount, vencidasTotal, recebidasMes };
  }, [data]);

  function resetForm() {
    setForm(emptyForm);
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createAccountReceivable({
        description: form.description,
        customerName: form.customerName || undefined,
        amount: Number(form.amount),
        dueDate: form.dueDate,
        status: "pendente",
        category: form.category,
        notes: form.notes || undefined,
      });
      if (result.success) {
        toast.success("Conta criada com sucesso");
        setCreateOpen(false);
        resetForm();
        refetch();
      } else {
        toast.error(result.error || "Erro ao criar conta");
      }
    });
  }

  function handleEdit() {
    if (!editingItem) return;
    startTransition(async () => {
      const result = await updateAccountReceivable(editingItem.id, {
        description: form.description,
        customerName: form.customerName || undefined,
        amount: Number(form.amount),
        dueDate: form.dueDate,
        category: form.category,
        notes: form.notes || undefined,
      });
      if (result.success) {
        toast.success("Conta atualizada");
        setEditOpen(false);
        setEditingItem(null);
        resetForm();
        refetch();
      } else {
        toast.error(result.error || "Erro ao atualizar");
      }
    });
  }

  function openEdit(item: any) {
    setEditingItem(item);
    setForm({
      description: item.description || "",
      customerName: item.customerName || "",
      amount: String(item.amount || ""),
      dueDate: item.dueDate || "",
      category: item.category || "venda",
      notes: item.notes || "",
    });
    setEditOpen(true);
  }

  function handleReceive(id: string) {
    if (!confirm("Confirmar recebimento desta conta?")) return;
    startTransition(async () => {
      const result = await receiveAccountReceivable(id);
      if (result.success) {
        toast.success("Recebimento registrado");
        refetch();
      } else {
        toast.error(result.error || "Erro ao registrar recebimento");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Deseja excluir esta conta?")) return;
    startTransition(async () => {
      const result = await deleteAccountReceivable(id);
      if (result.success) {
        toast.success("Conta excluida");
        refetch();
      } else {
        toast.error(result.error || "Erro ao excluir");
      }
    });
  }

  function getStatusBadge(item: any) {
    if (item.status === "recebido") {
      return <Badge className="bg-green-600 hover:bg-green-600/80">Recebido</Badge>;
    }
    if (item.status === "pendente" && item.dueDate < todayISO()) {
      return <Badge className="bg-red-600 hover:bg-red-600/80">Vencido</Badge>;
    }
    return <Badge className="bg-yellow-600 hover:bg-yellow-600/80">Pendente</Badge>;
  }

  const formFields = (
    <div className="space-y-4">
      <div>
        <Label>Descricao</Label>
        <Input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div>
        <Label>Cliente</Label>
        <Input
          value={form.customerName}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
        />
      </div>
      <div>
        <Label>Valor (R$)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
      </div>
      <div>
        <Label>Vencimento</Label>
        <Input
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        />
      </div>
      <div>
        <Label>Categoria</Label>
        <Select
          value={form.category}
          onValueChange={(v) => setForm({ ...form, category: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Observacoes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Contas a Receber"
        description="Controle de contas a receber"
        action={
          <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Conta
          </Button>
        }
      />

      {loading && (
        <div className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] w-full" />
            ))}
          </div>
          <Skeleton className="h-[300px] w-full" />
        </div>
      )}

      {error && (
        <div className="p-6">
          <p className="text-red-600">Erro: {error}</p>
          <button onClick={refetch} className="mt-2 text-sm underline text-primary">
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6 p-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Total Pendente"
              value={formatCurrency(kpis.totalPendente)}
            />
            <StatCard
              label="Vencidas"
              value={`${kpis.vencidasCount} (${formatCurrency(kpis.vencidasTotal)})`}
              className={
                kpis.vencidasCount > 0
                  ? "border-red-500 bg-red-50 dark:bg-red-950"
                  : undefined
              }
            />
            <StatCard
              label="Recebidas este Mes"
              value={formatCurrency(kpis.recebidasMes)}
              className="border-green-500 bg-green-50 dark:bg-green-950"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Label className="mb-1 block text-sm">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label className="mb-1 block text-sm">Periodo</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label className="mb-1 block text-sm">Categoria</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium">Descricao</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma conta encontrada
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="px-4 py-3">{item.customerName || "-"}</td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(item.amount || 0)}
                      </td>
                      <td className="px-4 py-3">{formatDate(item.dueDate)}</td>
                      <td className="px-4 py-3">{getStatusBadge(item)}</td>
                      <td className="px-4 py-3">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={isPending}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {item.status === "pendente" && (
                              <DropdownMenuItem onClick={() => handleReceive(item.id)}>
                                Receber
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEdit(item)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600"
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog Nova Conta */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conta a Receber</DialogTitle>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isPending || !form.description || !form.amount || !form.dueDate}
            >
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Conta a Receber</DialogTitle>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isPending || !form.description || !form.amount || !form.dueDate}
            >
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
