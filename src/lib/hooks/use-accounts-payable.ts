"use client";

import { useState, useEffect, useCallback } from "react";
import { listAccountsPayable } from "@/lib/actions/financial";

interface AccountsPayableFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
}

export function useAccountsPayable(filters?: AccountsPayableFilters) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAccountsPayable(filters);
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
  }, [filters?.status, filters?.startDate, filters?.endDate]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
