import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TOTP implementation
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
  // Allow ±1 time step window
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const { action } = body;

    // For login verification, we don't require auth token (user isn't logged in yet)
    if (action === "verify-login") {
      const { user_id, token } = body;
      if (!user_id || !token) {
        return new Response(JSON.stringify({ error: "Missing user_id or token" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check TOTP secret
      const { data: totp } = await supabaseAdmin
        .from("totp_secrets")
        .select("encrypted_secret, is_verified")
        .eq("user_id", user_id)
        .single();

      if (!totp || !totp.is_verified) {
        return new Response(JSON.stringify({ error: "2FA not enabled" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const valid = await verifyTOTP(totp.encrypted_secret, token);
      if (valid) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check backup codes
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
          return new Response(JSON.stringify({ success: true, backup_used: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For check-status, allow with just user_id (pre-login check)
    if (action === "check-status") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: totp } = await supabaseAdmin
        .from("totp_secrets")
        .select("is_verified")
        .eq("user_id", user_id)
        .single();

      return new Response(JSON.stringify({ enabled: totp?.is_verified === true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require authentication
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || "user";

      const secret = generateBase32Secret();
      const email = user.email || "user";
      const otpauthUrl = `otpauth://totp/PetKeep:${email}?secret=${secret}&issuer=PetKeep`;

      // Upsert secret (not verified yet)
      await supabaseAdmin.from("totp_secrets").upsert({
        user_id: user.id,
        encrypted_secret: secret,
        is_verified: false,
        app_name: "PetKeep",
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ secret, otpauth_url: otpauthUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify-setup") {
      const { token } = body;
      if (!token || token.length !== 6) {
        return new Response(JSON.stringify({ error: "Invalid token format" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: totp } = await supabaseAdmin
        .from("totp_secrets")
        .select("encrypted_secret")
        .eq("user_id", user.id)
        .single();

      if (!totp) {
        return new Response(JSON.stringify({ error: "No TOTP setup found" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const valid = await verifyTOTP(totp.encrypted_secret, token);
      if (!valid) {
        return new Response(JSON.stringify({ error: "Invalid code. Check your authenticator app." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark as verified
      await supabaseAdmin.from("totp_secrets").update({ is_verified: true }).eq("user_id", user.id);

      // Update user_settings
      await supabaseAdmin.from("user_settings").update({ two_factor_enabled: true }).eq("user_id", user.id);

      // Generate backup codes
      const backupCodes = generateBackupCodes(8);
      // Delete old backup codes
      await supabaseAdmin.from("totp_backup_codes").delete().eq("user_id", user.id);
      // Insert new hashed codes
      const inserts = await Promise.all(
        backupCodes.map(async (code) => ({
          user_id: user.id,
          code_hash: await hashCode(code),
        }))
      );
      await supabaseAdmin.from("totp_backup_codes").insert(inserts);

      return new Response(JSON.stringify({ success: true, backup_codes: backupCodes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disable") {
      const { token } = body;
      if (!token) {
        return new Response(JSON.stringify({ error: "Code required to disable 2FA" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: totp } = await supabaseAdmin
        .from("totp_secrets")
        .select("encrypted_secret")
        .eq("user_id", user.id)
        .single();

      if (!totp) {
        return new Response(JSON.stringify({ error: "2FA not set up" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const valid = await verifyTOTP(totp.encrypted_secret, token);
      if (!valid) {
        return new Response(JSON.stringify({ error: "Invalid code" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("totp_secrets").delete().eq("user_id", user.id);
      await supabaseAdmin.from("totp_backup_codes").delete().eq("user_id", user.id);
      await supabaseAdmin.from("user_settings").update({ two_factor_enabled: false }).eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
