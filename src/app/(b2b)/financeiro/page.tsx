"use client";

import { useState } from "react";
import { DollarSign, AlertTriangle, Calendar } from "lucide-react";
import { useB2bFinancial } from "@/lib/hooks/use-b2b-financial";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
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

interface Receivable {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({ status, dueDate }: { status: string; dueDate: string }) {
  if (status === "recebido") {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        Pago
      </Badge>
    );
  }

  const isOverdue =
    status === "pendente" && new Date(dueDate) < new Date();

  if (isOverdue) {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200">Vencida</Badge>
    );
  }

  return (
    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
      Pendente
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computedStatus(item: Receivable): "pago" | "vencida" | "pendente" {
  if (item.status === "recebido") return "pago";
  if (item.status === "pendente" && new Date(item.dueDate) < new Date())
    return "vencida";
  return "pendente";
}

// ---------------------------------------------------------------------------
// ReceivableCard
// ---------------------------------------------------------------------------

function ReceivableCard({ item }: { item: Receivable }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{item.description}</p>
        <StatusBadge status={item.status} dueDate={item.dueDate} />
      </div>
      <p className="text-xl font-bold mt-1">{formatCurrency(item.amount)}</p>
      <p className="text-sm text-muted-foreground mt-1">
        Vencimento: {formatDate(item.dueDate)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FinanceiroB2bPage() {
  const {
    receivables: rawReceivables,
    totalOpen,
    totalOverdue,
    lastPaymentDate,
    loading,
    error,
  } = useB2bFinancial();

  const receivables = rawReceivables as unknown as Receivable[];

  // Sort open items by dueDate (most urgent first)
  const openItems = receivables
    .filter((r) => r.status !== "recebido")
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

  const paidItems = receivables
    .filter((r) => r.status === "recebido")
    .sort(
      (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
    );

  function renderItems(list: Receivable[], emptyMsg: string) {
    if (loading) {
      return (
        <div className="space-y-4 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      );
    }

    if (error) {
      return <p className="p-4 text-sm text-destructive">{error}</p>;
    }

    if (list.length === 0) {
      return (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">{emptyMsg}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        {list.map((item) => (
          <ReceivableCard key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Seus pagamentos e faturas"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3">
        {loading ? (
          <>
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="col-span-2 h-24 rounded-lg sm:col-span-1" />
          </>
        ) : (
          <>
            <StatCard
              label="Total em Aberto"
              value={formatCurrency(totalOpen)}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <StatCard
              label="Vencidas"
              value={formatCurrency(totalOverdue)}
              icon={<AlertTriangle className="h-4 w-4" />}
              className={totalOverdue > 0 ? "border-red-300 bg-red-50" : undefined}
            />
            <StatCard
              label="Último Pagamento"
              value={lastPaymentDate ? formatDate(lastPaymentDate) : "Nenhum"}
              icon={<Calendar className="h-4 w-4" />}
              className="col-span-2 sm:col-span-1"
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 px-4">
        <Tabs defaultValue="aberto">
          <TabsList className="w-full">
            <TabsTrigger value="aberto" className="flex-1">
              Em aberto
            </TabsTrigger>
            <TabsTrigger value="pagas" className="flex-1">
              Pagas
            </TabsTrigger>
            <TabsTrigger value="todas" className="flex-1">
              Todas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="aberto">
            {renderItems(openItems, "Nenhuma fatura em aberto.")}
          </TabsContent>
          <TabsContent value="pagas">
            {renderItems(paidItems, "Nenhum pagamento registrado.")}
          </TabsContent>
          <TabsContent value="todas">
            {renderItems(receivables, "Nenhuma fatura encontrada.")}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer note */}
      <p className="mt-8 px-4 pb-6 text-center text-xs text-muted-foreground">
        Pagamentos são registrados pela fábrica. Entre em contato para informar
        pagamentos.
      </p>
    </div>
  );
}
