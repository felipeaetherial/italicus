import { z } from "zod";

export const AccountPayableSchema = z.object({
  id: z.string(),
  description: z.string(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  amount: z.number(),
  interest: z.number().optional(),
  fine: z.number().optional(),
  totalAmount: z.number().optional(),
  dueDate: z.string(),
  paymentDate: z.string().optional(),
  status: z.enum(["pendente", "pago", "vencido"]).default("pendente"),
  category: z.enum([
    "compra_insumo",
    "embalagem",
    "imposto_venda",
    "comissao",
    "salario_producao",
    "salario",
    "aluguel",
    "energia",
    "agua",
    "manutencao",
    "salario_adm",
    "marketing",
    "sistema",
    "servico_terceiro",
    "equipamento",
    "juros",
    "tarifas_bancarias",
    "frete",
    "outro",
  ]),
  costGroup: z
    .enum(["variavel", "fixo", "operacional", "financeiro"])
    .optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateAccountPayableSchema = AccountPayableSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateAccountPayableSchema = CreateAccountPayableSchema.partial();

export type AccountPayable = z.infer<typeof AccountPayableSchema>;
export type CreateAccountPayable = z.infer<typeof CreateAccountPayableSchema>;
export type UpdateAccountPayable = z.infer<typeof UpdateAccountPayableSchema>;
