# Thiết kế lại luồng Auth + MFA (OTP/TOTP + Backup Code) theo hướng Transaction + Challenge

> Mục tiêu: làm luồng đăng nhập/MFA **rõ ràng như state machine**, giảm nhánh `if/else` rối trong `@server/src/services/auth/auth.service.ts`, chuẩn hoá API response, và **giữ (hoặc siết) bảo mật**.
>
> Phạm vi tài liệu: đăng nhập bằng password + step-up MFA (TOTP/backup code) + bắt buộc setup MFA. (Các OTP cho đăng ký/quên mật khẩu vẫn tách riêng.)

---

## 0) Bổ sung: OAuth flow (đồng bộ với auth mới)

Tài liệu này trước đây tập trung vào **Password + MFA**. Sau refactor auth, cần mô tả thêm **OAuth (Google)** như một "điểm vào" (entrypoint) khác của AuthFlow và đảm bảo response/behavior thống nhất.

### 0.1. Mục tiêu của OAuth refactor

- Chuẩn hoá OAuth login để trả về cùng kiểu kết quả với login mới:
  - `COMPLETED`: cấp session/tokens
  - `CHALLENGE`: yêu cầu bước tiếp theo (MFA challenge hoặc MFA enroll)
- Dùng lại **decision function** (`resolveNextStep`) và **Auth Transaction** (`authTx`) thay vì viết logic rẽ nhánh riêng cho OAuth.
- Đảm bảo OAuth cũng tuân thủ policy bảo mật giống password login: enforce MFA, risk-based MFA, binding ip/ua, attempt limits, audit log.

### 0.2. Endpoints hiện tại (tham chiếu code)

Trong code hiện có:

- `POST /auth/oauth/google` (public)
- `POST /auth/oauth/link-telegram` (requires auth)

File: `@server/src/modules/oauth/oauth.controller.ts`

> Ghi chú: `link-telegram` là luồng "link account" sau khi user đã login, không thuộc phần "đăng nhập" (issuance session). Phần refactor OAuth trong tài liệu này tập trung vào `/auth/oauth/google`.

### 0.3. OAuth Google login: luồng logic mong muốn

#### Input

`POST /auth/oauth/google`

- Nhận dữ liệu từ client để xác minh với Google (tuỳ implementation thực tế): `code` (authorization code) hoặc `idToken`.

#### Steps (logic tổng quát)

1. **Verify Google credential**
   - Validate `idToken` hoặc exchange `code` → lấy `googleProfile`.
   - Bắt lỗi các case: token invalid/expired/aud mismatch.
2. **Resolve user mapping**
   - Tìm user theo `provider=google` + `providerSubject` (google sub).
   - Nếu chưa có mapping:
     - Nếu hệ thống cho phép auto-create → tạo user + tạo oauthIdentity.
     - Nếu không auto-create → trả lỗi (hoặc yêu cầu user liên kết theo flow khác).
3. **User policy checks**
   - `assertCanLogin(user)` (active/blocked/...) giống password.
4. **Security / risk evaluation** (nếu có)
   - Evaluate risk theo IP/device; risk HIGH → block.
5. **Create authTx**
   - `state = PASSWORD_VERIFIED` (hoặc state trung tính kiểu `PRIMARY_AUTH_VERIFIED` nếu bạn muốn rename).
   - Bind `ipHash/uaHash`.
6. **Resolve next step** (dùng chung):
   - Nếu cần MFA enroll → trả `CHALLENGE: MFA_ENROLL`.
   - Nếu user đã bật MFA → trả `CHALLENGE: MFA_TOTP` (allow backup code).
   - Nếu không cần MFA → cấp session ngay → `COMPLETED`.

#### Output (chuẩn hoá)

- Nếu hoàn tất:

```json
{
  "status": "COMPLETED",
  "session": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600,
    "sessionId": "...",
    "user": { "...": "..." }
  }
}
```

- Nếu cần bước tiếp theo:

```json
{
  "status": "CHALLENGE",
  "authTxId": "...",
  "challenge": {
    "type": "MFA_TOTP",
    "allowBackupCode": true
  }
}
```

> Quan trọng: OAuth login không được "bỏ qua" enforce MFA. Nếu policy yêu cầu enroll hoặc challenge thì OAuth cũng phải trả về `CHALLENGE` giống password login.

### 0.4. Các bước refactor OAuth (step-by-step)

1. **Đổi response của `oauthService.googleLogin()`**
   - Từ `LoginResponseDto` hiện tại sang `AuthResponse` chuẩn hoá (`COMPLETED | CHALLENGE`).
   - Hoặc nếu cần backward compatible: giữ `LoginResponseDto` nhưng bọc thêm field `status` và dần migrate client.
2. **Trích xuất phần quyết định MFA thành nguồn chân lý chung**
   - Tái sử dụng `resolveNextStep(user, policy, securityResult)` đang dùng cho password.
3. **Tạo authTx trong OAuth flow**
   - Sau khi verify Google & resolve user, tạo `authTx` tương tự `POST /auth/login`.
4. **Đồng bộ controller swagger/DTO**
   - Update `oauth.controller.ts` response schema:
     - 200: `ResWrapper(AuthResponseDto)` (thay vì chỉ `LoginResponseDto`)
   - Đảm bảo mô tả endpoint ghi rõ có thể trả `CHALLENGE`.
5. **Audit log chuẩn hoá**
   - Thêm event: `oauth_login_started`, `oauth_login_failed`, `oauth_login_success`, và reuse `mfa_challenge_*` / `mfa_enroll_*`.

### 0.5. Mapping sang state machine hiện tại

- OAuth Google tương đương với bước "primary authentication verified" (thay password verify).
- Sau đó đi chung pipeline với password login:
  - `resolveNextStep` → `CHALLENGE_MFA_REQUIRED` / `CHALLENGE_MFA_ENROLL` / `COMPLETED`.

---

## 1) Hiện trạng & vấn đề

Trong `auth.service.ts` hiện tại, hàm đăng nhập đang trộn nhiều trách nhiệm:

- Xác thực password + lock/rate limit + kiểm tra trạng thái user + password expired
- Quyết định cần MFA hay không
- Nếu MFA bắt buộc mà user chưa setup → tạo setup token/cache
- Nếu user đã bật MFA → tạo mfa token/cache
- Nếu không → cấp session/token luôn
- Khi bổ sung **backup code** và các trường hợp (enforce MFA, step-up cho action nhạy cảm, OTP cho register/forgot...) thì **logic nổ nhánh** và khó đảm bảo nhất quán.

Các vấn đề điển hình:

- **API response không nhất quán**: client phải “đoán” xem bước tiếp theo là gì dựa vào field rời rạc.
- **Cache token phân tán** (mfa token, setup token, by-user token...) → khó quản TTL, revoke, audit.
- **MFA enabled** vs **MFA required by policy** bị trộn.
- Backup code thường thành endpoint/nhánh riêng → tăng độ phức tạp.

Kết luận: nên chuẩn hoá thành **Transaction** (phiên đăng nhập đang diễn ra) + **Challenge** (một bước phải hoàn thành).

---

## 2) Thiết kế mới: “Auth Transaction” + “Challenge”

### 2.1. Khái niệm

#### A. Auth Transaction (`authTx`)

Một “phiên” đăng nhập _chưa phát hành access/refresh token_.

- Lưu trong Redis (hoặc cache tương đương) theo `authTxId`
- TTL ngắn: **5–10 phút**
- Chứa metadata để quyết định và ràng buộc bảo mật:

```ts
type AuthTxState =
  | "PASSWORD_VERIFIED" // password OK, chưa quyết xong next step
  | "CHALLENGE_MFA_REQUIRED" // yêu cầu MFA (TOTP/backup)
  | "CHALLENGE_MFA_ENROLL" // bắt buộc enroll TOTP
  | "COMPLETED"; // đã cấp session (thường sẽ xoá tx)

interface AuthTx {
  id: string;
  userId: string;
  createdAt: number;
  state: AuthTxState;

  // binding (giảm nguy cơ bị đánh cắp authTxId)
  ipHash?: string;
  uaHash?: string;

  // chống brute-force ở bước challenge
  challengeAttempts: number;

  // kết quả đánh giá rủi ro (tuỳ hệ thống)
  securityResult?: {
    risk: "LOW" | "MEDIUM" | "HIGH";
    reasonCodes?: string[];
  };

  // dữ liệu enroll tạm
  enroll?: {
    enrollToken: string;
    tempTotpSecret: string;
    startedAt: number;
  };
}
```

> `authTx` thay thế cho nhiều loại token/cache rời rạc (mfaToken, setupToken...).

#### B. Challenge

Một bước user cần hoàn thành để tiếp tục.

Các challenge tối thiểu cho bài toán này:

- `MFA_TOTP`: nhập OTP từ app authenticator (TOTP)
- `MFA_BACKUP_CODE`: nhập backup code (one-time)
- `MFA_ENROLL`: bắt buộc setup TOTP trước khi cấp session

Sau này có thể mở rộng: `EMAIL_OTP`, `CAPTCHA`, `DEVICE_VERIFY`...

#### C. Response chuẩn hoá

Tất cả endpoints quan trọng trả về 1 trong 2 trạng thái:

- `COMPLETED`: cấp session/tokens
- `CHALLENGE`: cần bước tiếp theo

```ts
type AuthResponse =
  | {
      status: "COMPLETED";
      session: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        sessionId: string;
        user: unknown; // user dto
      };
    }
  | {
      status: "CHALLENGE";
      authTxId: string;
      challenge: ChallengeDto;
    };

type ChallengeDto =
  | { type: "MFA_TOTP"; allowBackupCode: true }
  | { type: "MFA_BACKUP_CODE" }
  | {
      type: "MFA_ENROLL";
      methods: Array<"totp">;
      backupCodesWillBeGenerated: boolean;
    };
```

> Client chỉ cần nhìn `status` để biết bước tiếp theo, không phải đoán.

---

## 3) Luồng đăng nhập mới (State machine rõ ràng)

### 3.1. Bước 1 — `POST /auth/login`

**Input**: `email`, `password` (tuỳ policy có thể kèm captcha)

**Nhiệm vụ** endpoint này chỉ nên gồm:

1. Normalize email → load user
2. Verify password + policy lock/rate-limit
3. Validate user status (active/blocked/...) và các điều kiện như password expired
4. securityMonitor (nếu có) → có thể block
5. Create `authTx`
6. Quyết định bước tiếp theo bằng 1 hàm duy nhất: `resolveNextStep()`

**Pseudo-code**:

```ts
async function startLogin(dto, ctx): Promise<AuthResponse> {
  const user = await usersRepo.findByEmail(normalize(dto.email));

  // Không leak user tồn tại hay không (tuỳ policy)
  await loginAttemptPolicy.assertAllowed(dto.email, ctx.ip);

  const passwordOk = await passwordService.verify(user, dto.password);
  if (!passwordOk) {
    await audit.log("login_failed", { userId: user?.id, ip: ctx.ip });
    throw new AuthError("INVALID_CREDENTIALS");
  }

  userPolicy.assertCanLogin(user);

  const securityResult = await securityMonitor.evaluateLogin({ user, ctx });
  if (securityResult.risk === "HIGH") {
    await audit.log("login_blocked", { userId: user.id, ...securityResult });
    throw new AuthError("LOGIN_BLOCKED");
  }

  const authTx = await authTxService.create({
    userId: user.id,
    ctx,
    securityResult,
    state: "PASSWORD_VERIFIED",
  });

  const next = resolveNextStep({ user, policy: mfaPolicy, securityResult });

  if (next.kind === "COMPLETE") {
    // optional: có thể bỏ authTx luôn nếu complete ngay
    await authTxService.delete(authTx.id);
    return completeLogin(user, ctx);
  }

  if (next.kind === "ENROLL_MFA") {
    await authTxService.setState(authTx.id, "CHALLENGE_MFA_ENROLL");
    return {
      status: "CHALLENGE",
      authTxId: authTx.id,
      challenge: {
        type: "MFA_ENROLL",
        methods: ["totp"],
        backupCodesWillBeGenerated: true,
      },
    };
  }

  // MFA challenge
  await authTxService.setState(authTx.id, "CHALLENGE_MFA_REQUIRED");
  return {
    status: "CHALLENGE",
    authTxId: authTx.id,
    challenge: { type: "MFA_TOTP", allowBackupCode: true },
  };
}
```

**Decision function duy nhất**:

```ts
function resolveNextStep({
  user,
  policy,
  securityResult,
}): { kind: "COMPLETE" } | { kind: "MFA_CHALLENGE" } | { kind: "ENROLL_MFA" } {
  // Ví dụ policy: bắt buộc MFA cho mọi user
  if (policy.mfaRequired && !user.mfaTotpEnabled) return { kind: "ENROLL_MFA" };

  // Ví dụ: user đã bật MFA
  if (user.mfaTotpEnabled) return { kind: "MFA_CHALLENGE" };

  // (tuỳ chọn) risk-based MFA: risk cao -> bắt MFA
  if (policy.riskBased && securityResult?.risk === "MEDIUM") {
    return user.mfaTotpEnabled
      ? { kind: "MFA_CHALLENGE" }
      : { kind: "ENROLL_MFA" };
  }

  return { kind: "COMPLETE" };
}
```

### 3.2. Bước 2 — `POST /auth/login/challenge`

Dùng chung cho **TOTP** và **backup code**.

**Input**:

```json
{
  "authTxId": "...",
  "type": "MFA_TOTP" | "MFA_BACKUP_CODE",
  "code": "123456" | "backup-code"
}
```

**Flow**:

1. Load `authTx` từ cache; check TTL
2. Check state phải là `CHALLENGE_MFA_REQUIRED`
3. (Optional nhưng khuyến nghị) verify binding ip/ua
4. Check attempt limit
5. Verify code theo type
6. Nếu OK → completeLogin() cấp token/session
7. Xoá `authTx`

**Pseudo-code**:

```ts
async function completeChallenge(input, ctx): Promise<AuthResponse> {
  const tx = await authTxService.getOrThrow(input.authTxId);
  authTxService.assertBinding(tx, ctx);

  if (tx.state !== "CHALLENGE_MFA_REQUIRED") {
    throw new AuthError("INVALID_STATE");
  }

  await authTxService.assertChallengeAttemptsAllowed(tx);

  const user = await usersRepo.findById(tx.userId);

  let ok = false;
  if (input.type === "MFA_TOTP") {
    ok = await mfaService.verifyTotp(user, input.code);
  } else if (input.type === "MFA_BACKUP_CODE") {
    ok = await mfaService.verifyBackupCodeAndConsume(user, input.code);
  }

  if (!ok) {
    await authTxService.incrementChallengeAttempts(tx.id);
    await audit.log("mfa_challenge_failed", {
      userId: user.id,
      type: input.type,
      ip: ctx.ip,
    });
    throw new AuthError("INVALID_MFA_CODE");
  }

  await audit.log("mfa_challenge_passed", {
    userId: user.id,
    type: input.type,
    ip: ctx.ip,
  });
  await authTxService.delete(tx.id);

  return completeLogin(user, ctx);
}
```

> Backup code chỉ là một `type` trong challenge, không cần endpoint riêng.

### 3.3. Bắt buộc setup MFA — enroll flow

Khi `POST /auth/login` trả về `MFA_ENROLL`, client thực hiện 2 bước:

#### A) `POST /auth/mfa/enroll/start`

**Input**: `{ authTxId }`

**Output**: `otpauthUrl` hoặc QR payload + `enrollToken`

**Pseudo-code**:

```ts
async function enrollStart({ authTxId }, ctx) {
  const tx = await authTxService.getOrThrow(authTxId);
  authTxService.assertBinding(tx, ctx);

  if (tx.state !== "CHALLENGE_MFA_ENROLL") throw new AuthError("INVALID_STATE");

  const user = await usersRepo.findById(tx.userId);

  const { tempSecret, otpauthUrl } = await mfaService.generateTempTotpSecret(
    user
  );
  const enrollToken = crypto.randomUUID();

  await authTxService.attachEnroll(tx.id, {
    enrollToken,
    tempTotpSecret: tempSecret,
    startedAt: Date.now(),
  });

  await audit.log("mfa_enroll_started", { userId: user.id, ip: ctx.ip });

  return { authTxId: tx.id, enrollToken, otpauthUrl };
}
```

#### B) `POST /auth/mfa/enroll/confirm`

**Input**: `{ authTxId, enrollToken, otp }`

**Flow**:

1. Load tx, check state `CHALLENGE_MFA_ENROLL`
2. Verify `enrollToken` + OTP against `tempTotpSecret`
3. Persist secret vào DB (`user.mfaTotpEnabled = true`)
4. Generate backup codes (nếu policy yêu cầu) và trả **1 lần duy nhất**
5. Sau enroll xong: **đề xuất cấp session ngay** (vì vừa chứng minh sở hữu thiết bị TOTP)

**Pseudo-code**:

```ts
async function enrollConfirm(
  input,
  ctx
): Promise<AuthResponse & { backupCodes?: string[] }> {
  const tx = await authTxService.getOrThrow(input.authTxId);
  authTxService.assertBinding(tx, ctx);

  if (tx.state !== "CHALLENGE_MFA_ENROLL") throw new AuthError("INVALID_STATE");
  if (!tx.enroll || tx.enroll.enrollToken !== input.enrollToken)
    throw new AuthError("INVALID_ENROLL_TOKEN");

  const user = await usersRepo.findById(tx.userId);

  const otpOk = await mfaService.verifyTotpWithSecret(
    tx.enroll.tempTotpSecret,
    input.otp
  );
  if (!otpOk) {
    await authTxService.incrementChallengeAttempts(tx.id);
    throw new AuthError("INVALID_MFA_CODE");
  }

  await mfaService.persistTotpSecret(user.id, tx.enroll.tempTotpSecret);
  const backupCodes = await mfaService.generateAndStoreBackupCodes(user.id);

  await audit.log("mfa_enroll_completed", { userId: user.id, ip: ctx.ip });
  await authTxService.delete(tx.id);

  const completed = await completeLogin(user, ctx);
  return { ...completed, backupCodes };
}
```

**Tại sao nên cấp session ngay sau enroll?**

- User vừa chứng minh sở hữu secret (OTP hợp lệ) → tương đương vượt qua challenge.
- Giảm số bước cho người dùng, giảm API round-trip.

Nếu bạn muốn “siết” hơn (bắt user nhập OTP lần nữa) vẫn làm được: sau enroll confirm chỉ set state sang `CHALLENGE_MFA_REQUIRED` và yêu cầu `/auth/login/challenge`. Nhưng thường không cần.

---

## 4) API đề xuất (tối giản nhưng rõ)

### Auth

- `POST /auth/login` → `COMPLETED` hoặc `CHALLENGE`
- `POST /auth/login/challenge` → submit `MFA_TOTP` hoặc `MFA_BACKUP_CODE`

### MFA enroll (khi cần)

- `POST /auth/mfa/enroll/start`
- `POST /auth/mfa/enroll/confirm`

### Giữ nguyên các endpoint khác

- refresh token, logout, logout all, me...
- register / verify-account / forgot-password ... (OTP email độc lập)

---

## 5) Tổ chức code (refactor đề xuất cho `auth.service.ts`)

### 5.1. Tách 3 service chính

1. **AuthFlowService** (orchestrator)

   - `startLogin()`
   - `completeChallenge()`
   - `enrollStart()`
   - `enrollConfirm()`

2. **AuthTxService** (Redis/cache)

   - `create/get/update/delete`
   - `assertBinding(ip/ua)`
   - `assertChallengeAttemptsAllowed()`
   - `incrementChallengeAttempts()`

3. **MfaService** (logic MFA)
   - `verifyTotp(user, code)`
   - `verifyBackupCodeAndConsume(user, code)`
   - `generateTempTotpSecret(user)`
   - `persistTotpSecret(userId, secret)`
   - `generateAndStoreBackupCodes(userId)`

> `auth.service.ts` nên trở thành façade gọi `AuthFlowService`, hoặc tách file mới rồi migrate dần.

### 5.2. Mấu chốt: 1 “decision function” duy nhất

Không để nhiều nơi tự suy luận `mfaRequired`, `mfaEnabled`, `setupToken`...

- `resolveNextStep(user, policy, securityResult)` là nguồn chân lý.

---

## 6) Bảo mật: đảm bảo & nâng cấp

### 6.1. TTL + attempt limits

- `authTx` TTL: 5–10 phút
- attempts cho challenge: ví dụ **5 lần / tx**, hoặc kết hợp sliding window theo IP
- lock theo user/email khi password sai quá nhiều

### 6.2. Binding `authTxId` với IP/UA

- Lưu `ipHash`, `uaHash` trong tx
- Khi submit challenge/enroll, so sánh hash
- Tuỳ UX, có thể strict với IP, mềm với UA (vì UA có thể thay đổi nhẹ)

### 6.3. Audit log theo state

Gợi ý event names:

- `login_failed`, `login_success`
- `mfa_challenge_started`, `mfa_challenge_failed`, `mfa_challenge_passed`
- `mfa_enroll_started`, `mfa_enroll_completed`
- `backup_code_used`

### 6.4. Không leak thông tin

- Login fail trả thông báo chung (`INVALID_CREDENTIALS`)
- Nhưng audit log nội bộ vẫn ghi lý do

### 6.5. Session hygiene

- Khi complete → rotate refresh token như hiện tại
- Revoke sessions khi reset password / thay đổi bảo mật
- Nếu tx bị expire → phải login lại từ đầu

---

## 7) Mapping từ hệ thống hiện tại sang thiết kế mới

Bạn đang có:

- `mfaCache` (mfaToken)
- `mfaSetupTokenCache` + `mfaSetupTokenByUserCache`
- `otpService` (register/forgot)

Đề xuất migration:

1. Giữ `otpService` cho register/forgot như hiện tại (OTP email độc lập)
2. Thay `mfaToken` + `setupToken*` bằng **duy nhất** `authTxId`
3. Trong `authTx`, dùng `state` để phân biệt:
   - `CHALLENGE_MFA_REQUIRED`
   - `CHALLENGE_MFA_ENROLL`
4. Gộp logic “confirm MFA login” và “login with backup code” vào `POST /auth/login/challenge`

---

## 8) Đầu việc cụ thể cần làm (Task breakdown)

### A. Thiết kế dữ liệu & DTO

- [ ] Định nghĩa `AuthTx` model (ts interface) + schema serialize (JSON)
- [x] Định nghĩa `AuthResponse` + `ChallengeDto`
- [x] Chuẩn hoá error codes (`INVALID_CREDENTIALS`, `INVALID_MFA_CODE`, `INVALID_STATE`, ...)

### B. AuthTxService (Redis)

- [ ] `createAuthTx(userId, ctx, securityResult)`
- [ ] `getAuthTxOrThrow(authTxId)`
- [ ] `setState(authTxId, state)`
- [ ] `attachEnroll(authTxId, enrollData)`
- [ ] attempt counter helpers
- [ ] binding helpers (ip/ua)

### C. AuthFlowService

- [x] `startLogin()` (bước password)
- [x] `completeChallenge()` (TOTP/backup/email)
- [x] `enrollStart()`
- [x] `enrollConfirm()`
- [x] `resolveNextStep()` function

### D. MFA service adjustments

- [ ] verify TOTP
- [ ] verify + consume backup code (atomic)
- [ ] generate temp secret + persist secret
- [ ] generate backup codes và chỉ trả 1 lần

### E. Controller/API wiring

- [ ] Cập nhật routes theo 4 endpoint mới
- [ ] Backward compatibility (nếu cần) bằng cách giữ endpoint cũ và proxy sang flow mới

### F. Security & Observability

- [ ] Audit log theo state
- [ ] Rate limit cho password + challenge
- [ ] Metrics (success/fail) nếu hệ thống có

---

## 9) Phác thảo code mẫu (skeleton)

### 9.1. AuthTxService (ví dụ)

```ts
export class AuthTxService {
  constructor(private readonly redis: Redis) {}

  async create(input: {
    userId: string;
    ctx: { ip: string; ua?: string };
    securityResult?: any;
    state: AuthTxState;
  }): Promise<AuthTx> {
    const id = crypto.randomUUID();
    const tx: AuthTx = {
      id,
      userId: input.userId,
      createdAt: Date.now(),
      state: input.state,
      ipHash: hashIp(input.ctx.ip),
      uaHash: input.ctx.ua ? hashUa(input.ctx.ua) : undefined,
      challengeAttempts: 0,
      securityResult: input.securityResult,
    };

    await this.redis.setex(this.key(id), 600, JSON.stringify(tx));
    return tx;
  }

  async getOrThrow(id: string): Promise<AuthTx> {
    const raw = await this.redis.get(this.key(id));
    if (!raw) throw new AuthError("AUTH_TX_EXPIRED");
    return JSON.parse(raw);
  }

  async save(tx: AuthTx): Promise<void> {
    // giữ TTL còn lại: tuỳ Redis client, có thể lấy TTL rồi setex lại
    await this.redis.set(this.key(tx.id), JSON.stringify(tx), "EX", 600);
  }

  assertBinding(tx: AuthTx, ctx: { ip: string; ua?: string }) {
    if (tx.ipHash && tx.ipHash !== hashIp(ctx.ip))
      throw new AuthError("AUTH_TX_BINDING_MISMATCH");
    if (tx.uaHash && ctx.ua && tx.uaHash !== hashUa(ctx.ua))
      throw new AuthError("AUTH_TX_BINDING_MISMATCH");
  }

  async incrementChallengeAttempts(id: string) {
    const tx = await this.getOrThrow(id);
    tx.challengeAttempts += 1;
    await this.save(tx);
  }

  async assertChallengeAttemptsAllowed(tx: AuthTx) {
    if (tx.challengeAttempts >= 5) throw new AuthError("TOO_MANY_ATTEMPTS");
  }

  async delete(id: string) {
    await this.redis.del(this.key(id));
  }

  private key(id: string) {
    return `auth:tx:${id}`;
  }
}
```

### 9.2. AuthFlowService (ý tưởng)

```ts
export class AuthFlowService {
  constructor(
    private readonly usersRepo: UsersRepo,
    private readonly authTx: AuthTxService,
    private readonly mfa: MfaService,
    private readonly session: SessionService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService
  ) {}

  async startLogin(dto, ctx): Promise<AuthResponse> {
    // giống phần pseudo ở trên
  }

  async completeChallenge(input, ctx): Promise<AuthResponse> {
    // giống phần pseudo ở trên
  }

  async enrollStart(input, ctx) {
    // giống phần pseudo ở trên
  }

  async enrollConfirm(input, ctx) {
    // giống phần pseudo ở trên
  }

  private async completeLogin(user, ctx): Promise<AuthResponse> {
    const session = await this.session.issue(user, ctx);
    await this.audit.log("login_success", { userId: user.id, ip: ctx.ip });
    return { status: "COMPLETED", session };
  }
}
```

---

## 10) Quyết định cần bạn xác nhận (để chốt behavior)

1. Khi `MFA_ENROLL` (bắt buộc setup) và user confirm OTP thành công: **cấp session ngay** hay bắt nhập OTP thêm lần nữa?

   - Khuyến nghị: **cấp session ngay**.

2. Backup code submit chung endpoint `POST /auth/login/challenge` hay tách endpoint riêng?
   - Khuyến nghị: **chung endpoint** (giảm nhánh, dễ maintain).

---

## Commit message gợi ý (English)

`refactor(auth): redesign login flow using auth transaction and unified MFA challenges`

---

## 11) So sánh Implementation hiện tại với Thiết kế

### ✅ ĐÃ TRIỂN KHAI (Implemented)

#### A. Core Infrastructure

1. **AuthTx Service** ✅

   - File: `src/services/auth/auth-tx.service.ts`
   - Đã implement đầy đủ: create, get, update, delete, setState, attachEnroll
   - Có binding IP/UA hash
   - Có challenge attempts tracking
   - TTL: 300s (5 phút)
   - Cache: Redis-based (`authTxCache`)

2. **Auth Types** ✅

   - File: `src/types/auth.types.ts`
   - Đã định nghĩa: `AuthTxState`, `AuthTx`, `ChallengeDto`
   - States: `PASSWORD_VERIFIED`, `CHALLENGE_MFA_REQUIRED`, `CHALLENGE_MFA_ENROLL`, `COMPLETED`

3. **AuthFlow Service** ✅

   - File: `src/services/auth/auth-flow.service.ts`
   - Đã implement:
     - `startLogin()` - Password verification + decision logic
     - `completeChallenge()` - MFA TOTP/Backup code verification
     - `enrollStart()` - Start MFA enrollment
     - `enrollConfirm()` - Confirm MFA enrollment with backup codes
     - `resolveNextStep()` - Decision function

4. **AuthFlow Controller** ✅

   - File: `src/modules/auth/auth-flow.controller.ts`
   - Endpoints:
     - `POST /auth2/login`
     - `POST /auth2/login/challenge`
     - `POST /auth2/mfa/enroll/start`
     - `POST /auth2/mfa/enroll/confirm`

5. **MFA Service** ✅

   - File: `src/services/auth/mfa.service.ts`
   - Backup codes: generation, hashing, parsing
   - Integrated vào `auth-flow.service.ts` (TOTP verify, backup code consume)

6. **Security Monitor** ✅

   - File: `src/services/auth/security-monitor.service.ts`
   - Device fingerprinting
   - Unknown device detection
   - Risk evaluation (allow/block)
   - Audit logging for suspicious activity

7. **OAuth Integration** ✅

   - File: `src/services/auth/oauth.service.ts`
   - Google OAuth đã tích hợp với AuthTx flow
   - Sử dụng `resolveNextStep()` chung
   - Trả về `AuthResponse` chuẩn (COMPLETED/CHALLENGE)
   - Hỗ trợ MFA challenge/enroll sau OAuth login

8. **DTOs** ✅

   - File: `src/dtos/auth.dto.ts`
   - `AuthResponseDto` (union of COMPLETED/CHALLENGE)
   - `ChallengeDto`
   - Request/Response DTOs cho tất cả endpoints

9. **Audit Logging** ✅

   - Đầy đủ security events:
     - `login_failed`, `login_success`
     - `mfa_challenge_started`, `mfa_verified`, `mfa_failed`
     - `mfa_setup_started`, `mfa_setup_completed`
     - `suspicious_activity`
   - Integrated vào `AuditLog` model với `SecurityEventType` enum

10. **Database Schema** ✅
    - User model có đầy đủ MFA fields:
      - `mfaTotpEnabled`, `totpSecret`
      - `backupCodes`, `backupCodesUsed`
    - Session tracking với device fingerprint
    - Security event types trong enum
    - Account lockout support

#### B. Supporting Features

11. **Password Service** ✅

    - File: `src/services/auth/password.service.ts`
    - Verify and track attempts
    - Password expiration validation
    - Hashing/comparison

12. **Session Service** ✅

    - File: `src/services/auth/session.service.ts`
    - Session creation/revocation
    - Token management

13. **Captcha Service** ✅

    - File: `src/services/auth/captcha.service.ts`
    - Text và Math captcha
    - Token-based validation
    - Cache-based storage

14. **Rate Limiting** ✅
    - Auth rate limit config: `src/services/rate-limit/auth-rate-limit.config.ts`
    - Applied to auth endpoints

---

### ⚠️ CẦN CẢI THIỆN (Needs Improvement)

#### 1. **Captcha Integration vào Login Flow** ⚠️

**Hiện trạng:**

- Captcha service đã có (`captchaService`)
- Endpoint riêng: `GET /captcha/generate`, `POST /captcha/verify`
- **CHƯA** tích hợp vào `POST /auth2/login`

**Cần làm:**

- [ ] Thêm optional field `captcha` vào `LoginRequestDto`:
  ```ts
  {
    email: string;
    password: string;
    captcha?: { token: string; userInput: string };
  }
  ```
- [ ] Trong `authFlowService.startLogin()`, validate captcha nếu policy yêu cầu:
  ```ts
  const captchaRequired = await settingsService.captchaRequired();
  if (captchaRequired && !params.captcha) {
    throw new BadReqErr(ErrCode.CaptchaRequired);
  }
  if (params.captcha) {
    const valid = await captchaService.validateCaptcha(params.captcha);
    if (!valid) throw new BadReqErr(ErrCode.InvalidCaptcha);
  }
  ```
- [ ] Thêm setting `CAPTCHA_REQUIRED` vào `Setting` model
- [ ] Update design doc section 3.1 để mention captcha

**Lý do quan trọng:**

- Thiết kế doc đề cập: "tuỳ policy có thể kèm captcha" (line 244)
- Chống brute-force login attempts

---

#### 2. **Risk-Based MFA** ⚠️

**Hiện trạng:**

- `securityMonitorService.evaluateLogin()` đã có
- Trả về `SecurityCheckResult` với `action: 'allow' | 'block'`
- **CHƯA** implement logic "risk-based MFA" như trong design (section 3.1, line 330-335)

**Cần làm:**

- [ ] Mở rộng `SecurityCheckResult` để có `risk: 'LOW' | 'MEDIUM' | 'HIGH'`
- [ ] Update `resolveNextStep()` để xử lý risk-based MFA:
  ```ts
  // Nếu risk MEDIUM/HIGH → bắt buộc MFA challenge
  if (securityResult?.risk === "MEDIUM" || securityResult?.risk === "HIGH") {
    if (!user.mfaTotpEnabled) return { kind: "ENROLL_MFA" };
    return { kind: "MFA_CHALLENGE" };
  }
  ```
- [ ] Thêm setting `MFA_RISK_BASED_ENABLED` vào Settings
- [ ] Cải thiện `securityMonitorService` để đánh giá risk level (không chỉ allow/block)

**Ví dụ risk factors:**

- Unknown device → MEDIUM
- Unknown IP + unknown device → HIGH
- Multiple failed attempts → HIGH

---

#### 3. **Backup Code Regeneration** ⚠️

**Hiện trạng:**

- Backup codes được generate khi enroll MFA
- **CHƯA** có endpoint để user regenerate backup codes (khi đã dùng hết hoặc mất)

**Cần làm:**

- [ ] Thêm endpoint `POST /auth/mfa/backup-codes/regenerate` (requires auth + MFA verify)
- [ ] Service method:
  ```ts
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    // Verify user đã enable MFA
    // Generate new codes
    // Update DB
    // Return codes (1 lần duy nhất)
    // Audit log
  }
  ```
- [ ] Yêu cầu verify TOTP trước khi regenerate (security)
- [ ] Audit log: `backup_codes_regenerated`

---

#### 4. **MFA Disable Flow** ✅

**Hiện trạng:**

- Có thể enable MFA (enroll flow)
- **CHƯA** có flow để disable MFA

**Cần làm:**

- [x] Endpoint `POST /auth/mfa/disable` (requires auth)
- [x] Yêu cầu verify password + TOTP code trước khi disable
- [x] Update user: `mfaTotpEnabled = false`, clear `totpSecret`, `backupCodes`
- [x] Audit log: `mfa_disabled`
- [ ] Notification: email cảnh báo user về việc disable MFA

---

#### 5. **Session Hygiene - Revoke on Security Changes** ✅

**Hiện trạng:**

- `sessionService.revoke()` đã có
- Được gọi khi forgot password
- **CHƯA** được gọi khi:
  - User disable MFA
  - User change password (trong `auth.service.ts` line 168-175 không revoke session)
  - Admin force password reset

**Cần làm:**

- [x] Trong `changePassword()`: thêm `await sessionService.revoke(userId)` sau update password
- [x] Trong MFA disable: revoke all sessions
- [x] Trong admin force password reset: revoke all sessions (Note: Admin password reset feature not currently implemented)
- [x] Setting: `REVOKE_SESSIONS_ON_PASSWORD_CHANGE` (optional, default true)

---

#### 6. **AuthTx Cleanup Job** ⚠️

**Hiện trạng:**

- AuthTx có TTL 300s trong Redis
- Redis tự động expire
- **CHƯA** có monitoring/cleanup job cho orphaned transactions

**Cần làm:**

- [ ] (Optional) Background job để log expired transactions (analytics)
- [ ] Metrics: track số lượng transactions created vs completed
- [ ] Alert nếu completion rate thấp (có thể do UX issue)

---

#### 7. **OAuth Telegram Login** ⚠️

**Hiện trạng:**

- Telegram chỉ có `linkTelegram()` (link account sau khi đã login)
- **CHƯA** có Telegram login flow (như Google)

**Cần làm:**

- [ ] Implement `telegramLogin()` tương tự `googleLogin()`
- [ ] Endpoint: `POST /auth/oauth/telegram`
- [ ] Sử dụng chung `authTx` flow
- [ ] Trả về `AuthResponse` chuẩn

---

#### 8. **Error Code Standardization** ⚠️

**Hiện trạng:**

- Đã có `ErrCode` enum
- Các error codes được sử dụng: `PasswordNotMatch`, `InvalidOtp`, `InvalidBackupCode`, etc.
- **CHƯA** có error codes cho một số case mới:
  - `CaptchaRequired`
  - `InvalidCaptcha`
  - `BackupCodesExhausted` (khi user đã dùng hết backup codes)

**Cần làm:**

- [ ] Thêm error codes vào `ErrCode` enum
- [ ] Đảm bảo error messages không leak thông tin (vd: "Invalid credentials" thay vì "User not found")

---

#### 9. **Documentation & API Spec** ⚠️

**Hiện trạng:**

- Swagger docs có cho `/auth2/*` endpoints
- **CHƯA** có:
  - Sequence diagrams cho các flows
  - Postman collection
  - Client integration guide

**Cần làm:**

- [ ] Tạo sequence diagrams:
  - Password login → MFA challenge → Complete
  - Password login → MFA enroll → Complete
  - OAuth login → MFA challenge
- [ ] Postman collection với examples
- [ ] Client SDK/helper functions (nếu có frontend codebase)

---

#### 10. **Testing Coverage** ⚠️

**Hiện trạng:**

- Có test folder: `server/test/`
- **CHƯA** rõ coverage cho auth flow mới

**Cần làm:**

- [ ] Unit tests cho `AuthFlowService`:
  - `startLogin()` với các scenarios
  - `completeChallenge()` TOTP/backup code
  - `enrollStart()` và `enrollConfirm()`
  - `resolveNextStep()` decision logic
- [ ] Integration tests:
  - Full login flow (password → MFA → complete)
  - OAuth → MFA flow
  - Enroll flow
- [ ] Security tests:
  - Brute-force protection
  - AuthTx binding (IP/UA mismatch)
  - Expired authTx
  - Invalid backup codes

---

### ❌ THIẾU HOÀN TOÀN (Missing)

#### 1. **Email OTP Challenge** ❌

**Thiết kế đề cập:**

- Section 2.1.B: "Sau này có thể mở rộng: `EMAIL_OTP`, `CAPTCHA`, `DEVICE_VERIFY`..."

**Hiện trạng:**

- Có `otpService` cho register/forgot password
- **CHƯA** có Email OTP như một MFA challenge method (thay thế TOTP)

**Cần làm (nếu muốn):**

- [ ] Extend `ChallengeDto` để có `EMAIL_OTP` type
- [ ] Trong `resolveNextStep()`: cho phép chọn Email OTP thay TOTP
- [ ] `POST /auth/login/challenge` accept `type: 'EMAIL_OTP'`
- [ ] Send OTP qua email khi challenge started
- [ ] Verify OTP code

**Lưu ý:** Đây là optional feature, không critical cho MVP.

---

#### 2. **Device Verification Challenge** ❌

**Thiết kế đề cập:**

- Section 2.1.B: "DEVICE_VERIFY"

**Hiện trạng:**

- Có device fingerprinting trong `securityMonitorService`
- **CHƯA** có flow "verify device" (vd: gửi link verify qua email khi login từ device mới)

**Cần làm (nếu muốn):**

- [ ] Challenge type: `DEVICE_VERIFY`
- [ ] Khi unknown device → tạo verify token → gửi email
- [ ] User click link → verify device → complete login
- [ ] Store verified devices per user

**Lưu ý:** Advanced feature, không cần thiết cho MVP.

---

#### 3. **Step-up Authentication** ❌

**Thiết kế đề cập:**

- Section 1: "step-up cho action nhạy cảm"

**Hiện trạng:**

- Auth flow chỉ dùng cho login
- **CHƯA** có mechanism để yêu cầu re-authenticate cho sensitive actions (vd: change password, delete account, transfer funds)

**Cần làm (nếu muốn):**

- [ ] Middleware `requireStepUp(action)`
- [ ] Tạo authTx cho step-up (không phải login)
- [ ] Challenge user với TOTP/password
- [ ] Cache "step-up verified" trong session (TTL ngắn: 5-10 phút)

**Lưu ý:** Advanced security feature.

---

#### 4. **Admin Force MFA Enrollment** ❌

**Hiện trạng:**

- MFA enrollment được trigger bởi setting `MFA_REQUIRED`
- **CHƯA** có admin UI/API để force specific users enroll MFA

**Cần làm (nếu muốn):**

- [ ] Admin endpoint: `POST /admin/users/:id/force-mfa-enroll`
- [ ] Set flag trên user: `mfaEnrollRequired: true`
- [ ] Login flow check flag này (ngoài global setting)
- [ ] User bắt buộc enroll MFA ngay lần login tiếp theo

---

#### 5. **MFA Recovery Codes (khác Backup Codes)** ❌

**Hiện trạng:**

- Có backup codes (one-time use)
- **CHƯA** có "recovery codes" (dùng để disable MFA khi mất device)

**Phân biệt:**

- **Backup codes**: dùng thay TOTP để login (tiêu hao sau khi dùng)
- **Recovery codes**: dùng để disable MFA hoàn toàn (khi mất authenticator app)

**Cần làm (nếu muốn):**

- [ ] Generate recovery code khi enroll MFA (1 code duy nhất, dài hơn backup code)
- [ ] Endpoint: `POST /auth/mfa/recover` (public, không cần auth)
  - Input: email + recovery code
  - Action: disable MFA cho user
  - Audit log + email notification
- [ ] Store recovery code hash trong DB

---

### 📊 Tổng kết Implementation Status

| Hạng mục                     | Trạng thái | Ghi chú                                |
| ---------------------------- | ---------- | -------------------------------------- |
| **Core Auth Transaction**    | ✅ 100%    | Hoàn chỉnh                             |
| **Password Login Flow**      | ✅ 100%    | Hoàn chỉnh                             |
| **MFA TOTP Challenge**       | ✅ 100%    | Hoàn chỉnh                             |
| **MFA Backup Code**          | ✅ 100%    | Hoàn chỉnh                             |
| **MFA Enrollment**           | ✅ 100%    | Hoàn chỉnh                             |
| **OAuth Google Integration** | ✅ 100%    | Hoàn chỉnh                             |
| **Security Monitoring**      | ✅ 90%     | Thiếu risk levels                      |
| **Audit Logging**            | ✅ 100%    | Hoàn chỉnh                             |
| **Captcha Integration**      | ⚠️ 50%     | Service có, chưa integrate vào login   |
| **Risk-Based MFA**           | ⚠️ 30%     | Cơ sở hạ tầng có, chưa implement logic |
| **MFA Management**           | ✅ 90%     | Disable implemented, missing regenerate |
| **Session Hygiene**          | ✅ 100%    | Revoke on security changes implemented |
| **OAuth Telegram Login**     | ❌ 0%      | Chỉ có link account                    |
| **Email OTP Challenge**      | ❌ 0%      | Chưa implement                         |
| **Device Verification**      | ❌ 0%      | Chưa implement                         |
| **Step-up Auth**             | ❌ 0%      | Chưa implement                         |

---

### 🎯 Khuyến nghị Ưu tiên (Priority Recommendations)

#### **P0 - Critical (Cần làm ngay)**

1. ✅ **Captcha Integration** - Chống brute-force
2. ✅ **Session Revoke on Password Change** - Security hygiene
3. ✅ **MFA Disable Flow** - User experience

#### **P1 - High (Nên làm sớm)**

4. ✅ **Risk-Based MFA** - Adaptive security
5. ✅ **Backup Code Regeneration** - User recovery
6. ✅ **Error Code Standardization** - Better error handling

#### **P2 - Medium (Có thể làm sau)**

7. ⚠️ **OAuth Telegram Login** - Nếu có user base Telegram
8. ⚠️ **Testing Coverage** - Quality assurance
9. ⚠️ **Documentation** - Developer experience

#### **P3 - Low (Nice to have)**

10. ⚠️ **Email OTP Challenge** - Alternative MFA method
11. ⚠️ **Device Verification** - Advanced security
12. ⚠️ **Step-up Auth** - For sensitive operations
13. ⚠️ **MFA Recovery Codes** - Edge case recovery

---

### 📝 Action Items Summary

**Để hoàn thiện hệ thống theo thiết kế, cần:**

**Backend:**

- [ ] Integrate captcha vào login endpoint
- [ ] Implement risk-based MFA logic
- [x] Add MFA disable endpoint
- [x] Add backup code regeneration endpoint
- [x] Revoke sessions on security changes
- [ ] Add missing error codes
- [ ] Improve security monitor risk levels

**Database:**

- [x] Add settings: `REVOKE_SESSIONS_ON_PASSWORD_CHANGE`
- [ ] Add settings: `CAPTCHA_REQUIRED`, `MFA_RISK_BASED_ENABLED`
- [ ] (Optional) Add `mfaEnrollRequired` field to User model

**Testing:**

- [ ] Unit tests cho AuthFlowService
- [ ] Integration tests cho full flows
- [ ] Security tests

**Documentation:**

- [ ] Sequence diagrams
- [ ] Postman collection
- [ ] Client integration guide

**Optional (Future):**

- [ ] OAuth Telegram login
- [ ] Email OTP challenge
- [ ] Device verification
- [ ] Step-up authentication
- [ ] MFA recovery codes
