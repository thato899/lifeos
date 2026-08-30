import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityPanel } from "@/components/app/activity-panel";
import { ToolInspector } from "@/components/app/tool-inspector";

export default function ActivityPage() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-muted-foreground text-sm">
          Everything LifeOS has done — whether you clicked it or an agent called
          it through WebMCP.
        </p>
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed">Activity feed</TabsTrigger>
          <TabsTrigger value="tools">WebMCP tool inspector</TabsTrigger>
        </TabsList>
        <TabsContent value="feed" className="mt-4">
          <Card className="h-[32rem] p-0">
            <ActivityPanel />
          </Card>
        </TabsContent>
        <TabsContent value="tools" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Registered tools</CardTitle>
            </CardHeader>
            <CardContent>
              <ToolInspector />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
