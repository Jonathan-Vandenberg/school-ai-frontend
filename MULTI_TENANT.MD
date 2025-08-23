## Multi-tenant rollout checklist (schools using API-only vs API+frontend)

This plan makes one shared codebase serve many schools via subdomains while isolating each school’s data in its own database. The audio-analysis Supabase acts as the control plane; each school has its own Supabase project for data.

### P0 decisions (confirm once)
- [ ] Subdomain strategy: `school-name.speechanalyser.com` for frontend, single API host `api.speechanalyser.com` (optional: `*.api.speechanalyser.com` later)
- [ ] Per-school database: one Supabase project per school (hard isolation)
- [ ] Wildcard DNS + certificate for `*.speechanalyser.com`

---

### Milestone 1 – Control plane schema (Supabase used by audio-analysis)
- [x] Create tables in control plane DB:
  - [x] `tenants(id uuid pk, subdomain text unique, display_name text, status text, created_at timestamptz)`
  - [x] `tenant_branding(tenant_id fk, logo_url text, primary_hex text, secondary_hex text, accent_hex text, dark_mode bool)`
  - [x] `tenant_supabase_creds(tenant_id fk, supabase_url text, anon_key text, service_role_key_encrypted text, region text, rotation_at timestamptz)`
  - [x] `api_keys_tenants(api_key_id fk, tenant_id fk)`
  - [x] Add `tenant_id` to `usage_logs` (and analytics view `api_usage_analytics`)
- [x] Add encryption helper for `service_role_key` at rest (env: `CP_ENCRYPTION_KEY`)
- [x] Seed a demo tenant for testing

Deliverables: SQL migrations + docs on how to rotate keys.

---

### Milestone 2 – API (audio-analysis) multi-tenant
- [x] In API key auth, resolve `tenant_id` via `api_keys_tenants` and attach to request context
- [ ] Add per-tenant Supabase client factory with LRU cache; decrypt creds on load
- [ ] Ensure all DB writes/reads that are tenant-specific use the tenant client
- [ ] Log `tenant_id` in all `api_usage_logs` and cost analytics
  - [x] Included in `api_usage_logs`
  - [x] Include in AI cost logs (`ai_interactions`)
- [ ] New endpoints:
  - [x] `GET /tenants/config` (public; accepts Host/subdomain → returns branding + public config)
  - [x] Admin: `POST /api/admin/tenants` (create tenant + branding; optional `issue_api_key=true` to create and link an API key in one step)
  - [x] Admin: `POST /api/admin/tenants/{id}/db` (store encrypted Supabase creds)
  - [x] Admin: `POST /api/admin/keys/link` to accept `tenant_id` or `subdomain` and link key→tenant
  - [x] Admin: `PUT /api/admin/tenants/{id}` (update display_name, status, branding)
- [ ] Optional: tenant-level aggregate rate limits

Deliverables: middleware, new endpoints, updated usage logging, tests.

---

### Milestone 3 – Frontend (school-ai) multi-tenant runtime
- [x] Subdomain resolution in `middleware.ts` (parse `hostname` → `subdomain`)
- [x] On boot, fetch `GET /tenants/config?host=<hostname>` and hydrate a `TenantContext`
- [x] Apply theming via CSS variables/shadcn tokens from branding (CSS vars: `--brand-primary/secondary/accent`)
- [ ] Server-side API calls: look up tenant’s API key/route via control plane (do not store per-tenant keys in `.env`)
  - Current: using global API key + `x-tenant-subdomain` header; control‑plane key resolution pending
- [ ] Add fallback pages for unknown/disabled tenants

Deliverables: tenant-aware theming, server helpers to call API by tenant, docs.

---

### Milestone 4 – Admin (school-ai-admin)
- [x] Tenant CRUD (create + inline update of `display_name`, `status`) — delete pending
- [x] Branding editor (basic inline hex + logo URL) — file upload palette UI pending
- [x] Per-tenant DB credentials form (URL, anon, service_role → encrypt on save)
- [ ] API key creation UI: requires `subdomain`; link key→tenant; show `sk-…` once
  - Current: `issue_api_key=true` on tenant create issues and links a key; UI to display one-time key value pending
- [ ] Tenant overview: usage, limits, last activity, rotate keys

Backend status: implemented. UI: tenants page live with create/inline edit/creds/link actions.

Deliverables: new screens + calls to API admin endpoints.

---

### Milestone 5 – Provisioning automation
- [x] Script/Action to create Supabase project for a tenant (region param)
- [x] Run school schema migrations against new project
- [x] Store tenant creds (encrypted) in control plane
- [ ] Create API key and link to tenant
- [ ] Create DNS record for `subdomain.speechanalyser.com`

Notes
- Migrations are applied via psql to the transaction pooler (host `aws-1-<region>.pooler.supabase.com`, port 6543, user `postgres.<project_ref>`, `sslmode=require`).
- The workflow waits for DB readiness and uses `DEFAULT_TENANT_DB_PASSWORD` (same `db_pass` used at project creation). Optional: store per-tenant DB passwords in `tenant_supabase_creds.db_password_encrypted`.

Deliverables: CLI script and runbook; optional GitHub Action workflow.

---

### Milestone 6 – DNS, TLS, deployment
- [ ] Wildcard DNS `*.speechanalyser.com` → frontend LB or CDN
- [ ] TLS: wildcard cert (managed cert or DNS-01 via certbot)
- [ ] Single deploy of API + single deploy of frontend; both tenant-aware
- [ ] Health checks per tenant (config & DB connectivity)

Deliverables: infra notes + checklist to onboard a new tenant end-to-end.

---

### Milestone 7 – Security, secrets, caching
- [x] Store `service_role_key` encrypted (AES/fernet) in control plane
- [ ] Add `CP_ENCRYPTION_KEY` rotation procedure
- [ ] Cache: key→tenant map, tenant config, Supabase clients (LRU/TTL)
- [ ] Audit logs: admin actions for tenant/key/creds changes

---

### Milestone 8 – QA & migration
- [ ] Backfill existing keys with tenant links (create default tenant as needed)
- [ ] Load test per-tenant isolation and rate limits
- [ ] E2E tests: subdomain → themed UI → API call logs under correct tenant

---

### Onboarding runbook (per school)
- [ ] Choose subdomain and upload branding
- [ ] Provision Supabase project (region), capture URL/keys
- [ ] Store creds (encrypted) in control plane
- [ ] Create API key with `description=subdomain` and link to tenant
- [ ] Add DNS record `subdomain.speechanalyser.com`
- [ ] Verify UI loads branding and API calls log with correct `tenant_id`

Notes
- Frontend code changes propagate to all tenants on each deploy; branding/config stay per-tenant
- Per-tenant DB ensures isolation; platform aggregates metadata, billing, and analytics in control plane


### Milestone 9 – Schema changes across all schools (Prisma + Supabase)

Important: updating the Prisma schema in the repo does NOT automatically change each school’s DB. We must run migrations for every tenant database.

- [ ] Generate migration once from the source `schema.prisma`
  - [ ] `prisma migrate dev` (local) to author the migration, commit it
  - [ ] Optionally export SQL: `prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script > migrations/<ts>_change.sql`
- [ ] Test the migration against a staging tenant DB
- [ ] Rollout pipeline (choose one):
  - [ ] A) GitHub Action iterates all tenants from control plane and runs `prisma migrate deploy` with `DATABASE_URL=<tenant_db_url>`
  - [ ] B) Script loops tenants and applies the SQL via `psql "$TENANT_DATABASE_URL" -f <migration.sql>`
  - [ ] C) Job matrix per tenant (if tenant count is small) with concurrency limit
- [ ] Safeguards
  - [ ] Backups enabled per Supabase project
  - [ ] Migrations backward‑compatible (add columns/tables first; avoid dropping in the same release)
  - [ ] Track version per tenant (Prisma manages `prisma_migrations` table)
- [ ] Verification
  - [ ] After rollout, check a canary query on each tenant (health endpoint that hits the changed table)
  - [ ] Alert on failures and halt pipeline
- [ ] New tenant provisioning uses the latest schema automatically (`prisma migrate deploy` during create)

Notes
- Use the Supabase “pooling” connection string with `sslmode=require&pgbouncer=true` for Prisma.
- Because each school has its own DB, running one migration per tenant is expected; the control plane simply orchestrates it.


