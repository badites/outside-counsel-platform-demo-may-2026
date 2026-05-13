import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── Users ───────────────────────────────────────────────────────────────
  const userSarah = await prisma.user.upsert({
    where: { email: "sarah.scales@example.com" },
    update: {},
    create: { email: "sarah.scales@example.com", name: "Sarah Scales", role: "LAWYER" },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "Admin User", role: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { email: "james.chen@example.com" },
    update: {},
    create: { email: "james.chen@example.com", name: "James Chen", role: "LAWYER" },
  });

  console.log("  Users: 3");

  // ─── Practice Areas ────────────────────────────────────────────────────
  const practiceAreas = await Promise.all(
    [
      { name: "Corporate & M&A", slug: "corporate-ma" },
      { name: "Dispute Resolution", slug: "dispute-resolution" },
      { name: "Banking & Finance", slug: "banking-finance" },
      { name: "Capital Markets", slug: "capital-markets" },
      { name: "Employment & Labour", slug: "employment-labour" },
      { name: "Intellectual Property", slug: "intellectual-property" },
      { name: "Real Estate & Construction", slug: "real-estate-construction" },
      { name: "Energy & Natural Resources", slug: "energy-natural-resources" },
    ].map((pa) =>
      prisma.practiceArea.upsert({
        where: { slug: pa.slug },
        update: {},
        create: pa,
      })
    )
  );
  console.log(`  Practice Areas: ${practiceAreas.length}`);

  // ─── Jurisdictions ─────────────────────────────────────────────────────
  const jurisdictions = await Promise.all(
    [
      { name: "Thailand", country: "Thailand", region: "APAC" },
      { name: "Singapore", country: "Singapore", region: "APAC" },
      { name: "Hong Kong SAR", country: "Hong Kong", region: "APAC" },
      { name: "Indonesia", country: "Indonesia", region: "APAC" },
      { name: "Vietnam", country: "Vietnam", region: "APAC" },
      { name: "Myanmar", country: "Myanmar", region: "APAC" },
      { name: "Philippines", country: "Philippines", region: "APAC" },
      { name: "England & Wales", country: "United Kingdom", region: "EMEA" },
      { name: "New York", country: "United States", region: "AMERICAS" },
      { name: "Japan", country: "Japan", region: "APAC" },
    ].map((j) =>
      prisma.jurisdiction.upsert({
        where: { name: j.name },
        update: {},
        create: j,
      })
    )
  );
  console.log(`  Jurisdictions: ${jurisdictions.length}`);

  // Convenience lookups
  const pa = Object.fromEntries(practiceAreas.map((p) => [p.slug, p]));
  const jur = Object.fromEntries(jurisdictions.map((j) => [j.name, j]));

  // ─── Firms ─────────────────────────────────────────────────────────────
  const firmData = [
    {
      name: "Baker McKenzie",
      shortName: "Baker",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.bakermckenzie.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 4700,
      foundedYear: 1949,
    },
    {
      name: "Allen & Overy (A&O Shearman)",
      shortName: "A&O",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.aoshearman.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 5500,
      foundedYear: 1930,
    },
    {
      name: "Linklaters",
      shortName: "Linklaters",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.linklaters.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 5200,
      foundedYear: 1838,
    },
    {
      name: "Tilleke & Gibbins",
      shortName: "T&G",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.tilleke.com",
      firmType: "REGIONAL" as const,
      headcount: 350,
      foundedYear: 1890,
    },
    {
      name: "Weerawong, Chinnavat & Partners",
      shortName: "WCP",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.weerawongcp.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 130,
      foundedYear: 2002,
    },
    {
      name: "Chandler MHM",
      shortName: "Chandler",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.chandlermhm.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 100,
      foundedYear: 2015,
    },
    {
      name: "Rajah & Tann",
      shortName: "R&T",
      country: "Singapore",
      city: "Singapore",
      website: "https://www.rajahtannasia.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 1000,
      foundedYear: 1954,
    },
    {
      name: "Norton Rose Fulbright",
      shortName: "NRF",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.nortonrosefulbright.com",
      firmType: "FULL_SERVICE" as const,
      headcount: 3000,
      foundedYear: 2013,
    },
    {
      name: "Kudun & Partners",
      shortName: "Kudun",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.kap.co.th",
      firmType: "BOUTIQUE" as const,
      headcount: 65,
      foundedYear: 2015,
    },
    {
      name: "Pisut & Partners",
      shortName: "Pisut",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.pisutandpartners.com",
      firmType: "BOUTIQUE" as const,
      headcount: 20,
      foundedYear: 2019,
    },
  ];

  const firms: Record<string, { id: string }> = {};
  for (const fd of firmData) {
    const firm = await prisma.firm.upsert({
      where: { id: fd.name }, // will not match — create path
      update: {},
      create: fd,
    });
    firms[fd.shortName ?? fd.name] = firm;
  }

  // Boutique spin-off links
  // Kudun & Partners was founded by partners from Baker McKenzie
  await prisma.firm.update({
    where: { id: firms["Kudun"].id },
    data: { parentFirmId: firms["Baker"].id },
  });

  // Pisut & Partners — boutique spin-off from WCP
  await prisma.firm.update({
    where: { id: firms["Pisut"].id },
    data: { parentFirmId: firms["WCP"].id },
  });

  console.log(`  Firms: ${firmData.length}`);

  // ─── Firm Practice Areas ───────────────────────────────────────────────
  const firmPALinks = [
    { firm: "Baker", pa: "corporate-ma", jur: "Thailand" },
    { firm: "Baker", pa: "dispute-resolution", jur: "Thailand" },
    { firm: "Baker", pa: "banking-finance", jur: "Thailand" },
    { firm: "Baker", pa: "employment-labour", jur: "Thailand" },
    { firm: "Baker", pa: "intellectual-property", jur: "Thailand" },
    { firm: "A&O", pa: "corporate-ma", jur: "Thailand" },
    { firm: "A&O", pa: "banking-finance", jur: "Thailand" },
    { firm: "A&O", pa: "capital-markets", jur: "Thailand" },
    { firm: "Linklaters", pa: "corporate-ma", jur: "Thailand" },
    { firm: "Linklaters", pa: "banking-finance", jur: "Thailand" },
    { firm: "Linklaters", pa: "capital-markets", jur: "Thailand" },
    { firm: "T&G", pa: "intellectual-property", jur: "Thailand" },
    { firm: "T&G", pa: "corporate-ma", jur: "Thailand" },
    { firm: "T&G", pa: "dispute-resolution", jur: "Thailand" },
    { firm: "WCP", pa: "corporate-ma", jur: "Thailand" },
    { firm: "WCP", pa: "banking-finance", jur: "Thailand" },
    { firm: "WCP", pa: "dispute-resolution", jur: "Thailand" },
    { firm: "Chandler", pa: "corporate-ma", jur: "Thailand" },
    { firm: "Chandler", pa: "energy-natural-resources", jur: "Thailand" },
    { firm: "R&T", pa: "corporate-ma", jur: "Singapore" },
    { firm: "R&T", pa: "dispute-resolution", jur: "Singapore" },
    { firm: "R&T", pa: "banking-finance", jur: "Singapore" },
    { firm: "NRF", pa: "corporate-ma", jur: "Thailand" },
    { firm: "NRF", pa: "energy-natural-resources", jur: "Thailand" },
    { firm: "NRF", pa: "banking-finance", jur: "Thailand" },
    { firm: "Kudun", pa: "corporate-ma", jur: "Thailand" },
    { firm: "Kudun", pa: "banking-finance", jur: "Thailand" },
    { firm: "Kudun", pa: "real-estate-construction", jur: "Thailand" },
    { firm: "Pisut", pa: "corporate-ma", jur: "Thailand" },
    { firm: "Pisut", pa: "dispute-resolution", jur: "Thailand" },
  ];

  for (const link of firmPALinks) {
    await prisma.firmPracticeArea.create({
      data: {
        firmId: firms[link.firm].id,
        practiceAreaId: pa[link.pa].id,
        jurisdictionId: jur[link.jur].id,
      },
    });
  }
  console.log(`  Firm Practice Areas: ${firmPALinks.length}`);

  // ─── Lawyers ───────────────────────────────────────────────────────────
  const lawyerData: {
    name: string;
    title: string;
    qualificationYear: number;
    barAdmissions: string;
    currentFirm: string;
    role: "PARTNER" | "OF_COUNSEL" | "ASSOCIATE" | "COUNSEL";
    practiceAreas: string[];
    jurisdiction: string;
    bio?: string;
    startYear: number;
    previousFirm?: string;
    previousRole?: "PARTNER" | "OF_COUNSEL" | "ASSOCIATE" | "COUNSEL";
    previousStart?: number;
    previousEnd?: number;
  }[] = [
    // Baker McKenzie — 6 lawyers
    { name: "Kullarat Phongsathaporn", title: "Managing Partner", qualificationYear: 1994, barAdmissions: "Thai Bar", currentFirm: "Baker", role: "PARTNER", practiceAreas: ["corporate-ma", "banking-finance"], jurisdiction: "Thailand", startYear: 2005, bio: "Leading M&A practitioner with 30+ years of experience advising multinational corporations on cross-border transactions in Thailand and ASEAN." },
    { name: "Paralee Techanarong", title: "Senior Partner", qualificationYear: 1998, barAdmissions: "Thai Bar", currentFirm: "Baker", role: "PARTNER", practiceAreas: ["dispute-resolution"], jurisdiction: "Thailand", startYear: 2008 },
    { name: "Pimvimol Vipamaneerut", title: "Partner", qualificationYear: 2002, barAdmissions: "Thai Bar", currentFirm: "Baker", role: "PARTNER", practiceAreas: ["employment-labour"], jurisdiction: "Thailand", startYear: 2012 },
    { name: "Dhiraphol Suwanprateep", title: "Partner", qualificationYear: 1999, barAdmissions: "Thai Bar", currentFirm: "Baker", role: "PARTNER", practiceAreas: ["intellectual-property"], jurisdiction: "Thailand", startYear: 2010 },
    { name: "Kowit Somwaiya", title: "Senior Associate", qualificationYear: 2012, barAdmissions: "Thai Bar", currentFirm: "Baker", role: "ASSOCIATE", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2015 },
    { name: "Natthida Praween", title: "Associate", qualificationYear: 2016, barAdmissions: "Thai Bar", currentFirm: "Baker", role: "ASSOCIATE", practiceAreas: ["banking-finance"], jurisdiction: "Thailand", startYear: 2018 },

    // A&O — 4 lawyers
    { name: "Patrick Leysen", title: "Partner", qualificationYear: 2000, barAdmissions: "England & Wales, Thai Bar", currentFirm: "A&O", role: "PARTNER", practiceAreas: ["corporate-ma", "capital-markets"], jurisdiction: "Thailand", startYear: 2010, bio: "Advises on major cross-border M&A and capital markets transactions across Southeast Asia." },
    { name: "Montien Bunjarnondha", title: "Partner", qualificationYear: 2001, barAdmissions: "Thai Bar", currentFirm: "A&O", role: "PARTNER", practiceAreas: ["banking-finance"], jurisdiction: "Thailand", startYear: 2012 },
    { name: "Sriprai Lertpitayapoom", title: "Counsel", qualificationYear: 2005, barAdmissions: "Thai Bar", currentFirm: "A&O", role: "COUNSEL", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2015 },
    { name: "Narun Popattanachai", title: "Associate", qualificationYear: 2014, barAdmissions: "Thai Bar, New York Bar", currentFirm: "A&O", role: "ASSOCIATE", practiceAreas: ["capital-markets"], jurisdiction: "Thailand", startYear: 2017 },

    // Linklaters — 4 lawyers
    { name: "John Frangos", title: "Partner", qualificationYear: 1997, barAdmissions: "England & Wales", currentFirm: "Linklaters", role: "PARTNER", practiceAreas: ["corporate-ma", "banking-finance"], jurisdiction: "Thailand", startYear: 2008, bio: "Leads the Thailand practice, specializing in complex financial transactions and M&A across ASEAN." },
    { name: "Watcharapong Kunakorn", title: "Partner", qualificationYear: 2003, barAdmissions: "Thai Bar", currentFirm: "Linklaters", role: "PARTNER", practiceAreas: ["capital-markets"], jurisdiction: "Thailand", startYear: 2014 },
    { name: "Suvimon Cherdchaipan", title: "Counsel", qualificationYear: 2007, barAdmissions: "Thai Bar", currentFirm: "Linklaters", role: "COUNSEL", practiceAreas: ["banking-finance"], jurisdiction: "Thailand", startYear: 2016 },
    { name: "Tanapon Sritanondha", title: "Associate", qualificationYear: 2015, barAdmissions: "Thai Bar", currentFirm: "Linklaters", role: "ASSOCIATE", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2018 },

    // Tilleke & Gibbins — 4 lawyers
    { name: "Darani Vachanavuttivong", title: "Director", qualificationYear: 1989, barAdmissions: "Thai Bar", currentFirm: "T&G", role: "PARTNER", practiceAreas: ["intellectual-property"], jurisdiction: "Thailand", startYear: 1995, bio: "One of Thailand's most recognized IP practitioners, with over 35 years advising on trademarks, patents, and technology licensing." },
    { name: "Wayu Suthisarnsuntorn", title: "Partner", qualificationYear: 2000, barAdmissions: "Thai Bar", currentFirm: "T&G", role: "PARTNER", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2005 },
    { name: "Alan Adcock", title: "Partner", qualificationYear: 1995, barAdmissions: "England & Wales, Thai Bar", currentFirm: "T&G", role: "PARTNER", practiceAreas: ["dispute-resolution"], jurisdiction: "Thailand", startYear: 2003 },
    { name: "Suebsiri Taweepon", title: "Associate", qualificationYear: 2017, barAdmissions: "Thai Bar", currentFirm: "T&G", role: "ASSOCIATE", practiceAreas: ["intellectual-property"], jurisdiction: "Thailand", startYear: 2019 },

    // WCP — 4 lawyers
    { name: "Veeranuch Thammavaranucupt", title: "Senior Partner", qualificationYear: 1992, barAdmissions: "Thai Bar, New York Bar", currentFirm: "WCP", role: "PARTNER", practiceAreas: ["corporate-ma", "banking-finance"], jurisdiction: "Thailand", startYear: 2002, bio: "Founding partner of WCP, recognized as a leading corporate lawyer in Thailand with deep experience in M&A and project finance." },
    { name: "Samart Poopoksakul", title: "Partner", qualificationYear: 2001, barAdmissions: "Thai Bar", currentFirm: "WCP", role: "PARTNER", practiceAreas: ["dispute-resolution"], jurisdiction: "Thailand", startYear: 2006 },
    { name: "Supatra Jaovisidha", title: "Partner", qualificationYear: 2004, barAdmissions: "Thai Bar", currentFirm: "WCP", role: "PARTNER", practiceAreas: ["banking-finance"], jurisdiction: "Thailand", startYear: 2010 },
    { name: "Pakorn Nilprapunt", title: "Associate", qualificationYear: 2016, barAdmissions: "Thai Bar", currentFirm: "WCP", role: "ASSOCIATE", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2018 },

    // Chandler MHM — 3 lawyers
    { name: "Albert Chandler", title: "Chairman", qualificationYear: 1985, barAdmissions: "England & Wales, Thai Bar", currentFirm: "Chandler", role: "PARTNER", practiceAreas: ["corporate-ma", "energy-natural-resources"], jurisdiction: "Thailand", startYear: 2015, bio: "Renowned energy and infrastructure lawyer with decades of experience in Southeast Asian project development." },
    { name: "Jessada Sawatdipong", title: "Partner", qualificationYear: 2003, barAdmissions: "Thai Bar", currentFirm: "Chandler", role: "PARTNER", practiceAreas: ["energy-natural-resources"], jurisdiction: "Thailand", startYear: 2015 },
    { name: "Ratana Poonsombudlert", title: "Of Counsel", qualificationYear: 1998, barAdmissions: "Thai Bar", currentFirm: "Chandler", role: "OF_COUNSEL", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2017 },

    // Rajah & Tann — 4 lawyers
    { name: "Lee Eng Beng", title: "Senior Partner", qualificationYear: 1990, barAdmissions: "Singapore Bar", currentFirm: "R&T", role: "PARTNER", practiceAreas: ["dispute-resolution"], jurisdiction: "Singapore", startYear: 1995, bio: "One of Singapore's top litigators, appointed Senior Counsel, specializing in complex commercial and investment treaty disputes." },
    { name: "Chia Kim Huat", title: "Regional Head, Corporate", qualificationYear: 1993, barAdmissions: "Singapore Bar", currentFirm: "R&T", role: "PARTNER", practiceAreas: ["corporate-ma", "banking-finance"], jurisdiction: "Singapore", startYear: 1998 },
    { name: "Tan Beng Hwee", title: "Partner", qualificationYear: 2004, barAdmissions: "Singapore Bar", currentFirm: "R&T", role: "PARTNER", practiceAreas: ["banking-finance"], jurisdiction: "Singapore", startYear: 2010 },
    { name: "Rachel Eng", title: "Senior Partner", qualificationYear: 1991, barAdmissions: "Singapore Bar", currentFirm: "R&T", role: "PARTNER", practiceAreas: ["corporate-ma"], jurisdiction: "Singapore", startYear: 1996 },

    // Norton Rose Fulbright — 3 lawyers
    { name: "Bob Kongyingyong", title: "Partner", qualificationYear: 2000, barAdmissions: "Thai Bar", currentFirm: "NRF", role: "PARTNER", practiceAreas: ["energy-natural-resources", "corporate-ma"], jurisdiction: "Thailand", startYear: 2013 },
    { name: "Scott Olson", title: "Partner", qualificationYear: 1998, barAdmissions: "New York Bar, Thai Bar", currentFirm: "NRF", role: "PARTNER", practiceAreas: ["banking-finance"], jurisdiction: "Thailand", startYear: 2015 },
    { name: "Wiriya Pupipat", title: "Associate", qualificationYear: 2015, barAdmissions: "Thai Bar", currentFirm: "NRF", role: "ASSOCIATE", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2017 },

    // Kudun & Partners — 3 lawyers (boutique spin-off from Baker)
    { name: "Kudun Sukhumananda", title: "Founding Partner", qualificationYear: 1995, barAdmissions: "Thai Bar, New York Bar", currentFirm: "Kudun", role: "PARTNER", practiceAreas: ["corporate-ma", "banking-finance"], jurisdiction: "Thailand", startYear: 2015, bio: "Founded Kudun & Partners after 20 years at Baker McKenzie. Recognized by Chambers and Legal 500 for corporate/M&A in Thailand.", previousFirm: "Baker", previousRole: "PARTNER", previousStart: 1998, previousEnd: 2015 },
    { name: "Pariyapol Kamolsilp", title: "Partner", qualificationYear: 2004, barAdmissions: "Thai Bar", currentFirm: "Kudun", role: "PARTNER", practiceAreas: ["real-estate-construction"], jurisdiction: "Thailand", startYear: 2015, previousFirm: "Baker", previousRole: "ASSOCIATE", previousStart: 2007, previousEnd: 2015 },
    { name: "Chinawat Assavapokee", title: "Partner", qualificationYear: 2006, barAdmissions: "Thai Bar", currentFirm: "Kudun", role: "PARTNER", practiceAreas: ["banking-finance"], jurisdiction: "Thailand", startYear: 2016, previousFirm: "Baker", previousRole: "ASSOCIATE", previousStart: 2009, previousEnd: 2016 },

    // Pisut & Partners — 3 lawyers (boutique spin-off from WCP)
    { name: "Pisut Rakwong", title: "Managing Partner", qualificationYear: 2003, barAdmissions: "Thai Bar", currentFirm: "Pisut", role: "PARTNER", practiceAreas: ["corporate-ma", "dispute-resolution"], jurisdiction: "Thailand", startYear: 2019, bio: "Left WCP in 2019 to found Pisut & Partners, focusing on M&A advisory and commercial litigation for mid-market clients.", previousFirm: "WCP", previousRole: "PARTNER", previousStart: 2008, previousEnd: 2019 },
    { name: "Nattavut Chaimanat", title: "Partner", qualificationYear: 2008, barAdmissions: "Thai Bar", currentFirm: "Pisut", role: "PARTNER", practiceAreas: ["dispute-resolution"], jurisdiction: "Thailand", startYear: 2019, previousFirm: "WCP", previousRole: "COUNSEL", previousStart: 2012, previousEnd: 2019 },
    { name: "Sirikanya Chongmankhong", title: "Senior Associate", qualificationYear: 2013, barAdmissions: "Thai Bar", currentFirm: "Pisut", role: "ASSOCIATE", practiceAreas: ["corporate-ma"], jurisdiction: "Thailand", startYear: 2020, previousFirm: "WCP", previousRole: "ASSOCIATE", previousStart: 2015, previousEnd: 2020 },
  ];

  const lawyers: Record<string, { id: string }> = {};
  for (const ld of lawyerData) {
    const lawyer = await prisma.lawyer.create({
      data: {
        name: ld.name,
        title: ld.title,
        qualificationYear: ld.qualificationYear,
        barAdmissions: ld.barAdmissions,
        bio: ld.bio ?? null,
      },
    });
    lawyers[ld.name] = lawyer;

    // Current firm link
    await prisma.firmLawyer.create({
      data: {
        firmId: firms[ld.currentFirm].id,
        lawyerId: lawyer.id,
        role: ld.role,
        startDate: new Date(`${ld.startYear}-01-01`),
        isCurrent: true,
      },
    });

    // Previous firm link (for alumni tracking)
    if (ld.previousFirm && ld.previousStart && ld.previousEnd) {
      await prisma.firmLawyer.create({
        data: {
          firmId: firms[ld.previousFirm].id,
          lawyerId: lawyer.id,
          role: ld.previousRole ?? "ASSOCIATE",
          startDate: new Date(`${ld.previousStart}-01-01`),
          endDate: new Date(`${ld.previousEnd}-01-01`),
          isCurrent: false,
        },
      });
    }

    // Lawyer practice areas
    for (const paSlug of ld.practiceAreas) {
      await prisma.lawyerPracticeArea.create({
        data: {
          lawyerId: lawyer.id,
          practiceAreaId: pa[paSlug].id,
          jurisdictionId: jur[ld.jurisdiction].id,
        },
      });
    }
  }

  console.log(`  Lawyers: ${lawyerData.length}`);

  // ─── Ranking Sources ─────────────────────────────────────────────────
  const rankingSources = await Promise.all([
    prisma.rankingSource.create({ data: { name: "Chambers Asia-Pacific 2025", slug: "chambers-2025", publisher: "CHAMBERS", editionYear: 2025 } }),
    prisma.rankingSource.create({ data: { name: "Chambers Asia-Pacific 2024", slug: "chambers-2024", publisher: "CHAMBERS", editionYear: 2024 } }),
    prisma.rankingSource.create({ data: { name: "Legal 500 Asia Pacific 2025", slug: "legal500-2025", publisher: "LEGAL500", editionYear: 2025 } }),
    prisma.rankingSource.create({ data: { name: "Legal 500 Asia Pacific 2024", slug: "legal500-2024", publisher: "LEGAL500", editionYear: 2024 } }),
    prisma.rankingSource.create({ data: { name: "Benchmark Litigation Asia-Pacific 2025", slug: "benchmark-2025", publisher: "BENCHMARK_LITIGATION", editionYear: 2025 } }),
    prisma.rankingSource.create({ data: { name: "AsiaLaw Profiles 2025", slug: "asialaw-2025", publisher: "ASIALAW", editionYear: 2025 } }),
    prisma.rankingSource.create({ data: { name: "AsiaLaw Profiles 2024", slug: "asialaw-2024", publisher: "ASIALAW", editionYear: 2024 } }),
  ]);

  const rs: Record<string, { id: string }> = {};
  for (const src of rankingSources) {
    rs[src.slug] = src;
  }
  console.log(`  Ranking Sources: ${rankingSources.length}`);

  // ─── Firm Rankings ─────────────────────────────────────────────────────
  const firmRankingData: { firm: string; source: string; pa: string; jur: string; band?: number; tier?: number; starRating?: number }[] = [
    // Baker McKenzie
    { firm: "Baker", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", band: 1 },
    { firm: "Baker", source: "chambers-2024", pa: "corporate-ma", jur: "Thailand", band: 1 },
    { firm: "Baker", source: "chambers-2025", pa: "dispute-resolution", jur: "Thailand", band: 2 },
    { firm: "Baker", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", tier: 1 },
    { firm: "Baker", source: "legal500-2024", pa: "corporate-ma", jur: "Thailand", tier: 1 },
    { firm: "Baker", source: "legal500-2025", pa: "employment-labour", jur: "Thailand", tier: 1 },
    { firm: "Baker", source: "asialaw-2025", pa: "corporate-ma", jur: "Thailand", starRating: 5 },

    // A&O
    { firm: "A&O", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", band: 1 },
    { firm: "A&O", source: "chambers-2024", pa: "corporate-ma", jur: "Thailand", band: 2 },
    { firm: "A&O", source: "chambers-2025", pa: "banking-finance", jur: "Thailand", band: 1 },
    { firm: "A&O", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", tier: 1 },
    { firm: "A&O", source: "legal500-2025", pa: "capital-markets", jur: "Thailand", tier: 2 },
    { firm: "A&O", source: "asialaw-2025", pa: "banking-finance", jur: "Thailand", starRating: 5 },

    // Linklaters
    { firm: "Linklaters", source: "chambers-2025", pa: "banking-finance", jur: "Thailand", band: 1 },
    { firm: "Linklaters", source: "chambers-2025", pa: "capital-markets", jur: "Thailand", band: 2 },
    { firm: "Linklaters", source: "legal500-2025", pa: "banking-finance", jur: "Thailand", tier: 1 },
    { firm: "Linklaters", source: "asialaw-2025", pa: "banking-finance", jur: "Thailand", starRating: 5 },

    // Tilleke & Gibbins
    { firm: "T&G", source: "chambers-2025", pa: "intellectual-property", jur: "Thailand", band: 1 },
    { firm: "T&G", source: "chambers-2024", pa: "intellectual-property", jur: "Thailand", band: 1 },
    { firm: "T&G", source: "legal500-2025", pa: "intellectual-property", jur: "Thailand", tier: 1 },
    { firm: "T&G", source: "legal500-2025", pa: "dispute-resolution", jur: "Thailand", tier: 2 },
    { firm: "T&G", source: "asialaw-2025", pa: "intellectual-property", jur: "Thailand", starRating: 5 },

    // WCP
    { firm: "WCP", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", band: 2 },
    { firm: "WCP", source: "chambers-2024", pa: "corporate-ma", jur: "Thailand", band: 2 },
    { firm: "WCP", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", tier: 2 },
    { firm: "WCP", source: "legal500-2025", pa: "banking-finance", jur: "Thailand", tier: 2 },
    { firm: "WCP", source: "asialaw-2025", pa: "corporate-ma", jur: "Thailand", starRating: 4 },

    // Chandler MHM
    { firm: "Chandler", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", band: 3 },
    { firm: "Chandler", source: "legal500-2025", pa: "energy-natural-resources", jur: "Thailand", tier: 2 },
    { firm: "Chandler", source: "asialaw-2025", pa: "corporate-ma", jur: "Thailand", starRating: 4 },

    // Rajah & Tann
    { firm: "R&T", source: "chambers-2025", pa: "dispute-resolution", jur: "Singapore", band: 1 },
    { firm: "R&T", source: "chambers-2025", pa: "corporate-ma", jur: "Singapore", band: 2 },
    { firm: "R&T", source: "legal500-2025", pa: "dispute-resolution", jur: "Singapore", tier: 1 },
    { firm: "R&T", source: "asialaw-2025", pa: "dispute-resolution", jur: "Singapore", starRating: 5 },

    // Norton Rose Fulbright
    { firm: "NRF", source: "chambers-2025", pa: "energy-natural-resources", jur: "Thailand", band: 2 },
    { firm: "NRF", source: "legal500-2025", pa: "energy-natural-resources", jur: "Thailand", tier: 1 },
    { firm: "NRF", source: "asialaw-2025", pa: "energy-natural-resources", jur: "Thailand", starRating: 4 },

    // Kudun & Partners
    { firm: "Kudun", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", band: 3 },
    { firm: "Kudun", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", tier: 3 },
    { firm: "Kudun", source: "legal500-2025", pa: "real-estate-construction", jur: "Thailand", tier: 2 },
    { firm: "Kudun", source: "asialaw-2025", pa: "corporate-ma", jur: "Thailand", starRating: 3 },

    // Pisut & Partners
    { firm: "Pisut", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", tier: 4 },
    { firm: "Pisut", source: "benchmark-2025", pa: "dispute-resolution", jur: "Thailand", starRating: 3 },
  ];

  for (const fr of firmRankingData) {
    await prisma.firmRanking.create({
      data: {
        firmId: firms[fr.firm].id,
        rankingSourceId: rs[fr.source].id,
        practiceAreaId: pa[fr.pa].id,
        jurisdictionId: jur[fr.jur].id,
        band: fr.band ?? null,
        tier: fr.tier ?? null,
        starRating: fr.starRating ?? null,
      },
    });
  }
  console.log(`  Firm Rankings: ${firmRankingData.length}`);

  // ─── Lawyer Rankings ───────────────────────────────────────────────────
  type LRC = "LEADING" | "RECOMMENDED" | "UP_AND_COMING" | "STAR" | "RECOGNISED";
  const lawyerRankingData: { lawyer: string; source: string; pa: string; jur: string; category: LRC }[] = [
    // Baker
    { lawyer: "Kullarat Phongsathaporn", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", category: "LEADING" },
    { lawyer: "Kullarat Phongsathaporn", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", category: "LEADING" },
    { lawyer: "Paralee Techanarong", source: "chambers-2025", pa: "dispute-resolution", jur: "Thailand", category: "RECOMMENDED" },
    { lawyer: "Dhiraphol Suwanprateep", source: "chambers-2025", pa: "intellectual-property", jur: "Thailand", category: "LEADING" },
    { lawyer: "Pimvimol Vipamaneerut", source: "legal500-2025", pa: "employment-labour", jur: "Thailand", category: "LEADING" },

    // A&O
    { lawyer: "Patrick Leysen", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", category: "LEADING" },
    { lawyer: "Patrick Leysen", source: "legal500-2025", pa: "capital-markets", jur: "Thailand", category: "LEADING" },
    { lawyer: "Montien Bunjarnondha", source: "chambers-2025", pa: "banking-finance", jur: "Thailand", category: "RECOMMENDED" },

    // Linklaters
    { lawyer: "John Frangos", source: "chambers-2025", pa: "banking-finance", jur: "Thailand", category: "LEADING" },
    { lawyer: "John Frangos", source: "legal500-2025", pa: "banking-finance", jur: "Thailand", category: "LEADING" },
    { lawyer: "Watcharapong Kunakorn", source: "chambers-2025", pa: "capital-markets", jur: "Thailand", category: "RECOMMENDED" },

    // Tilleke & Gibbins
    { lawyer: "Darani Vachanavuttivong", source: "chambers-2025", pa: "intellectual-property", jur: "Thailand", category: "STAR" },
    { lawyer: "Darani Vachanavuttivong", source: "legal500-2025", pa: "intellectual-property", jur: "Thailand", category: "LEADING" },
    { lawyer: "Alan Adcock", source: "chambers-2025", pa: "dispute-resolution", jur: "Thailand", category: "RECOMMENDED" },

    // WCP
    { lawyer: "Veeranuch Thammavaranucupt", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", category: "LEADING" },
    { lawyer: "Veeranuch Thammavaranucupt", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", category: "LEADING" },
    { lawyer: "Samart Poopoksakul", source: "chambers-2025", pa: "dispute-resolution", jur: "Thailand", category: "RECOMMENDED" },

    // Chandler
    { lawyer: "Albert Chandler", source: "chambers-2025", pa: "energy-natural-resources", jur: "Thailand", category: "LEADING" },

    // Rajah & Tann
    { lawyer: "Lee Eng Beng", source: "chambers-2025", pa: "dispute-resolution", jur: "Singapore", category: "STAR" },
    { lawyer: "Lee Eng Beng", source: "legal500-2025", pa: "dispute-resolution", jur: "Singapore", category: "LEADING" },
    { lawyer: "Rachel Eng", source: "chambers-2025", pa: "corporate-ma", jur: "Singapore", category: "LEADING" },
    { lawyer: "Chia Kim Huat", source: "legal500-2025", pa: "corporate-ma", jur: "Singapore", category: "LEADING" },

    // NRF
    { lawyer: "Bob Kongyingyong", source: "chambers-2025", pa: "energy-natural-resources", jur: "Thailand", category: "RECOMMENDED" },
    { lawyer: "Scott Olson", source: "legal500-2025", pa: "banking-finance", jur: "Thailand", category: "RECOMMENDED" },

    // Kudun
    { lawyer: "Kudun Sukhumananda", source: "chambers-2025", pa: "corporate-ma", jur: "Thailand", category: "RECOMMENDED" },
    { lawyer: "Kudun Sukhumananda", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", category: "RECOMMENDED" },

    // Pisut
    { lawyer: "Pisut Rakwong", source: "legal500-2025", pa: "corporate-ma", jur: "Thailand", category: "UP_AND_COMING" },
  ];

  for (const lr of lawyerRankingData) {
    await prisma.lawyerRanking.create({
      data: {
        lawyerId: lawyers[lr.lawyer].id,
        rankingSourceId: rs[lr.source].id,
        practiceAreaId: pa[lr.pa].id,
        jurisdictionId: jur[lr.jur].id,
        category: lr.category,
      },
    });
  }
  console.log(`  Lawyer Rankings: ${lawyerRankingData.length}`);

  console.log("Seed complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
