import { useState, useEffect, useCallback } from "react";
import { useTabRefresh } from "@/hooks/useTabRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ConversationList from "@/components/messages/ConversationList";
import ChatView from "@/components/messages/ChatView";
import ForwardModal from "@/components/messages/ForwardModal";
import { type Conversation, type Message, useChatMessages, useConversations } from "@/hooks/useMessages";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MessagesPage = () => {
  const { user } = useAuth();
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [forwardingMessageId, setForwardingMessageId] = useState<string | null>(null);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const { messages, forwardMessage } = useChatMessages(activeConversation?.id || null);
  const { toggleMute, deleteConversation, refresh } = useConversations();

  const refreshMessages = useCallback(async () => {
    refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [refresh]);

  useTabRefresh("/messages", refreshMessages);

  const { refreshing, pullDistance, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePullToRefresh({ onRefresh: refreshMessages });

  // Handle deep-link to a specific conversation
  useEffect(() => {
    const convId = searchParams.get("conversation");
    const userId = searchParams.get("userId");
    const meetupId = searchParams.get("meetup");

    if (meetupId && user && !activeConversation) {
      // Open meetup chat by looking up conversation_id from blog_posts
      const openMeetupChat = async () => {
        const { data: blogPost } = await (supabase as any)
          .from("blog_posts")
          .select("conversation_id, title, user_id, event_date, event_end_time, status")
          .eq("id", meetupId)
          .single();

        if (!blogPost) {
          toast({ title: "This meetup is no longer available", variant: "destructive" });
          setSearchParams({}, { replace: true });
          return;
        }

        let convId = blogPost.conversation_id;

        // Auto-create chat if missing (fallback for older meetups)
        if (!convId) {
          // Only the meetup creator can create the chat now (server-enforced)
          if (blogPost.user_id !== user.id) {
            toast({ title: "Meetup chat not ready yet", description: "The organizer needs to open it first.", variant: "destructive" });
            setSearchParams({}, { replace: true });
            return;
          }
          try {
            const { data: newConvId } = await (supabase as any).rpc("create_meetup_chat", {
              _blog_post_id: meetupId,
              _meetup_title: blogPost.title,
            });
            convId = newConvId;
          } catch (e) {
            console.error("Failed to auto-create meetup chat:", e);
            toast({ title: "Could not create meetup chat", variant: "destructive" });
            setSearchParams({}, { replace: true });
            return;
          }
        }

        // Check membership — auto-join if user is a meetup participant but not in chat
        const { data: membership } = await (supabase as any)
          .from("conversation_participants")
          .select("id")
          .eq("conversation_id", convId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!membership) {
          // Check if user is a meetup participant
          const { data: eventPart } = await (supabase as any)
            .from("blog_event_participants")
            .select("id")
            .eq("blog_post_id", meetupId)
            .eq("user_id", user.id)
            .maybeSingle();

          if (eventPart) {
            // Auto-add to chat
            try {
              await (supabase as any).rpc("join_meetup_chat", { _blog_post_id: meetupId });
            } catch {}
          } else {
            toast({ title: "Join the meetup to access the chat", variant: "destructive" });
            setSearchParams({}, { replace: true });
            return;
          }
        }

        // Determine if meetup has ended
        let meetupEnded = false;
        if (blogPost.event_date) {
          if (blogPost.event_end_time) {
            const endDt = new Date(`${blogPost.event_date}T${blogPost.event_end_time}`);
            meetupEnded = endDt <= new Date();
          } else {
            meetupEnded = new Date(blogPost.event_date + "T23:59:59") <= new Date();
          }
        }
        if (blogPost.status === "ended") meetupEnded = true;

        setActiveConversation({
          id: convId,
          created_at: new Date().toISOString(),
          other_user: {
            user_id: "group",
            full_name: "📍 " + blogPost.title,
            username: null,
            avatar_url: null,
            last_active_at: null,
          },
          unread_count: 0,
          is_pinned: false,
          is_archived: false,
          is_muted: false,
          is_group: true,
          group_name: "📍 " + blogPost.title,
          meetup_id: meetupId,
          meetup_ended: meetupEnded,
        });
        setSearchParams({}, { replace: true });
      };
      openMeetupChat();
    } else if (convId && userId && !activeConversation) {
      const loadConversation = async () => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, full_name, username, avatar_url, last_active_at")
          .eq("user_id", userId)
          .maybeSingle();
        if (profile) {
          setActiveConversation({
            id: convId,
            created_at: new Date().toISOString(),
            other_user: {
              user_id: profile.user_id,
              full_name: profile.full_name,
              username: profile.username,
              avatar_url: profile.avatar_url,
              last_active_at: (profile as any).last_active_at || null,
            },
            unread_count: 0,
            is_pinned: false,
            is_archived: false,
            is_muted: false,
          });
          setSearchParams({}, { replace: true });
        }
      };
      loadConversation();
    }
  }, [searchParams, user]);

  const forwardingMessage = forwardingMessageId
    ? messages.find((m) => m.id === forwardingMessageId) || null
    : null;

  const handleForward = async (targetConversationId: string) => {
    if (!forwardingMessageId) return;
    const ok = await forwardMessage(forwardingMessageId, targetConversationId);
    if (ok) {
      toast({ title: "Message forwarded" });
    }
    setForwardingMessageId(null);
  };

  const handleMuteToggle = async (conversationId: string, muted: boolean) => {
    await toggleMute(conversationId, muted);
    toast({ title: muted ? "Chat muted" : "Chat unmuted" });
  };

  const handleDeleteChat = async (conversationId: string) => {
    await deleteConversation(conversationId);
    toast({ title: "Chat deleted" });
    refresh();
  };

  const handleClearChat = async (conversationId: string) => {
    // Clear by marking all messages as deleted for this user
    await deleteConversation(conversationId);
    toast({ title: "Chat cleared" });
  };

  return (
    <AppLayout>
      <div className={`mx-auto max-w-lg ${activeConversation ? "fixed inset-x-0 top-0 bottom-0 max-w-lg left-1/2 -translate-x-1/2 flex flex-col overflow-hidden bg-background z-30" : ""}`}>
        {activeConversation ? (
          <ChatView
            conversation={activeConversation}
            onBack={() => { setActiveConversation(null); refresh(); }}
            onForward={(msgId) => setForwardingMessageId(msgId)}
            onMuteToggle={handleMuteToggle}
            onDeleteChat={handleDeleteChat}
            onClearChat={handleClearChat}
          />
        ) : (
          <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            <PullToRefreshIndicator refreshing={refreshing} pullDistance={pullDistance} />
            <ConversationList onSelect={setActiveConversation} />
          </div>
        )}
      </div>

      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          onForward={handleForward}
          onClose={() => setForwardingMessageId(null)}
        />
      )}
    </AppLayout>
  );
};

export default MessagesPage;
