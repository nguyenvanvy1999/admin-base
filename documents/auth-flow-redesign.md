# Thiết kế lại luồng Auth + MFA (OTP/TOTP + Backup Code) theo hướng Transaction + Challenge

> Mục tiêu: làm luồng đăng nhập/MFA **rõ ràng như state machine**, giảm nhánh `if/else` rối trong `@server/src/services/auth/auth.service.ts`, chuẩn hoá API response, và **giữ (hoặc siết) bảo mật**.
>
> Phạm vi tài liệu: đăng nhập bằng password + step-up MFA (TOTP/backup code) + bắt buộc setup MFA. (Các OTP cho đăng ký/quên mật khẩu vẫn tách riêng.)

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
- [ ] Định nghĩa `AuthResponse` + `ChallengeDto`
- [ ] Chuẩn hoá error codes (`INVALID_CREDENTIALS`, `INVALID_MFA_CODE`, `INVALID_STATE`, ...)

### B. AuthTxService (Redis)

- [ ] `createAuthTx(userId, ctx, securityResult)`
- [ ] `getAuthTxOrThrow(authTxId)`
- [ ] `setState(authTxId, state)`
- [ ] `attachEnroll(authTxId, enrollData)`
- [ ] attempt counter helpers
- [ ] binding helpers (ip/ua)

### C. AuthFlowService

- [ ] `startLogin()` (bước password)
- [ ] `completeChallenge()` (TOTP/backup)
- [ ] `enrollStart()`
- [ ] `enrollConfirm()`
- [ ] `resolveNextStep()` function

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
