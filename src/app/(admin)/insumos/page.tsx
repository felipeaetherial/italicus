"use client";

import { useState, useTransition, useMemo } from "react";
import { useIngredients } from "@/lib/hooks/use-ingredients";
import {
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from "@/lib/actions/ingredients";
import { adjustStock } from "@/lib/actions/stock";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/format";
import { Package, AlertTriangle, DollarSign, MoreHorizontal } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  farinha: "Farinha",
  acucar: "Acucar",
  gordura: "Gordura",
  laticinio: "Laticinio",
  fermento: "Fermento",
  ovo: "Ovo",
  fruta: "Fruta",
  chocolate: "Chocolate",
  embalagem: "Embalagem",
  outro: "Outro",
};

const UNIT_OPTIONS = ["kg", "g", "L", "ml", "un"];

interface IngredientForm {
  name: string;
  unit: string;
  costPerUnit: number;
  stockQuantity: number;
  minStock: number;
  trackStock: boolean;
  supplierId: string;
  supplierName: string;
  category: string;
}

const emptyForm: IngredientForm = {
  name: "",
  unit: "kg",
  costPerUnit: 0,
  stockQuantity: 0,
  minStock: 0,
  trackStock: true,
  supplierId: "",
  supplierName: "",
  category: "outro",
};

export default function InsumosPage() {
  const { data, loading, refetch } = useIngredients();
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IngredientForm>(emptyForm);
  const [originalCost, setOriginalCost] = useState<number | null>(null);

  // Stock adjust dialog
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockCounts, setStockCounts] = useState<Record<string, string>>({});
  const [confirmAdjust, setConfirmAdjust] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Stats
  const totalCadastrados = data.length;

  const emAlerta = useMemo(
    () =>
      data.filter(
        (i: any) =>
          i.trackStock && i.stockQuantity <= (i.minStock || 0),
      ).length,
    [data],
  );

  const valorEstoque = useMemo(
    () =>
      data.reduce(
        (sum: number, i: any) =>
          sum + (i.stockQuantity || 0) * (i.costPerUnit || 0),
        0,
      ),
    [data],
  );

  const costChanged =
    editingId !== null &&
    originalCost !== null &&
    form.costPerUnit !== originalCost;

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setOriginalCost(null);
    setDialogOpen(true);
  }

  function openEdit(item: any) {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      unit: item.unit || "kg",
      costPerUnit: item.costPerUnit || 0,
      stockQuantity: item.stockQuantity || 0,
      minStock: item.minStock || 0,
      trackStock: item.trackStock !== false,
      supplierId: item.supplierId || "",
      supplierName: item.supplierName || "",
      category: item.category || "outro",
    });
    setOriginalCost(item.costPerUnit || 0);
    setDialogOpen(true);
  }

  function handleSave() {
    startTransition(async () => {
      const payload = { ...form };
      let result;
      if (editingId) {
        result = await updateIngredient(editingId, payload);
      } else {
        result = await createIngredient(payload);
      }
      if (result.success) {
        toast.success(editingId ? "Insumo atualizado!" : "Insumo criado!");
        setDialogOpen(false);
        refetch();
      } else {
        toast.error(result.error || "Erro ao salvar insumo");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteIngredient(id);
      if (result.success) {
        toast.success("Insumo excluido!");
        setDeleteId(null);
        refetch();
      } else {
        toast.error(result.error || "Erro ao excluir insumo");
      }
    });
  }

  // Stock adjustment
  function openStockAdjust() {
    const initial: Record<string, string> = {};
    data
      .filter((i: any) => i.trackStock !== false)
      .forEach((i: any) => {
        initial[i.id] = String(i.stockQuantity || 0);
      });
    setStockCounts(initial);
    setConfirmAdjust(false);
    setStockDialogOpen(true);
  }

  function handleApplyAdjust() {
    if (!confirmAdjust) {
      setConfirmAdjust(true);
      return;
    }
    startTransition(async () => {
      const items = Object.entries(stockCounts).map(([ingredientId, val]) => ({
        ingredientId,
        countedQuantity: parseFloat(val) || 0,
      }));
      const result = await adjustStock({ items });
      if (result.success) {
        toast.success(`Estoque ajustado! ${result.data?.updated} itens atualizados.`);
        setStockDialogOpen(false);
        refetch();
      } else {
        toast.error(result.error || "Erro ao ajustar estoque");
      }
    });
  }

  const trackedIngredients = data.filter((i: any) => i.trackStock !== false);

  return (
    <div>
      <PageHeader
        title="Insumos"
        description="Materias-primas e ingredientes"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openStockAdjust}>
              Ajustar Estoque
            </Button>
            <Button onClick={openNew}>Novo Insumo</Button>
          </div>
        }
      />

      <div className="space-y-6 p-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Total Cadastrados"
            value={totalCadastrados}
            icon={<Package className="h-4 w-4" />}
          />
          <StatCard
            label="Em Alerta"
            value={emAlerta}
            icon={<AlertTriangle className="h-4 w-4" />}
            className={emAlerta > 0 ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950" : undefined}
          />
          <StatCard
            label="Valor em Estoque"
            value={formatCurrency(valorEstoque)}
            icon={<DollarSign className="h-4 w-4" />}
          />
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : data.length === 0 ? (
          <EmptyState
            title="Nenhum insumo cadastrado"
            description="Adicione seus primeiros insumos para comecar."
            action={<Button onClick={openNew}>Novo Insumo</Button>}
          />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Un.</TableHead>
                  <TableHead>Custo/Un</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Minimo</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="w-[60px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item: any) => {
                  const isAlert =
                    item.trackStock !== false &&
                    (item.stockQuantity || 0) <= (item.minStock || 0);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {CATEGORY_LABELS[item.category] || item.category || "-"}
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{formatCurrency(item.costPerUnit || 0)}</TableCell>
                      <TableCell>
                        {item.trackStock === false ? (
                          <span className="text-sm text-muted-foreground">
                            Nao controlado
                          </span>
                        ) : (
                          <Badge variant={isAlert ? "destructive" : "secondary"}>
                            {item.stockQuantity ?? 0} {item.unit}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.trackStock === false
                          ? "-"
                          : `${item.minStock ?? 0} ${item.unit}`}
                      </TableCell>
                      <TableCell>{item.supplierName || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(item)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(item.id)}
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Insumo" : "Novo Insumo"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Altere os dados do insumo."
                : "Preencha os dados do novo insumo."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Farinha de trigo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm({ ...form, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Custo por Unidade (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costPerUnit}
                  onChange={(e) =>
                    setForm({ ...form, costPerUnit: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Estoque Atual</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.stockQuantity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stockQuantity: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estoque Minimo</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.minStock}
                  onChange={(e) =>
                    setForm({ ...form, minStock: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="flex items-end space-x-2 pb-1">
                <input
                  type="checkbox"
                  id="trackStock"
                  checked={form.trackStock}
                  onChange={(e) =>
                    setForm({ ...form, trackStock: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="trackStock">Controlar estoque</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fornecedor (ID)</Label>
                <Input
                  value={form.supplierId}
                  onChange={(e) =>
                    setForm({ ...form, supplierId: e.target.value })
                  }
                  placeholder="ID do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Fornecedor</Label>
                <Input
                  value={form.supplierName}
                  onChange={(e) =>
                    setForm({ ...form, supplierName: e.target.value })
                  }
                  placeholder="Nome do fornecedor"
                />
              </div>
            </div>
            {costChanged && (
              <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                <strong>Atencao:</strong> Alterar o custo vai recalcular todas as
                fichas tecnicas que usam este insumo.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending || !form.name.trim()}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Insumo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este insumo? Esta acao nao pode ser
              desfeita.
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

      {/* Adjust Stock Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajustar Estoque</DialogTitle>
            <DialogDescription>
              Informe a contagem fisica de cada insumo. Os valores serao
              atualizados ao aplicar o ajuste.
            </DialogDescription>
          </DialogHeader>
          {trackedIngredients.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nenhum insumo com controle de estoque ativo.
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Estoque Sistema</TableHead>
                    <TableHead>Contagem Fisica</TableHead>
                    <TableHead>Diferenca</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trackedIngredients.map((item: any) => {
                    const systemQty = item.stockQuantity || 0;
                    const counted = parseFloat(stockCounts[item.id] || "0") || 0;
                    const diff = counted - systemQty;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          {systemQty} {item.unit}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-28"
                            value={stockCounts[item.id] || ""}
                            onChange={(e) =>
                              setStockCounts({
                                ...stockCounts,
                                [item.id]: e.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              diff > 0
                                ? "text-green-600"
                                : diff < 0
                                  ? "text-red-600"
                                  : "text-muted-foreground"
                            }
                          >
                            {diff > 0 ? "+" : ""}
                            {diff.toFixed(2)} {item.unit}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {confirmAdjust && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
              Confirma o ajuste de estoque? Os valores do sistema serao
              substituidos pela contagem fisica.
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStockDialogOpen(false);
                setConfirmAdjust(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApplyAdjust}
              disabled={isPending || trackedIngredients.length === 0}
            >
              {isPending
                ? "Aplicando..."
                : confirmAdjust
                  ? "Confirmar Ajuste"
                  : "Aplicar Ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
