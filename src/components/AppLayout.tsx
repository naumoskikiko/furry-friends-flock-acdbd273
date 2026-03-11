import { ReactNode, forwardRef } from "react";
import BottomNav from "./BottomNav";

const AppLayout = forwardRef<HTMLDivElement, { children: ReactNode }>(({ children }, ref) => {
  return (
    <div ref={ref} className="min-h-screen bg-background">
      <main className="pb-20">{children}</main>
      <BottomNav />
    </div>
  );
});

AppLayout.displayName = "AppLayout";

export default AppLayout;
