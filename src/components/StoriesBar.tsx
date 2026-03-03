const stories = [
  { name: "Your Story", avatar: "YS", hasNew: false, isOwn: true },
  { name: "Charlie", avatar: "🐕", hasNew: true },
  { name: "Mika", avatar: "🐱", hasNew: true },
  { name: "Luna", avatar: "🐺", hasNew: true },
  { name: "Bruno", avatar: "🐶", hasNew: false },
  { name: "PetShop+", avatar: "🏪", hasNew: true },
  { name: "VetCare", avatar: "🏥", hasNew: false },
];

const StoriesBar = () => {
  return (
    <div className="border-b border-border bg-card px-4 py-3">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {stories.map((story, i) => (
          <button key={i} className="flex flex-col items-center gap-1">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full text-xl ${
                story.hasNew
                  ? "bg-gradient-to-br from-primary via-petkeep-orange-light to-accent p-[2px]"
                  : "bg-secondary p-[2px]"
              }`}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-card text-lg">
                {story.isOwn ? (
                  <span className="text-2xl text-muted-foreground">+</span>
                ) : (
                  story.avatar
                )}
              </div>
            </div>
            <span className="w-16 truncate text-center text-[10px] font-medium">
              {story.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StoriesBar;
