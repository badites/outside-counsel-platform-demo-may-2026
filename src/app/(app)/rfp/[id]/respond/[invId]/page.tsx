import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { FirmResponseForm } from "./response-form";

export default async function RespondPage({
  params,
}: {
  params: Promise<{ id: string; invId: string }>;
}) {
  const { id, invId } = await params;

  const invitation = await prisma.rfpInvitation.findUnique({
    where: { id: invId },
    include: {
      firm: { select: { name: true } },
      rfp: {
        select: {
          title: true,
          requestFeeCap: true,
          requestSuggestedBudget: true,
          scopeDocument: true,
          pricingRequirements: true,
          additionalRequirements: true,
        },
      },
    },
  });

  if (!invitation || invitation.rfpId !== id) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Response: ${invitation.firm.name}`}
        description={`For RFP: ${invitation.rfp.title}`}
      />

      {invitation.rfp.scopeDocument && (
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Scope of Work
          </h3>
          <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
            {invitation.rfp.scopeDocument}
          </p>
        </section>
      )}

      <FirmResponseForm
        invitationId={invId}
        rfpId={id}
        requestFeeCap={invitation.rfp.requestFeeCap}
        requestSuggestedBudget={invitation.rfp.requestSuggestedBudget}
        pricingRequirements={invitation.rfp.pricingRequirements}
        additionalRequirements={invitation.rfp.additionalRequirements}
      />
    </div>
  );
}
