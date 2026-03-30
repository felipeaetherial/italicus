"use client";

import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { useMonthlyReport } from "@/lib/hooks/use-monthly-report";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const GROUP_LABELS: Record<string, string> = {
  variavel: "Variavel",
  fixo: "Fixo",
  operacional: "Operacional",
  financeiro: "Financeiro",
};

const REASON_LABELS: Record<string, string> = {
  vencimento: "Vencimento",
  producao: "Producao",
  queda: "Queda",
  outro: "Outro",
};

const PIE_COLORS = ["#D4AF37", "#22c55e", "#3b82f6", "#a855f7", "#f97316"];

function ReportSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] w-full" />
        ))}
      </div>
      <Skeleton className="h-[350px] w-full" />
      <Skeleton className="h-[300px] w-full" />
      <Skeleton className="h-[200px] w-full" />
    </div>
  );
}

export default function RelatoriosPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, loading, error, refetch } = useMonthlyReport(month, year);

  const revenueTrend = useMemo(() => {
    if (!data || !data.prevRevenue) return undefined;
    const diff = ((data.revenue - data.prevRevenue) / data.prevRevenue) * 100;
    return { value: Math.round(diff * 10) / 10, isPositive: data.revenue >= data.prevRevenue };
  }, [data]);

  const pieData = useMemo(() => {
    if (!data?.costsByGroup) return [];
    return data.costsByGroup.map((g: any) => ({
      name: GROUP_LABELS[g.group] || g.group,
      value: g.total,
    }));
  }, [data]);

  // Year options: current year and 2 previous
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2];
  }, []);

  return (
    <div>
      <PageHeader title="Relatorios" description="Relatorios e analises" />

      <div className="p-6 space-y-6">
        {/* Month Selector */}
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <Label className="mb-1 block text-sm">Mes</Label>
            <Select
              value={String(month)}
              onValueChange={(v) => setMonth(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <Label className="mb-1 block text-sm">Ano</Label>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading && <ReportSkeleton />}

        {error && (
          <div>
            <p className="text-red-600">Erro: {error}</p>
            <button onClick={refetch} className="mt-2 text-sm underline text-primary">
              Tentar novamente
            </button>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-8">
            {/* Section 1: Resumo Financeiro */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Resumo Financeiro</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Faturamento"
                  value={formatCurrency(data.revenue)}
                  trend={revenueTrend}
                />
                <StatCard
                  label="Custos"
                  value={formatCurrency(data.costs)}
                  className="border-red-500 bg-red-50 dark:bg-red-950"
                />
                <StatCard
                  label="Lucro Bruto"
                  value={formatCurrency(data.grossProfit)}
                  className={
                    data.grossProfit >= 0
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : "border-red-500 bg-red-50 dark:bg-red-950"
                  }
                />
                <StatCard
                  label="Margem"
                  value={formatPercent(data.margin)}
                />
              </div>
            </div>

            {/* Section 2: Vendas por Cliente */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Vendas por Cliente</h2>
              <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">N Vendas</th>
                      <th className="px-4 py-3 font-medium">Valor Total</th>
                      <th className="px-4 py-3 font-medium">% Faturamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data.salesByCustomer || data.salesByCustomer.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhuma venda no periodo
                        </td>
                      </tr>
                    ) : (
                      data.salesByCustomer.map((c: any, i: number) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-4 py-3">{c.customerName}</td>
                          <td className="px-4 py-3">{c.count}</td>
                          <td className="px-4 py-3 font-medium">
                            {formatCurrency(c.total)}
                          </td>
                          <td className="px-4 py-3">
                            {formatPercent(c.percentage)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Custos por Grupo */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Custos por Grupo</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                {pieData.length > 0 && (
                  <div className="rounded-lg border bg-card p-6 shadow-sm">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name }) => String(name ?? "")}
                        >
                          {pieData.map((entry: any, index: number) => (
                            <Cell
                              key={entry.name}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Category breakdown table */}
                <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="px-4 py-3 font-medium">Categoria</th>
                        <th className="px-4 py-3 font-medium">Grupo</th>
                        <th className="px-4 py-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.costsByCategory || data.costsByCategory.length === 0) ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                            Nenhum custo no periodo
                          </td>
                        </tr>
                      ) : (
                        data.costsByCategory.map((c: any, i: number) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-4 py-3 capitalize">
                              {c.category.replace(/_/g, " ")}
                            </td>
                            <td className="px-4 py-3">
                              {GROUP_LABELS[c.group] || c.group}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {formatCurrency(c.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Section 4: Desperdicio */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Desperdicio</h2>
              <div className="space-y-4">
                <StatCard
                  label="Total Perdido"
                  value={formatCurrency(data.wasteTotal)}
                  className="border-red-500 bg-red-50 dark:bg-red-950 max-w-sm"
                />

                <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="px-4 py-3 font-medium">Motivo</th>
                        <th className="px-4 py-3 font-medium">Qtd Registros</th>
                        <th className="px-4 py-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.wasteByReason || data.wasteByReason.length === 0) ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                            Nenhum desperdicio no periodo
                          </td>
                        </tr>
                      ) : (
                        data.wasteByReason.map((r: any, i: number) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-4 py-3">
                              {REASON_LABELS[r.reason] || r.reason}
                            </td>
                            <td className="px-4 py-3">{r.count}</td>
                            <td className="px-4 py-3 font-medium text-red-600">
                              {formatCurrency(r.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
