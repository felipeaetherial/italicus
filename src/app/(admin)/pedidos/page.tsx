"use client";

import { useState, useTransition, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useOrders } from "@/lib/hooks/use-orders";
import {
  completeOrder,
  updateOrderQuantities,
  deleteOrder,
} from "@/lib/actions/orders";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  todayISO,
} from "@/lib/utils/format";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pendente: { label: "Pendente", variant: "secondary" },
  confirmado: { label: "Confirmado", variant: "outline" },
  em_producao: { label: "Em producao", variant: "outline" },
  entregue: { label: "Entregue", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

function consolidateItems(orders: any[]) {
  const map = new Map<string, { productName: string; quantity: number }>();
  for (const order of orders) {
    for (const item of order.items || []) {
      const key = item.productName || item.productId;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        map.set(key, { productName: key, quantity: item.quantity });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PedidosPage() {
  const [isPending, startTransition] = useTransition();
  const [editDialog, setEditDialog] = useState<{
    orderId: string;
    items: { productId: string; productName: string; quantity: number; unitPrice: number; total: number }[];
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const today = todayISO();

  // Fetch today's orders
  const {
    data: todayOrders,
    loading: loadingToday,
    refetch: refetchToday,
  } = useOrders({ productionDate: today });

  // Fetch all orders (for future + history)
  const {
    data: allOrders,
    loading: loadingAll,
    refetch: refetchAll,
  } = useOrders();

  const futureOrders = useMemo(
    () =>
      allOrders.filter(
        (o: any) =>
          o.productionDate > today &&
          o.status !== "entregue" &&
          o.status !== "cancelado",
      ),
    [allOrders, today],
  );

  const historyOrders = useMemo(
    () => allOrders.filter((o: any) => o.status === "entregue" || o.status === "cancelado"),
    [allOrders],
  );

  const todayConsolidated = useMemo(() => consolidateItems(todayOrders), [todayOrders]);

  function refetchBoth() {
    refetchToday();
    refetchAll();
  }

  function handleComplete(orderId: string) {
    startTransition(async () => {
      const result = await completeOrder(orderId);
      if (result.success) {
        toast.success("Pedido entregue!");
        refetchBoth();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSaveQuantities() {
    if (!editDialog) return;
    startTransition(async () => {
      const result = await updateOrderQuantities({
        orderId: editDialog.orderId,
        items: editDialog.items.map((i) => ({
          ...i,
          total: i.quantity * i.unitPrice,
        })),
      });
      if (result.success) {
        toast.success("Quantidades atualizadas!");
        setEditDialog(null);
        refetchBoth();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(orderId: string) {
    startTransition(async () => {
      const result = await deleteOrder(orderId);
      if (result.success) {
        toast.success("Pedido excluido!");
        setConfirmDelete(null);
        refetchBoth();
      } else {
        toast.error(result.error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      <PageHeader title="Pedidos" description="Gerencie os pedidos de producao" />

      <div className="p-6">
        <Tabs defaultValue="hoje">
          <TabsList>
            <TabsTrigger value="hoje">Hoje</TabsTrigger>
            <TabsTrigger value="proximos">Proximos</TabsTrigger>
            <TabsTrigger value="historico">Historico</TabsTrigger>
          </TabsList>

          {/* ---- TAB HOJE ---- */}
          <TabsContent value="hoje" className="mt-4 space-y-6">
            {loadingToday ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : todayOrders.length === 0 ? (
              <EmptyState
                title="Nenhum pedido para hoje"
                description="Nao ha pedidos com producao agendada para hoje."
              />
            ) : (
              <>
                {/* Consolidado */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h3 className="font-semibold mb-2">Consolidado do dia</h3>
                  <div className="flex flex-wrap gap-3">
                    {todayConsolidated.map((item) => (
                      <Badge key={item.productName} variant="outline" className="text-sm py-1 px-3">
                        {item.productName}: {item.quantity} un
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Order cards */}
                <div className="grid gap-4 md:grid-cols-2">
                  {todayOrders.map((order: any) => {
                    const status = STATUS_BADGE[order.status] || {
                      label: order.status,
                      variant: "outline" as const,
                    };
                    return (
                      <div
                        key={order.id}
                        className="rounded-lg border p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {order.customerName || "Sem cliente"}
                          </span>
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                        </div>

                        <ul className="text-sm text-muted-foreground space-y-1">
                          {(order.items || []).map((item: any, idx: number) => (
                            <li key={idx}>
                              {item.productName} x{item.quantity} -{" "}
                              {formatCurrency(item.total)}
                            </li>
                          ))}
                        </ul>

                        <div className="text-sm font-medium">
                          Total: {formatCurrency(order.totalAmount || 0)}
                        </div>

                        <div className="flex gap-2">
                          {order.status !== "entregue" &&
                            order.status !== "cancelado" && (
                              <Button
                                size="sm"
                                onClick={() => handleComplete(order.id)}
                                disabled={isPending}
                              >
                                Produzido e Entregue
                              </Button>
                            )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEditDialog({
                                orderId: order.id,
                                items: (order.items || []).map((i: any) => ({ ...i })),
                              })
                            }
                          >
                            Editar Qtd
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* ---- TAB PROXIMOS ---- */}
          <TabsContent value="proximos" className="mt-4">
            {loadingAll ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : futureOrders.length === 0 ? (
              <EmptyState
                title="Nenhum pedido futuro"
                description="Nao ha pedidos agendados para os proximos dias."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {futureOrders.map((order: any) => {
                  const status = STATUS_BADGE[order.status] || {
                    label: order.status,
                    variant: "outline" as const,
                  };
                  return (
                    <div
                      key={order.id}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {order.customerName || "Sem cliente"}
                        </span>
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Producao: {formatDate(order.productionDate)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(order.items || []).length} itens -{" "}
                        {formatCurrency(order.totalAmount || 0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ---- TAB HISTORICO ---- */}
          <TabsContent value="historico" className="mt-4">
            {loadingAll ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : historyOrders.length === 0 ? (
              <EmptyState
                title="Nenhum pedido no historico"
                description="Pedidos concluidos e cancelados aparecerão aqui."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Data</th>
                      <th className="px-4 py-3 text-left font-medium">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Acoes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyOrders.map((order: any) => {
                      const status = STATUS_BADGE[order.status] || {
                        label: order.status,
                        variant: "outline" as const,
                      };
                      return (
                        <tr
                          key={order.id}
                          className="border-b last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            {order.productionDate
                              ? formatDate(order.productionDate)
                              : order.createdAt
                                ? formatDateTime(order.createdAt)
                                : "-"}
                          </td>
                          <td className="px-4 py-3">
                            {order.customerName || "Sem cliente"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(order.totalAmount || 0)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => setConfirmDelete(order.id)}
                            >
                              Excluir
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Quantities Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Quantidades</DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4">
              {editDialog.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm flex-1">{item.productName}</span>
                  <Input
                    type="number"
                    min={0}
                    className="w-24"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...editDialog.items];
                      newItems[idx] = {
                        ...newItems[idx],
                        quantity: Number(e.target.value),
                        total: Number(e.target.value) * newItems[idx].unitPrice,
                      };
                      setEditDialog({ ...editDialog, items: newItems });
                    }}
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditDialog(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveQuantities} disabled={isPending}>
                  {isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir pedido?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acao ira excluir permanentemente o pedido. Esta acao nao pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={isPending}
            >
              {isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
