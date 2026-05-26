"use client";

import { useState, useRef, useEffect } from "react";
import {
  BarChart3,
  RefreshCw,
  Loader2,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AiGeneratedBadge } from "@/components/shared/AiGeneratedBadge";
import { MarkdownReport } from "@/components/shared/MarkdownReport";

interface ComparisonSectionProps {
  rfpId: string;
  initialReport: string | null;
  generatedAt: string | null;
  hasSubmittedResponses: boolean;
}

type CoachMessage = {
  role: "user" | "assistant";
  content: string;
};

export function ComparisonSection({
  rfpId,
  initialReport,
  generatedAt,
  hasSubmittedResponses,
}: ComparisonSectionProps) {
  const [report, setReport] = useState(initialReport);
  const [reportDate, setReportDate] = useState(generatedAt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Coach state
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const [coachInput, setCoachInput] = useState("");
  const [isCoaching, setIsCoaching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [coachMessages]);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/rfp/${rfpId}/comparison`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to generate report");
        return;
      }

      const data = await res.json();
      setReport(data.content);
      setReportDate(new Date().toISOString());
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCoachSend() {
    if (!coachInput.trim() || !report) return;

    const userMsg = coachInput.trim();
    setCoachInput("");
    setCoachMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsCoaching(true);

    try {
      const res = await fetch(`/api/rfp/${rfpId}/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMsg,
          currentReport: report,
          conversationHistory: coachMessages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCoachMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error ?? "Something went wrong"}` },
        ]);
        return;
      }

      setCoachMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);

      // If the AI produced an updated report, apply it
      if (data.updatedReport) {
        setReport(data.updatedReport);
        setReportDate(new Date().toISOString());
      }
    } catch {
      setCoachMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error — please try again." },
      ]);
    } finally {
      setIsCoaching(false);
    }
  }

  if (!hasSubmittedResponses && !report) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
        <BarChart3 size={24} className="mx-auto text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">
          AI comparison report will be available once firms submit their proposals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Report section */}
      <div className="rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700">
              AI Comparison Report
            </h2>
            {report && <AiGeneratedBadge />}
          </div>
          <div className="flex items-center gap-2">
            {reportDate && (
              <span className="text-xs text-gray-400">
                {new Date(reportDate).toLocaleDateString()}{" "}
                {new Date(reportDate).toLocaleTimeString()}
              </span>
            )}
            {hasSubmittedResponses && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 rounded-md bg-scg-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-scg-700 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw size={12} />
                    {report ? "Regenerate" : "Generate Report"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {report ? (
          <div className="mt-4 max-w-none">
            <MarkdownReport content={report} />
          </div>
        ) : (
          !isGenerating && (
            <p className="mt-4 text-sm text-gray-400">
              Click &quot;Generate Report&quot; to create an AI-powered comparative analysis.
            </p>
          )
        )}
      </div>

      {/* AI Coach */}
      {report && (
        <div className="rounded-lg border border-gray-200">
          <button
            onClick={() => setCoachOpen(!coachOpen)}
            className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-scg-600" />
              <span className="text-sm font-semibold text-gray-700">
                Analysis Coach
              </span>
              <span className="text-xs text-gray-400">
                Ask questions, adjust weights, deep-dive on specific firms
              </span>
            </div>
            {coachOpen ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </button>

          {coachOpen && (
            <div className="border-t border-gray-200 px-5 py-4">
              {/* Messages */}
              {coachMessages.length > 0 && (
                <div className="mb-4 max-h-80 space-y-3 overflow-y-auto">
                  {coachMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "ml-8 bg-scg-50 text-gray-900"
                          : "mr-8 bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span className="mb-1 block text-[10px] font-medium uppercase text-gray-400">
                        {msg.role === "user" ? "You" : "AI Coach"}
                      </span>
                      {msg.role === "assistant" ? (
                        <MarkdownReport content={msg.content} />
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </div>
                  ))}
                  {isCoaching && (
                    <div className="mr-8 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
                      <Loader2 size={14} className="animate-spin" />
                      Analyzing...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Suggestion chips */}
              {coachMessages.length === 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {[
                    "Which scope items are missing or only implicitly covered?",
                    "What if we weight cost more heavily?",
                    "Compare staffing plans side by side",
                    "What are the risk flags for each firm?",
                    "Which firm offers the best value for money?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setCoachInput(suggestion);
                      }}
                      className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-scg-300 hover:text-scg-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={coachInput}
                  onChange={(e) => setCoachInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleCoachSend();
                    }
                  }}
                  disabled={isCoaching}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500 disabled:opacity-50"
                  placeholder="Ask about the proposals, request adjustments to the analysis..."
                />
                <button
                  onClick={handleCoachSend}
                  disabled={isCoaching || !coachInput.trim()}
                  className="rounded-md bg-scg-600 px-4 py-2 text-white hover:bg-scg-700 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
