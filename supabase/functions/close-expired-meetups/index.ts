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

    const now = new Date();
    const nowISO = now.toISOString();
    const today = nowISO.slice(0, 10);
    const currentTime = nowISO.slice(11, 16);

    // ── Phase 1: Close active meetups whose end time has passed ──
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

    let closedCount = 0;
    if (expiredMeetups && expiredMeetups.length > 0) {
      const meetupIds = expiredMeetups.map((m: any) => m.id);

      const { error: updateError } = await supabase
        .from("blog_posts")
        .update({ status: "ended" })
        .in("id", meetupIds);

      if (updateError) {
        console.error("Error updating meetup status:", updateError);
      }

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

      closedCount = meetupIds.length;
      console.log(`Closed ${closedCount} expired meetups`);
    }

    // ── Phase 2: Delete ended meetups that ended 15+ minutes ago ──
    const deleteThreshold = new Date(now.getTime() - 15 * 60 * 1000);
    const delDate = deleteThreshold.toISOString().slice(0, 10);
    const delTime = deleteThreshold.toISOString().slice(11, 16);

    const { data: meetupsToDelete, error: delFetchError } = await supabase
      .from("blog_posts")
      .select("id, conversation_id, title, event_date, event_end_time")
      .eq("post_type", "meetup")
      .eq("status", "ended")
      .or(`event_date.lt.${delDate},and(event_date.eq.${delDate},event_end_time.lte.${delTime})`);

    if (delFetchError) {
      console.error("Error fetching meetups to delete:", delFetchError);
    }

    let deletedCount = 0;
    if (meetupsToDelete && meetupsToDelete.length > 0) {
      const deleteIds = meetupsToDelete.map((m: any) => m.id);
      const conversationIds = meetupsToDelete
        .map((m: any) => m.conversation_id)
        .filter(Boolean);

      // Delete related data in correct order (children first)
      // 1. Blog engagement data
      await supabase.from("blog_event_participants").delete().in("blog_post_id", deleteIds);
      await supabase.from("blog_comments").delete().in("blog_post_id", deleteIds);
      await supabase.from("blog_likes").delete().in("blog_post_id", deleteIds);
      await supabase.from("blog_saves").delete().in("blog_post_id", deleteIds);

      // 2. Chat data (messages, participants, conversations)
      if (conversationIds.length > 0) {
        // Get message ids for deleted_messages cleanup
        const { data: msgs } = await supabase
          .from("messages")
          .select("id")
          .in("conversation_id", conversationIds);

        if (msgs && msgs.length > 0) {
          const msgIds = msgs.map((m: any) => m.id);
          await supabase.from("deleted_messages").delete().in("message_id", msgIds);
        }

        await supabase.from("messages").delete().in("conversation_id", conversationIds);
        await supabase.from("conversation_participants").delete().in("conversation_id", conversationIds);
      }

      // 3. Delete the blog posts themselves (this clears conversation_id FK)
      const { error: deletePostsError } = await supabase
        .from("blog_posts")
        .delete()
        .in("id", deleteIds);

      if (deletePostsError) {
        console.error("Error deleting meetup posts:", deletePostsError);
      } else {
        deletedCount = deleteIds.length;
        console.log(`Deleted ${deletedCount} ended meetups: ${meetupsToDelete.map((m: any) => m.title).join(", ")}`);
      }

      // 4. Delete orphaned conversations
      if (conversationIds.length > 0) {
        await supabase.from("conversations").delete().in("id", conversationIds);
      }
    }

    return new Response(
      JSON.stringify({ closed: closedCount, deleted: deletedCount }),
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
