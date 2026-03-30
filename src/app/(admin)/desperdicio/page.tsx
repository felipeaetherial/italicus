"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useWasteEntries } from "@/lib/hooks/use-waste-entries";
import { useIngredients } from "@/lib/hooks/use-ingredients";
import { useProducts } from "@/lib/hooks/use-products";
import { createWasteEntry, deleteWasteEntry } from "@/lib/actions/waste";
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

const REASON_LABELS: Record<string, string> = {
  vencimento: "Vencimento",
  producao: "Producao",
  queda: "Queda",
  outro: "Outro",
};

export default function DesperdicioPage() {
  const { data, loading, error, refetch } = useWasteEntries();
  const { data: ingredients } = useIngredients();
  const { data: products } = useProducts();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    type: "insumo" as "insumo" | "produto",
    itemId: "",
    quantity: "",
    reason: "outro",
    date: todayISO(),
    notes: "",
  });

  // Selected item details
  const selectedItem = useMemo(() => {
    if (form.type === "insumo") {
      return ingredients.find((i: any) => i.id === form.itemId);
    }
    return products.find((p: any) => p.id === form.itemId);
  }, [form.type, form.itemId, ingredients, products]);

  const estimatedCost = useMemo(() => {
    if (!selectedItem || !form.quantity || Number(form.quantity) <= 0) return 0;
    const qty = Number(form.quantity);
    if (form.type === "insumo") {
      return (selectedItem.costPerUnit || 0) * qty;
    }
    return (selectedItem.costPrice || 0) * qty;
  }, [selectedItem, form.quantity, form.type]);

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let custoMes = 0;
    let registrosMes = 0;
    const reasonCount = new Map<string, number>();

    for (const item of data) {
      const d = item.createdAt ? new Date(item.createdAt) : new Date(item.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        custoMes += item.estimatedCost || 0;
        registrosMes++;
        const reason = item.reason || "outro";
        reasonCount.set(reason, (reasonCount.get(reason) || 0) + 1);
      }
    }

    let principalMotivo = "-";
    let maxCount = 0;
    for (const [reason, count] of reasonCount) {
      if (count > maxCount) {
        maxCount = count;
        principalMotivo = REASON_LABELS[reason] || reason;
      }
    }

    return { custoMes, registrosMes, principalMotivo };
  }, [data]);

  function resetForm() {
    setForm({
      type: "insumo",
      itemId: "",
      quantity: "",
      reason: "outro",
      date: todayISO(),
      notes: "",
    });
  }

  function handleSubmit() {
    const itemName =
      form.type === "insumo"
        ? selectedItem?.name || ""
        : selectedItem?.name || "";

    startTransition(async () => {
      const result = await createWasteEntry({
        type: form.type,
        itemId: form.itemId || undefined,
        itemName,
        quantity: Number(form.quantity),
        unit: form.type === "insumo" ? selectedItem?.unit || undefined : undefined,
        estimatedCost: estimatedCost,
        reason: form.reason,
        date: form.date,
        notes: form.notes || undefined,
      });
      if (result.success) {
        toast.success("Desperdicio registrado");
        setDialogOpen(false);
        resetForm();
        refetch();
      } else {
        toast.error(result.error || "Erro ao registrar desperdicio");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Deseja excluir este registro?")) return;
    startTransition(async () => {
      const result = await deleteWasteEntry(id);
      if (result.success) {
        toast.success("Registro excluido");
        refetch();
      } else {
        toast.error(result.error || "Erro ao excluir");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Desperdicio"
        description="Registro de perdas e desperdicios"
        action={
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar Desperdicio
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
              label="Desperdicio do Mes (R$)"
              value={formatCurrency(kpis.custoMes)}
              className="border-red-500 bg-red-50 dark:bg-red-950"
            />
            <StatCard label="Registros no Mes" value={kpis.registrosMes} />
            <StatCard label="Principal Motivo" value={kpis.principalMotivo} />
          </div>

          {/* Table */}
          <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Quantidade</th>
                  <th className="px-4 py-3 font-medium">Custo Est.</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                ) : (
                  data.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{formatDate(item.date || item.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={item.type === "insumo" ? "secondary" : "outline"}
                        >
                          {item.type === "insumo" ? "Insumo" : "Produto"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{item.itemName || "-"}</td>
                      <td className="px-4 py-3">
                        {item.quantity}
                        {item.unit ? ` ${item.unit}` : ""}
                      </td>
                      <td className="px-4 py-3 font-medium text-red-600">
                        {formatCurrency(item.estimatedCost || 0)}
                      </td>
                      <td className="px-4 py-3">
                        {REASON_LABELS[item.reason] || item.reason || "-"}
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

      {/* Dialog Registrar Desperdicio */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Desperdicio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({ ...form, type: v as "insumo" | "produto", itemId: "", quantity: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="insumo">Insumo</SelectItem>
                  <SelectItem value="produto">Produto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{form.type === "insumo" ? "Ingrediente" : "Produto"}</Label>
              <Select
                value={form.itemId}
                onValueChange={(v) => setForm({ ...form, itemId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {form.type === "insumo"
                    ? ingredients.map((ing: any) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name}
                        </SelectItem>
                      ))
                    : products.map((prod: any) => (
                        <SelectItem key={prod.id} value={prod.id}>
                          {prod.name}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>
                Quantidade
                {form.type === "insumo" && selectedItem?.unit
                  ? ` (${selectedItem.unit})`
                  : ""}
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>

            {estimatedCost > 0 && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm">
                  Custo estimado: <strong className="text-red-600">{formatCurrency(estimatedCost)}</strong>
                </p>
              </div>
            )}

            <div>
              <Label>Motivo</Label>
              <Select
                value={form.reason}
                onValueChange={(v) => setForm({ ...form, reason: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REASON_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button
              onClick={handleSubmit}
              disabled={isPending || !form.itemId || !form.quantity}
            >
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
