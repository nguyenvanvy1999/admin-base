Xây một web app quản lý tài chính cá nhân kết hợp quản lý đầu tư — cho phép người dùng theo dõi thu/chi, ngân sách, vay, nợ và đồng thời quản lý các danh mục đầu tư (coin, CCQ, đầu tư tự do). Ứng dụng cần trực quan, mobile-friendly, bảo mật, và cho phép mở rộng (thêm kênh đầu tư, tích hợp ngân hàng, kết nối exchange).
Tech stack đề xuất (bắt buộc / khuyến nghị)
- Backend: ElysiaJS (TypeScript), SQLite.
- Auth: JWT + Refresh token, optional OAuth for bank/login.
- Coding rules: comments bằng tiếng Anh;
  Người dùng & Quyền (roles)
- Regular user (mặc định).
- Admin (quản trị app, manage seeds, configs).
  (Hỗ trợ multi-account per user).
  Chức năng chính (MVP)
1. Core finance:
    - CRUD giao dịch thu/chi vay nợ (amount, date, account, category, note, receipt URL).
    - Quản lý tài khoản (cash, bank, wallet, investment account).
    - Categories (income/expense), tags, recurring transactions (daily/weekly/monthly).
    - Budget: set budget theo category + thông báo khi gần vượt.
2. Investment (kết hợp vào cùng một hệ thống):
    - Hỗ trợ nhiều loại tài sản: Coin, CCQ (chứng chỉ quỹ), CustomInvestment (đầu tư tự do).
    - Mỗi tài sản có nhiều giao dịch: buy/sell — lưu timestamp, priceAtTime, quantity, amount, fee, accountId.
    - Tính toán current price (realtime/periodic), unrealized/realized P&L, average cost, total holdings per asset.
    - Portfolio view: tổng tài sản, phân bổ theo loại, performance (day/week/month/ YTD), drawdown.
3. Reporting & UI:
    - Dashboard: balance timeline, cashflow, top expenses, asset allocation pie, P&L chart.
    - Reports: lãi/lỗ theo khoảng thời gian, export CSV/PDF.
    - Charts: line chart (time-series), pie (allocation), bar (category spend).
4. Integrations (MVP optional): price API for coins (Coingecko/Exchange), NAV feed for CCQ, CSV import for bank statements.
   DB Schema — high-level (SQLite collections)
- users
    - id, email, passwordHash, name, settings, createdAt, updatedAt
- accounts (cash/bank/wallet/investment)
    - id, userId, type, name, currency, balance, meta, createdAt
- categories
    - id, userId, type (income|expense), name, parentId?
- transactions (thu/chi)
    - id, userId, accountId, type (income|expense|transfer), categoryId, amount, currency, date, note, metadata
- investments (tổng quan asset)
    - id, userId, symbol, name, assetType (coin|ccq|custom), currency, extra (e.g., ccqId), createdAt
- investmentTrades (mua/bán)
    - id, investmentId, userId, accountId, side (buy|sell), timestamp, price, quantity, amount, fee, note
- prices (cache price history)
    - id, assetKey, timestamp, price
- budgets, recurrings, auditLogs, reports (optional)
  Một vài rule & tính toán quan trọng
- Average cost (FIFO/WA) cho mỗi asset — chọn chiến lược tính (MVP: weighted average).
- Realized P&L: ghi nhận khi có giao dịch bán.
- Unrealized P&L: holdings * (currentPrice - avgCost).
- Support multi-currency: convert to base currency (user setting) để hiển thị tổng tài sản.
  API endpoints chính (REST style)
- POST /auth/register, POST /auth/login, POST /auth/refresh
- GET /accounts, POST /accounts, PUT /accounts/:id, DELETE /accounts/:id
- GET /categories, POST /categories, ...
- GET /transactions, POST /transactions, PUT /transactions/:id, DELETE /transactions/:id
- GET /investments, POST /investments, GET /investments/:id/trades, POST /investments/:id/trades
- GET /reports/portfolio, GET /reports/pnl, GET /reports/cashflow
- Background: POST /admin/price-sync (protected) to trigger fetch jobs
  Code conventions & project setup
- Elysia monorepo layout (api, web).
- Monorepo với Bun. SSR
- Validation: TypeBox ( ElysiaJS t) schemas for incoming payloads; code comments in English.
- Tests: unit tests for services, integration tests for critical flows (transactions & P&L).
  MVP milestones (gợi ý)
- Sprint 0 (1 week): project scaffolding, auth, user model, basic account & category CRUD.
- Sprint 1 (2 weeks): transactions CRUD (thu/chi), budgets, recurring transactions, CSV import.
- Sprint 2 (2 weeks): investment models + trade CRUD, holdings calculation (avg cost, P&L).
- Sprint 3 (2 weeks): dashboard + basic charts + price fetch background job.
- Sprint 4 (1 week): reports export, polishing, tests, deploy to staging.
  Acceptance criteria (MVP)
- Người dùng có thể tạo tài khoản, add transactions, xem balance và cashflow.
- Người dùng có thể thêm asset, tạo giao dịch mua/bán, và xem holdings + unrealized/realized P&L.
- Dashboard hiển thị biểu đồ time-series của tổng tài sản và phân bổ tài sản.
- API có tests cơ bản và bảo mật JWT.
  Deliverables (khi giao task)
- API docs (OpenAPI/Swagger).
- DB schema & ER diagram.
- Frontend screens (Figma/UX rough).
- CI/CD basic pipeline, docker-compose for local dev.
  Ghi chú thêm / tuỳ chọn nâng cao
- Hỗ trợ multi-user family shares / multi-currency.
- Kết nối tự động ngân hàng (Plaid-like) hoặc import OFX.
- Push notifications cho budget alerts.
- Role-based access nếu cần multi-user team.
  Yêu cầu khi implement (bắt buộc)
- Viết code comment bằng tiếng Anh.
- Backend dùng ElysiaJS + SQLite.
- Sử dụng BullMQ/Redis cho background job thông tin giá.
  Kết quả mong muốn trả về từ bạn (nếu bạn là dev/AI được giao task)
- Tạo backlog theo epics + user stories.
- Thiết kế DB schema chi tiết (mỗi collection field + index).
- Viết mã mẫu (controller/service/model) cho transactions và investment trades — kèm DTO

## Implementation Tasks Breakdown

### Phase 1: Database Schema Design (IN PROGRESS)

#### 1.1 Core Tables Design
- [x] Update users table: add email, name, settings (JSON), baseCurrency
- [x] Create accounts table: id, userId, type, name, currency, balance, creditLimit, expiryDate, meta, timestamps
  - Support account types: cash, bank, credit_card, investment
  - creditLimit and expiryDate for credit cards
- [x] Create categories table: id, userId, type, name, parentId, icon, color, timestamps
- [x] Create transactions table: unified table for all transaction types
  - Core fields: id, userId, accountId, toAccountId, type, categoryId, investmentId, amount, currency, date, note, receiptUrl, metadata
  - Investment fields: price, priceInBaseCurrency, quantity, fee, feeInBaseCurrency (for investment transactions)
  - price: giá theo currency của asset (USD, VND, etc.)
  - priceInBaseCurrency: giá quy đổi sang VND (base currency) để tính tổng tài sản
  - feeInBaseCurrency: phí quy đổi sang VND
  - Transaction types: income, expense, transfer, loan_given, loan_received, investment
- [x] Add indexes for all tables (userId, type, date, investmentId, toAccountId, etc.)

#### 1.2 Investment Tables Design
- [x] Create investments table: id, userId, symbol, name, assetType, currency, extra, timestamps
  - Asset types: coin, ccq, custom
- [x] Gộp investmentTrades vào transactions table
  - Investment transactions use: investmentId, price, priceInBaseCurrency, quantity, fee, feeInBaseCurrency
  - price: giá theo currency của asset (USD, BTC, etc.)
  - priceInBaseCurrency: giá quy đổi sang VND để tính tổng tài sản
  - Type = 'investment' for investment transactions
- [x] Xóa pricesTable - sẽ lấy giá hiện tại từ API khi cần (CoinGecko, NAV feed)
  - Giá khi giao dịch đã lưu trong transactionsTable.price
  - Giá hiện tại sẽ fetch từ API khi tính unrealized P&L

#### 1.3 Optional Tables (MVP)
- [x] Create budgets table: id, userId, categoryId, amount, period, startDate, endDate, timestamps
- [x] Create recurringTransactions table: id, userId, accountId, categoryId, type, amount, currency, frequency, nextDate, endDate, note, timestamps
- [x] Add indexes for optional tables

#### 1.4 Implementation Steps
- [x] Update existing users table schema
- [x] Create all new table schemas in `src/db/schema.ts`
- [x] Add proper indexes for query performance
- [x] Add foreign key relationships (where applicable)
- [x] Update accounts table: add creditLimit, expiryDate for credit cards
- [x] Update transactions table: gộp investment trades vào transactions
  - Add: toAccountId (for transfers), investmentId, price, quantity, fee
- [x] Remove investmentTrades table (gộp vào transactions)
- [x] Generate Drizzle migration
- [x] Test migration on fresh database
- [x] Update UserService to handle email field
- [x] Update UserController to accept email in register

### Phase 2: Core Finance Features (Sprint 0-1)

#### 2.1 Accounts Management
- [ ] Create AccountService.ts
- [ ] Create account.controller.ts
- [ ] Implement GET /accounts endpoint
- [ ] Implement POST /accounts endpoint
- [ ] Implement PUT /accounts/:id endpoint
- [ ] Implement DELETE /accounts/:id endpoint
- [ ] Add Zod validation schemas for account types

#### 2.2 Categories Management
- [ ] Create CategoryService.ts
- [ ] Create category.controller.ts
- [ ] Implement GET /categories endpoint
- [ ] Implement POST /categories endpoint
- [ ] Implement PUT /categories/:id endpoint
- [ ] Implement DELETE /categories/:id endpoint
- [ ] Support hierarchical categories (parentId)

#### 2.3 Transactions Management
- [ ] Create TransactionService.ts
- [ ] Create transaction.controller.ts
- [ ] Implement GET /transactions endpoint (with filters)
- [ ] Implement POST /transactions endpoint
- [ ] Implement PUT /transactions/:id endpoint
- [ ] Implement DELETE /transactions/:id endpoint
- [ ] Balance updates on account when transaction created/updated/deleted
- [ ] Support transfer transactions (between accounts)

#### 2.4 Budgets (Optional MVP)
- [ ] Create BudgetService.ts
- [ ] Create budget.controller.ts
- [ ] Implement GET /budgets endpoint
- [ ] Implement POST /budgets endpoint
- [ ] Implement PUT /budgets/:id endpoint
- [ ] Implement DELETE /budgets/:id endpoint
- [ ] Budget tracking and alerts

#### 2.5 Recurring Transactions (Optional MVP)
- [ ] Create RecurringService.ts
- [ ] Create recurring.controller.ts
- [ ] Background job to create transactions from recurring rules

### Phase 3: Investment Management (Sprint 2)

#### 3.1 Investments CRUD
- [ ] Create InvestmentService.ts
- [ ] Create investment.controller.ts
- [ ] Implement GET /investments endpoint
- [ ] Implement POST /investments endpoint
- [ ] Implement PUT /investments/:id endpoint
- [ ] Implement DELETE /investments/:id endpoint

#### 3.2 Investment Transactions (gộp vào transactions)
- [ ] Update TransactionService to handle investment transactions
- [ ] Add investment transaction logic: price, quantity, fee
- [ ] Implement GET /transactions with investment filter
- [ ] Implement POST /transactions for investment type
- [ ] Implement PUT /transactions/:id for investment transactions
- [ ] Implement DELETE /transactions/:id for investment transactions

#### 3.3 Holdings & P&L Calculations
- [ ] Average cost calculation (weighted average)
- [ ] Current holdings per asset
- [ ] Unrealized P&L: holdings * (currentPrice - avgCost)
- [ ] Realized P&L: sum of (sellPrice - avgCost) * quantity for sold trades
- [ ] Implement GET /investments/:id/holdings endpoint

### Phase 4: Reporting & Dashboard (Sprint 3)

#### 4.1 Dashboard Endpoints
- [ ] Implement GET /reports/portfolio endpoint
- [ ] Implement GET /reports/cashflow endpoint
- [ ] Implement GET /reports/pnl endpoint
- [ ] Implement GET /reports/balance-timeline endpoint

#### 4.2 Price Fetch Service (Real-time)
- [ ] Create PriceService.ts để fetch giá từ API
- [ ] Integrate CoinGecko API for coins (real-time fetch)
- [ ] NAV feed for CCQ (optional, real-time fetch)
- [ ] Tính unrealized P&L: fetch currentPrice từ API khi cần
- [ ] Cache giá trong memory (optional) để giảm API calls

### Phase 5: Frontend Implementation

#### 5.1 Core Pages
- [ ] Dashboard page with charts
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
- [ ] Update `client/libs/api.ts` with new endpoints
- [ ] Type-safe API calls using Eden Treaty
