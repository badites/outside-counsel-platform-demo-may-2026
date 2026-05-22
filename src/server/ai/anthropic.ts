import Anthropic from "@anthropic-ai/sdk";

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

export const anthropic =
  globalForAnthropic.anthropic ?? new Anthropic();

if (process.env.NODE_ENV !== "production") {
  globalForAnthropic.anthropic = anthropic;
}

export const DEFAULT_MODEL = "claude-sonnet-4-6";

export function hasServerApiKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function getClient(requestApiKey?: string): Anthropic {
  if (requestApiKey) {
    return new Anthropic({ apiKey: requestApiKey });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic;
  }
  throw new Error("No Anthropic API key configured. Set ANTHROPIC_API_KEY or provide your own key in Settings.");
}

export function resolveApiKey(request: Request): string | undefined {
  return request.headers.get("x-anthropic-key") ?? undefined;
}

export type ClaudeRequest = {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  apiKey?: string;
};

export type ClaudeResponse = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
};

export async function callClaude(
  request: ClaudeRequest
): Promise<ClaudeResponse> {
  const client = getClient(request.apiKey);
  const model = request.model ?? DEFAULT_MODEL;

  const message = await client.messages.create({
    model,
    max_tokens: request.maxTokens ?? 8192,
    temperature: request.temperature ?? 0.3,
    system: request.systemPrompt,
    messages: [{ role: "user", content: request.userMessage }],
  });

  const textBlocks = message.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  const content = textBlocks.map((b) => b.text).join("\n\n");

  return {
    content,
    model: message.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    stopReason: message.stop_reason,
  };
}

export async function streamClaude(
  request: ClaudeRequest,
  onText: (chunk: string) => void
): Promise<ClaudeResponse> {
  const client = getClient(request.apiKey);
  const model = request.model ?? DEFAULT_MODEL;

  const stream = client.messages.stream({
    model,
    max_tokens: request.maxTokens ?? 8192,
    temperature: request.temperature ?? 0.3,
    system: request.systemPrompt,
    messages: [{ role: "user", content: request.userMessage }],
  });

  let content = "";

  stream.on("text", (text) => {
    content += text;
    onText(text);
  });

  const finalMessage = await stream.finalMessage();

  return {
    content,
    model: finalMessage.model,
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
    stopReason: finalMessage.stop_reason,
  };
}
