import { hasServerApiKey } from "@/server/ai/anthropic";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ hasServerKey: hasServerApiKey() });
}
