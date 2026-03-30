"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useB2bCatalog } from "@/lib/hooks/use-b2b-catalog";
import { useCart, type CartItem } from "@/lib/hooks/use-cart";
import { createB2bOrder } from "@/lib/actions/b2b";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Minus, Plus, ShoppingCart, X, Search, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

const categoryLabels: Record<string, string> = {
  todos: "Todos",
  pao: "Pães",
  bolo: "Bolos",
  doce: "Doces",
  salgado: "Salgados",
  bebida: "Bebidas",
  frio: "Frios",
  outro: "Outros",
};

export default function CatalogoPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const { products, tenantName, categories, loading } = useB2bCatalog();
  const {
    items,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCart();

  const tomorrowDate = new Date(Date.now() + 86400000)
    .toISOString()
    .split("T")[0];

  const filteredProducts = useMemo(() => {
    // Flatten products from Record<category, products[]> to a single array
    let allProducts: Record<string, unknown>[] = [];
    if (selectedCategory === "todos") {
      allProducts = Object.values(products).flat() as Record<string, unknown>[];
    } else {
      allProducts = (products[selectedCategory] || []) as Record<string, unknown>[];
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allProducts = allProducts.filter((p: Record<string, unknown>) =>
        (p.name as string || "").toLowerCase().includes(query)
      );
    }

    return allProducts;
  }, [products, selectedCategory, searchQuery]);

  const handleSubmitOrder = () => {
    startTransition(async () => {
      const result = await createB2bOrder({
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          unit: i.unit,
        })),
        deliveryDate,
        notes: orderNotes,
      });
      if (result.success) {
        toast.success(
          "Pedido enviado! Você será notificado quando for confirmado."
        );
        clearCart();
        setCartOpen(false);
        setDeliveryDate("");
        setOrderNotes("");
        router.push("/meus-pedidos");
      } else {
        toast.error(result.error);
      }
    });
  };

  function ProductCard({ product }: { product: any }) {
    const cartItem = items.find((i) => i.productId === product.id);
    const quantity = cartItem?.quantity || 0;

    return (
      <div
        className={cn(
          "rounded-lg border bg-card p-3 transition-all",
          quantity > 0 && "border-gold ring-1 ring-gold/30"
        )}
      >
        <p className="font-semibold text-sm leading-tight">{product.name}</p>
        <p className="text-lg font-bold text-gold mt-1">
          {formatCurrency(product.sellPrice)}
          <span className="text-xs text-muted-foreground font-normal">
            /{product.unit}
          </span>
        </p>
        {product.minOrderQuantity > 0 && (
          <p className="text-xs text-muted-foreground">
            Mín: {product.minOrderQuantity} {product.unit}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          {quantity === 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() =>
                addItem({
                  productId: product.id,
                  productName: product.name,
                  quantity: product.minOrderQuantity || 1,
                  unitPrice: product.sellPrice,
                  unit: product.unit,
                  minOrderQuantity: product.minOrderQuantity,
                })
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          ) : (
            <div className="flex items-center gap-3 mx-auto">
              <button
                onClick={() => updateQuantity(product.id, quantity - 1)}
                className="h-8 w-8 rounded-full border flex items-center justify-center"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-lg font-bold w-8 text-center">
                {quantity}
              </span>
              <button
                onClick={() => updateQuantity(product.id, quantity + 1)}
                className="h-8 w-8 rounded-full bg-gold text-gold-foreground flex items-center justify-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        {["todos", ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              selectedCategory === cat
                ? "bg-gold text-gold-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {categoryLabels[cat] || cat}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Product grid */}
      {filteredProducts.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-muted-foreground">
            Nenhum produto disponível no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          {filteredProducts.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Floating cart button */}
      {itemCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-20 left-4 right-4 mx-auto max-w-lg z-10 flex items-center justify-between rounded-xl bg-gold text-gold-foreground px-5 py-3.5 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <span className="font-semibold">Ver Pedido</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className="bg-white/20 text-white"
            >
              {itemCount} itens
            </Badge>
            <span className="font-bold text-lg">
              {formatCurrency(total)}
            </span>
          </div>
        </button>
      )}

      {/* Cart Sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>Seu Pedido</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-4">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between border-b pb-3"
              >
                <div>
                  <p className="font-medium text-sm">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(item.unitPrice)}/{item.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1)
                    }
                    className="h-7 w-7 rounded-full border flex items-center justify-center"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1)
                    }
                    className="h-7 w-7 rounded-full border flex items-center justify-center"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="ml-2 text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="font-semibold text-sm w-20 text-right">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">
                Data de Entrega *
              </label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={tomorrowDate}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Alguma observação sobre o pedido?"
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-gold">{formatCurrency(total)}</span>
            </div>
            <Button
              className="w-full bg-gold text-gold-foreground hover:bg-gold/90 h-12 text-base"
              disabled={isPending || !deliveryDate || items.length === 0}
              onClick={handleSubmitOrder}
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Enviar Pedido"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
