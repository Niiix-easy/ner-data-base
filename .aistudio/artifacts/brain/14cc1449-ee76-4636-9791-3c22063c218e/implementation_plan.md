# Implementation Plan: API Key Management Overhaul - Phase 2

## 1. Goal
Implement 'Requests per Minute' (RPM) rate limiting and 'Webhooks' registration for API keys in the ZimaOS Dashboard.

## 2. Backend Updates (Control-Plane)
- [ ] Add `rpm_limit` (INTEGER, default 100) to `public.api_keys` table.
- [ ] Create `public.api_key_webhooks` table (id, api_key_id, url, event_type, created_at).
- [ ] Implement RPM rate limiting middleware in `services/control-plane/src/index.js` to enforce limits.
- [ ] Implement webhook triggering logic for events ('CREATED', 'ROTATED', 'REVOKED').

## 3. Frontend Updates (Dashboard)
- [ ] Update `ApiKey` interface in `services/dashboard/src/app/api-keys/page.tsx`.
- [ ] Add `RPM Limit` input field in the 'Create Key' form.
- [ ] Create a new 'Webhooks' tab in the API key detail/log modal.
- [ ] Add UI to register/delete webhook URLs for specific API keys.

## 4. Verification
- [ ] Verify RPM limit enforcement via simulated rapid requests.
- [ ] Verify webhook trigger by registering a mock endpoint (e.g., using a test URL).
