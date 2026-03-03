import AppLayout from "@/components/AppLayout";
import FeedHeader from "@/components/FeedHeader";
import StoriesBar from "@/components/StoriesBar";
import PostCard from "@/components/PostCard";
import { mockPosts } from "@/data/mockData";

const Index = () => {
  return (
    <AppLayout>
      <FeedHeader />
      <StoriesBar />
      <div className="mx-auto max-w-lg">
        {mockPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </AppLayout>
  );
};

export default Index;
