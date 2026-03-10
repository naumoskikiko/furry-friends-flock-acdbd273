import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import ConversationList from "@/components/messages/ConversationList";
import ChatView from "@/components/messages/ChatView";
import ForwardModal from "@/components/messages/ForwardModal";
import { type Conversation, type Message, useChatMessages } from "@/hooks/useMessages";
import { useToast } from "@/hooks/use-toast";

const MessagesPage = () => {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [forwardingMessageId, setForwardingMessageId] = useState<string | null>(null);
  const { toast } = useToast();

  const { messages, forwardMessage } = useChatMessages(activeConversation?.id || null);

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
      <div className="mx-auto max-w-lg h-[calc(100vh-4rem)]">
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
