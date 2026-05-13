"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Send, Bot, User, Loader2, Sparkles, X, MessageSquare } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

function parseResultLinks(text: string): React.ReactNode[] {
  // Parse markdown-style links: [text](/path) and bold **text**
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for markdown links
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch && linkMatch.index !== undefined) {
      // Add text before the link
      if (linkMatch.index > 0) {
        parts.push(
          <span key={key++}>{remaining.slice(0, linkMatch.index)}</span>
        );
      }
      // Add the link
      parts.push(
        <Link
          key={key++}
          href={linkMatch[2]}
          className="font-medium text-teal-700 underline hover:text-teal-900"
        >
          {linkMatch[1]}
        </Link>
      );
      remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }

  return parts;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-teal-600" : "bg-amber-100"
        }`}
      >
        {isUser ? (
          <User size={14} className="text-white" />
        ) : (
          <Bot size={14} className="text-amber-700" />
        )}
      </div>
      <div
        className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-teal-600 text-white"
            : "border border-gray-200 bg-white text-gray-800"
        }`}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="space-y-2">
            {message.content.split("\n").map((line, i) => {
              if (!line.trim()) return <div key={i} className="h-1" />;
              // Bold headers
              const boldMatch = line.match(/^\*\*(.+)\*\*$/);
              if (boldMatch) {
                return (
                  <p key={i} className="font-semibold text-gray-900">
                    {boldMatch[1]}
                  </p>
                );
              }
              // List items
              if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
                return (
                  <p key={i} className="pl-3 text-gray-700">
                    {parseResultLinks(line)}
                  </p>
                );
              }
              // Numbered items
              if (/^\d+\./.test(line.trim())) {
                return (
                  <p key={i} className="text-gray-700">
                    {parseResultLinks(line)}
                  </p>
                );
              }
              return (
                <p key={i} className="text-gray-700">
                  {parseResultLinks(line)}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function AiSearchChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Build full conversation history for the API
      const chatHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setError("Failed to connect. Check your network and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg border border-teal-200 bg-gradient-to-r from-teal-50 to-amber-50/30 px-4 py-3 text-left transition-all hover:border-teal-300 hover:shadow-md"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600">
          <Sparkles size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            AI-Assisted Search
          </p>
          <p className="text-xs text-gray-500">
            Describe your legal needs in plain language and get personalized
            recommendations
          </p>
        </div>
        <MessageSquare size={18} className="text-teal-500" />
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-teal-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              AI Counsel Finder
            </h3>
            <p className="text-[10px] text-gray-400">
              Powered by Claude
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="h-[400px] overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot size={32} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              How can I help you find counsel?
            </p>
            <p className="mt-1 text-xs text-gray-400">Try something like:</p>
            <div className="mt-3 space-y-2">
              {[
                "Find me a litigation firm in Thailand with strong Chambers rankings",
                "Who are the top M&A lawyers we've worked with?",
                "I need a cost-effective boutique firm for an IP dispute in Singapore",
                "Compare Baker McKenzie and Linklaters for banking work",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="block w-full rounded-md border border-gray-200 px-3 py-2 text-left text-xs text-gray-600 hover:border-teal-300 hover:bg-teal-50/50"
                >
                  &ldquo;{suggestion}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Bot size={14} className="text-amber-700" />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-500">
                <Loader2 size={14} className="animate-spin" />
                Searching the directory...
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your legal needs..."
            rows={1}
            className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            style={{
              minHeight: "38px",
              maxHeight: "100px",
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
