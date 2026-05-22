"use client";

import { ReviewAndSendStep } from "@/components/rfp/steps/ReviewAndSendStep";

type Props = {
  params: Record<string, string | string[] | undefined>;
  draftId?: string;
  firmNameMap?: Record<string, string>;
  manualFirmNames?: string[];
};

function str(val: string | string[] | undefined): string {
  return typeof val === "string" ? val : "";
}

export function ReviewAndSendClient({ params, firmNameMap = {}, manualFirmNames = [] }: Props) {
  const firmIds = str(params.firmIds).split(",").filter(Boolean);
  const allFirmNames = [
    ...firmIds.map((id) => firmNameMap[id] ?? id),
    ...manualFirmNames,
  ];

  const data = {
    costCenterCode: str(params.costCenterCode) || "—",
    costCenterName: str(params.costCenterName) || "—",
    contactPersons: str(params.contactPersons) || "[]",
    jurisdictionName: str(params.jurisdictionName) || str(params.jurisdictionId) || "—",
    practiceAreaName: str(params.practiceAreaName) || str(params.practiceAreaId) || "—",
    complexityTier: str(params.complexityTier) || "STANDARD",
    urgency: str(params.urgency) || "ROUTINE",
    title: str(params.title) || "Untitled RFP",
    matterNumber: str(params.matterNumber) || undefined,
    scopeDocument: str(params.scopeDocument) || undefined,
    deadline: str(params.deadline) || undefined,
    firmCount: firmIds.length + manualFirmNames.length,
    firmNames: allFirmNames,
    requestFeeCap: params.requestFeeCap !== "false",
    requestSuggestedBudget: params.requestSuggestedBudget !== "false",
    additionalRequirements: str(params.additionalRequirements) || undefined,
  };

  async function handleSend() {
    const practiceAreaId = str(params.practiceAreaId);
    const jurisdictionId = str(params.jurisdictionId);
    const costCenterId = str(params.costCenterId);

    if (!practiceAreaId || practiceAreaId === "__other__") {
      throw new Error("Practice area is required. Please go back and select one.");
    }
    if (!jurisdictionId || jurisdictionId === "__other__") {
      throw new Error("Jurisdiction is required. Please go back and select one.");
    }

    const body = {
      title: data.title,
      practiceAreaId,
      jurisdictionId,
      costCenterId: costCenterId || undefined,
      contactPersons: data.contactPersons,
      matterNumber: data.matterNumber,
      complexityTier: data.complexityTier,
      urgency: data.urgency,
      scopeDocument: data.scopeDocument,
      pricingRequirements: str(params.pricingRequirements) || undefined,
      evaluationCriteria: str(params.evaluationCriteria) || undefined,
      deadline: data.deadline,
      requestFeeCap: data.requestFeeCap,
      requestSuggestedBudget: data.requestSuggestedBudget,
      additionalRequirements: data.additionalRequirements,
      firmIds,
    };

    const res = await fetch("/api/rfp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? "Failed to create RFP. Please check all fields and try again.");
    }
  }

  return <ReviewAndSendStep data={data} onSend={handleSend} />;
}
