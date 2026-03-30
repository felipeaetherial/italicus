"use client";

import { useState, useTransition, useMemo } from "react";
import { useStockEntries } from "@/lib/hooks/use-stock-entries";
import { useSuppliers } from "@/lib/hooks/use-suppliers";
import { useIngredients } from "@/lib/hooks/use-ingredients";
import { createStockEntry, deleteStockEntry } from "@/lib/actions/stock";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";

interface EntryItem {
  type: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  totalCost: number;
  unitCost: number;
}

interface EntryForm {
  invoiceNumber: string;
  invoiceDate: string;
  supplierId: string;
  supplierName: string;
  paymentDueDate: string;
  notes: string;
  items: EntryItem[];
}

const emptyItem: EntryItem = {
  type: "insumo",
  itemId: "",
  itemName: "",
  quantity: 0,
  unit: "",
  totalCost: 0,
  unitCost: 0,
};

const emptyForm: EntryForm = {
  invoiceNumber: "",
  invoiceDate: new Date().toISOString().split("T")[0],
  supplierId: "",
  supplierName: "",
  paymentDueDate: "",
  notes: "",
  items: [{ ...emptyItem }],
};

export default function EstoquePage() {
  const { data, loading, refetch } = useStockEntries();
  const { data: suppliers } = useSuppliers();
  const { data: ingredients } = useIngredients();
  const [isPending, startTransition] = useTransition();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const runningTotal = useMemo(
    () => form.items.reduce((sum, item) => sum + (item.totalCost || 0), 0),
    [form.items],
  );

  function openNew() {
    setForm({
      ...emptyForm,
      invoiceDate: new Date().toISOString().split("T")[0],
      items: [{ ...emptyItem }],
    });
    setSheetOpen(true);
  }

  function updateItem(index: number, updates: Partial<EntryItem>) {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], ...updates };

    // Auto-calculate unitCost when totalCost and quantity are set
    if (
      (updates.totalCost !== undefined || updates.quantity !== undefined) &&
      newItems[index].quantity > 0
    ) {
      newItems[index].unitCost =
        newItems[index].totalCost / newItems[index].quantity;
    }

    setForm({ ...form, items: newItems });
  }

  function selectIngredient(index: number, ingredientId: string) {
    const ing = ingredients.find((i: any) => i.id === ingredientId);
    if (ing) {
      updateItem(index, {
        itemId: ingredientId,
        itemName: (ing as any).name,
        unit: (ing as any).unit || "",
      });
    }
  }

  function addItem() {
    setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  }

  function removeItem(index: number) {
    if (form.items.length <= 1) return;
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  }

  function selectSupplier(supplierId: string) {
    const sup = suppliers.find((s: any) => s.id === supplierId);
    if (sup) {
      setForm({
        ...form,
        supplierId,
        supplierName: (sup as any).name || "",
      });
    }
  }

  function handleSave() {
    startTransition(async () => {
      const totalAmount = form.items.reduce(
        (sum, item) => sum + (item.totalCost || 0),
        0,
      );
      const payload = {
        invoiceNumber: form.invoiceNumber,
        invoiceDate: form.invoiceDate,
        supplierId: form.supplierId,
        supplierName: form.supplierName,
        paymentDueDate: form.paymentDueDate || undefined,
        notes: form.notes || undefined,
        totalAmount,
        items: form.items.map((item) => ({
          type: item.type,
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          totalCost: item.totalCost,
          unitCost: item.unitCost,
        })),
      };
      const result = await createStockEntry(payload);
      if (result.success) {
        toast.success("Entrada de estoque registrada!");
        setSheetOpen(false);
        refetch();
      } else {
        toast.error(result.error || "Erro ao registrar entrada");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteStockEntry(id);
      if (result.success) {
        toast.success("Entrada excluida!");
        setDeleteId(null);
        refetch();
      } else {
        toast.error(result.error || "Erro ao excluir entrada");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Entradas de Estoque"
        description="Registro de notas fiscais e entradas de insumos"
        action={<Button onClick={openNew}>Nova Entrada</Button>}
      />

      <div className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : data.length === 0 ? (
          <EmptyState
            title="Nenhuma entrada registrada"
            description="Registre sua primeira entrada de estoque."
            action={<Button onClick={openNew}>Nova Entrada</Button>}
          />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No NF</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="w-[60px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.invoiceNumber || "S/N"}
                    </TableCell>
                    <TableCell>
                      {entry.invoiceDate
                        ? formatDate(entry.invoiceDate)
                        : entry.createdAt
                          ? formatDate(entry.createdAt)
                          : "-"}
                    </TableCell>
                    <TableCell>{entry.supplierName || "-"}</TableCell>
                    <TableCell>{(entry.items || []).length}</TableCell>
                    <TableCell>
                      {formatCurrency(entry.totalAmount || 0)}
                    </TableCell>
                    <TableCell>
                      {entry.paymentDueDate
                        ? formatDate(entry.paymentDueDate)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteId(entry.id)}
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* New Entry Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-2xl"
        >
          <SheetHeader>
            <SheetTitle>Nova Entrada de Estoque</SheetTitle>
            <SheetDescription>
              Registre uma nota fiscal e atualize o estoque automaticamente.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Numero da NF</Label>
                <Input
                  value={form.invoiceNumber}
                  onChange={(e) =>
                    setForm({ ...form, invoiceNumber: e.target.value })
                  }
                  placeholder="Ex: 001234"
                />
              </div>
              <div className="space-y-2">
                <Label>Data da NF</Label>
                <Input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) =>
                    setForm({ ...form, invoiceDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Select
                  value={form.supplierId}
                  onValueChange={selectSupplier}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={form.paymentDueDate}
                  onChange={(e) =>
                    setForm({ ...form, paymentDueDate: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-base font-semibold">Itens</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar Item
                </Button>
              </div>
              <div className="space-y-3">
                {form.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border p-3 space-y-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Label>Insumo</Label>
                        <Select
                          value={item.itemId}
                          onValueChange={(v) => selectIngredient(idx, v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o insumo" />
                          </SelectTrigger>
                          <SelectContent>
                            {ingredients.map((ing: any) => (
                              <SelectItem key={ing.id} value={ing.id}>
                                {ing.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {form.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-6 h-8 w-8 text-red-500"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateItem(idx, {
                              quantity: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Unidade</Label>
                        <Input value={item.unit} disabled />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Custo Total (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.totalCost || ""}
                          onChange={(e) =>
                            updateItem(idx, {
                              totalCost: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    {item.unitCost > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Custo unitario: {formatCurrency(item.unitCost)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <p className="text-sm font-semibold">
                  Total: {formatCurrency(runningTotal)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observacoes opcionais..."
                rows={3}
              />
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isPending ||
                !form.supplierName ||
                form.items.every((i) => !i.itemId)
              }
            >
              {isPending ? "Salvando..." : "Registrar Entrada"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Entrada</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta entrada de estoque? O estoque
              dos insumos sera revertido e a conta a pagar vinculada sera
              removida.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
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
