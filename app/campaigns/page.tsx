import { Sidebar } from "@/components/layout/Sidebar";
import { FileText } from "lucide-react";

export default function CampaignsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center text-center">
        <div className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="font-semibold text-lg">Select a campaign</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Choose a campaign from the sidebar or create a new one to get started.
          </p>
        </div>
      </main>
    </div>
  );
}
