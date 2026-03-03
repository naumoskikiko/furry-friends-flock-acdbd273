import AppLayout from "@/components/AppLayout";
import { Search } from "lucide-react";

const conversations = [
  { name: "Ana Petrova", last: "Charlie had a great walk today! 🐕", time: "2m", unread: 2, avatar: "AP", active: true },
  { name: "PetShop Plus", last: "Your order is ready for pickup!", time: "1h", unread: 1, avatar: "🏪", active: false },
  { name: "Stefan Nikolov", last: "I can take Bruno this Saturday", time: "3h", unread: 0, avatar: "SN", active: true },
  { name: "Happy Paws Vet", last: "Reminder: Luna's checkup tomorrow", time: "1d", unread: 0, avatar: "🏥", active: false },
  { name: "Elena Stojanova", last: "Thanks for the review! 💛", time: "2d", unread: 0, avatar: "ES", active: false },
];

const MessagesPage = () => {
  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        <div className="px-4 pt-4 pb-2">
          <h1 className="font-display text-2xl font-extrabold">Messages</h1>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search conversations..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div>
          {conversations.map((c) => (
            <button
              key={c.name}
              className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
            >
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-petkeep-orange-light font-display text-sm font-bold text-primary-foreground">
                  {c.avatar.length > 2 ? <span className="text-lg">{c.avatar}</span> : c.avatar}
                </div>
                {c.active && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-petkeep-green" />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground">{c.time}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.last}</p>
              </div>
              {c.unread > 0 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {c.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default MessagesPage;
