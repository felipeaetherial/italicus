"use client";

import { useState, useEffect, useCallback } from "react";
import { getB2bCatalog } from "@/lib/actions/b2b";

export function useB2bCatalog() {
  const [data, setData] = useState<{
    products: Record<string, unknown[]>;
    tenantName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getB2bCatalog();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar catálogo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const products = data?.products ?? {};
  const tenantName = data?.tenantName ?? "";
  const categories = Object.keys(products).sort();

  return { products, tenantName, categories, loading, error, refetch: fetch };
}
