# Database Schema

Tài liệu này mô tả chi tiết schema database của FinTrack, bao gồm các models, relationships và indexes.

## Tổng Quan

Database sử dụng PostgreSQL với Prisma ORM. Schema được định nghĩa trong `prisma/schema.prisma`.

## Enums

### UserRole
- `user` - Người dùng thường
- `admin` - Quản trị viên

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
- `monthly` - Hàng tháng
- `yearly` - Hàng năm

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

## Models

### Currency

Quản lý các loại tiền tệ.

**Fields**:
- `id`: String (UUID v7)
- `code`: String (unique) - Mã tiền tệ (VND, USD, etc.)
- `name`: String - Tên tiền tệ
- `symbol`: String? - Ký hiệu ($, ₫, etc.)
- `isActive`: Boolean - Trạng thái hoạt động
- `createdAt`, `updatedAt`: DateTime

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
- `name`: String?
- `role`: UserRole (default: user)
- `baseCurrencyId`: String - Currency mặc định
- `settings`: Json? - Cài đặt người dùng
- `deletedAt`: DateTime? - Soft delete
- `createdAt`, `updatedAt`: DateTime

**Relations**:
- `baseCurrency`: Currency
- `accounts`: Account[]
- `categories`: Category[]
- `investments`: Investment[]
- `transactions`: Transaction[]
- Và nhiều relations khác

**Indexes**:
- `username`
- `baseCurrencyId`

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
- `deletedAt`: DateTime? - Soft delete
- `createdAt`, `updatedAt`: DateTime

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
- `deletedAt`: DateTime? - Soft delete
- `createdAt`, `updatedAt`: DateTime

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
- `deletedAt`: DateTime? - Soft delete
- `createdAt`, `updatedAt`: DateTime

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
- `deletedAt`: DateTime? - Soft delete
- `createdAt`, `updatedAt`: DateTime

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
- `createdAt`, `updatedAt`: DateTime

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
- `createdAt`, `updatedAt`: DateTime

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
- `createdAt`, `updatedAt`: DateTime

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
- `unrealizedPnlUpdatedAt`: DateTime?
- `lastPrice`: Decimal?
- `lastPriceAt`: DateTime?
- `createdAt`, `updatedAt`: DateTime

**Relations**:
- `user`: User
- `investment`: Investment

**Indexes**:
- `userId, investmentId`

### Budget

Ngân sách theo danh mục.

**Fields**:
- `id`: String (UUID v7)
- `userId`: String
- `categoryId`: String
- `amount`: Decimal
- `period`: BudgetPeriod
- `startDate`: DateTime
- `endDate`: DateTime?
- `deletedAt`: DateTime? - Soft delete
- `createdAt`, `updatedAt`: DateTime

**Relations**:
- `user`: User
- `category`: Category

**Indexes**:
- `userId`
- `categoryId`

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
- `deletedAt`: DateTime? - Soft delete
- `createdAt`, `updatedAt`: DateTime

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
- `createdAt`, `updatedAt`: DateTime

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
- `deletedAt`: DateTime? - Soft delete
- `createdAt`, `updatedAt`: DateTime

**Relations**:
- `user`: User

**Indexes**:
- `userId, name` (unique)
- `userId`
- `name`

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

## Indexes Strategy

Indexes được tạo cho:
- Foreign keys (userId, accountId, etc.)
- Frequently queried fields (date, type, etc.)
- Composite indexes cho queries phức tạp
- Unique constraints (username, userId+name combinations)

## Soft Delete

Nhiều models hỗ trợ soft delete thông qua trường `deletedAt`:
- User
- Account
- Category
- Investment
- Transaction
- Budget
- Entity
- Tag

## Decimal Precision

Tất cả các trường tiền tệ sử dụng `Decimal(30, 10)` để đảm bảo độ chính xác cao.

