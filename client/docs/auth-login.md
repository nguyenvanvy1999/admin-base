# Admin Login & MFA Flow

## Overview

The admin login surface is implemented under `src/app/pages/LoginPage.tsx` and is powered by dedicated auth feature components in `src/features/auth`. The flow is fully type-safe via `react-hook-form` + `zod` and leans on `@tanstack/react-query` for async orchestration. Session state is centralized inside `src/store/authStore.ts`, which keeps tokens/user profile in sync with the `AuthProvider` context for route guards.

## API contracts

| Use case | Method | Endpoint | Payload | Response |
| --- | --- | --- | --- | --- |
| Primary login | `POST` | `/api/auth/login` | `LoginPayload` (`email`, `password`, `rememberDevice`, `deviceId`) | `LoginSuccessResponse` or `MfaRequiredResponse` / `BackupRequiredResponse` |
| Verify OTP | `POST` | `/api/auth/mfa/verify` | `VerifyMfaPayload` (`challengeId`, `code`, `rememberDevice`, `deviceId`) | `LoginSuccessResponse` |
| Resend OTP | `POST` | `/api/auth/mfa/resend` | `{ challengeId }` | `MfaChallenge` |
| Verify backup code | `POST` | `/api/auth/mfa/backup` | `VerifyBackupPayload` (`challengeId`, `backupCode`, `deviceId`) | `LoginSuccessResponse` |
| Current user | `GET` | `/api/auth/me` | `-` | `AuthUser` |
| Logout | `POST` | `/api/auth/logout` | `-` | `void` |

> All request/response DTOs live in `src/types/auth.ts` and are re-used across the hook, store and UI components.

## State machine

`useAuthFlow` (see `src/features/auth/hooks/useAuthFlow.ts`) encapsulates a small state machine:

1. `credentials` — renders `LoginForm` to capture email/password and `rememberDevice`.
2. `mfa` — triggered when the login response signals `mfa_required`. The `MfaStep` component handles OTP entry, resend logic, and the optional fallback to backup codes.
3. `backup` — triggered via `backup_required` responses or when the user requests the fallback.
4. `success` — emitted once `authService` returns a `LoginSuccessResponse`. The hook calls `completeSignIn` to persist tokens + user, which in turn unlocks every `ProtectedRoute`.

Each transition clears step-specific server errors so the UI always reflects the freshest validation state.

## Session persistence & guards

- `authStore.hydrate()` loads persisted tokens (access/refresh/device) from `localStorage` and keeps them in sync with `apiClient`.
- `AuthProvider` sits at the root of the app. It observes the store, lazily fetches `/api/auth/me` when an access token exists, and exposes `isBootstrapping`/`isLoadingProfile` to the rest of the app.
- `ProtectedRoute` now blocks rendering until bootstrapping + profile fetch are complete, then redirects unauthenticated visitors to `/login`.

## MFA & backup code UX

- OTP inputs use `Input.OTP` with a configurable length (`AUTH_MFA_CONFIG`) and display channel metadata (masked destination, retry countdown).
- Backup codes expose remaining quota hints and allow jumping back to the authenticator-based step.
- All CTA/labels are localized via `auth.*` namespaces in `src/locales/en|vi/translation.json`.

## Extensibility tips

- Extend `MfaMethod` in `src/types/auth.ts` when the backend introduces new channels (e.g., WebAuthn), then branch inside `MfaStep` for channel-specific copy.
- `authService.refreshTokens` is already defined; wire it into a background refresh effect if/when the backend exposes expiring access tokens.
- To audit sign-ins, hook into `completeSignIn` and dispatch analytics events once the session is established.

