"use client";

import { useState, useCallback } from "react";
import { Send, Check, X, Loader2, AlertTriangle, Pencil } from "lucide-react";

type NoteProposal = {
  firmId: string;
  firmName: string;
  currentNotes: string | null;
  proposedNotes: string;
};

type ProposalState = {
  proposals: NoteProposal[];
  unmatched: string[];
};

export function AiNotesAssistant() {
  const [instruction, setInstruction] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [proposals, setProposals] = useState<ProposalState | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const handleProcess = useCallback(async () => {
    if (!instruction.trim()) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setProposals(null);
    setDismissed(new Set());

    try {
      const res = await fetch("/api/ai-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: instruction.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      if (data.proposals.length === 0) {
        setError(
          data.unmatched?.length > 0
            ? `Could not find firms matching: ${data.unmatched.join(", ")}. Check the spelling or try the full firm name.`
            : "No matching firms found. Try being more specific."
        );
        return;
      }

      setProposals(data);
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsProcessing(false);
    }
  }, [instruction]);

  const handleApply = useCallback(async () => {
    if (!proposals) return;

    const activeProposals = proposals.proposals.filter(
      (_, i) => !dismissed.has(i)
    );
    if (activeProposals.length === 0) return;

    setIsApplying(true);
    setError(null);

    try {
      const res = await fetch("/api/ai-notes/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: activeProposals.map((p) => ({
            firmId: p.firmId,
            notes: p.proposedNotes,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to apply notes");
        return;
      }

      setSuccess(
        `Updated AI notes for ${data.count} firm${data.count > 1 ? "s" : ""}: ${data.firms.join(", ")}`
      );
      setProposals(null);
      setInstruction("");
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsApplying(false);
    }
  }, [proposals, dismissed]);

  const handleEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditText(proposals!.proposals[idx].proposedNotes);
  };

  const handleSaveEdit = (idx: number) => {
    if (!proposals) return;
    const updated = [...proposals.proposals];
    updated[idx] = { ...updated[idx], proposedNotes: editText };
    setProposals({ ...proposals, proposals: updated });
    setEditingIdx(null);
  };

  const handleDismiss = (idx: number) => {
    setDismissed((prev) => new Set([...prev, idx]));
  };

  const activeCount = proposals
    ? proposals.proposals.filter((_, i) => !dismissed.has(i)).length
    : 0;

  return (
    <div className="space-y-4">
      {/* Input area */}
      <div className="flex gap-2">
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleProcess();
            }
          }}
          rows={2}
          disabled={isProcessing}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500 disabled:opacity-50"
          placeholder='e.g. "Picazo and SyCip are corporate secretary firms only — never recommend for M&A or litigation"'
        />
        <button
          onClick={handleProcess}
          disabled={isProcessing || !instruction.trim()}
          className="self-end rounded-md bg-scg-600 px-4 py-2 text-sm font-medium text-white hover:bg-scg-700 disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
          <Check size={16} className="mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={14} className="animate-spin" />
          Analyzing your instruction and matching firms...
        </div>
      )}

      {/* Proposals */}
      {proposals && proposals.proposals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Proposed changes ({activeCount} firm{activeCount !== 1 ? "s" : ""})
            </h4>
            {activeCount > 0 && (
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="flex items-center gap-1.5 rounded-md bg-scg-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-scg-700 disabled:opacity-50"
              >
                {isApplying ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Apply {activeCount > 1 ? "All" : ""}
              </button>
            )}
          </div>

          {proposals.proposals.map((p, i) => {
            if (dismissed.has(i)) return null;

            return (
              <div
                key={p.firmId}
                className="rounded-md border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h5 className="text-sm font-semibold text-gray-900">
                    {p.firmName}
                  </h5>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(i)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDismiss(i)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {p.currentNotes && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-gray-400">
                      Current:
                    </span>
                    <p className="text-xs text-gray-500 line-through">
                      {p.currentNotes}
                    </p>
                  </div>
                )}

                <div className="mt-2">
                  <span className="text-xs font-medium text-amber-600">
                    {p.currentNotes ? "Updated:" : "New:"}
                  </span>
                  {editingIdx === i ? (
                    <div className="mt-1 flex gap-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-scg-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveEdit(i)}
                        className="self-end rounded bg-scg-600 px-3 py-1 text-xs text-white hover:bg-scg-700"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-800">{p.proposedNotes}</p>
                  )}
                </div>
              </div>
            );
          })}

          {proposals.unmatched && proposals.unmatched.length > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-700">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                Could not match: {proposals.unmatched.join(", ")}. Check spelling
                or try the full firm name.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
