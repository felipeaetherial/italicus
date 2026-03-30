import { z } from "zod";

export const CustomerSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  name: z.string(),
  cpfCnpj: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  isB2bEnabled: z.boolean().default(false),
  b2bUserId: z.string().optional(),
  defaultPaymentDueDays: z.number().optional(),
  autoPaymentRule: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateCustomerSchema = CustomerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

export type Customer = z.infer<typeof CustomerSchema>;
export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;
