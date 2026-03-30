import { z } from "zod";

export const IngredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.enum(["kg", "g", "L", "mL", "un"]),
  costPerUnit: z.number(),
  stockQuantity: z.number(),
  minStock: z.number(),
  trackStock: z.boolean().default(true),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  category: z.enum([
    "farinha",
    "acucar",
    "gordura",
    "laticinio",
    "fermento",
    "ovo",
    "fruta",
    "chocolate",
    "embalagem",
    "outro",
  ]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateIngredientSchema = IngredientSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateIngredientSchema = CreateIngredientSchema.partial();

export type Ingredient = z.infer<typeof IngredientSchema>;
export type CreateIngredient = z.infer<typeof CreateIngredientSchema>;
export type UpdateIngredient = z.infer<typeof UpdateIngredientSchema>;
