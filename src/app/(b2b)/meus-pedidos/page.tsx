"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useB2bOrders } from "@/lib/hooks/use-b2b-orders";
import { repeatOrder } from "@/lib/actions/b2b";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

interface Order {
  id: string;
  status: string;
  createdAt: string;
  productionDate?: string;
  dueDate?: string;
  totalAmount: number;
  items: OrderItem[];
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

const statusMap: Record<string, { label: string; className: string }> = {
  pendente: {
    label: "Aguardando",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  confirmado: {
    label: "Confirmado",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  em_producao: {
    label: "Em Produção",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  entregue: {
    label: "Entregue",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

function StatusBadge({ status }: { status: string }) {
  const info = statusMap[status] ?? {
    label: status,
    className: "",
  };
  return <Badge className={info.className}>{info.label}</Badge>;
}

// ---------------------------------------------------------------------------
// OrderCard
// ---------------------------------------------------------------------------

function OrderCard({
  order,
  onRepeat,
  isPending,
}: {
  order: Order;
  onRepeat: (id: string) => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const visibleItems = expanded ? order.items : order.items.slice(0, 2);
  const hiddenCount = order.items.length - 2;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            Pedido de {formatDate(order.createdAt)}
          </p>
          <p className="text-xs text-muted-foreground">
            Entrega: {formatDate(order.productionDate || order.dueDate || order.createdAt)}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="text-sm">
        {visibleItems.map((item) => (
          <p key={item.productId}>
            {item.productName} &times; {item.quantity}
          </p>
        ))}
        {!expanded && hiddenCount > 0 && (
          <button
            type="button"
            className="text-muted-foreground hover:underline"
            onClick={() => setExpanded(true)}
          >
            +{hiddenCount} itens
          </button>
        )}
        {expanded && hiddenCount > 0 && (
          <button
            type="button"
            className="text-muted-foreground hover:underline"
            onClick={() => setExpanded(false)}
          >
            ver menos
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-lg font-bold">{formatCurrency(order.totalAmount)}</p>
        {order.status === "entregue" && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => onRepeat(order.id)}
          >
            Repetir Pedido
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MeusPedidosPage() {
  const { orders: rawOrders, loading, error } = useB2bOrders();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const orders = rawOrders as Order[];

  const pendentes = orders.filter(
    (o) => o.status !== "entregue" && o.status !== "cancelado",
  );
  const entregues = orders.filter((o) => o.status === "entregue");

  function handleRepeatOrder(orderId: string) {
    startTransition(async () => {
      const result = await repeatOrder(orderId);
      if (result.success) {
        toast.success(
          "Items copiados! Vá para o catálogo para montar o pedido.",
        );
      } else {
        toast.error(result.error ?? "Erro ao repetir pedido");
      }
    });
  }

  function renderOrders(list: Order[]) {
    if (loading) {
      return (
        <div className="space-y-4 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <p className="p-4 text-sm text-destructive">{error}</p>
      );
    }

    if (list.length === 0) {
      return (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">
            Você ainda não fez nenhum pedido.
          </p>
          <Link
            href="/catalogo"
            className="mt-2 inline-block text-sm font-medium text-primary underline"
          >
            Ir para o catálogo
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        {list.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onRepeat={handleRepeatOrder}
            isPending={isPending}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Meus Pedidos" description="Acompanhe seus pedidos" />

      <div className="px-4">
        <Tabs defaultValue="pendentes">
          <TabsList className="w-full">
            <TabsTrigger value="pendentes" className="flex-1">
              Pendentes
            </TabsTrigger>
            <TabsTrigger value="entregues" className="flex-1">
              Entregues
            </TabsTrigger>
            <TabsTrigger value="todos" className="flex-1">
              Todos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes">
            {renderOrders(pendentes)}
          </TabsContent>
          <TabsContent value="entregues">
            {renderOrders(entregues)}
          </TabsContent>
          <TabsContent value="todos">{renderOrders(orders)}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
