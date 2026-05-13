# Outside Counsel Directory: Project Context for Claude Code

## What this project is

An internal directory for SCG's in-house legal team to evaluate, compare, and select law firms and individual lawyers. It aggregates external rankings from Chambers, Legal 500, Benchmark Litigation, and AsiaLaw with SCG's own internal ratings, engagement history, relationship notes, and cost benchmarks. It tracks boutique firm spin-offs and lawyer movement between firms.

## Who uses it

Two user roles:

1. **In-house lawyer.** Searches for firms/lawyers, reviews rankings and internal ratings, logs engagements, adds notes.
2. **Admin.** Manages reference data (practice areas, jurisdictions), enters external ranking data, manages users.

## Non-negotiable conventions

### Code style
- TypeScript strict mode everywhere. No `any`. No `// @ts-ignore`.
- Functional React components only. No class components.
- Server Components by default. Client Components only when interactivity requires it.
- Async server functions live in `src/server/`. Never call Prisma directly from a Client Component.
- All API routes return typed responses using `zod` schemas.
- Use named exports. Default exports only for Next.js page and layout files.

### File naming
- React components: `PascalCase.tsx`
- Server modules: `kebab-case.ts`
- Hooks: `useThingName.ts`
- Test files: same name as source plus `.test.ts` or `.test.tsx`
- No barrel files (`index.ts` re-exports) outside of `src/components/ui/`.

### Database conventions
- All tables in `snake_case`. Prisma `@@map` to enforce.
- All Prisma model names in `PascalCase` (singular).
- Every table has `id` (cuid), `created_at`, `updated_at`.
- Soft delete via `deleted_at` nullable column where appropriate. Never hard delete.
- Money stored as integer cents in USD. Display formatting in the UI layer only.

### UI conventions
- Light backgrounds only. No dark mode.
- Primary brand colour: teal (`#0F766E`).
- Accent colour: amber (`#F59E0B`) for highlights and scores.
- Sidebar always present on authenticated routes. Width: 240px expanded, 64px collapsed.
- All data tables use TanStack Table with sort, filter, pagination.
- All charts use Recharts.

### Testing
- Every server module in `src/server/` has unit tests in `tests/unit/`.
- Every page route has at least one Playwright happy-path test.
- Run `npm run test` and `npm run test:e2e` before declaring any phase complete.

### Git workflow
- Commit at the end of every session with a conventional message.
- Never commit `.env`, `.env.local`, or any file with secrets.

## What not to do

- Do not install component libraries beyond shadcn/ui.
- Do not add an ORM other than Prisma.
- Do not introduce state management libraries. Server Components plus URL state are sufficient.
- Do not write CSS files. Tailwind classes only.
- Do not scrape external ranking directories.
- Do not store secrets in the codebase.
- Do not skip Zod validation on any input that crosses a trust boundary.

## How to ask for help

If a requirement is ambiguous, stop and ask. The user is a senior in-house lawyer who prefers to clarify rather than rework.
