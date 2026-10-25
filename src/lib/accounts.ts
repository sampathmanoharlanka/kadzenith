import { z } from "zod";

export type AppRole = "farmer" | "labour" | "crp";

export const ROLES: { id: AppRole; label: string; labelTe: string; hint: string }[] = [
  { id: "farmer", label: "Farmer", labelTe: "రైతు", hint: "Book labour, see your tests & schedules" },
  { id: "labour", label: "Labour", labelTe: "కూలీ", hint: "Accept work requests near you" },
  { id: "crp", label: "CRP", labelTe: "సీఆర్పీ", hint: "Upload tests, set schedules & rates" },
];

export const ROLE_HOME = {
  farmer: "/farmer",
  labour: "/labour",
  crp: "/crp",
} as const satisfies Record<AppRole, string>;

export const STATES = [
  { code: "AP", name: "Andhra Pradesh" },
  { code: "TS", name: "Telangana" },
] as const;

export type StateCode = (typeof STATES)[number]["code"];

// Accounts sign in with a username, so we map it to a private address
// that only exists inside our auth system.
const AUTH_EMAIL_DOMAIN = "users.kad.app";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,20}$/, "Use 3–20 letters, numbers, dots or underscores");

export const passwordSchema = z.string().min(6, "Password needs at least 6 characters").max(72);

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a 10 digit mobile number");

export const signUpSchema = z
  .object({
    role: z.enum(["farmer", "labour", "crp"]),
    username: usernameSchema,
    password: passwordSchema,
    fullName: z.string().trim().min(2, "Enter your full name").max(60),
    phone: phoneSchema,
    stateCode: z.enum(["AP", "TS"]).default("AP"),
    village: z.string().trim().max(60).optional(),
    crpCode: z.string().trim().toUpperCase().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "crp" && !value.crpCode) {
      ctx.addIssue({ code: "custom", path: ["crpCode"], message: "Enter the CRP ID given by RySS" });
    }
    if (value.role !== "crp" && !value.village) {
      ctx.addIssue({ code: "custom", path: ["village"], message: "Enter your village" });
    }
  });

export type SignUpInput = z.input<typeof signUpSchema>;

/** State-wise farmer ID, e.g. AP0128315605. */
export function generateFarmerCode(stateCode: StateCode, random: () => number = Math.random) {
  let digits = "";
  for (let i = 0; i < 10; i++) {
    digits += Math.floor(random() * 10).toString();
  }
  return `${stateCode}${digits}`;
}

export function isFarmerCode(code: string) {
  return /^(AP|TS)\d{10}$/.test(code);
}
