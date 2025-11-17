# Database Schema

Tài liệu này mô tả chi tiết schema database của FinTrack, bao gồm các models, relationships và indexes.

## Tổng Quan

Database sử dụng PostgreSQL với Prisma ORM. Schema được định nghĩa trong `prisma/schema.prisma`.

## Enums

### AccountType

- `cash` - Tiền mặt
- `bank` - Ngân hàng
- `credit_card` - Thẻ tín dụng
- `investment` - Tài khoản đầu tư

### CategoryType

- `expense` - Chi tiêu
- `income` - Thu nhập
- `transfer` - Chuyển khoản
- `investment` - Đầu tư
- `loan` - Vay nợ

### TransactionType

- `income` - Thu nhập
- `expense` - Chi tiêu
- `transfer` - Chuyển khoản
- `loan_given` - Cho vay
- `loan_received` - Nhận vay
- `investment` - Đầu tư

### InvestmentAssetType

- `coin` - Cryptocurrency
- `ccq` - Chứng chỉ quỹ
- `custom` - Đầu tư tự do

### InvestmentMode

- `priced` - Đầu tư có lệnh mua/bán chi tiết
- `manual` - Đầu tư cập nhật số dư thủ công

### EntityType

- `individual` - Cá nhân
- `organization` - Tổ chức

### BudgetPeriod

- `daily` - Hàng ngày
- `monthly` - Hàng tháng
- `quarterly` - Hàng quý
- `yearly` - Hàng năm
- `none` - Không có chu kỳ

### RecurringFrequency

- `daily` - Hàng ngày
- `weekly` - Hàng tuần
- `monthly` - Hàng tháng

### TradeSide

- `buy` - Mua
- `sell` - Bán

### ContributionType

- `deposit` - Đóng góp
- `withdrawal` - Rút tiền/quyết toán

### ReferralStatus

- `active` - Đang hoạt động
- `inactive` - Không hoạt động

### ProxyProtocol

- `http` - HTTP proxy
- `https` - HTTPS proxy
- `socks4` - SOCKS4 proxy
- `socks5` - SOCKS5 proxy

### SettingDataType

- `string` - Chuỗi
- `number` - Số
- `boolean` - Boolean
- `date` - Ngày tháng
- `json` - JSON

## Models

### Currency

Quản lý các loại tiền tệ.

**Fields**:

- `id`: String (UUID v7)
- `code`: String (unique) - Mã tiền tệ (VND, USD, etc.)
- `name`: String - Tên tiền tệ
- `symbol`: String? - Ký hiệu ($, ₫, etc.)
- `isActive`: Boolean - Trạng thái hoạt động
- `created`, `modified`: DateTime

**Relations**:

- `users`: User[]
- `accounts`: Account[]
- `investments`: Investment[]
- `transactions`: Transaction[]
- Và nhiều relations khác

**Indexes**:

- `code`

### User

Người dùng của hệ thống.

**Fields**:

- `id`: String (UUID v7)
- `username`: String (unique)
- `password`: String (hashed)
- `passwordExpired`: DateTime? - Ngày hết hạn mật khẩu
- `passwordCreated`: DateTime? - Ngày tạo mật khẩu
- `passwordAttempt`: Int (default: 0) - Số lần thử mật khẩu sai
- `lastPasswordChangeAt`: DateTime? - Lần cuối đổi mật khẩu
- `name`: String?
- `baseCurrencyId`: String - Currency mặc định
- `settings`: Json? - Cài đặt người dùng
- `refCode`: String? (unique) - Mã giới thiệu
- `mfaTotpEnabled`: Boolean (default: false) - Bật MFA TOTP
- `totpSecret`: String? - Secret cho TOTP
- `backupCodes`: String? - Backup codes cho MFA
- `pendingRef`: Int (default: 0) - Số referral đang chờ
- `activeRef`: Int (default: 0) - Số referral đang hoạt động
- `created`, `modified`: DateTime
- `lastLoginAt`: DateTime? - Lần cuối đăng nhập

**Relations**:

- `baseCurrency`: Currency
- `accounts`: Account[]
- `categories`: Category[]
- `investments`: Investment[]
- `transactions`: Transaction[]
- `budgets`: Budget[]
- `entities`: Entity[]
- `tags`: Tag[]
- `events`: Event[]
- `roles`: RolePlayer[] - Roles được gán (RBAC)
- `sessions`: Session[] - Sessions đăng nhập
- `referralMade`: Referral? - Referral mà user này là referrer
- `referralsGot`: Referral[] - Referrals mà user này được giới thiệu
- `authProviders`: UserAuthProvider[] - External auth providers
- Và nhiều relations khác

**Indexes**:

- `username`
- `baseCurrencyId`

**Lưu ý**: User không có field `role` trực tiếp. Thay vào đó, sử dụng RBAC thông qua `RolePlayer` để gán nhiều roles cho
một user.

### Account

Tài khoản của người dùng.

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `type`: AccountType
- `name`: String
- `currencyId`: String
- `balance`: Decimal (default: 0)
- `creditLimit`: Decimal? - Cho credit_card
- `notifyOnDueDate`: Boolean? - Thông báo đến hạn
- `paymentDay`: Int? - Ngày thanh toán
- `notifyDaysBefore`: Int? - Thông báo trước bao nhiêu ngày
- `meta`: Json? - Metadata
- `created`, `modified`: DateTime

**Relations**:

- `currency`: Currency
- `user`: User
- `transactions`: Transaction[]
- `toTransactions`: Transaction[] - Cho transfer
- `recurringTransactions`: RecurringTransaction[]
- `investmentTrades`: InvestmentTrade[]
- `investmentContributions`: InvestmentContribution[]

**Indexes**:

- `userId`
- `type`
- `currencyId`

### Category

Danh mục cho giao dịch.

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `type`: CategoryType
- `name`: String
- `parentId`: String? - Cho danh mục con
- `icon`: String?
- `color`: String?
- `isLocked`: Boolean (default: false)
- `created`, `modified`: DateTime

**Relations**:

- `user`: User
- `parent`: Category? - Danh mục cha
- `children`: Category[] - Danh mục con
- `transactions`: Transaction[]
- `budgets`: Budget[]
- `recurringTransactions`: RecurringTransaction[]

**Indexes**:

- `userId`
- `type`
- `parentId`

### Investment

Tài sản đầu tư.

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `symbol`: String - Mã tài sản (BTC, ETH, etc.)
- `name`: String - Tên tài sản
- `assetType`: InvestmentAssetType
- `mode`: InvestmentMode (default: priced)
- `currencyId`: String - Currency của asset
- `baseCurrencyId`: String? - Currency của tài khoản nguồn (VND)
- `extra`: Json? - Metadata (ví dụ: ccqId cho CCQ)
- `created`, `modified`: DateTime

**Relations**:

- `currency`: Currency
- `baseCurrency`: Currency?
- `user`: User
- `transactions`: Transaction[]
- `trades`: InvestmentTrade[]
- `holdings`: Holding[]
- `contributions`: InvestmentContribution[]
- `valuations`: InvestmentValuation[]

**Indexes**:

- `userId`
- `assetType`
- `symbol`
- `currencyId`
- `baseCurrencyId`

### Transaction

Giao dịch thống nhất cho tất cả loại giao dịch.

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `accountId`: String
- `toAccountId`: String? - Cho transfer
- `transferGroupId`: String? - Nhóm transfer
- `isTransferMirror`: Boolean (default: false) - Mirror transaction
- `type`: TransactionType
- `categoryId`: String?
- `investmentId`: String? - Cho investment
- `entityId`: String? - Cho loan
- `amount`: Decimal
- `currencyId`: String
- `price`: Decimal? - Cho investment
- `priceInBaseCurrency`: Decimal? - Giá quy đổi
- `quantity`: Decimal? - Cho investment
- `fee`: Decimal (default: 0)
- `feeInBaseCurrency`: Decimal? - Phí quy đổi
- `date`: DateTime
- `dueDate`: DateTime? - Cho loan
- `note`: String?
- `receiptUrl`: String?
- `metadata`: Json?
- `created`, `modified`: DateTime

**Relations**:

- `currency`: Currency
- `user`: User
- `account`: Account
- `toAccount`: Account? - Cho transfer
- `category`: Category?
- `investment`: Investment?
- `entity`: Entity?
- `trade`: InvestmentTrade?

**Indexes**:

- `userId`
- `accountId`
- `toAccountId`
- `categoryId`
- `investmentId`
- `entityId`
- `currencyId`
- `date`
- `dueDate`
- `type`
- Composite indexes cho performance

### InvestmentTrade

Lệnh mua/bán cho đầu tư priced mode.

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `investmentId`: String
- `accountId`: String
- `side`: TradeSide
- `timestamp`: DateTime
- `price`: Decimal
- `quantity`: Decimal
- `amount`: Decimal
- `fee`: Decimal (default: 0)
- `currencyId`: String
- `priceCurrency`: String?
- `priceInBaseCurrency`: Decimal? - Giá quy đổi
- `amountInBaseCurrency`: Decimal? - Số tiền quy đổi
- `exchangeRate`: Decimal? - Tỉ giá tại thời điểm trade
- `baseCurrencyId`: String?
- `priceSource`: String? - Nguồn giá
- `priceFetchedAt`: DateTime? - Thời gian fetch giá
- `externalId`: String? - ID từ exchange
- `transactionId`: String? (unique) - Link đến Transaction
- `meta`: Json?
- `created`, `modified`: DateTime

**Relations**:

- `currency`: Currency
- `baseCurrency`: Currency?
- `user`: User
- `investment`: Investment
- `account`: Account
- `transaction`: Transaction?

**Indexes**:

- `userId, investmentId`
- `investmentId, timestamp`
- `currencyId`
- `externalId`
- `baseCurrencyId`

### InvestmentContribution

Đóng góp/rút tiền cho đầu tư manual mode.

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `investmentId`: String
- `accountId`: String?
- `amount`: Decimal
- `currencyId`: String
- `type`: ContributionType (default: deposit)
- `amountInBaseCurrency`: Decimal? - Số tiền quy đổi
- `exchangeRate`: Decimal? - Tỉ giá tại thời điểm
- `baseCurrencyId`: String?
- `timestamp`: DateTime
- `note`: String?
- `created`, `modified`: DateTime

**Relations**:

- `user`: User
- `investment`: Investment
- `account`: Account?
- `currency`: Currency
- `baseCurrency`: Currency?

**Indexes**:

- `userId`
- `investmentId`
- `accountId`
- `currencyId`
- `baseCurrencyId`

### InvestmentValuation

Giá trị hiện tại của đầu tư.

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `investmentId`: String
- `currencyId`: String
- `price`: Decimal - Giá hiện tại
- `priceInBaseCurrency`: Decimal? - Giá quy đổi
- `exchangeRate`: Decimal? - Tỉ giá tại thời điểm
- `baseCurrencyId`: String?
- `timestamp`: DateTime
- `source`: String? - Nguồn giá
- `fetchedAt`: DateTime? - Thời gian fetch
- `created`, `modified`: DateTime

**Relations**:

- `user`: User
- `investment`: Investment
- `currency`: Currency
- `baseCurrency`: Currency?

**Indexes**:

- `userId`
- `investmentId`
- `currencyId`
- `timestamp`
- `baseCurrencyId`

### Holding

Cache/snapshot của position (chưa được sử dụng nhiều).

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `investmentId`: String
- `quantity`: Decimal
- `avgCost`: Decimal
- `unrealizedPnl`: Decimal?
- `unrealizedPnlmodified`: DateTime?
- `lastPrice`: Decimal?
- `lastPriceAt`: DateTime?
- `created`, `modified`: DateTime

**Relations**:

- `user`: User
- `investment`: Investment

**Indexes**:

- `userId, investmentId`

### Budget

Ngân sách với tracking theo chu kỳ.

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `name`: String - Tên ngân sách
- `amount`: Decimal - Số tiền ngân sách
- `period`: BudgetPeriod - Chu kỳ (daily/monthly/quarterly/yearly/none)
- `startDate`: DateTime - Ngày bắt đầu
- `endDate`: DateTime? - Ngày kết thúc (optional)
- `carryOver`: Boolean (default: false) - Có chuyển số dư sang chu kỳ sau không
- `categoryId`: String? - Danh mục liên quan (optional)
- `created`, `modified`: DateTime

**Relations**:

- `user`: User
- `category`: Category? - Danh mục (optional)
- `categories`: BudgetCategory[] - Nhiều danh mục (many-to-many)
- `accounts`: BudgetAccount[] - Nhiều tài khoản (many-to-many)
- `periods`: BudgetPeriodRecord[] - Lịch sử các chu kỳ

**Indexes**:

- `userId`

### BudgetCategory

Liên kết nhiều danh mục với một budget.

**Fields**:

- `id`: String (UUID v7)
- `budgetId`: String
- `categoryId`: String
- `created`: DateTime

**Relations**:

- `budget`: Budget
- `category`: Category

**Indexes**:

- `budgetId`
- `categoryId`
- Unique: `[budgetId, categoryId]`

### BudgetAccount

Liên kết nhiều tài khoản với một budget.

**Fields**:

- `id`: String (UUID v7)
- `budgetId`: String
- `accountId`: String
- `created`: DateTime

**Relations**:

- `budget`: Budget
- `account`: Account

**Indexes**:

- `budgetId`
- `accountId`
- Unique: `[budgetId, accountId]`

### BudgetPeriodRecord

Lịch sử tracking theo từng chu kỳ của budget.

**Fields**:

- `id`: String (UUID v7)
- `budgetId`: String
- `periodStartDate`: DateTime - Ngày bắt đầu chu kỳ
- `periodEndDate`: DateTime - Ngày kết thúc chu kỳ
- `carriedOverAmount`: Decimal (default: 0) - Số tiền chuyển từ chu kỳ trước
- `created`, `modified`: DateTime

**Relations**:

- `budget`: Budget

**Indexes**:

- `budgetId`
- `periodStartDate`
- Unique: `[budgetId, periodStartDate]`

### Entity

Đối tác vay nợ.

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `name`: String
- `type`: EntityType (default: individual)
- `phone`: String?
- `email`: String?
- `address`: String?
- `note`: String?
- `created`, `modified`: DateTime

**Relations**:

- `user`: User
- `transactions`: Transaction[]

**Indexes**:

- `userId, name` (unique)
- `userId`
- `name`
- `type`

### RecurringTransaction

Giao dịch định kỳ.

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `accountId`: String
- `categoryId`: String?
- `type`: TransactionType
- `amount`: Decimal
- `currencyId`: String
- `frequency`: RecurringFrequency
- `nextDate`: DateTime
- `endDate`: DateTime?
- `note`: String?
- `created`, `modified`: DateTime

**Relations**:

- `currency`: Currency
- `user`: User
- `account`: Account
- `category`: Category?

**Indexes**:

- `userId`
- `currencyId`
- `nextDate`

### Tag

Tags cho giao dịch.

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `name`: String
- `description`: String?
- `created`, `modified`: DateTime

**Relations**:

- `user`: User

**Indexes**:

- `userId, name` (unique)
- `userId`
- `name`

### Event

Sự kiện để nhóm giao dịch theo thời gian hoặc dịp.

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `name`: String
- `startAt`: DateTime - Ngày bắt đầu
- `endAt`: DateTime? - Ngày kết thúc (optional)
- `created`, `modified`: DateTime

**Relations**:

- `user`: User
- `transactions`: Transaction[]

**Indexes**:

- `userId, name` (unique)
- `userId`
- `name`
- `startAt`
- `endAt`

### AuthProvider

Cấu hình các nhà cung cấp xác thực bên ngoài (Google, Telegram, etc.).

**Fields**:

- `id`: String (UUID v7)
- `name`: String (unique)
- `code`: String (unique)
- `description`: String?
- `config`: Json? - Cấu hình provider
- `enabled`: Boolean (default: true)
- `created`, `modified`: DateTime

**Relations**:

- `usersAuth`: UserAuthProvider[]

### UserAuthProvider

Liên kết user với external authentication providers.

**Fields**:

- `id`: String (UUID v7)
- `providerId`: String - ID từ provider
- `authUserId`: String - User ID
- `providerCode`: String - Code của provider
- `lastUsedAt`: DateTime? - Lần cuối sử dụng
- `created`, `modified`: DateTime

**Relations**:

- `provider`: AuthProvider
- `authUser`: User

**Indexes**:

- `authUserId`
- `providerCode`
- Unique: `[providerCode, providerId]`

### Permission

Quyền hệ thống cho RBAC.

**Fields**:

- `id`: String (UUID v7)
- `title`: String (unique)
- `description`: String?

**Relations**:

- `roles`: RolePermission[]

### Role

Vai trò người dùng cho RBAC.

**Fields**:

- `id`: String (UUID v7)
- `title`: String (unique)
- `description`: String?
- `enabled`: Boolean (default: true)
- `created`, `modified`: DateTime

**Relations**:

- `permissions`: RolePermission[]
- `players`: RolePlayer[]

### RolePermission

Quan hệ many-to-many giữa Role và Permission.

**Fields**:

- `id`: String (UUID v7)
- `roleId`: String
- `permissionId`: String
- `created`, `modified`: DateTime

**Relations**:

- `role`: Role
- `permission`: Permission

**Indexes**:

- `roleId`
- `permissionId`
- Unique: `[roleId, permissionId]`

### RolePlayer

Gán roles cho users.

**Fields**:

- `id`: String (UUID v7)
- `playerId`: String - User ID
- `roleId`: String
- `description`: String?
- `created`, `modified`: DateTime

**Relations**:

- `player`: User
- `role`: Role

**Indexes**:

- `playerId`
- `roleId`
- Unique: `[roleId, playerId]`

### Session

Phiên đăng nhập của user.

**Fields**:

- `id`: String (UUID v7)
- `userId`: String
- `token`: String (unique)
- `device`: String? - Thiết bị
- `ip`: String? - IP address
- `expired`: DateTime - Ngày hết hạn
- `revoked`: Boolean (default: false) - Đã thu hồi chưa
- `created`, `modified`: DateTime

**Relations**:

- `user`: User

**Indexes**:

- `userId`
- `token`

### Referral

Chương trình giới thiệu.

**Fields**:

- `id`: String (UUID v7)
- `referrerId`: String (unique) - User giới thiệu
- `referredId`: String - User được giới thiệu
- `status`: ReferralStatus (default: inactive)
- `created`: DateTime

**Relations**:

- `referrer`: User
- `referred`: User

**Indexes**:

- `[referrerId, referredId]`

### I18n

Bản dịch đa ngôn ngữ.

**Fields**:

- `id`: String (UUID v7)
- `key`: String (unique)
- `en`: String? - Bản dịch tiếng Anh
- `vi`: String? - Bản dịch tiếng Việt

**Indexes**:

- `key`

### IPWhitelist

Danh sách IP được phép truy cập.

**Fields**:

- `id`: String (UUID v7)
- `ip`: String (unique)
- `note`: String?

**Indexes**:

- `ip`

### Setting

Cấu hình ứng dụng.

**Fields**:

- `id`: String (UUID v7)
- `key`: String (unique)
- `value`: String
- `description`: String?
- `type`: SettingDataType (default: string)
- `isSecret`: Boolean (default: false)

**Indexes**:

- `key`

### Proxy

Cấu hình proxy server.

**Fields**:

- `id`: String (UUID v7)
- `protocol`: ProxyProtocol
- `host`: String
- `port`: Int
- `username`: String
- `password`: String
- `enabled`: Boolean (default: true)
- `created`, `modified`: DateTime

**Indexes**:

- Unique: `[host, port, protocol, username, password]`

### AuditLog

Log audit cho hệ thống.

**Fields**:

- `id`: BigInt (auto-increment)
- `payload`: Json - Dữ liệu log
- `level`: String - Mức độ log
- `logType`: String - Loại log
- `userId`: String? - User ID
- `sessionId`: String? - Session ID
- `ip`: String? - IP address
- `userAgent`: String? - User agent
- `requestId`: String? - Request ID
- `traceId`: String? - Trace ID
- `correlationId`: String? - Correlation ID
- `occurredAt`: DateTime - Thời gian xảy ra
- `created`: DateTime

**Indexes**:

- `created`
- `level`
- `logType`
- `[userId, occurredAt]`
- `[sessionId, occurredAt]`
- `traceId`
- `correlationId`

## Relationships

### User → Accounts

- One-to-Many
- Cascade delete

### User → Categories

- One-to-Many
- Cascade delete

### User → Investments

- One-to-Many
- Cascade delete

### Category → Children Categories

- Self-referential
- One-to-Many
- SetNull on delete

### Investment → Trades

- One-to-Many
- Cascade delete

### Investment → Contributions

- One-to-Many
- Cascade delete

### Investment → Valuations

- One-to-Many
- Cascade delete

### Transaction → InvestmentTrade

- One-to-One (optional)
- SetNull on delete

### User → Roles (RBAC)

- Many-to-Many qua RolePlayer
- Cascade delete

### User → Sessions

- One-to-Many
- Cascade delete

### User → Referrals

- One-to-Many (referrer/referred)
- Cascade delete

### Budget → Categories/Accounts

- Many-to-Many qua BudgetCategory/BudgetAccount
- Cascade delete

### Budget → Periods

- One-to-Many
- Cascade delete

## Indexes Strategy

Indexes được tạo cho:

- Foreign keys (userId, accountId, etc.)
- Frequently queried fields (date, type, etc.)
- Composite indexes cho queries phức tạp
- Unique constraints (username, userId+name combinations)

## Decimal Precision

Tất cả các trường tiền tệ sử dụng `Decimal(30, 10)` để đảm bảo độ chính xác cao.

