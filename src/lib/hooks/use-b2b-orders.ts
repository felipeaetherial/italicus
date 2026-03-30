"use client";

import { useState, useEffect, useCallback } from "react";
import { getB2bMyOrders } from "@/lib/actions/b2b";

export function useB2bOrders(filters?: { status?: string }) {
  const [orders, setOrders] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getB2bMyOrders(filters);
      if (result.success) {
        setOrders(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar pedidos");
    } finally {
      setLoading(false);
    }
  }, [filters?.status]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { orders, loading, error, refetch: fetch };
}
