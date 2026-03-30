"use client";

import { useState, useTransition, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useSales } from "@/lib/hooks/use-sales";
import { createSale, cancelSale, deleteSale } from "@/lib/actions/sales";
import { formatCurrency, formatDateTime, todayISO } from "@/lib/utils/format";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateRange(period: string) {
  const now = new Date();
  const today = todayISO();

  switch (period) {
    case "hoje":
      return { startDate: today + "T00:00:00.000Z", endDate: today + "T23:59:59.999Z" };
    case "7dias": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { startDate: d.toISOString(), endDate: now.toISOString() };
    }
    case "30dias": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return { startDate: d.toISOString(), endDate: now.toISOString() };
    }
    case "mes": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    default:
      return {};
  }
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  concluida: { label: "Concluida", variant: "default" },
  pendente: { label: "Pendente", variant: "secondary" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_credito: "Cartao Credito",
  cartao_debito: "Cartao Debito",
  fiado: "Fiado",
};

// ---------------------------------------------------------------------------
// Empty form state
// ---------------------------------------------------------------------------

function emptyForm() {
  return {
    customerName: "",
    items: [{ productName: "", productId: "", quantity: 1, unitPrice: 0, total: 0 }],
    paymentMethod: "dinheiro" as string,
    paymentDueDate: "",
    isEncomenda: false,
    productionDate: "",
    freightType: "sem_frete" as string,
    freightValue: 0,
    freightSupplierName: "",
    freightSupplierId: "",
    notes: "",
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VendasPage() {
  const [period, setPeriod] = useState("30dias");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "cancel" | "delete"; id: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const dateRange = useMemo(() => getDateRange(period), [period]);

  const filters = useMemo(() => ({
    ...dateRange,
    status: statusFilter !== "all" ? statusFilter : undefined,
    paymentMethod: paymentFilter !== "all" ? paymentFilter : undefined,
  }), [dateRange, statusFilter, paymentFilter]);

  const { data: sales, loading, refetch } = useSales(filters);

  // --- Form state ---
  const [form, setForm] = useState(emptyForm);

  function updateItem(index: number, field: string, value: string | number) {
    setForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        item.total = Number(item.quantity) * Number(item.unitPrice);
      }
      items[index] = item;
      return { ...prev, items };
    });
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { productName: "", productId: "", quantity: 1, unitPrice: 0, total: 0 }],
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items,
    }));
  }

  const formTotal = useMemo(
    () => form.items.reduce((s, i) => s + i.total, 0) + (form.freightType !== "sem_frete" ? Number(form.freightValue) || 0 : 0),
    [form.items, form.freightType, form.freightValue],
  );

  function handleSubmit() {
    if (form.items.every((i) => !i.productName)) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    startTransition(async () => {
      const payload: Record<string, unknown> = {
        customerName: form.customerName || undefined,
        items: form.items.map((i) => ({
          productId: i.productId || i.productName,
          productName: i.productName,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          total: Number(i.quantity) * Number(i.unitPrice),
        })),
        totalAmount: formTotal,
        paymentMethod: form.paymentMethod,
        status: "concluida",
        origin: "admin",
      };

      if (form.paymentMethod === "fiado" && form.paymentDueDate) {
        payload.paymentDueDate = form.paymentDueDate;
      }
      if (form.isEncomenda && form.productionDate) {
        payload.productionDate = form.productionDate;
        payload.status = "pendente";
      }
      if (form.freightType !== "sem_frete") {
        payload.freightType = form.freightType;
        payload.freightValue = Number(form.freightValue) || 0;
        if (form.freightType === "terceiro") {
          payload.freightSupplierName = form.freightSupplierName;
          payload.freightSupplierId = form.freightSupplierId || form.freightSupplierName;
        }
      }
      if (form.notes) {
        payload.notes = form.notes;
      }

      const result = await createSale(payload);
      if (result.success) {
        toast.success("Venda criada!");
        setSheetOpen(false);
        setForm(emptyForm());
        refetch();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleConfirmAction() {
    if (!confirmAction) return;
    startTransition(async () => {
      const fn = confirmAction.type === "cancel" ? cancelSale : deleteSale;
      const result = await fn(confirmAction.id);
      if (result.success) {
        toast.success(confirmAction.type === "cancel" ? "Venda cancelada!" : "Venda excluida!");
        refetch();
      } else {
        toast.error(result.error);
      }
      setConfirmAction(null);
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      <PageHeader
        title="Vendas"
        description="Registro e historico de vendas"
        action={
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button>Nova Venda</Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Nova Venda</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Cliente */}
                <div>
                  <Label>Cliente</Label>
                  <Input
                    placeholder="Nome do cliente"
                    value={form.customerName}
                    onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                  />
                </div>

                <Separator />

                {/* Itens */}
                <div>
                  <Label className="mb-2 block">Itens</Label>
                  <div className="space-y-3">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          {idx === 0 && <span className="text-xs text-muted-foreground">Produto</span>}
                          <Input
                            placeholder="Nome"
                            value={item.productName}
                            onChange={(e) => updateItem(idx, "productName", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          {idx === 0 && <span className="text-xs text-muted-foreground">Qtd</span>}
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3">
                          {idx === 0 && <span className="text-xs text-muted-foreground">Preco Unit.</span>}
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2 text-right text-sm font-medium pt-1">
                          {formatCurrency(item.total)}
                        </div>
                        <div className="col-span-1">
                          <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}>
                            X
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-2" onClick={addItem}>
                    + Adicionar item
                  </Button>
                </div>

                <Separator />

                {/* Pagamento */}
                <div className="space-y-3">
                  <Label>Pagamento</Label>
                  <Select value={form.paymentMethod} onValueChange={(v) => setForm((p) => ({ ...p, paymentMethod: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="cartao_credito">Cartao Credito</SelectItem>
                      <SelectItem value="cartao_debito">Cartao Debito</SelectItem>
                      <SelectItem value="fiado">Fiado</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.paymentMethod === "fiado" && (
                    <div>
                      <Label>Data de vencimento</Label>
                      <Input
                        type="date"
                        value={form.paymentDueDate}
                        onChange={(e) => setForm((p) => ({ ...p, paymentDueDate: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Producao */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isEncomenda"
                      checked={form.isEncomenda}
                      onChange={(e) => setForm((p) => ({ ...p, isEncomenda: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="isEncomenda">E encomenda?</Label>
                  </div>
                  {form.isEncomenda && (
                    <div>
                      <Label>Data de producao</Label>
                      <Input
                        type="date"
                        value={form.productionDate}
                        onChange={(e) => setForm((p) => ({ ...p, productionDate: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Frete */}
                <div className="space-y-3">
                  <Label>Frete</Label>
                  <Select value={form.freightType} onValueChange={(v) => setForm((p) => ({ ...p, freightType: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem_frete">Sem frete</SelectItem>
                      <SelectItem value="proprio">Proprio</SelectItem>
                      <SelectItem value="terceiro">Terceiro</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.freightType !== "sem_frete" && (
                    <div>
                      <Label>Valor do frete</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.freightValue}
                        onChange={(e) => setForm((p) => ({ ...p, freightValue: Number(e.target.value) }))}
                      />
                    </div>
                  )}
                  {form.freightType === "terceiro" && (
                    <div>
                      <Label>Nome do transportador</Label>
                      <Input
                        value={form.freightSupplierName}
                        onChange={(e) => setForm((p) => ({ ...p, freightSupplierName: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Observacoes */}
                <div>
                  <Label>Observacoes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Observacoes adicionais..."
                  />
                </div>

                {/* Total + Submit */}
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-lg font-bold">Total: {formatCurrency(formTotal)}</span>
                  <Button onClick={handleSubmit} disabled={isPending}>
                    {isPending ? "Salvando..." : "Salvar Venda"}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 px-6 py-4 border-b">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="7dias">7 dias</SelectItem>
            <SelectItem value="30dias">30 dias</SelectItem>
            <SelectItem value="mes">Este mes</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="concluida">Concluida</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="pix">Pix</SelectItem>
            <SelectItem value="cartao_credito">Cartao Credito</SelectItem>
            <SelectItem value="cartao_debito">Cartao Debito</SelectItem>
            <SelectItem value="fiado">Fiado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="p-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            title="Nenhuma venda encontrada"
            description="Ajuste os filtros ou crie uma nova venda."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Itens</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-left font-medium">Pagamento</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale: any) => {
                  const items = sale.items || [];
                  const statusInfo = STATUS_BADGE[sale.status] || { label: sale.status, variant: "outline" as const };
                  return (
                    <tr key={sale.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {sale.createdAt ? formatDateTime(sale.createdAt) : "-"}
                      </td>
                      <td className="px-4 py-3">{sale.customerName || "Balcao"}</td>
                      <td className="px-4 py-3" title={items.map((i: any) => `${i.productName} x${i.quantity}`).join(", ")}>
                        {items.length} {items.length === 1 ? "item" : "itens"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(sale.totalAmount || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              ...
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: "cancel", id: sale.id })}
                              disabled={sale.status === "cancelada"}
                            >
                              Cancelar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setConfirmAction({ type: "delete", id: sale.id })}
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "cancel" ? "Cancelar venda?" : "Excluir venda?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmAction?.type === "cancel"
              ? "Esta acao ira cancelar a venda e reverter os efeitos no estoque. Esta acao nao pode ser desfeita."
              : "Esta acao ira excluir permanentemente a venda e todos os registros associados. Esta acao nao pode ser desfeita."}
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleConfirmAction} disabled={isPending}>
              {isPending ? "Processando..." : "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
