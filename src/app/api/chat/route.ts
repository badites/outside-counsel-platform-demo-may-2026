import Anthropic from "@anthropic-ai/sdk";
import { DIRECTORY_TOOLS, executeTool } from "@/server/ai-search";

const SYSTEM_PROMPT = `You are the AI assistant for SCG's Outside Counsel Directory — an internal tool used by the in-house legal team to find and evaluate law firms and individual lawyers.

Your role:
- Help users find the right firm or lawyer for their legal needs
- Interpret natural language queries and search the directory
- Present results clearly with key metrics (composite fit score, NPS, rankings, practice areas)
- When showing results, include the firm/lawyer ID so the user can click through to the detail page
- If the user describes an engagement type (e.g. "cross-border M&A in Thailand"), map it to the appropriate practice area and jurisdiction filters
- Proactively suggest related searches or deeper profiles when useful
- Be concise but informative — this is for busy lawyers

When presenting search results, format them as a clear ranked list with:
- Name and current firm (for lawyers)
- Composite fit score (0-100)
- NPS score if available
- Key practice areas
- Notable rankings (Chambers band, Legal 500 tier, etc.)

Always search the directory using the available tools before answering questions about firms or lawyers. Never make up information about specific firms or lawyers.`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured. Add it to your .env file." },
      { status: 500 }
    );
  }

  const { messages } = (await request.json()) as { messages: ChatMessage[] };

  if (!messages || messages.length === 0) {
    return Response.json({ error: "No messages provided" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  // Build Anthropic message format
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    // Agentic loop: keep calling Claude until it stops using tools
    let response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
      tools: DIRECTORY_TOOLS,
    });

    // Collect tool results and keep going
    const allMessages: Anthropic.MessageParam[] = [...anthropicMessages];

    while (response.stop_reason === "tool_use") {
      // Extract tool use blocks
      const toolUseBlocks = response.content.filter(
        (block) => block.type === "tool_use"
      );

      // Add assistant response with tool use
      allMessages.push({ role: "assistant", content: response.content });

      // Execute all tools and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        if (toolUse.type !== "tool_use") continue;
        const tu = toolUse as Anthropic.ToolUseBlock;
        const result = await executeTool(
          tu.name,
          tu.input as Record<string, unknown>
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: result,
        });
      }

      // Add tool results
      allMessages.push({ role: "user", content: toolResults });

      // Call Claude again with tool results
      response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: allMessages,
        tools: DIRECTORY_TOOLS,
      });
    }

    // Extract the final text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    const assistantMessage = textBlocks.map((b) => b.text).join("\n\n");

    return Response.json({ message: assistantMessage });
  } catch (err) {
    console.error("Chat API error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
