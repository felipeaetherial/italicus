"use client";

import { useState, useTransition } from "react";
import { Plus, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useProducts } from "@/lib/hooks/use-products";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  recalcAllCosts,
} from "@/lib/actions/products";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  pao: "Pão",
  bolo: "Bolo",
  doce: "Doce",
  salgado: "Salgado",
  bebida: "Bebida",
  frio: "Frio",
  outro: "Outro",
};

const CATEGORIES = Object.entries(CATEGORY_LABELS);

interface ProductForm {
  code: string;
  name: string;
  category: string;
  sellPrice: number;
  costPrice: number;
  profitMargin: number;
  unit: string;
  weightPerUnit: number;
  ovenLossPercent: number;
  isActive: boolean;
  isB2bVisible: boolean;
  minOrderQuantity: number | undefined;
}

const EMPTY_FORM: ProductForm = {
  code: "",
  name: "",
  category: "pao",
  sellPrice: 0,
  costPrice: 0,
  profitMargin: 0,
  unit: "un",
  weightPerUnit: 0,
  ovenLossPercent: 0,
  isActive: true,
  isB2bVisible: true,
  minOrderQuantity: undefined,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProdutosPage() {
  const { data: products, loading, error, refetch } = useProducts();
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // ---- Handlers ----

  function openNewDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(product: any) {
    setEditingId(product.id);
    setForm({
      code: product.code ?? "",
      name: product.name ?? "",
      category: product.category ?? "outro",
      sellPrice: product.sellPrice ?? 0,
      costPrice: product.costPrice ?? 0,
      profitMargin: product.profitMargin ?? 0,
      unit: product.unit ?? "un",
      weightPerUnit: product.weightPerUnit ?? 0,
      ovenLossPercent: product.ovenLossPercent ?? 0,
      isActive: product.isActive ?? true,
      isB2bVisible: product.isB2bVisible ?? true,
      minOrderQuantity: product.minOrderQuantity ?? undefined,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Nome e obrigatorio");
      return;
    }

    startTransition(async () => {
      const payload = {
        ...form,
        minOrderQuantity: form.minOrderQuantity ?? 0,
      };

      if (editingId) {
        const res = await updateProduct(editingId, payload);
        if (res.success) {
          toast.success("Produto atualizado");
          setDialogOpen(false);
          refetch();
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await createProduct(payload);
        if (res.success) {
          toast.success("Produto criado");
          setDialogOpen(false);
          refetch();
        } else {
          toast.error(res.error);
        }
      }
    });
  }

  function handleToggleActive(product: any) {
    startTransition(async () => {
      const res = await updateProduct(product.id, {
        isActive: !product.isActive,
      });
      if (res.success) {
        toast.success(
          product.isActive ? "Produto desativado" : "Produto ativado",
        );
        refetch();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleRecalcCosts() {
    startTransition(async () => {
      const res = await recalcAllCosts();
      if (res.success) {
        toast.success(`Custos recalculados: ${res.data.updated} fichas atualizadas`);
        refetch();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteProduct(deleteTarget.id);
      if (res.success) {
        toast.success("Produto excluido");
        setDeleteTarget(null);
        refetch();
      } else {
        toast.error(res.error);
      }
    });
  }

  // ---- Margin badge helper ----

  function marginBadge(margin: number) {
    if (margin >= 50) {
      return (
        <Badge className="bg-green-600 hover:bg-green-600/80">
          {formatPercent(margin)}
        </Badge>
      );
    }
    if (margin >= 30) {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-500/80 text-black">
          {formatPercent(margin)}
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-600 hover:bg-red-600/80">
        {formatPercent(margin)}
      </Badge>
    );
  }

  // ---- Render ----

  return (
    <div>
      <PageHeader
        title="Produtos"
        description="Catalogo de produtos da fabrica"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleRecalcCosts}
              disabled={isPending}
            >
              <RefreshCw className="h-4 w-4" />
              Recalcular Custos
            </Button>
            <Button onClick={openNewDialog} disabled={isPending}>
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </div>
        }
      />

      <div className="p-6">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {error && (
          <div>
            <p className="text-red-600">Erro ao carregar dados: {error}</p>
            <button
              onClick={refetch}
              className="mt-2 text-sm underline text-primary"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Preco Venda</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead>Un.</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Nenhum produto cadastrado
                  </TableCell>
                </TableRow>
              )}
              {products.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-xs">
                    {product.code}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {CATEGORY_LABELS[product.category] ?? product.category}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.sellPrice ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.costPrice ?? 0)}
                  </TableCell>
                  <TableCell>
                    {marginBadge(product.profitMargin ?? 0)}
                  </TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(product)}
                      disabled={isPending}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        product.isActive ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
                          product.isActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDeleteTarget({
                            id: product.id,
                            name: product.name,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ---- New / Edit Product Dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Atualize os dados do produto."
                : "Preencha os dados do novo produto."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Codigo</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm({ ...form, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellPrice">Preco Venda (R$)</Label>
                <Input
                  id="sellPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.sellPrice}
                  onChange={(e) =>
                    setForm({ ...form, sellPrice: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={form.unit}
                  onValueChange={(val) => setForm({ ...form, unit: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="un">un</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weightPerUnit">Peso por Unidade (g)</Label>
                <Input
                  id="weightPerUnit"
                  type="number"
                  step="1"
                  min="0"
                  value={form.weightPerUnit}
                  onChange={(e) =>
                    setForm({ ...form, weightPerUnit: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ovenLossPercent">Perda Forno (%)</Label>
                <Input
                  id="ovenLossPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.ovenLossPercent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ovenLossPercent: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minOrderQuantity">
                  Qtd. Min. Pedido (opcional)
                </Label>
                <Input
                  id="minOrderQuantity"
                  type="number"
                  step="1"
                  min="0"
                  value={form.minOrderQuantity ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minOrderQuantity: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-input"
                />
                Ativo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isB2bVisible}
                  onChange={(e) =>
                    setForm({ ...form, isB2bVisible: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-input"
                />
                Visivel B2B
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirm Dialog ---- */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Produto</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir &quot;{deleteTarget?.name}&quot;?
              Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
