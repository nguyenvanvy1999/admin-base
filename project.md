# FinTrack - Ứng Dụng Quản Lý Tài Chính Cá Nhân & Đầu Tư

## 📋 Tổng Quan Dự Án

FinTrack là một ứng dụng web quản lý tài chính cá nhân kết hợp quản lý đầu tư, cho phép người dùng:

- Theo dõi thu/chi, ngân sách, vay, nợ
- Quản lý các danh mục đầu tư (coin, CCQ, đầu tư tự do)
- Xem báo cáo và phân tích tài chính

**Yêu cầu:**

- Trực quan, dễ sử dụng
- Mobile-friendly
- Bảo mật cao
- Dễ mở rộng (thêm kênh đầu tư, tích hợp ngân hàng, kết nối exchange)

---

## 🛠️ Yêu Cầu Kỹ Thuật

### Tech Stack (Bắt Buộc)

- **Backend**: ElysiaJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + Refresh Token
- **Runtime**: Bun
- **Frontend**: React 19 với Tailwind CSS
- **Type Safety**: Eden Treaty (end-to-end type safety)

### Tech Stack (Tùy Chọn)

- **OAuth**: Cho đăng nhập ngân hàng (tương lai)
- **Background Jobs**: BullMQ/Redis cho đồng bộ giá
- **Price APIs**: CoinGecko cho coin, NAV feed cho CCQ

---

## 👥 Người Dùng & Phân Quyền

### Vai Trò Người Dùng

1. **Regular User** (Mặc định)
    - Quản lý tài chính cá nhân
    - Quản lý đầu tư
    - Xem báo cáo

2. **Admin**
    - Quản trị ứng dụng
    - Quản lý seeds, configs
    - Quyền truy cập hệ thống

### Tính Năng Đa Tài Khoản

- Hỗ trợ nhiều tài khoản cho mỗi người dùng
- Mỗi tài khoản có thể có loại khác nhau (cash, bank, wallet, investment)

---

## 📐 Quy Tắc & Quy Ước

### Quy Tắc Code

1. **Ngôn Ngữ Comment**: Tất cả comment trong code phải bằng tiếng Anh
2. **Validation**: Sử dụng TypeBox (ElysiaJS `t`) cho validation payload
3. **Testing**:
    - Unit tests cho services
    - Integration tests cho các flow quan trọng (transactions & P&L)
4. **Code Style**: Tuân theo `.prettierrc` của dự án

### Quy Ước Đặt Tên

- **Controllers**: `[name].controller.ts` (ví dụ: `user.controller.ts`)
- **Services**: `[Name]Service.ts` (ví dụ: `UserService.ts`)
- **Pages**: `[Name]Page.tsx` (ví dụ: `LoginPage.tsx`)
- **Components**: `[Name].tsx` (ví dụ: `Header.tsx`)

### Quy Tắc Database

1. **Schema Management**: Tất cả models phải được định nghĩa trong `prisma/schema.prisma`
2. **Migrations**:
    - Tạo migration: `bun run db:migrate`
    - Generate client: `bun run db:generate`
3. **Indexes**: Thêm indexes cho các trường thường query (userId, date, type, etc.)

---

## 🏗️ Kiến Trúc Hệ Thống

### Cấu Trúc Thư Mục

```
investment/
├── src/                      # Backend (ElysiaJS)
│   ├── controllers/          # API endpoint handlers
│   ├── services/             # Business logic layer
│   ├── middlewares/          # Request/response processors
│   ├── macros/               # Elysia macros (auth, etc.)
│   ├── db.ts                 # Prisma client initialization
│   └── index.ts              # Server entry point
│
├── client/                   # Frontend (React)
│   ├── components/           # Reusable UI components
│   ├── pages/                # Page components
│   ├── layouts/              # Layout wrappers
│   ├── store/                # Zustand stores
│   └── libs/                 # Utilities & API client
│
├── prisma/                   # Prisma schema and migrations
│   ├── schema.prisma         # Database schema definition
│   └── migrations/           # Database migration files
│
└── package.json              # Dependencies & scripts
```

### Kiến Trúc Backend

- **Controller Layer**: Xử lý HTTP requests/responses
- **Service Layer**: Business logic và data processing
- **Database Layer**: Prisma ORM với PostgreSQL
- **Middleware**: Error handling, authentication, validation

### Kiến Trúc Frontend

- **Pages**: Các trang chính của ứng dụng
- **Components**: UI components tái sử dụng
- **Store**: Zustand cho state management
- **API Client**: Eden Treaty cho type-safe API calls

---

## 💾 Cấu Trúc Database

### Bảng Cốt Lõi

#### 1. Users (Người Dùng)

- `id`: String (UUID)
- `username`: String (unique)
- `password`: String (hashed)
- `email`: String (optional)
- `name`: String (optional)
- `role`: String (user/admin)
- `baseCurrency`: String (mặc định: VND)
- `settings`: JSON (cài đặt người dùng)
- `createdAt`, `updatedAt`: DateTime

#### 2. Accounts (Tài Khoản)

- `id`: String (UUID)
- `userId`: String (FK → Users)
- `type`: Enum (cash, bank, credit_card, investment)
- `name`: String
- `currency`: String (mặc định: VND)
- `balance`: Integer (số dư hiện tại)
- `creditLimit`: Integer (cho credit_card)
- `expiryDate`: DateTime (cho credit_card)
- `meta`: JSON (metadata)
- `createdAt`, `updatedAt`: DateTime

**Indexes**: userId, type

#### 3. Categories (Danh Mục)

- `id`: String (UUID)
- `userId`: String (FK → Users)
- `type`: Enum (income, expense)
- `name`: String
- `parentId`: String (FK → Categories, optional - cho danh mục con)
- `icon`: String (optional)
- `color`: String (optional)
- `createdAt`, `updatedAt`: DateTime

**Indexes**: userId, type, parentId

#### 4. Transactions (Giao Dịch)

Bảng thống nhất cho tất cả loại giao dịch (thu/chi/đầu tư/vay nợ).

**Trường Cốt Lõi:**

- `id`: String (UUID)
- `userId`: String (FK → Users)
- `accountId`: String (FK → Accounts)
- `toAccountId`: String (FK → Accounts, optional - cho transfer)
- `type`: Enum (income, expense, transfer, loan_given, loan_received, investment)
- `categoryId`: String (FK → Categories, optional)
- `investmentId`: String (FK → Investments, optional - cho investment)
- `loanPartyId`: String (FK → LoanParties, optional - cho vay nợ)
- `amount`: Integer (số tiền)
- `currency`: String (mặc định: VND)
- `date`: DateTime
- `dueDate`: DateTime (optional - cho vay nợ)
- `note`: String (optional)
- `receiptUrl`: String (optional)
- `metadata`: JSON (optional)

**Trường Cho Đầu Tư:**

- `price`: Integer (giá theo currency của asset - USD, BTC, etc.)
- `priceInBaseCurrency`: Integer (giá quy đổi sang VND)
- `quantity`: Integer (số lượng)
- `fee`: Integer (phí giao dịch)
- `feeInBaseCurrency`: Integer (phí quy đổi sang VND)

**Indexes**: userId, accountId, toAccountId, categoryId, investmentId, loanPartyId, date, dueDate, type

#### 5. Investments (Tài Sản Đầu Tư)

- `id`: String (UUID)
- `userId`: String (FK → Users)
- `symbol`: String (mã tài sản - BTC, ETH, etc.)
- `name`: String (tên tài sản)
- `assetType`: Enum (coin, ccq, custom)
- `currency`: String (currency của asset)
- `extra`: JSON (metadata - ví dụ: ccqId cho CCQ)
- `createdAt`, `updatedAt`: DateTime

**Indexes**: userId, assetType, symbol

#### 6. LoanParties (Đối Tác Vay Nợ)

- `id`: String (UUID)
- `userId`: String (FK → Users)
- `name`: String (tên người/đơn vị)
- `phone`: String (optional)
- `email`: String (optional)
- `address`: String (optional)
- `note`: String (optional)
- `meta`: JSON (optional)
- `createdAt`, `updatedAt`: DateTime

**Indexes**: userId, name

### Bảng Tùy Chọn (MVP)

#### 7. Budgets (Ngân Sách)

- `id`: String (UUID)
- `userId`: String (FK → Users)
- `categoryId`: String (FK → Categories)
- `amount`: Integer (số tiền ngân sách)
- `period`: Enum (monthly, yearly)
- `startDate`: DateTime
- `endDate`: DateTime (optional)
- `createdAt`, `updatedAt`: DateTime

**Indexes**: userId, categoryId

#### 8. RecurringTransactions (Giao Dịch Định Kỳ)

- `id`: String (UUID)
- `userId`: String (FK → Users)
- `accountId`: String (FK → Accounts)
- `categoryId`: String (FK → Categories, optional)
- `type`: Enum (income, expense, transfer, etc.)
- `amount`: Integer
- `currency`: String
- `frequency`: Enum (daily, weekly, monthly)
- `nextDate`: DateTime (ngày thực hiện tiếp theo)
- `endDate`: DateTime (optional)
- `note`: String (optional)
- `createdAt`, `updatedAt`: DateTime

**Indexes**: userId, nextDate

---

## 🔢 Quy Tắc Tính Toán Quan Trọng

### 1. Average Cost (Chi Phí Trung Bình)

- **Phương pháp**: Weighted Average (trung bình có trọng số)
- **Công thức**:
  ```
  avgCost = tổng(price * quantity) / tổng(quantity)
  ```
- **Áp dụng**: Tính cho mỗi asset đầu tư

### 2. Realized P&L (Lãi/Lỗ Đã Thực Hiện)

- **Ghi nhận**: Khi có giao dịch bán
- **Công thức**:
  ```
  realizedPnL = (sellPrice - avgCost) * quantity
  ```
- **Lưu ý**: Chỉ tính khi bán, không tính khi mua

### 3. Unrealized P&L (Lãi/Lỗ Chưa Thực Hiện)

- **Tính toán**: Dựa trên giá hiện tại từ API
- **Công thức**:
  ```
  unrealizedPnL = holdings * (currentPrice - avgCost)
  ```
- **Cập nhật**: Realtime hoặc periodic (tùy cấu hình)

### 4. Multi-Currency (Đa Tiền Tệ)

- **Base Currency**: Người dùng chọn (mặc định: VND)
- **Quy đổi**: Tất cả giá trị phải quy đổi sang base currency để hiển thị tổng tài sản
- **Lưu trữ**:
    - Lưu giá gốc theo currency của asset
    - Lưu thêm `priceInBaseCurrency` để tính toán nhanh

---

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/refresh` - Làm mới token

### Accounts (Tài Khoản)

- `GET /api/accounts` - Lấy danh sách tài khoản
- `POST /api/accounts` - Tạo tài khoản mới
- `PUT /api/accounts/:id` - Cập nhật tài khoản
- `DELETE /api/accounts/:id` - Xóa tài khoản

### Categories (Danh Mục)

- `GET /api/categories` - Lấy danh sách danh mục
- `POST /api/categories` - Tạo danh mục mới
- `PUT /api/categories/:id` - Cập nhật danh mục
- `DELETE /api/categories/:id` - Xóa danh mục

### Transactions (Giao Dịch)

- `GET /api/transactions` - Lấy danh sách giao dịch (có filters)
- `POST /api/transactions` - Tạo giao dịch mới
- `PUT /api/transactions/:id` - Cập nhật giao dịch
- `DELETE /api/transactions/:id` - Xóa giao dịch

**Lưu ý**:

- Tự động cập nhật balance của account khi tạo/cập nhật/xóa transaction
- Hỗ trợ transfer giữa các account (type = 'transfer')

### Investments (Đầu Tư)

- `GET /api/investments` - Lấy danh sách tài sản đầu tư
- `POST /api/investments` - Tạo tài sản đầu tư mới
- `PUT /api/investments/:id` - Cập nhật tài sản đầu tư
- `DELETE /api/investments/:id` - Xóa tài sản đầu tư
- `GET /api/investments/:id/holdings` - Lấy thông tin holdings và P&L

**Lưu ý**:

- Investment transactions được gộp vào bảng transactions (type = 'investment')
- Sử dụng `investmentId` để liên kết

### Reports (Báo Cáo)

- `GET /api/reports/portfolio` - Tổng quan portfolio
- `GET /api/reports/cashflow` - Báo cáo dòng tiền
- `GET /api/reports/pnl` - Báo cáo lãi/lỗ
- `GET /api/reports/balance-timeline` - Timeline số dư

### Admin (Quản Trị)

- `POST /api/admin/price-sync` - Đồng bộ giá từ API (protected, admin only)

---

## 📊 Chức Năng Chính (MVP)

### 1. Core Finance (Tài Chính Cốt Lõi)

- **CRUD Giao Dịch**: Thu/chi, vay, nợ
    - Số tiền, ngày, tài khoản, danh mục, ghi chú, receipt URL
- **Quản Lý Tài Khoản**: Cash, bank, wallet, investment account
- **Danh Mục**: Income/expense, hỗ trợ danh mục con (parentId)
- **Giao Dịch Định Kỳ**: Daily/weekly/monthly
- **Ngân Sách**: Đặt ngân sách theo danh mục + thông báo khi gần vượt

### 2. Investment (Đầu Tư)

- **Loại Tài Sản**: Coin, CCQ (chứng chỉ quỹ), CustomInvestment (đầu tư tự do)
- **Giao Dịch Mua/Bán**:
    - Lưu timestamp, price, quantity, amount, fee, accountId
    - Tự động tính average cost
- **Tính Toán**:
    - Current price (realtime/periodic từ API)
    - Unrealized/Realized P&L
    - Average cost (weighted average)
    - Total holdings per asset
- **Portfolio View**:
    - Tổng tài sản
    - Phân bổ theo loại
    - Performance (day/week/month/YTD)
    - Drawdown

### 3. Reporting & UI (Báo Cáo & Giao Diện)

- **Dashboard**:
    - Balance timeline
    - Cashflow chart
    - Top expenses
    - Asset allocation pie chart
    - P&L chart
- **Reports**:
    - Lãi/lỗ theo khoảng thời gian
    - Export CSV/PDF
- **Charts**:
    - Line chart (time-series)
    - Pie chart (allocation)
    - Bar chart (category spend)

### 4. Integrations (Tích Hợp - MVP Optional)

- **Price API**: CoinGecko cho coin, Exchange API
- **NAV Feed**: Cho CCQ
- **CSV Import**: Import bank statements

---

## 📅 Kế Hoạch Triển Khai

### Phase 1: Database Schema Design ✅

- [x] Thiết kế schema cho tất cả bảng
- [x] Tạo Prisma schema
- [x] Generate migrations
- [x] Test migrations

### Phase 2: Core Finance Features (Sprint 0-1)

#### 2.1 Accounts Management

- [ ] Tạo AccountService.ts
- [ ] Tạo account.controller.ts
- [ ] Implement CRUD endpoints cho accounts
- [ ] Validation schemas

#### 2.2 Categories Management

- [ ] Tạo CategoryService.ts
- [ ] Tạo category.controller.ts
- [ ] Implement CRUD endpoints cho categories
- [ ] Hỗ trợ danh mục con (parentId)

#### 2.3 Transactions Management

- [ ] Tạo TransactionService.ts
- [ ] Tạo transaction.controller.ts
- [ ] Implement CRUD endpoints cho transactions
- [ ] Tự động cập nhật balance khi tạo/cập nhật/xóa
- [ ] Hỗ trợ transfer transactions

#### 2.4 Budgets (Optional MVP)

- [ ] Tạo BudgetService.ts
- [ ] Tạo budget.controller.ts
- [ ] Implement CRUD endpoints cho budgets
- [ ] Budget tracking và alerts

#### 2.5 Recurring Transactions (Optional MVP)

- [ ] Tạo RecurringService.ts
- [ ] Tạo recurring.controller.ts
- [ ] Background job tạo transactions từ recurring rules

### Phase 3: Investment Management (Sprint 2)

#### 3.1 Investments CRUD

- [ ] Tạo InvestmentService.ts
- [ ] Tạo investment.controller.ts
- [ ] Implement CRUD endpoints cho investments

#### 3.2 Investment Transactions

- [ ] Cập nhật TransactionService để xử lý investment transactions
- [ ] Logic cho price, quantity, fee
- [ ] Filter transactions theo investment

#### 3.3 Holdings & P&L Calculations

- [ ] Tính average cost (weighted average)
- [ ] Tính current holdings per asset
- [ ] Tính unrealized P&L
- [ ] Tính realized P&L
- [ ] Endpoint GET /investments/:id/holdings

### Phase 4: Reporting & Dashboard (Sprint 3)

#### 4.1 Dashboard Endpoints

- [ ] GET /reports/portfolio
- [ ] GET /reports/cashflow
- [ ] GET /reports/pnl
- [ ] GET /reports/balance-timeline

#### 4.2 Price Fetch Service

- [ ] Tạo PriceService.ts
- [ ] Tích hợp CoinGecko API cho coin
- [ ] NAV feed cho CCQ (optional)
- [ ] Cache giá trong memory để giảm API calls
- [ ] Tính unrealized P&L với currentPrice từ API

### Phase 5: Frontend Implementation

#### 5.1 Core Pages

- [ ] Dashboard page với charts
- [ ] Accounts management page
- [ ] Transactions list/add/edit page
- [ ] Investments portfolio page
- [ ] Investment trades page

#### 5.2 Components

- [ ] Chart components (line, pie, bar)
- [ ] Transaction form component
- [ ] Investment form component
- [ ] Budget alerts component

#### 5.3 API Integration

- [ ] Cập nhật `client/libs/api.ts` với các endpoints mới
- [ ] Type-safe API calls sử dụng Eden Treaty

---

## ✅ Tiêu Chí Chấp Nhận (MVP)

### Functional Requirements

1. **Quản Lý Tài Khoản & Giao Dịch**
    - Người dùng có thể tạo tài khoản
    - Người dùng có thể thêm giao dịch (thu/chi)
    - Người dùng có thể xem balance và cashflow

2. **Quản Lý Đầu Tư**
    - Người dùng có thể thêm asset đầu tư
    - Người dùng có thể tạo giao dịch mua/bán
    - Người dùng có thể xem holdings và unrealized/realized P&L

3. **Dashboard & Báo Cáo**
    - Dashboard hiển thị biểu đồ time-series của tổng tài sản
    - Dashboard hiển thị phân bổ tài sản (pie chart)
    - Có thể export báo cáo CSV/PDF

### Technical Requirements

1. **API**
    - Có tests cơ bản cho API
    - Bảo mật JWT cho protected routes
    - Swagger documentation

2. **Database**
    - Schema được định nghĩa trong Prisma
    - Migrations đã được test
    - Indexes được tối ưu

3. **Code Quality**
    - Code comments bằng tiếng Anh
    - Tuân theo code style của dự án
    - Có unit tests cho services

---

## 📦 Deliverables

Khi hoàn thành task, cần cung cấp:

1. **API Documentation**: OpenAPI/Swagger
2. **Database Schema**: Prisma schema + ER diagram
3. **Frontend Screens**: Figma/UX rough (nếu có)
4. **CI/CD**: Basic pipeline
5. **Docker**: docker-compose cho local dev

---

## 🚀 Tính Năng Nâng Cao (Tương Lai)

- Hỗ trợ multi-user family shares
- Multi-currency nâng cao
- Kết nối tự động ngân hàng (Plaid-like) hoặc import OFX
- Push notifications cho budget alerts
- Role-based access cho multi-user team
- Mobile app (React Native)

---

## 📝 Ghi Chú

- Tất cả code comments phải bằng tiếng Anh
- Backend sử dụng ElysiaJS + PostgreSQL
- Database sử dụng Prisma ORM
- Background jobs sử dụng BullMQ/Redis (cho price sync)
- Frontend sử dụng React 19 với Tailwind CSS
- Type safety end-to-end với Eden Treaty
