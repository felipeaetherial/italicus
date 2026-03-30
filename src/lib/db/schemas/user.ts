import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum(["owner", "staff", "b2b_client"]),
  tenantId: z.string(),
  tenantRole: z.enum(["admin", "user"]).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateUserSchema = CreateUserSchema.partial();

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
