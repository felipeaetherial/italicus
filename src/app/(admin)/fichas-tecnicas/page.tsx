"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { useTechnicalSheets } from "@/lib/hooks/use-technical-sheets";
import { useProducts } from "@/lib/hooks/use-products";
import { useIngredients } from "@/lib/hooks/use-ingredients";
import {
  createTechnicalSheet,
  updateTechnicalSheet,
  deleteTechnicalSheet,
} from "@/lib/actions/products";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IngredientRow {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  cost: number;
}

interface SheetForm {
  productId: string;
  productName: string;
  yieldQuantity: number;
  yieldUnit: string;
  totalWeightBeforeOven: number;
  totalWeightAfterOven: number;
  ovenLossPercent: number;
  ovenTemperature: number;
  ovenTimeMinutes: number;
  ingredients: IngredientRow[];
  totalCost: number;
  costPerUnit: number;
  instructions: string;
}

const EMPTY_FORM: SheetForm = {
  productId: "",
  productName: "",
  yieldQuantity: 0,
  yieldUnit: "un",
  totalWeightBeforeOven: 0,
  totalWeightAfterOven: 0,
  ovenLossPercent: 0,
  ovenTemperature: 0,
  ovenTimeMinutes: 0,
  ingredients: [],
  totalCost: 0,
  costPerUnit: 0,
  instructions: "",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FichasTecnicasPage() {
  const { data: sheets, loading, error, refetch } = useTechnicalSheets();
  const { data: products } = useProducts();
  const { data: ingredients } = useIngredients();
  const [isPending, startTransition] = useTransition();

  // Sheet (side panel) state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SheetForm>(EMPTY_FORM);

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Build ingredient price map
  const ingredientPriceMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const ing of ingredients) {
      m.set(ing.id, ing.costPerUnit ?? 0);
    }
    return m;
  }, [ingredients]);

  // Build ingredient unit map
  const ingredientUnitMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const ing of ingredients) {
      m.set(ing.id, ing.unit ?? "");
    }
    return m;
  }, [ingredients]);

  // Build product name map
  const productNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) {
      m.set(p.id, p.name);
    }
    return m;
  }, [products]);

  // ---- Recalculate derived values ----

  function recalcForm(updated: SheetForm): SheetForm {
    // Oven loss percent
    let ovenLossPercent = 0;
    if (updated.totalWeightBeforeOven > 0 && updated.totalWeightAfterOven > 0) {
      ovenLossPercent =
        ((updated.totalWeightBeforeOven - updated.totalWeightAfterOven) /
          updated.totalWeightBeforeOven) *
        100;
    }

    // Ingredient costs
    const ingredientsWithCosts = updated.ingredients.map((row) => ({
      ...row,
      cost: (ingredientPriceMap.get(row.ingredientId) ?? 0) * row.quantity,
    }));

    const totalCost = ingredientsWithCosts.reduce((sum, r) => sum + r.cost, 0);
    const costPerUnit =
      updated.yieldQuantity > 0 ? totalCost / updated.yieldQuantity : 0;

    return {
      ...updated,
      ovenLossPercent: Math.round(ovenLossPercent * 10) / 10,
      ingredients: ingredientsWithCosts,
      totalCost,
      costPerUnit,
    };
  }

  function updateFormField<K extends keyof SheetForm>(
    key: K,
    value: SheetForm[K],
  ) {
    setForm((prev) => recalcForm({ ...prev, [key]: value }));
  }

  // ---- Ingredient rows ----

  function addIngredientRow() {
    setForm((prev) =>
      recalcForm({
        ...prev,
        ingredients: [
          ...prev.ingredients,
          {
            ingredientId: "",
            ingredientName: "",
            quantity: 0,
            unit: "",
            cost: 0,
          },
        ],
      }),
    );
  }

  function updateIngredientRow(index: number, field: string, value: any) {
    setForm((prev) => {
      const newIngredients = [...prev.ingredients];
      const row = { ...newIngredients[index] };

      if (field === "ingredientId") {
        const ing = ingredients.find((i: any) => i.id === value);
        row.ingredientId = value;
        row.ingredientName = ing?.name ?? "";
        row.unit = ing?.unit ?? "";
      } else if (field === "quantity") {
        row.quantity = Number(value);
      }

      newIngredients[index] = row;
      return recalcForm({ ...prev, ingredients: newIngredients });
    });
  }

  function removeIngredientRow(index: number) {
    setForm((prev) => {
      const newIngredients = prev.ingredients.filter((_, i) => i !== index);
      return recalcForm({ ...prev, ingredients: newIngredients });
    });
  }

  // ---- Open / Close ----

  function openNewSheet() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEditSheet(sheet: any) {
    setEditingId(sheet.id);
    const loaded: SheetForm = {
      productId: sheet.productId ?? "",
      productName: sheet.productName ?? "",
      yieldQuantity: sheet.yieldQuantity ?? 0,
      yieldUnit: sheet.yieldUnit ?? "un",
      totalWeightBeforeOven: sheet.totalWeightBeforeOven ?? 0,
      totalWeightAfterOven: sheet.totalWeightAfterOven ?? 0,
      ovenLossPercent: sheet.ovenLossPercent ?? 0,
      ovenTemperature: sheet.ovenTemperature ?? 0,
      ovenTimeMinutes: sheet.ovenTimeMinutes ?? 0,
      ingredients: (sheet.ingredients ?? []).map((ing: any) => ({
        ingredientId: ing.ingredientId ?? "",
        ingredientName: ing.ingredientName ?? "",
        quantity: ing.quantity ?? 0,
        unit: ing.unit ?? "",
        cost: ing.cost ?? 0,
      })),
      totalCost: sheet.totalCost ?? 0,
      costPerUnit: sheet.costPerUnit ?? 0,
      instructions: sheet.instructions ?? "",
    };
    setForm(recalcForm(loaded));
    setSheetOpen(true);
  }

  // ---- Submit ----

  function handleSubmit() {
    if (!form.productId) {
      toast.error("Selecione um produto");
      return;
    }
    if (form.yieldQuantity <= 0) {
      toast.error("Rendimento deve ser maior que zero");
      return;
    }

    startTransition(async () => {
      const payload = {
        productId: form.productId,
        productName:
          form.productName || productNameMap.get(form.productId) || "",
        yieldQuantity: form.yieldQuantity,
        yieldUnit: form.yieldUnit,
        totalWeightBeforeOven: form.totalWeightBeforeOven,
        totalWeightAfterOven: form.totalWeightAfterOven,
        ovenLossPercent: form.ovenLossPercent,
        ovenTemperature: form.ovenTemperature,
        ovenTimeMinutes: form.ovenTimeMinutes,
        ingredients: form.ingredients.filter((r) => r.ingredientId),
        totalCost: form.totalCost,
        costPerUnit: form.costPerUnit,
        instructions: form.instructions,
      };

      if (editingId) {
        const res = await updateTechnicalSheet(editingId, payload);
        if (res.success) {
          toast.success("Ficha tecnica atualizada");
          setSheetOpen(false);
          refetch();
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await createTechnicalSheet(payload);
        if (res.success) {
          toast.success("Ficha tecnica criada");
          setSheetOpen(false);
          refetch();
        } else {
          toast.error(res.error);
        }
      }
    });
  }

  // ---- Delete ----

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteTechnicalSheet(deleteTarget.id);
      if (res.success) {
        toast.success("Ficha tecnica excluida");
        setDeleteTarget(null);
        refetch();
      } else {
        toast.error(res.error);
      }
    });
  }

  // ---- Render ----

  return (
    <div>
      <PageHeader
        title="Fichas Tecnicas"
        description="Receitas e fichas de producao"
        action={
          <Button onClick={openNewSheet} disabled={isPending}>
            <Plus className="h-4 w-4" />
            Nova Ficha
          </Button>
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
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Rendimento</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead className="text-right">Custo/Un</TableHead>
                <TableHead>Forno</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheets.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    Nenhuma ficha tecnica cadastrada
                  </TableCell>
                </TableRow>
              )}
              {sheets.map((sheet: any) => (
                <TableRow key={sheet.id}>
                  <TableCell className="font-medium">
                    {sheet.productName ||
                      productNameMap.get(sheet.productId) ||
                      sheet.productId}
                  </TableCell>
                  <TableCell className="text-right">
                    {sheet.yieldQuantity} {sheet.yieldUnit}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(sheet.totalCost ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(sheet.costPerUnit ?? 0)}
                  </TableCell>
                  <TableCell>
                    {sheet.ovenTemperature
                      ? `${sheet.ovenTemperature}\u00B0C / ${sheet.ovenTimeMinutes}min`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditSheet(sheet)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDeleteTarget({
                            id: sheet.id,
                            name: sheet.productName || "Ficha",
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

      {/* ---- Side Panel (Sheet) for New / Edit ---- */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>
              {editingId ? "Editar Ficha Tecnica" : "Nova Ficha Tecnica"}
            </SheetTitle>
            <SheetDescription>
              {editingId
                ? "Atualize os dados da ficha tecnica."
                : "Preencha os dados da nova ficha tecnica."}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* 1. Product */}
            {!editingId && (
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select
                  value={form.productId}
                  onValueChange={(val) => {
                    const prod = products.find((p: any) => p.id === val);
                    setForm((prev) =>
                      recalcForm({
                        ...prev,
                        productId: val,
                        productName: prod?.name ?? "",
                      }),
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editingId && (
              <div className="space-y-1">
                <Label>Produto</Label>
                <p className="text-sm font-medium">
                  {form.productName ||
                    productNameMap.get(form.productId) ||
                    form.productId}
                </p>
              </div>
            )}

            <Separator />

            {/* 2. Yield */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Rendimento</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yieldQuantity">Quantidade</Label>
                  <Input
                    id="yieldQuantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.yieldQuantity}
                    onChange={(e) =>
                      updateFormField("yieldQuantity", Number(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select
                    value={form.yieldUnit}
                    onValueChange={(val) => updateFormField("yieldUnit", val)}
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
              </div>
            </div>

            <Separator />

            {/* 3. Weights */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Pesos</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weightBefore">Antes do Forno (g)</Label>
                  <Input
                    id="weightBefore"
                    type="number"
                    step="1"
                    min="0"
                    value={form.totalWeightBeforeOven}
                    onChange={(e) =>
                      updateFormField(
                        "totalWeightBeforeOven",
                        Number(e.target.value),
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weightAfter">Apos Forno (g)</Label>
                  <Input
                    id="weightAfter"
                    type="number"
                    step="1"
                    min="0"
                    value={form.totalWeightAfterOven}
                    onChange={(e) =>
                      updateFormField(
                        "totalWeightAfterOven",
                        Number(e.target.value),
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perda Forno (%)</Label>
                  <Input
                    value={`${form.ovenLossPercent}%`}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 4. Oven */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Forno</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ovenTemp">Temperatura (C)</Label>
                  <Input
                    id="ovenTemp"
                    type="number"
                    step="5"
                    min="0"
                    value={form.ovenTemperature}
                    onChange={(e) =>
                      updateFormField(
                        "ovenTemperature",
                        Number(e.target.value),
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ovenTime">Tempo (min)</Label>
                  <Input
                    id="ovenTime"
                    type="number"
                    step="1"
                    min="0"
                    value={form.ovenTimeMinutes}
                    onChange={(e) =>
                      updateFormField(
                        "ovenTimeMinutes",
                        Number(e.target.value),
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 5. Ingredients Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Ingredientes</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addIngredientRow}
                >
                  <Plus className="h-3 w-3" />
                  Adicionar ingrediente
                </Button>
              </div>

              {form.ingredients.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum ingrediente adicionado.
                </p>
              )}

              {form.ingredients.length > 0 && (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_80px_60px_90px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
                    <span>Ingrediente</span>
                    <span>Qtd</span>
                    <span>Un.</span>
                    <span className="text-right">Custo</span>
                    <span />
                  </div>

                  {form.ingredients.map((row, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_80px_60px_90px_32px] gap-2 items-center"
                    >
                      <Select
                        value={row.ingredientId}
                        onValueChange={(val) =>
                          updateIngredientRow(idx, "ingredientId", val)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredients.map((ing: any) => (
                            <SelectItem key={ing.id} value={ing.id}>
                              {ing.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        className="h-8 text-xs"
                        value={row.quantity}
                        onChange={(e) =>
                          updateIngredientRow(idx, "quantity", e.target.value)
                        }
                      />
                      <Input
                        className="h-8 text-xs bg-muted"
                        value={row.unit}
                        readOnly
                      />
                      <Input
                        className="h-8 text-xs bg-muted text-right"
                        value={formatCurrency(row.cost)}
                        readOnly
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeIngredientRow(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  {/* Running total */}
                  <div className="grid grid-cols-[1fr_80px_60px_90px_32px] gap-2 pt-2 border-t">
                    <span className="text-sm font-semibold">Total</span>
                    <span />
                    <span />
                    <span className="text-sm font-semibold text-right">
                      {formatCurrency(form.totalCost)}
                    </span>
                    <span />
                  </div>
                  <div className="grid grid-cols-[1fr_80px_60px_90px_32px] gap-2">
                    <span className="text-sm text-muted-foreground">
                      Custo por unidade
                    </span>
                    <span />
                    <span />
                    <span className="text-sm font-medium text-right">
                      {formatCurrency(form.costPerUnit)}
                    </span>
                    <span />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* 6. Instructions */}
            <div className="space-y-2">
              <Label htmlFor="instructions">Instrucoes</Label>
              <Textarea
                id="instructions"
                rows={4}
                value={form.instructions}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, instructions: e.target.value }))
                }
                placeholder="Modo de preparo, observacoes..."
              />
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : editingId ? "Salvar" : "Criar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ---- Delete Confirm Dialog ---- */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Ficha Tecnica</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a ficha de &quot;
              {deleteTarget?.name}&quot;? O custo do produto sera zerado.
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
