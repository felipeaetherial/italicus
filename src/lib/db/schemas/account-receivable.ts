import { z } from "zod";

export const AccountReceivableSchema = z.object({
  id: z.string(),
  description: z.string(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  amount: z.number(),
  interest: z.number().optional(),
  fine: z.number().optional(),
  totalAmount: z.number().optional(),
  dueDate: z.string(),
  receiptDate: z.string().optional(),
  status: z.enum(["pendente", "recebido", "vencido"]).default("pendente"),
  category: z.enum(["venda", "servico", "outro"]),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateAccountReceivableSchema = AccountReceivableSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateAccountReceivableSchema =
  CreateAccountReceivableSchema.partial();

export type AccountReceivable = z.infer<typeof AccountReceivableSchema>;
export type CreateAccountReceivable = z.infer<
  typeof CreateAccountReceivableSchema
>;
export type UpdateAccountReceivable = z.infer<
  typeof UpdateAccountReceivableSchema
>;
