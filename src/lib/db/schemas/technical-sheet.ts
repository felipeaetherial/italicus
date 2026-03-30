import { z } from "zod";

export const TechnicalSheetIngredientSchema = z.object({
  ingredientId: z.string(),
  ingredientName: z.string(),
  quantity: z.number(),
  unit: z.string(),
  cost: z.number(),
});

export const TechnicalSheetSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  yieldQuantity: z.number(),
  yieldUnit: z.enum(["kg", "un"]),
  totalWeightBeforeOven: z.number(),
  totalWeightAfterOven: z.number(),
  ovenLossPercent: z.number(),
  ovenTemperature: z.number(),
  ovenTimeMinutes: z.number(),
  ingredients: z.array(TechnicalSheetIngredientSchema),
  totalCost: z.number(),
  costPerUnit: z.number(),
  instructions: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateTechnicalSheetSchema = TechnicalSheetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateTechnicalSheetSchema = CreateTechnicalSheetSchema.partial();

export type TechnicalSheet = z.infer<typeof TechnicalSheetSchema>;
export type CreateTechnicalSheet = z.infer<typeof CreateTechnicalSheetSchema>;
export type UpdateTechnicalSheet = z.infer<typeof UpdateTechnicalSheetSchema>;
