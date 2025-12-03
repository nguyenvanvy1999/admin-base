# Admin Login & MFA Flow

## Overview

The admin login surface is implemented under `src/app/pages/LoginPage.tsx` and is powered by dedicated auth feature
components in `src/features/auth`. All forms reuse Ant Design ProComponents (`LoginForm`, `ProForm*`) to keep
validation + UI consistent and lean on `@tanstack/react-query` for async orchestration. Session state is centralized
inside `src/store/authStore.ts`, which keeps tokens/user profile in sync with the `AuthProvider` context for route
guards.

## API contracts

| Use case                              | Method | Endpoint                            | Payload                              | Response                   |
|---------------------------------------|--------|-------------------------------------|--------------------------------------|----------------------------|
| Primary login                         | `POST` | `/api/auth/login`                   | `LoginPayload` (`email`, `password`) | `LoginResponse` union      |
| Submit OTP (existing MFA)             | `POST` | `/api/auth/login/mfa`               | `{ mfaToken, otp }`                  | `LoginSuccessResponse`     |
| Submit OTP after setup confirmation   | `POST` | `/api/auth/login/mfa/confirm`       | `{ mfaToken, loginToken, otp }`      | `LoginSuccessResponse`     |
| Request TOTP secret (during login)    | `POST` | `/api/auth/mfa/setup/request`       | `{ setupToken }`                     | `{ mfaToken, totpSecret }` |
| Confirm TOTP secret                   | `POST` | `/api/auth/mfa/setup/confirm`       | `{ mfaToken, otp }`                  | `{ mfaToken, loginToken }` |
| Verify backup code (any login branch) | `POST` | `/api/auth/mfa/backup-codes/verify` | `{ mfaToken, backupCode }`           | `LoginSuccessResponse`     |
| Current user                          | `GET`  | `/api/auth/me`                      | `-`                                  | `AuthUser`                 |
| Logout                                | `POST` | `/api/auth/logout`                  | `-`                                  | `void`                     |

> All request/response DTOs live in `src/types/auth.ts` and are re-used across the hook, store and UI components.

## State machine

`useAuthFlow` (see `src/features/auth/hooks/useAuthFlow.ts`) encapsulates a small state machine:

1. `credentials` — renders `LoginForm` to capture email/password.
2. `mfa-setup` — triggered when the login response signals `mfa-setup`. `MfaSetupWizard` fetches the TOTP secret
   (`setup/request`), displays the QR/secret, and confirms the first OTP (`setup/confirm`).
3. `mfa-challenge` — shown when either (a) the user already had MFA enabled or (b) setup just completed and we now have
   `{ mfaToken, loginToken }`. `MfaStep` handles the OTP submission for `/auth/login/mfa` or `/auth/login/mfa/confirm`.
4. `backup` — optional fallback that posts to `/auth/mfa/backup-codes/verify`.
5. `success` — emitted once `authService` returns a `LoginSuccessResponse`. The hook calls `completeSignIn` to persist
   tokens + user, which in turn unlocks every `ProtectedRoute`.

Each transition clears step-specific server errors so the UI always reflects the freshest validation state.

## Session persistence & guards

- `authStore.hydrate()` loads persisted tokens (access/refresh/device) from `localStorage` and keeps them in sync with
  `apiClient`.
- `AuthProvider` sits at the root of the app. It observes the store, lazily fetches `/api/auth/me` when an access token
  exists, and exposes `isBootstrapping`/`isLoadingProfile` to the rest of the app.
- `ProtectedRoute` now blocks rendering until bootstrapping + profile fetch are complete, then redirects unauthenticated
  visitors to `/login`.

## MFA & backup code UX

- OTP inputs use `Input.OTP` with the global length defined in `AUTH_MFA_CONFIG`.
- There is no “resend” CTA anymore because we rely on the authenticator app (TOTP). Instead, we surface lock warnings
  when the backend returns `Too many attempts`.
- `BackupCodeStep` is always available while a `mfaToken` exists so users can fall back at any time.
- `MfaSetupWizard` lives entirely client-side: it handles requesting a QR secret, generating an `otpauth://` URL for the
  QR code (`antd`'s `QRCode`), and then confirming the first OTP before handing control back to the main challenge step.
- All CTA/labels are localized via `auth.*` namespaces in `src/locales/en|vi/translation.json`.

## Extensibility tips

- If/when the backend introduces additional MFA channels (SMS, WebAuthn, etc.), extend the union types in
  `src/types/auth.ts` and branch inside `MfaStep` as needed.
- `authService.refreshTokens` already exists; wire it into a background refresh effect if/when refresh tokens become
  mandatory.
- To audit sign-ins, hook into `completeSignIn` and dispatch analytics events once the session is established.

