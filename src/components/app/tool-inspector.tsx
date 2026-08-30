"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelativeTime } from "@/lib/format";
import { onToolCall } from "@/components/webmcp/webmcp-events";

interface ToolMeta {
  name: string;
  title: string;
  description: string;
  riskLevel: "read" | "low_write" | "high_write";
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
}

const RISK_LABEL: Record<ToolMeta["riskLevel"], string> = {
  read: "Read",
  low_write: "Write",
  high_write: "Needs approval",
};
const RISK_VARIANT: Record<
  ToolMeta["riskLevel"],
  "secondary" | "outline" | "destructive"
> = {
  read: "secondary",
  low_write: "outline",
  high_write: "destructive",
};

/**
 * The WebMCP tool inspector (spec section 32) — every registered tool, its
 * description and risk classification, and when it was last called in this
 * session. Reads directly from the live registry endpoint the browser
 * itself just registered from, so this can never drift from what's
 * actually exposed to an agent.
 */
export function ToolInspector() {
  const [tools, setTools] = useState<ToolMeta[]>([]);
  const [lastRun, setLastRun] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/mcp/tools")
      .then((r) => r.json())
      .then((data) => setTools(data.tools ?? []));

    const unsubscribe = onToolCall((event) => {
      setLastRun((prev) => ({ ...prev, [event.toolName]: event.timestamp }));
    });
    return unsubscribe;
  }, []);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table className="table-fixed">
        <colgroup>
          <col className="w-40" />
          <col />
          <col className="w-32" />
          <col className="w-24" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Tool</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Last run</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tools.map((tool) => (
            <TableRow key={tool.name}>
              <TableCell className="font-mono text-xs break-all">
                {tool.name}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs break-words whitespace-normal">
                {tool.description}
              </TableCell>
              <TableCell>
                <Badge
                  variant={RISK_VARIANT[tool.riskLevel]}
                  className="whitespace-nowrap"
                >
                  {RISK_LABEL[tool.riskLevel]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                {lastRun[tool.name]
                  ? formatRelativeTime(new Date(lastRun[tool.name]))
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
