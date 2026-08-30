// Ambient types for the WebMCP Imperative API. Not yet part of TypeScript's
// built-in DOM lib (the API itself is experimental — see docs/webmcp.md for
// the exact Chrome version / flag required). Modeled directly on the
// ModelContextTool / ToolAnnotations dictionaries in the spec's index.bs
// (webmachinelearning/webmcp), not guessed.
export {};

interface ModelContextToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

interface ModelContextToolExecuteContext {
  signal: AbortSignal;
}

interface ModelContextTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: object;
  execute: (
    input: unknown,
    context: ModelContextToolExecuteContext,
  ) => unknown | Promise<unknown>;
  annotations?: ModelContextToolAnnotations;
}

interface ModelContextRegisterToolOptions {
  signal?: AbortSignal;
  exposedTo?: string[];
}

interface ModelContext {
  registerTool(
    tool: ModelContextTool,
    options?: ModelContextRegisterToolOptions,
  ): Promise<undefined>;
}

declare global {
  interface Document {
    readonly modelContext?: ModelContext;
  }
}
