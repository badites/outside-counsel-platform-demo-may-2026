/**
 * Creates seed users + demo engagement / rating / note data
 * against the already-imported 66-firm / 406-lawyer dataset.
 * Run with: npx tsx prisma/seed-users.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Seeding users + demo data                      ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── Users ────────────────────────────────────────────────────────────────
  const sarah = await prisma.user.upsert({
    where: { email: "sarah.scales@scg.com" },
    update: {},
    create: { email: "sarah.scales@scg.com", name: "Sarah Scales", role: "LAWYER" },
  });
  const james = await prisma.user.upsert({
    where: { email: "james.chen@scg.com" },
    update: {},
    create: { email: "james.chen@scg.com", name: "James Chen", role: "LAWYER" },
  });
  await prisma.user.upsert({
    where: { email: "admin@scg.com" },
    update: {},
    create: { email: "admin@scg.com", name: "Admin User", role: "ADMIN" },
  });
  console.log("✅ Users: 3");

  // ── User Preferences ─────────────────────────────────────────────────────
  await prisma.userPreference.upsert({
    where: { userId: sarah.id },
    update: {},
    create: {
      userId: sarah.id,
      weightResponsiveness: 1.2,
      weightQuality: 1.5,
      weightCommercialAwareness: 1.0,
      weightValue: 0.8,
      weightSubjectMatterExpertise: 1.3,
      weightNps: 1.4,
    },
  });
  await prisma.userPreference.upsert({
    where: { userId: james.id },
    update: {},
    create: {
      userId: james.id,
      weightResponsiveness: 1.0,
      weightQuality: 1.0,
      weightCommercialAwareness: 1.2,
      weightValue: 1.5,
      weightSubjectMatterExpertise: 1.0,
      weightNps: 1.3,
    },
  });
  console.log("✅ User Preferences: 2");

  // ── Helper lookups ────────────────────────────────────────────────────────
  async function firm(name: string) {
    const f = await prisma.firm.findFirst({ where: { name: { contains: name } } });
    if (!f) throw new Error(`Firm not found: ${name}`);
    return f;
  }
  async function lawyer(name: string) {
    const l = await prisma.lawyer.findFirst({ where: { name: { contains: name } } });
    if (!l) throw new Error(`Lawyer not found: ${name}`);
    return l;
  }
  async function pa(slug: string) {
    const p = await prisma.practiceArea.findFirst({ where: { slug: { contains: slug } } });
    if (!p) throw new Error(`Practice area not found: ${slug}`);
    return p;
  }
  async function jur(name: string) {
    const j = await prisma.jurisdiction.findFirst({ where: { name: { contains: name } } });
    if (!j) throw new Error(`Jurisdiction not found: ${name}`);
    return j;
  }

  const thailand = await jur("Thailand");
  const singapore = await jur("Singapore");
  const paCorporate = await pa("corporate");
  const paDispute = await pa("dispute");
  const paBanking = await pa("banking");
  const paIP = await pa("ip");
  const paEnergy = await pa("energy");

  // ── Engagements ──────────────────────────────────────────────────────────
  const baker = await firm("Baker McKenzie");
  const aAndO = await firm("A&O Shearman");
  const linklaters = await firm("Linklaters");
  const tAndG = await firm("Tilleke & Gibbins");
  const wcp = await firm("Weerawong");
  const rajah = await firm("Rajah & Tann Singapore");
  const chandler = await firm("Chandler MHM");
  const kudun = await firm("Kudun");
  const nrf = await firm("Norton Rose Fulbright");

  const engagements = [
    { firm: baker, matter: "SCG Packaging Acquisition", type: "TRANSACTIONAL" as const, jur: thailand, entity: "SCG Packaging", start: "2023-03-01", end: "2023-09-15", outcome: "COMPLETED" as const, fees: 4500000 },
    { firm: aAndO, matter: "Green Bond Issuance", type: "TRANSACTIONAL" as const, jur: thailand, entity: "SCG", start: "2024-06-01", end: "2024-12-20", outcome: "COMPLETED" as const, fees: 3500000 },
    { firm: linklaters, matter: "Project Finance — Solar Farm", type: "TRANSACTIONAL" as const, jur: thailand, entity: "SCG Cleanergy", start: "2024-09-01", end: null, outcome: "ONGOING" as const, fees: 2800000 },
    { firm: tAndG, matter: "Trademark Portfolio Review", type: "IP" as const, jur: thailand, entity: "SCG", start: "2024-04-01", end: "2024-08-15", outcome: "COMPLETED" as const, fees: 850000 },
    { firm: wcp, matter: "JV Agreement — Vietnam Cement", type: "TRANSACTIONAL" as const, jur: thailand, entity: "SCG", start: "2023-11-01", end: "2024-04-30", outcome: "COMPLETED" as const, fees: 2200000 },
    { firm: rajah, matter: "Singapore Arbitration — Supply Dispute", type: "LITIGATION" as const, jur: singapore, entity: "SCG Trading", start: "2023-06-01", end: "2024-12-15", outcome: "WON" as const, fees: 5500000 },
    { firm: chandler, matter: "Power Purchase Agreement", type: "TRANSACTIONAL" as const, jur: thailand, entity: "SCG Cleanergy", start: "2024-01-15", end: "2024-06-30", outcome: "COMPLETED" as const, fees: 1200000 },
    { firm: kudun, matter: "Real Estate Acquisition Advisory", type: "TRANSACTIONAL" as const, jur: thailand, entity: "SCG", start: "2025-01-15", end: null, outcome: "ONGOING" as const, fees: 1500000 },
    { firm: nrf, matter: "Power Plant Regulatory Compliance", type: "REGULATORY" as const, jur: thailand, entity: "SCG Cleanergy", start: "2024-02-01", end: "2024-07-30", outcome: "COMPLETED" as const, fees: 950000 },
    { firm: baker, matter: "Employment Restructuring Advisory", type: "ADVISORY" as const, jur: thailand, entity: "SCG Chemicals", start: "2024-01-15", end: "2024-06-30", outcome: "COMPLETED" as const, fees: 1200000 },
  ];

  for (const e of engagements) {
    await prisma.engagement.create({
      data: {
        firmId: e.firm.id,
        matterName: e.matter,
        matterType: e.type,
        jurisdictionId: e.jur.id,
        entityName: e.entity,
        startDate: new Date(e.start),
        endDate: e.end ? new Date(e.end) : null,
        outcome: e.outcome,
        totalFeesUsd: e.fees,
        createdById: sarah.id,
      },
    });
  }
  console.log(`✅ Engagements: ${engagements.length}`);

  // ── Internal Ratings ──────────────────────────────────────────────────────
  const ratings = [
    { firm: baker, user: sarah.id, r: 5, q: 5, c: 4, v: 3, s: 5, comment: "Outstanding quality but expensive" },
    { firm: baker, user: james.id, r: 4, q: 5, c: 4, v: 3, s: 5, comment: null },
    { firm: aAndO, user: sarah.id, r: 4, q: 5, c: 5, v: 3, s: 5, comment: "Top-tier banking expertise" },
    { firm: tAndG, user: sarah.id, r: 5, q: 5, c: 4, v: 4, s: 5, comment: "Best IP team in Thailand" },
    { firm: wcp, user: sarah.id, r: 4, q: 4, c: 4, v: 4, s: 4, comment: null },
    { firm: kudun, user: sarah.id, r: 5, q: 4, c: 4, v: 5, s: 4, comment: "Great value boutique" },
    { firm: kudun, user: james.id, r: 5, q: 4, c: 3, v: 5, s: 4, comment: null },
    { firm: rajah, user: james.id, r: 5, q: 5, c: 5, v: 4, s: 5, comment: "Outstanding litigation team in Singapore" },
  ];

  for (const rd of ratings) {
    const overall = (rd.r + rd.q + rd.c + rd.v + rd.s) / 5;
    await prisma.internalRating.create({
      data: {
        targetType: "FIRM",
        firmId: rd.firm.id,
        ratedById: rd.user,
        responsiveness: rd.r,
        quality: rd.q,
        commercialAwareness: rd.c,
        value: rd.v,
        subjectMatterExpertise: rd.s,
        overallScore: overall,
        comment: rd.comment,
      },
    });
  }
  console.log(`✅ Internal Ratings: ${ratings.length}`);

  // ── NPS Recommendations ───────────────────────────────────────────────────
  const npsEntries = [
    { firm: baker, user: sarah.id, nps: 9, pa: paCorporate, reason: "Excellent responsiveness and deep market knowledge" },
    { firm: baker, user: james.id, nps: 8, pa: paCorporate, reason: "Strong team but premium pricing" },
    { firm: aAndO, user: sarah.id, nps: 9, pa: paBanking, reason: "Top-tier banking expertise" },
    { firm: linklaters, user: sarah.id, nps: 8, pa: paBanking, reason: "Consistent quality" },
    { firm: tAndG, user: sarah.id, nps: 10, pa: paIP, reason: "Best IP team in Thailand, hands down" },
    { firm: tAndG, user: james.id, nps: 9, pa: paIP, reason: "Very strong IP practice" },
    { firm: wcp, user: sarah.id, nps: 8, pa: paCorporate, reason: "Solid Thai firm with good M&A capability" },
    { firm: chandler, user: sarah.id, nps: 7, pa: paEnergy, reason: "Strong on energy/infrastructure" },
    { firm: rajah, user: james.id, nps: 9, pa: paDispute, reason: "Outstanding litigation team in Singapore" },
    { firm: kudun, user: sarah.id, nps: 8, pa: paCorporate, reason: "Great value for boutique quality" },
    { firm: kudun, user: james.id, nps: 9, pa: paCorporate, reason: "More personal attention than big firms" },
  ];

  for (const n of npsEntries) {
    await prisma.recommendation.create({
      data: {
        targetType: "FIRM",
        firmId: n.firm.id,
        recommenderId: n.user,
        npsScore: n.nps,
        practiceAreaId: n.pa.id,
        reason: n.reason,
      },
    });
  }
  console.log(`✅ NPS Recommendations: ${npsEntries.length}`);

  // ── Relationship Notes ────────────────────────────────────────────────────
  const notes = [
    { firm: baker, user: sarah.id, content: "Strong relationship with managing partner. Preferred firm for complex M&A. Always available, never misses a deadline.", pinned: true },
    { firm: baker, user: james.id, content: "Rates have increased 15% since 2023 — push back at next renewal.", pinned: false },
    { firm: tAndG, user: sarah.id, content: "Best IP team in Thailand. Darani's team knows our entire trademark portfolio. Do not use anyone else for IP.", pinned: true },
    { firm: wcp, user: sarah.id, content: "Good domestic Thai firm. Better value than international firms for local matters.", pinned: false },
    { firm: kudun, user: sarah.id, content: "Kudun team came from Baker — they know our business well. Consider for mid-market deals where we want to save costs.", pinned: true },
    { firm: rajah, user: james.id, content: "Best for Singapore disputes and SIAC arbitration. Book well in advance — very busy.", pinned: true },
    { firm: aAndO, user: sarah.id, content: "Go-to for capital markets and cross-border finance. Rates are high but justified for complex deals.", pinned: false },
    { firm: linklaters, user: james.id, content: "Strong project finance capability. Preferred for energy sector financings.", pinned: false },
  ];

  for (const n of notes) {
    await prisma.relationshipNote.create({
      data: {
        targetType: "FIRM",
        firmId: n.firm.id,
        authorId: n.user,
        content: n.content,
        isPinned: n.pinned,
      },
    });
  }
  console.log(`✅ Relationship Notes: ${notes.length}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const [firms, lawyers, users, engagementsCount, ratingsCount] = await Promise.all([
    prisma.firm.count(),
    prisma.lawyer.count(),
    prisma.user.count(),
    prisma.engagement.count(),
    prisma.internalRating.count(),
  ]);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  DATABASE READY");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Users:       ${users}`);
  console.log(`  Firms:       ${firms}`);
  console.log(`  Lawyers:     ${lawyers}`);
  console.log(`  Engagements: ${engagementsCount}`);
  console.log(`  Ratings:     ${ratingsCount}`);
  console.log("═══════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error("❌", e.message); process.exit(1); });
