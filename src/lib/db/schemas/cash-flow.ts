import { z } from "zod";

export const CashFlowSchema = z.object({
  id: z.string(),
  type: z.enum(["entrada", "saida"]),
  category: z.enum([
    "venda",
    "compra_insumo",
    "salario",
    "aluguel",
    "energia",
    "agua",
    "manutencao",
    "equipamento",
    "frete",
    "outro",
  ]),
  description: z.string().optional(),
  amount: z.number(),
  date: z.string(),
  paymentMethod: z
    .enum(["dinheiro", "pix", "cartao_credito", "cartao_debito", "transferencia"])
    .optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateCashFlowSchema = CashFlowSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateCashFlowSchema = CreateCashFlowSchema.partial();

export type CashFlow = z.infer<typeof CashFlowSchema>;
export type CreateCashFlow = z.infer<typeof CreateCashFlowSchema>;
export type UpdateCashFlow = z.infer<typeof UpdateCashFlowSchema>;
