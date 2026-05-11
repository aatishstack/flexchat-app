import { z } from "zod";

const blockedDomains = [
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "fakeinbox.com",
];

const allowedDomains = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "proton.me",
  "icloud.com",
];

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username too short")
    .max(20, "Username too long"),

  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .refine((email) => {
      const domain = email.split("@")[1];

      if (!domain) return false;

      if (blockedDomains.includes(domain)) {
        return false;
      }

      return allowedDomains.includes(domain);
    }, "Use a valid email provider"),

  password: z
    .string()
    .regex(
      passwordRegex,
      "Password must contain uppercase, lowercase, number and 8+ chars"
    ),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email"),

  password: z
    .string()
    .min(1, "Password required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;