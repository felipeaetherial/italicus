"use client";

import { useState, useEffect, useCallback } from "react";
import { listCashFlow } from "@/lib/actions/financial";

interface CashFlowFilters {
  type?: string;
  startDate?: string;
  endDate?: string;
}

export function useCashFlow(filters?: CashFlowFilters) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listCashFlow(filters);
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [filters?.type, filters?.startDate, filters?.endDate]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
