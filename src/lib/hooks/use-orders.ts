"use client";

import { useState, useEffect, useCallback } from "react";
import { listOrders } from "@/lib/actions/orders";

interface OrdersFilters {
  status?: string;
  productionDate?: string;
}

export function useOrders(filters?: OrdersFilters) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listOrders(filters);
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
  }, [filters?.status, filters?.productionDate]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
