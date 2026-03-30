import { z } from "zod";

export const WasteEntrySchema = z.object({
  id: z.string(),
  type: z.enum(["insumo", "produto"]),
  itemId: z.string().optional(),
  itemName: z.string(),
  quantity: z.number(),
  unit: z.string().optional(),
  estimatedCost: z.number().optional(),
  reason: z.enum(["vencimento", "producao", "queda", "outro"]).optional(),
  date: z.string(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateWasteEntrySchema = WasteEntrySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateWasteEntrySchema = CreateWasteEntrySchema.partial();

export type WasteEntry = z.infer<typeof WasteEntrySchema>;
export type CreateWasteEntry = z.infer<typeof CreateWasteEntrySchema>;
export type UpdateWasteEntry = z.infer<typeof UpdateWasteEntrySchema>;
