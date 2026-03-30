import { z } from "zod";

export const SaleItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
});

export const SaleSchema = z.object({
  id: z.string(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  items: z.array(SaleItemSchema),
  totalAmount: z.number(),
  paymentMethod: z.enum([
    "dinheiro",
    "pix",
    "cartao_credito",
    "cartao_debito",
    "fiado",
  ]),
  paymentDueDate: z.string().optional(),
  productionDate: z.string().optional(),
  freightType: z.enum(["proprio", "terceiro", "sem_frete"]).optional(),
  freightValue: z.number().optional(),
  freightSupplierId: z.string().optional(),
  freightSupplierName: z.string().optional(),
  status: z.enum(["concluida", "cancelada", "pendente"]).default("concluida"),
  origin: z.enum(["admin", "b2b"]),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateSaleSchema = SaleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateSaleSchema = CreateSaleSchema.partial();

export type Sale = z.infer<typeof SaleSchema>;
export type CreateSale = z.infer<typeof CreateSaleSchema>;
export type UpdateSale = z.infer<typeof UpdateSaleSchema>;
