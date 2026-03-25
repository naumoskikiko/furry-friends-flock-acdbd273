import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ConversationList from "@/components/messages/ConversationList";
import ChatView from "@/components/messages/ChatView";
import ForwardModal from "@/components/messages/ForwardModal";
import { type Conversation, type Message, useChatMessages, useConversations } from "@/hooks/useMessages";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const MessagesPage = () => {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [forwardingMessageId, setForwardingMessageId] = useState<string | null>(null);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const { messages, forwardMessage } = useChatMessages(activeConversation?.id || null);

  // Handle deep-link to a specific conversation
  useEffect(() => {
    const convId = searchParams.get("conversation");
    const userId = searchParams.get("userId");
    if (convId && userId && !activeConversation) {
      // Build a minimal conversation object and open it
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
          // Clear the search params
          setSearchParams({}, { replace: true });
        }
      };
      loadConversation();
    }
  }, [searchParams]);

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

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg h-[calc(100dvh-4rem)] flex flex-col overflow-hidden">
        {activeConversation ? (
          <ChatView
            conversation={activeConversation}
            onBack={() => setActiveConversation(null)}
            onForward={(msgId) => setForwardingMessageId(msgId)}
          />
        ) : (
          <ConversationList onSelect={setActiveConversation} />
        )}
      </div>

      {/* Forward modal */}
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
