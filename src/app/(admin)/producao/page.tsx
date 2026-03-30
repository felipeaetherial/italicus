"use client";

import { useState, useTransition, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useOrders } from "@/lib/hooks/use-orders";
import { completeOrder } from "@/lib/actions/orders";
import { formatCurrency, todayISO } from "@/lib/utils/format";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

export default function ProducaoPage() {
  const [isPending, startTransition] = useTransition();
  const [produced, setProduced] = useState<Set<string>>(new Set());

  const today = todayISO();

  const { data: orders, loading, refetch } = useOrders({ productionDate: today });

  const pendingOrders = useMemo(
    () => orders.filter((o: any) => o.status !== "entregue" && o.status !== "cancelado"),
    [orders],
  );

  const consolidated = useMemo(() => consolidateItems(pendingOrders), [pendingOrders]);

  function toggleProduced(productName: string) {
    setProduced((prev) => {
      const next = new Set(prev);
      if (next.has(productName)) {
        next.delete(productName);
      } else {
        next.add(productName);
      }
      return next;
    });
  }

  function handleCompleteAll() {
    startTransition(async () => {
      let successCount = 0;
      let errorCount = 0;

      for (const order of pendingOrders) {
        const result = await completeOrder(order.id);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`${successCount} pedido(s) marcados como entregues!`);
      } else {
        toast.error(`${errorCount} pedido(s) falharam. ${successCount} entregues.`);
      }
      refetch();
    });
  }

  function handleCompleteSingle(orderId: string) {
    startTransition(async () => {
      const result = await completeOrder(orderId);
      if (result.success) {
        toast.success("Pedido entregue!");
        refetch();
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
      <PageHeader
        title="Producao do Dia"
        description={`Planejamento de producao para ${today}`}
        action={
          pendingOrders.length > 0 ? (
            <Button onClick={handleCompleteAll} disabled={isPending}>
              {isPending ? "Processando..." : "Marcar Todos como Entregues"}
            </Button>
          ) : undefined
        }
      />

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : pendingOrders.length === 0 ? (
          <EmptyState
            title="Nenhum pedido para hoje"
            description="Nao ha pedidos com producao agendada para hoje."
          />
        ) : (
          <>
            {/* Consolidated production list */}
            <div>
              <h2 className="text-lg font-semibold mb-3">O que produzir</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {consolidated.map((item) => (
                  <div
                    key={item.productName}
                    className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                      produced.has(item.productName)
                        ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                        : ""
                    }`}
                    onClick={() => toggleProduced(item.productName)}
                  >
                    <input
                      type="checkbox"
                      checked={produced.has(item.productName)}
                      onChange={() => toggleProduced(item.productName)}
                      className="h-5 w-5 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <span className={`font-medium ${produced.has(item.productName) ? "line-through text-muted-foreground" : ""}`}>
                        {item.productName}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {item.quantity} un
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Individual orders */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Pedidos individuais</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pendingOrders.map((order: any) => (
                  <div key={order.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {order.customerName || "Sem cliente"}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {order.status}
                      </Badge>
                    </div>

                    <ul className="text-sm text-muted-foreground space-y-1">
                      {(order.items || []).map((item: any, idx: number) => (
                        <li key={idx}>
                          {item.productName} x{item.quantity}
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {formatCurrency(order.totalAmount || 0)}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleCompleteSingle(order.id)}
                        disabled={isPending}
                      >
                        Entregue
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
