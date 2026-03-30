import { z } from "zod";

export const ProductSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  category: z.enum(["pao", "bolo", "doce", "salgado", "bebida", "frio", "outro"]),
  sellPrice: z.number(),
  costPrice: z.number(),
  profitMargin: z.number(),
  unit: z.enum(["kg", "un"]),
  weightPerUnit: z.number(),
  ovenLossPercent: z.number(),
  isActive: z.boolean().default(true),
  technicalSheetId: z.string().optional(),
  isB2bVisible: z.boolean().default(true),
  minOrderQuantity: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateProductSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateProductSchema = CreateProductSchema.partial();

export type Product = z.infer<typeof ProductSchema>;
export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
