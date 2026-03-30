import { z } from "zod";

export const OrderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
});

export const OrderSchema = z.object({
  id: z.string(),
  saleId: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string(),
  productionDate: z.string(),
  dueDate: z.string().optional(),
  items: z.array(OrderItemSchema),
  totalAmount: z.number(),
  freightValue: z.number().optional(),
  freightType: z.string().optional(),
  paymentMethod: z.string().optional(),
  status: z
    .enum(["pendente", "confirmado", "em_producao", "entregue", "cancelado"])
    .default("pendente"),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateOrderSchema = OrderSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateOrderSchema = CreateOrderSchema.partial();

export type Order = z.infer<typeof OrderSchema>;
export type CreateOrder = z.infer<typeof CreateOrderSchema>;
export type UpdateOrder = z.infer<typeof UpdateOrderSchema>;
