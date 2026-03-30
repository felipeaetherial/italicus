import { z } from "zod";

export const SupplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateSupplierSchema = SupplierSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateSupplierSchema = CreateSupplierSchema.partial();

export type Supplier = z.infer<typeof SupplierSchema>;
export type CreateSupplier = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplier = z.infer<typeof UpdateSupplierSchema>;
