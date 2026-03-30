import { z } from "zod";

export const TenantSettingsSchema = z.object({
  businessName: z.string(),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  logo: z.string().optional(),
});

export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  ownerId: z.string(),
  plan: z.enum(["free", "starter", "pro"]),
  settings: TenantSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateTenantSchema = TenantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateTenantSchema = CreateTenantSchema.partial();

export type Tenant = z.infer<typeof TenantSchema>;
export type CreateTenant = z.infer<typeof CreateTenantSchema>;
export type UpdateTenant = z.infer<typeof UpdateTenantSchema>;
