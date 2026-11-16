# Upgrade the seven-module workspace with guided reviews and gated customer persistence

The prior app stored synthetic tab-session records and had no authenticated customer workspace. This change preserves that demo and its exact fixtures while adding a three-step change wizard, source details, page/record search, unsaved-edit guards, due-work context, richer versioned reports and favicon/scroll metadata fixes.

Separate customer routes implement Supabase server identity and a PostgreSQL tenant repository. Transactions enforce membership, expected versions, idempotency, tenant-composite links, unique fingerprints/current notices, independent reviewer decisions and append-only history. Invitations are email-bound and single-use. Report exports are audited, including viewer exports. Customer mode remains disabled without complete secure configuration. Real uploads are intentionally unavailable.

Validation details and remaining critical hosted-service gates are in RELEASE_REPORT.md. The missing redesigned HTML/contract/SQL attachments were not invented: the available original reference and supplied prompt guided the work. No production database was altered and no client deployment was performed. New-install SQL refuses an existing schema; target-specific incremental migration remains a release gate.
