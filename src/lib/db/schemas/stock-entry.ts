import { z } from "zod";

export const StockEntryItemSchema = z.object({
  type: z.literal("insumo"),
  itemId: z.string(),
  itemName: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitCost: z.number(),
  totalCost: z.number(),
});

export const StockEntrySchema = z.object({
  id: z.string(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string(),
  paymentDueDate: z.string().optional(),
  items: z.array(StockEntryItemSchema),
  totalAmount: z.number(),
  notes: z.string().optional(),
  accountPayableId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateStockEntrySchema = StockEntrySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateStockEntrySchema = CreateStockEntrySchema.partial();

export type StockEntry = z.infer<typeof StockEntrySchema>;
export type CreateStockEntry = z.infer<typeof CreateStockEntrySchema>;
export type UpdateStockEntry = z.infer<typeof UpdateStockEntrySchema>;
