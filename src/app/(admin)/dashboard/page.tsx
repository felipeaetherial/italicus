"use client";

import { useTransition } from "react";
import {
  DollarSign,
  ClipboardList,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { useDashboard } from "@/lib/hooks/use-dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { completeOrder } from "@/lib/actions/orders";

const PIE_COLORS = ["#D4AF37", "#22c55e", "#3b82f6", "#a855f7", "#f97316"];

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[350px] w-full" />
        <Skeleton className="h-[350px] w-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();
  const [isPending, startTransition] = useTransition();

  function handleCompleteOrder(orderId: string) {
    startTransition(async () => {
      await completeOrder(orderId);
      refetch();
    });
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Visao geral da sua fabrica" />

      {loading && <DashboardSkeleton />}

      {error && (
        <div className="p-6">
          <p className="text-red-600">Erro ao carregar dados: {error}</p>
          <button
            onClick={refetch}
            className="mt-2 text-sm underline text-primary"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-6 p-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Vendas Hoje"
              value={formatCurrency(data.salesToday)}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <StatCard
              label="Pedidos Pendentes"
              value={data.pendingOrders}
              icon={<ClipboardList className="h-5 w-5" />}
            />
            <StatCard
              label="Recebiveis Vencidos"
              value={`${data.overdueReceivables.count} (${formatCurrency(data.overdueReceivables.total)})`}
              icon={<AlertTriangle className="h-5 w-5" />}
              className={data.overdueReceivables.count > 0 ? "border-red-500 bg-red-50 dark:bg-red-950" : undefined}
            />
            <StatCard
              label="Insumos em Alerta"
              value={data.lowStockIngredients}
              icon={<Package className="h-5 w-5" />}
              className={data.lowStockIngredients > 0 ? "border-red-500 bg-red-50 dark:bg-red-950" : undefined}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart - Sales last 30 days */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">
                Vendas - Ultimos 30 dias
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.salesLast30Days}>
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
                    formatter={(value) => formatCurrency(Number(value))}
                    labelFormatter={(label) => formatDate(String(label))}
                  />
                  <Bar dataKey="total" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart - Sales by payment method */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">
                Vendas por Pagamento
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.salesByPaymentMethod}
                    dataKey="total"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name }) => String(name ?? "")}
                  >
                    {data.salesByPaymentMethod.map(
                      (entry: { method: string; total: number; count: number }, index: number) => (
                        <Cell
                          key={entry.method}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ),
                    )}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Orders */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Pedidos de Hoje</h2>
              {data.todayOrders.length === 0 ? (
                <p className="text-muted-foreground">
                  Nenhum pedido para hoje
                </p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {data.todayOrders.map(
                    (order: {
                      id: string;
                      customerName: string;
                      items: unknown[];
                      totalAmount: number;
                      status: string;
                    }) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.items.length}{" "}
                            {order.items.length === 1 ? "item" : "itens"} &middot;{" "}
                            {formatCurrency(order.totalAmount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              order.status === "entregue"
                                ? "default"
                                : order.status === "pendente"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {order.status}
                          </Badge>
                          {order.status !== "entregue" && (
                            <button
                              onClick={() => handleCompleteOrder(order.id)}
                              disabled={isPending}
                              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                              Marcar Entregue
                            </button>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* Upcoming due dates */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">
                Vencimentos Proximos (7 dias)
              </h2>
              {data.upcomingDueDates.length === 0 ? (
                <p className="text-muted-foreground">
                  Nenhum vencimento proximo
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Descricao</th>
                        <th className="pb-2 font-medium">Entidade</th>
                        <th className="pb-2 font-medium">Valor</th>
                        <th className="pb-2 font-medium">Vencimento</th>
                        <th className="pb-2 font-medium">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.upcomingDueDates.map(
                        (item: {
                          id: string;
                          description: string;
                          entityName: string;
                          amount: number;
                          dueDate: string;
                          type: "receivable" | "payable";
                        }) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-2">{item.description}</td>
                            <td className="py-2">{item.entityName}</td>
                            <td className="py-2">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="py-2">
                              {formatDate(item.dueDate)}
                            </td>
                            <td className="py-2">
                              <Badge
                                className={
                                  item.type === "receivable"
                                    ? "bg-green-600 hover:bg-green-600/80"
                                    : "bg-red-600 hover:bg-red-600/80"
                                }
                              >
                                {item.type === "receivable"
                                  ? "Receber"
                                  : "Pagar"}
                              </Badge>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
