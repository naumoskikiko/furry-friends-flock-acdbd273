import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateBase32Secret(length = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => BASE32_CHARS[b % 32]).join("");
}

function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.replace(/=+$/, "").toUpperCase();
  const bits: number[] = [];
  for (const c of cleaned) {
    const val = BASE32_CHARS.indexOf(c);
    if (val === -1) continue;
    for (let i = 4; i >= 0; i--) bits.push((val >> i) & 1);
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i * 8 + j];
    bytes[i] = byte;
  }
  return bytes;
}

async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(sig);
}

async function generateTOTP(secret: string, timeStep = 30, digits = 6, offset = 0): Promise<string> {
  const key = base32Decode(secret);
  const time = Math.floor(Date.now() / 1000 / timeStep) + offset;
  const timeBytes = new Uint8Array(8);
  let t = time;
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = t & 0xff;
    t = Math.floor(t / 256);
  }
  const hash = await hmacSha1(key, timeBytes);
  const o = hash[hash.length - 1] & 0x0f;
  const code = ((hash[o] & 0x7f) << 24 | (hash[o + 1] & 0xff) << 16 | (hash[o + 2] & 0xff) << 8 | (hash[o + 3] & 0xff)) % Math.pow(10, digits);
  return code.toString().padStart(digits, "0");
}

async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  for (const offset of [-1, 0, 1]) {
    const expected = await generateTOTP(secret, 30, 6, offset);
    if (expected === token) return true;
  }
  return false;
}

function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const arr = new Uint8Array(4);
    crypto.getRandomValues(arr);
    const num = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
    codes.push(num.slice(0, 8).toUpperCase());
  }
  return codes;
}

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const supabaseAuth = createClient(supabaseUrl, publishableKey);

    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const { action } = body;

    if (action === "verify-login") {
      const { user_id, token } = body;
      if (!user_id || !token) {
        return json({ error: "Missing user_id or token" }, 400);
      }

      const { data: totp } = await supabaseAdmin
        .from("totp_secrets")
        .select("encrypted_secret, is_verified")
        .eq("user_id", user_id)
        .single();

      if (!totp || !totp.is_verified) {
        return json({ error: "2FA not enabled" }, 400);
      }

      const valid = await verifyTOTP(totp.encrypted_secret, token);
      if (valid) {
        return json({ success: true });
      }

      const { data: backupCodes } = await supabaseAdmin
        .from("totp_backup_codes")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_used", false);

      if (backupCodes) {
        const tokenHash = await hashCode(token.toUpperCase());
        const match = backupCodes.find((c: any) => c.code_hash === tokenHash);
        if (match) {
          await supabaseAdmin.from("totp_backup_codes").update({ is_used: true }).eq("id", match.id);
          return json({ success: true, backup_used: true });
        }
      }

      return json({ error: "Invalid code" }, 401);
    }

    if (action === "check-status") {
      const { user_id } = body;
      if (!user_id) {
        return json({ error: "Missing user_id" }, 400);
      }

      const { data: totp } = await supabaseAdmin
        .from("totp_secrets")
        .select("is_verified")
        .eq("user_id", user_id)
        .single();

      return json({ enabled: totp?.is_verified === true });
    }

    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(jwt);

    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = String(claimsData.claims.sub);
    const userEmail = String(claimsData.claims.email ?? "user");

    if (action === "setup") {
      const secret = generateBase32Secret();
      const otpauthUrl = `otpauth://totp/PetKeep:${userEmail}?secret=${secret}&issuer=PetKeep`;

      await supabaseAdmin.from("totp_secrets").upsert(
        {
          user_id: userId,
          encrypted_secret: secret,
          is_verified: false,
          app_name: "PetKeep",
        },
        { onConflict: "user_id" }
      );

      return json({ secret, otpauth_url: otpauthUrl });
    }

    if (action === "verify-setup") {
      const { token } = body;
      if (!token || token.length !== 6) {
        return json({ error: "Invalid token format" }, 400);
      }

      const { data: totp } = await supabaseAdmin
        .from("totp_secrets")
        .select("encrypted_secret")
        .eq("user_id", userId)
        .single();

      if (!totp) {
        return json({ error: "No TOTP setup found" }, 400);
      }

      const valid = await verifyTOTP(totp.encrypted_secret, token);
      if (!valid) {
        return json({ error: "Invalid code. Check your authenticator app." }, 400);
      }

      await supabaseAdmin.from("totp_secrets").update({ is_verified: true }).eq("user_id", userId);
      await supabaseAdmin.from("user_settings").update({ two_factor_enabled: true }).eq("user_id", userId);

      const backupCodes = generateBackupCodes(8);
      await supabaseAdmin.from("totp_backup_codes").delete().eq("user_id", userId);
      const inserts = await Promise.all(
        backupCodes.map(async (code) => ({
          user_id: userId,
          code_hash: await hashCode(code),
        }))
      );
      await supabaseAdmin.from("totp_backup_codes").insert(inserts);

      return json({ success: true, backup_codes: backupCodes });
    }

    if (action === "disable") {
      const { token } = body;
      if (!token) {
        return json({ error: "Code required to disable 2FA" }, 400);
      }

      const { data: totp } = await supabaseAdmin
        .from("totp_secrets")
        .select("encrypted_secret")
        .eq("user_id", userId)
        .single();

      if (!totp) {
        return json({ error: "2FA not set up" }, 400);
      }

      const valid = await verifyTOTP(totp.encrypted_secret, token);
      if (!valid) {
        return json({ error: "Invalid code" }, 401);
      }

      await supabaseAdmin.from("totp_secrets").delete().eq("user_id", userId);
      await supabaseAdmin.from("totp_backup_codes").delete().eq("user_id", userId);
      await supabaseAdmin.from("user_settings").update({ two_factor_enabled: false }).eq("user_id", userId);

      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
