import { z } from "zod";

// Messages are translation keys from validation.json. They match the backend's own rules, so the
// form catches a mistake before the server does.
const email = z.string().trim().min(1, "required").email("email");
const newPassword = z
  .string()
  .min(10, "passwordMin")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "passwordMax");

export const loginSchema = z.object({ email, password: z.string().min(1, "required") });
export const registerSchema = z.object({ name: z.string().trim().min(1, "required").max(120, "tooLong"), email, password: newPassword });
export const forgotSchema = z.object({ email });
export const resetSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((value) => value.password === value.confirm, { message: "passwordsDiffer", path: ["confirm"] });
// Bangla digits are fine: the server converts them.
export const codeSchema = z.object({ code: z.string().trim().regex(/^[\d০-৯]{6}$/, "code") });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1, "required"), newPassword });
