import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import ConversationList from "@/components/messages/ConversationList";
import ChatView from "@/components/messages/ChatView";
import { type Conversation } from "@/hooks/useMessages";

const MessagesPage = () => {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg h-[calc(100vh-4rem)]">
        {activeConversation ? (
          <ChatView
            conversation={activeConversation}
            onBack={() => setActiveConversation(null)}
          />
        ) : (
          <ConversationList onSelect={setActiveConversation} />
        )}
      </div>
    </AppLayout>
  );
};

export default MessagesPage;
