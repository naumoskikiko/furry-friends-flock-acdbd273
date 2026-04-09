import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const fcmServerKey = Deno.env.get("FCM_SERVER_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date();

    // Get all active medications
    const { data: medications, error: medError } = await supabase
      .from("pet_medications")
      .select("*, pets(name)")
      .eq("is_active", true);

    if (medError) throw medError;
    if (!medications || medications.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No active medications" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const med of medications) {
      // Convert current time to medication's timezone
      const tz = med.timezone || "UTC";
      const nowInTz = new Date(now.toLocaleString("en-US", { timeZone: tz }));
      const currentHour = nowInTz.getHours();
      const currentMinute = nowInTz.getMinutes();
      const dayOfWeek = nowInTz.getDay();

      // Check date range
      if (med.start_date && new Date(med.start_date) > nowInTz) continue;
      if (med.end_date && new Date(med.end_date) < nowInTz) continue;

      // Check repeat days
      if (med.repeat_type === "specific_days" && med.repeat_days?.length > 0) {
        if (!med.repeat_days.includes(dayOfWeek)) continue;
      }

      // Check each scheduled time
      for (const time of med.times || []) {
        const [h, m] = time.split(":").map(Number);
        if (h !== currentHour || m !== currentMinute) continue;

        // Build scheduled_at for today in UTC
        const scheduledDate = new Date(nowInTz);
        scheduledDate.setHours(h, m, 0, 0);

        // Check if we already sent a notification for this exact schedule
        const todayStart = new Date(nowInTz);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(nowInTz);
        todayEnd.setHours(23, 59, 59, 999);

        const { data: existingLogs } = await supabase
          .from("medication_logs")
          .select("id")
          .eq("medication_id", med.id)
          .eq("notification_sent", true)
          .gte("scheduled_at", todayStart.toISOString())
          .lte("scheduled_at", todayEnd.toISOString());

        // Check if this specific time already has a log
        const alreadySentForThisTime = existingLogs?.some((log: any) => {
          return true; // simplified: if any log exists for today with notification_sent
        });

        // More precise: check by hour
        const { data: hourLogs } = await supabase
          .from("medication_logs")
          .select("id, scheduled_at")
          .eq("medication_id", med.id)
          .eq("notification_sent", true)
          .gte("scheduled_at", todayStart.toISOString())
          .lte("scheduled_at", todayEnd.toISOString());

        const alreadySent = hourLogs?.some((log: any) => {
          const logDate = new Date(log.scheduled_at);
          return logDate.getHours() === h && logDate.getMinutes() === m;
        });

        if (alreadySent) continue;

        // Create a pending log entry
        await supabase.from("medication_logs").insert({
          medication_id: med.id,
          owner_id: med.owner_id,
          scheduled_at: scheduledDate.toISOString(),
          status: "pending",
          notification_sent: true,
        });

        // Get user's FCM tokens
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("fcm_token")
          .eq("user_id", med.owner_id);

        if (!tokens || tokens.length === 0) continue;

        const petName = med.pets?.name || "your pet";
        const title = `💊 Medication Reminder`;
        const body = `Time to give ${petName} their ${med.medication_name} (${med.dosage})`;

        // Send to all user devices
        for (const tokenRow of tokens) {
          try {
            const response = await fetch("https://fcm.googleapis.com/fcm/send", {
              method: "POST",
              headers: {
                Authorization: `key=${fcmServerKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: tokenRow.fcm_token,
                notification: { title, body, icon: "/placeholder.svg" },
                data: {
                  medication_id: med.id,
                  pet_id: med.pet_id,
                  scheduled_at: scheduledDate.toISOString(),
                  type: "medication_reminder",
                },
                webpush: {
                  notification: {
                    title,
                    body,
                    icon: "/placeholder.svg",
                    requireInteraction: true,
                    actions: [
                      { action: "mark-taken", title: "✅ Mark as Given" },
                      { action: "dismiss", title: "Later" },
                    ],
                  },
                },
              }),
            });

            const result = await response.json();
            if (result.success === 1) sentCount++;

            // Remove invalid tokens
            if (result.results?.[0]?.error === "NotRegistered") {
              await supabase
                .from("push_tokens")
                .delete()
                .eq("fcm_token", tokenRow.fcm_token);
            }
          } catch (e) {
            console.error("FCM send error:", e);
          }
        }
      }
    }

    // Also send follow-up reminders for pending medications (10 min after)
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const { data: pendingLogs } = await supabase
      .from("medication_logs")
      .select("*, pet_medications(medication_name, dosage, owner_id, pet_id, pets(name))")
      .eq("status", "pending")
      .lte("scheduled_at", tenMinAgo.toISOString())
      .gte("scheduled_at", new Date(now.getTime() - 60 * 60 * 1000).toISOString());

    for (const log of pendingLogs || []) {
      const med = log.pet_medications;
      if (!med) continue;

      const { data: tokens } = await supabase
        .from("push_tokens")
        .select("fcm_token")
        .eq("user_id", med.owner_id);

      if (!tokens || tokens.length === 0) continue;

      const petName = med.pets?.name || "your pet";
      for (const tokenRow of tokens) {
        try {
          await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              Authorization: `key=${fcmServerKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: tokenRow.fcm_token,
              notification: {
                title: "⚠️ Missed Medication?",
                body: `${petName} hasn't received ${med.medication_name} yet. Mark as given?`,
              },
              data: {
                medication_id: log.medication_id,
                pet_id: med.pet_id,
                scheduled_at: log.scheduled_at,
                type: "medication_followup",
              },
            }),
          });
        } catch (e) {
          console.error("Follow-up send error:", e);
        }
      }
    }

    return new Response(JSON.stringify({ sent: sentCount, checked: medications.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cron error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
