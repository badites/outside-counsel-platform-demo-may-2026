import { PageHeader } from "@/components/ui/PageHeader";
import { NewEngagementForm } from "@/components/engagements/NewEngagementForm";
import { listFirmsForSelect, listJurisdictions } from "@/server/reference-data";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function NewEngagementPage() {
  const [firms, jurisdictions, lawyers] = await Promise.all([
    listFirmsForSelect(),
    listJurisdictions(),
    prisma.lawyer.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New Engagement"
        breadcrumbs={[
          { label: "Engagements", href: "/engagements" },
          { label: "New" },
        ]}
      />

      <NewEngagementForm
        firms={firms}
        lawyers={lawyers}
        jurisdictions={jurisdictions.map((j) => ({ id: j.id, name: j.name }))}
      />
    </div>
  );
}
