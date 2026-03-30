"use client";

import { useState, useEffect, useCallback } from "react";
import { getB2bFinancial } from "@/lib/actions/b2b";

export function useB2bFinancial() {
  const [receivables, setReceivables] = useState<
    Array<{ id: string } & Record<string, unknown>>
  >([]);
  const [totalOpen, setTotalOpen] = useState(0);
  const [totalOverdue, setTotalOverdue] = useState(0);
  const [lastPaymentDate, setLastPaymentDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getB2bFinancial();
      if (result.success) {
        setReceivables(result.data.receivables);
        setTotalOpen(result.data.totalOpen);
        setTotalOverdue(result.data.totalOverdue);
        setLastPaymentDate(result.data.lastPaymentDate);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao buscar financeiro",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    receivables,
    totalOpen,
    totalOverdue,
    lastPaymentDate,
    loading,
    error,
    refetch: fetch,
  };
}
