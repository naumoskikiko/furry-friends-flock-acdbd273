import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find active meetups whose event_date + event_end_time has passed
    const now = new Date().toISOString();
    const today = now.slice(0, 10); // YYYY-MM-DD
    const currentTime = now.slice(11, 16); // HH:MM

    // Get meetups that should be closed:
    // 1. event_date < today (past days)
    // 2. event_date = today AND event_end_time <= currentTime
    const { data: expiredMeetups, error: fetchError } = await supabase
      .from("blog_posts")
      .select("id, conversation_id, title, event_date, event_end_time")
      .eq("post_type", "meetup")
      .eq("status", "active")
      .or(`event_date.lt.${today},and(event_date.eq.${today},event_end_time.lte.${currentTime})`);

    if (fetchError) {
      console.error("Error fetching expired meetups:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredMeetups || expiredMeetups.length === 0) {
      return new Response(JSON.stringify({ closed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meetupIds = expiredMeetups.map((m: any) => m.id);

    // Mark meetups as ended
    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({ status: "ended" })
      .in("id", meetupIds);

    if (updateError) {
      console.error("Error updating meetup status:", updateError);
    }

    // Send system message to each meetup chat
    for (const meetup of expiredMeetups) {
      if (meetup.conversation_id) {
        await supabase.from("messages").insert({
          conversation_id: meetup.conversation_id,
          sender_id: "00000000-0000-0000-0000-000000000000",
          message_text: `📍 This meetup "${meetup.title}" has ended. The chat is now read-only.`,
          message_type: "system",
        });
      }
    }

    console.log(`Closed ${meetupIds.length} expired meetups`);

    return new Response(
      JSON.stringify({ closed: meetupIds.length, ids: meetupIds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
