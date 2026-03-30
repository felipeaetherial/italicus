"use client";

import { useState, useMemo, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useCashFlow } from "@/lib/hooks/use-cash-flow";
import { createCashFlowEntry, deleteCashFlowEntry } from "@/lib/actions/financial";
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

const CATEGORY_LABELS: Record<string, string> = {
  venda: "Venda",
  compra_insumo: "Compra de Insumo",
  salario: "Salario",
  aluguel: "Aluguel",
  energia: "Energia",
  agua: "Agua",
  manutencao: "Manutencao",
  equipamento: "Equipamento",
  frete: "Frete",
  outro: "Outro",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartao Credito",
  cartao_debito: "Cartao Debito",
  transferencia: "Transferencia",
};

const PERIOD_OPTIONS = [
  { value: "30", label: "Ultimos 30 dias" },
  { value: "60", label: "Ultimos 60 dias" },
  { value: "90", label: "Ultimos 90 dias" },
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

export default function FluxoCaixaPage() {
  const [period, setPeriod] = useState("30");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dateRange = useMemo(() => getDateRange(Number(period)), [period]);

  const { data, loading, error, refetch } = useCashFlow({
    type: typeFilter !== "todos" ? typeFilter : undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Filter by category client-side
  const filteredData = useMemo(() => {
    if (categoryFilter === "todos") return data;
    return data.filter((item: any) => item.category === categoryFilter);
  }, [data, categoryFilter]);

  // KPIs for current month
  const kpis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let entradas = 0;
    let saidas = 0;

    for (const item of data) {
      const d = new Date(item.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        if (item.type === "entrada") entradas += item.amount || 0;
        else if (item.type === "saida") saidas += item.amount || 0;
      }
    }

    return { entradas, saidas, saldo: entradas - saidas };
  }, [data]);

  // Chart data: last 30 days grouped by day
  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; entrada: number; saida: number }>();

    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      map.set(key, { date: key, entrada: 0, saida: 0 });
    }

    for (const item of data) {
      const key = item.date;
      if (map.has(key)) {
        const row = map.get(key)!;
        if (item.type === "entrada") row.entrada += item.amount || 0;
        else if (item.type === "saida") row.saida += item.amount || 0;
      }
    }

    return Array.from(map.values());
  }, [data]);

  // Form state
  const [form, setForm] = useState({
    type: "entrada" as "entrada" | "saida",
    category: "venda",
    description: "",
    amount: "",
    date: todayISO(),
    paymentMethod: "pix",
    notes: "",
  });

  function resetForm() {
    setForm({
      type: "entrada",
      category: "venda",
      description: "",
      amount: "",
      date: todayISO(),
      paymentMethod: "pix",
      notes: "",
    });
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createCashFlowEntry({
        type: form.type,
        category: form.category,
        description: form.description || undefined,
        amount: Number(form.amount),
        date: form.date,
        paymentMethod: form.paymentMethod || undefined,
        notes: form.notes || undefined,
      });
      if (result.success) {
        toast.success("Lancamento criado com sucesso");
        setDialogOpen(false);
        resetForm();
        refetch();
      } else {
        toast.error(result.error || "Erro ao criar lancamento");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Deseja excluir este lancamento?")) return;
    startTransition(async () => {
      const result = await deleteCashFlowEntry(id);
      if (result.success) {
        toast.success("Lancamento excluido");
        refetch();
      } else {
        toast.error(result.error || "Erro ao excluir");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Fluxo de Caixa"
        description="Entradas e saidas financeiras"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Lancamento
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
          <Skeleton className="h-[350px] w-full" />
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
              label="Saldo do Mes"
              value={formatCurrency(kpis.saldo)}
              className={
                kpis.saldo >= 0
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : "border-red-500 bg-red-50 dark:bg-red-950"
              }
            />
            <StatCard
              label="Entradas"
              value={formatCurrency(kpis.entradas)}
              className="border-green-500 bg-green-50 dark:bg-green-950"
            />
            <StatCard
              label="Saidas"
              value={formatCurrency(kpis.saidas)}
              className="border-red-500 bg-red-50 dark:bg-red-950"
            />
          </div>

          {/* Bar Chart */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Fluxo - Ultimos 30 dias</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val: string) => {
                    const d = new Date(val);
                    return String(d.getDate());
                  }}
                />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    String(name) === "entrada" ? "Entrada" : "Saída",
                  ]}
                  labelFormatter={(label) => formatDate(String(label))}
                />
                <Legend formatter={(value) => (value === "entrada" ? "Entrada" : "Saida")} />
                <Bar dataKey="entrada" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saida" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
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
              <Label className="mb-1 block text-sm">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saida</SelectItem>
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
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Descricao</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Forma Pgto</th>
                  <th className="px-4 py-3 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum lancamento encontrado
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{formatDate(item.date)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            item.type === "entrada"
                              ? "bg-green-600 hover:bg-green-600/80"
                              : "bg-red-600 hover:bg-red-600/80"
                          }
                        >
                          {item.type === "entrada" ? "Entrada" : "Saida"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </td>
                      <td className="px-4 py-3">{item.description || "-"}</td>
                      <td
                        className={`px-4 py-3 font-medium ${
                          item.type === "entrada" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(item.amount || 0)}
                      </td>
                      <td className="px-4 py-3">
                        {PAYMENT_METHOD_LABELS[item.paymentMethod] || item.paymentMethod || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog Novo Lancamento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Lancamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as "entrada" | "saida" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saida</SelectItem>
                </SelectContent>
              </Select>
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
              <Label>Descricao</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select
                value={form.paymentMethod}
                onValueChange={(v) => setForm({ ...form, paymentMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.amount}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
