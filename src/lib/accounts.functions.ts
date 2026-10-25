import { createServerFn } from "@tanstack/react-start";

import { generateFarmerCode, signUpSchema, usernameToEmail } from "./accounts";

/**
 * Creates a username + password account with its profile and role.
 * Runs on the server so the role can't be picked by editing a request,
 * and so CRP accounts can only use an ID issued by RySS.
 */
export const createAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signUpSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", data.username)
      .maybeSingle();
    if (existing) throw new Error("That username is already taken");

    let district: string | null = null;
    if (data.role === "crp") {
      const { data: code } = await supabaseAdmin
        .from("crp_codes")
        .select("code, district, claimed_by")
        .eq("code", data.crpCode!)
        .maybeSingle();
      if (!code) throw new Error("This CRP ID is not issued by RySS");
      if (code.claimed_by) throw new Error("This CRP ID is already registered");
      district = code.district;
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username, full_name: data.fullName },
    });
    if (createError || !created.user) {
      const taken = createError?.message.toLowerCase().includes("already");
      throw new Error(taken ? "That username is already taken" : "Could not create the account");
    }

    const userId = created.user.id;

    try {
      await insertProfile(supabaseAdmin, {
        id: userId,
        username: data.username,
        full_name: data.fullName,
        phone: data.phone,
        state_code: data.stateCode,
        village: data.village ?? null,
        district,
        crp_code: data.role === "crp" ? data.crpCode! : null,
        withFarmerCode: data.role === "farmer",
      });

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: data.role });
      if (roleError) throw roleError;

      if (data.role === "crp") {
        const { error: claimError } = await supabaseAdmin
          .from("crp_codes")
          .update({ claimed_by: userId, claimed_at: new Date().toISOString() })
          .eq("code", data.crpCode!)
          .is("claimed_by", null);
        if (claimError) throw claimError;
      }
    } catch (error) {
      console.error("Account setup failed", error);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Could not finish setting up the account. Please try again.");
    }

    return { username: data.username };
  });

type AdminClient = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

async function insertProfile(
  admin: AdminClient,
  profile: {
    id: string;
    username: string;
    full_name: string;
    phone: string;
    state_code: "AP" | "TS";
    village: string | null;
    district: string | null;
    crp_code: string | null;
    withFarmerCode: boolean;
  },
) {
  const { withFarmerCode, ...row } = profile;

  // Farmer IDs are random, so retry a few times on the rare collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const farmer_code = withFarmerCode ? generateFarmerCode(row.state_code, secureRandom) : null;
    const { error } = await admin.from("profiles").insert({ ...row, farmer_code });
    if (!error) return;
    if (error.code !== "23505" || !withFarmerCode) throw error;
  }
  throw new Error("Could not generate a unique farmer ID");
}

function secureRandom() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] / 2 ** 32;
}
