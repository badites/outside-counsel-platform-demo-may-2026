"use server";

import { revalidatePath } from "next/cache";
import { parseCsv } from "@/lib/csv";
import { prisma } from "@/server/db";

export type ImportResult = {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
};

/**
 * Import firm rankings from CSV.
 * Expected columns: firm_name, publisher, edition_year, practice_area, jurisdiction, band, tier, star_rating
 */
export async function importFirmRankingsCsv(
  _prev: ImportResult,
  formData: FormData
): Promise<ImportResult> {
  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, imported: 0, skipped: 0, errors: ["No file provided"] };
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length < 2) {
    return { success: false, imported: 0, skipped: 0, errors: ["CSV must have a header row and at least one data row"] };
  }

  const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const expectedHeaders = ["firm_name", "publisher", "edition_year", "practice_area", "jurisdiction"];
  const missing = expectedHeaders.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return { success: false, imported: 0, skipped: 0, errors: [`Missing required columns: ${missing.join(", ")}`] };
  }

  const colIdx = (name: string) => headers.indexOf(name);
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      const firmName = row[colIdx("firm_name")];
      const publisher = row[colIdx("publisher")]?.toUpperCase();
      const editionYear = parseInt(row[colIdx("edition_year")]);
      const paName = row[colIdx("practice_area")];
      const jurName = row[colIdx("jurisdiction")];
      const band = row[colIdx("band")] ? parseInt(row[colIdx("band")]) : null;
      const tier = row[colIdx("tier")] ? parseInt(row[colIdx("tier")]) : null;
      const starRating = row[colIdx("star_rating")] ? parseInt(row[colIdx("star_rating")]) : null;

      if (!firmName || !publisher || !editionYear || !paName || !jurName) {
        errors.push(`Row ${rowNum}: Missing required fields`);
        skipped++;
        continue;
      }

      // Look up firm
      const firm = await prisma.firm.findFirst({
        where: {
          OR: [
            { name: { contains: firmName } },
            { shortName: { contains: firmName } },
          ],
          deletedAt: null,
        },
      });
      if (!firm) {
        errors.push(`Row ${rowNum}: Firm "${firmName}" not found`);
        skipped++;
        continue;
      }

      // Look up or create ranking source
      const sourceSlug = `${publisher.toLowerCase()}-${editionYear}`;
      let source = await prisma.rankingSource.findFirst({
        where: { publisher: publisher as "CHAMBERS" | "LEGAL500" | "BENCHMARK_LITIGATION" | "ASIALAW", editionYear },
      });
      if (!source) {
        const validPublishers = ["CHAMBERS", "LEGAL500", "BENCHMARK_LITIGATION", "ASIALAW"];
        if (!validPublishers.includes(publisher)) {
          errors.push(`Row ${rowNum}: Invalid publisher "${publisher}"`);
          skipped++;
          continue;
        }
        source = await prisma.rankingSource.create({
          data: {
            name: `${publisher} ${editionYear}`,
            slug: sourceSlug,
            publisher: publisher as "CHAMBERS" | "LEGAL500" | "BENCHMARK_LITIGATION" | "ASIALAW",
            editionYear,
          },
        });
      }

      // Look up practice area
      const pa = await prisma.practiceArea.findFirst({
        where: {
          OR: [
            { name: { contains: paName } },
            { slug: { contains: paName.toLowerCase().replace(/\s+/g, "-") } },
          ],
        },
      });
      if (!pa) {
        errors.push(`Row ${rowNum}: Practice area "${paName}" not found`);
        skipped++;
        continue;
      }

      // Look up jurisdiction
      const jur = await prisma.jurisdiction.findFirst({
        where: { name: { contains: jurName } },
      });
      if (!jur) {
        errors.push(`Row ${rowNum}: Jurisdiction "${jurName}" not found`);
        skipped++;
        continue;
      }

      // Upsert the ranking
      await prisma.firmRanking.upsert({
        where: {
          firmId_rankingSourceId_practiceAreaId_jurisdictionId: {
            firmId: firm.id,
            rankingSourceId: source.id,
            practiceAreaId: pa.id,
            jurisdictionId: jur.id,
          },
        },
        update: { band, tier, starRating },
        create: {
          firmId: firm.id,
          rankingSourceId: source.id,
          practiceAreaId: pa.id,
          jurisdictionId: jur.id,
          band,
          tier,
          starRating,
        },
      });

      imported++;
    } catch (err) {
      errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : "Unknown error"}`);
      skipped++;
    }
  }

  revalidatePath("/rankings");
  revalidatePath("/admin/rankings");

  return {
    success: errors.length === 0,
    imported,
    skipped,
    errors: errors.slice(0, 20), // Cap error list
  };
}
