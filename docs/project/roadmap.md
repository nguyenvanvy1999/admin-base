# Roadmap & Implementation Status

Tài liệu này mô tả kế hoạch triển khai và trạng thái implementation của dự án FinTrack.

## Implementation Status

### ✅ Completed Features

#### Backend

- [x] Database schema design (Prisma)
- [x] User authentication (JWT với refresh token)
- [x] RBAC system (Role, Permission, RolePlayer)
- [x] Session management
- [x] MFA support (TOTP)
- [x] External auth providers (AuthProvider, UserAuthProvider)
- [x] Referral program
- [x] Account management (CRUD)
- [x] Category management (CRUD)
- [x] Entity management (CRUD)
- [x] Tag management (CRUD)
- [x] Event management (CRUD)
- [x] Currency management
- [x] Transaction management (CRUD, bulk operations)
- [x] Investment management (CRUD)
- [x] Investment trade management
- [x] Investment contribution management
- [x] Investment valuation management
- [x] Budget management (CRUD, period tracking)
- [x] Error handling middleware
- [x] Logging system (Logtape)
- [x] Audit logging
- [x] Swagger documentation
- [x] DTO validation schemas

#### Frontend

- [x] Authentication pages (Login/Register)
- [x] User store (Zustand)
- [x] API client (Eden Treaty)
- [x] Query client setup (TanStack Query)
- [x] Account management page
- [x] Category management page
- [x] Entity management page
- [x] Tag management page
- [x] Event management page
- [x] Transaction management page (với bulk operations)
- [x] Investment management page
- [x] Investment detail page
- [x] Budget management page
- [x] Budget detail page
- [x] Budget period detail page
- [x] DataTable component
- [x] Toast notifications (Mantine)
- [x] i18n setup (i18next)
- [x] Mantine UI provider
- [x] Theme support
- [x] Protected routes
- [x] Query hooks pattern
- [x] Mutation hooks pattern

### 🚧 In Progress

- [ ] Recurring transactions
- [ ] Reports & analytics
- [ ] Dashboard with charts
- [ ] Multi-currency PNL calculations
- [ ] Exchange rate impact display

### 📋 Planned Features

- [ ] Price sync service (CoinGecko, NAV feed)
- [ ] Holdings & P&L calculations optimization
- [ ] Portfolio view với charts
- [ ] Cashflow reports
- [ ] Export functionality (CSV/PDF)
- [ ] Mobile responsive improvements
- [ ] Advanced filtering và search

## Kế Hoạch Triển Khai

### Phase 1: Database Schema Design ✅

- [x] Thiết kế schema cho tất cả bảng
- [x] Tạo Prisma schema
- [x] Generate migrations
- [x] Test migrations
- [x] Indexes optimization

### Phase 2: Core Finance Features ✅

#### 2.1 Accounts Management ✅

- [x] Tạo AccountService.ts
- [x] Tạo account.controller.ts
- [x] Implement CRUD endpoints cho accounts
- [x] Validation schemas
- [x] Frontend pages và components

#### 2.2 Categories Management ✅

- [x] Tạo CategoryService.ts
- [x] Tạo category.controller.ts
- [x] Implement CRUD endpoints cho categories
- [x] Hỗ trợ danh mục con (parentId)
- [x] Frontend pages và components

#### 2.3 Transactions Management ✅

- [x] Tạo TransactionService.ts
- [x] Tạo transaction.controller.ts
- [x] Implement CRUD endpoints cho transactions
- [x] Tự động cập nhật balance khi tạo/cập nhật/xóa
- [x] Hỗ trợ transfer transactions
- [x] Frontend pages và components

#### 2.4 Entities & Tags Management ✅

- [x] Tạo EntityService.ts và TagService.ts
- [x] Tạo entity.controller.ts và tag.controller.ts
- [x] Implement CRUD endpoints
- [x] Frontend pages và components

### Phase 3: Investment Management ✅

#### 3.1 Investments CRUD ✅

- [x] Tạo InvestmentService.ts
- [x] Tạo investment.controller.ts
- [x] Implement CRUD endpoints cho investments
- [x] Frontend pages và components

#### 3.2 Investment Transactions ✅

- [x] Tạo TradeService.ts và ContributionService.ts
- [x] Tạo trade.controller.ts và contribution.controller.ts
- [x] Logic cho price, quantity, fee
- [x] Filter transactions theo investment
- [x] Frontend dialogs và forms

#### 3.3 Holdings & P&L Calculations ✅

- [x] Tính average cost (weighted average)
- [x] Tính current holdings per asset
- [x] Tính unrealized P&L
- [x] Tính realized P&L
- [x] Endpoint GET /investments/:id/holdings
- [x] Frontend display

### Phase 4: Reporting & Dashboard 🚧

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

#### 4.3 Frontend Dashboard

- [ ] Dashboard page với charts
- [ ] Chart components (line, pie, bar)
- [ ] Portfolio overview
- [ ] Performance metrics

### Phase 5: Advanced Features 📋

#### 5.1 Budget Management ✅

- [x] Tạo BudgetService.ts
- [x] Tạo budget.controller.ts
- [x] Implement CRUD endpoints cho budgets
- [x] Budget tracking theo chu kỳ
- [x] Frontend pages và components (BudgetPage, BudgetDetailPage, BudgetPeriodDetailPage)
- [ ] Budget alerts (thông báo khi gần vượt)

#### 5.2 Recurring Transactions

- [ ] Tạo RecurringService.ts
- [ ] Tạo recurring.controller.ts
- [ ] Background job tạo transactions từ recurring rules
- [ ] Frontend pages và components

#### 5.3 Multi-Currency Enhancements

- [ ] Cập nhật logic tính PNL theo base currency
- [ ] UI để nhập tỉ giá khi tạo trade/contribution/valuation
- [ ] Hiển thị PNL theo cả 2 currency
- [ ] Hiển thị exchange rate impact

#### 5.4 Export & Reports

- [ ] Export CSV functionality
- [ ] Export PDF functionality
- [ ] Advanced reports với filters
- [ ] Custom date ranges

## Tiêu Chí Chấp Nhận (MVP)

### Functional Requirements

1. **Quản Lý Tài Khoản & Giao Dịch** ✅
  - Người dùng có thể tạo tài khoản ✅
  - Người dùng có thể thêm giao dịch (thu/chi) ✅
  - Người dùng có thể xem balance và cashflow ✅

2. **Quản Lý Đầu Tư** ✅
  - Người dùng có thể thêm asset đầu tư ✅
  - Người dùng có thể tạo giao dịch mua/bán ✅
  - Người dùng có thể xem holdings và unrealized/realized P&L ✅

3. **Dashboard & Báo Cáo** 🚧
  - Dashboard hiển thị biểu đồ time-series của tổng tài sản ⏳
  - Dashboard hiển thị phân bổ tài sản (pie chart) ⏳
  - Có thể export báo cáo CSV/PDF ⏳

### Technical Requirements

1. **API** ✅
  - Có tests cơ bản cho API ⏳
  - Bảo mật JWT cho protected routes ✅
  - Swagger documentation ✅

2. **Database** ✅
  - Schema được định nghĩa trong Prisma ✅
  - Migrations đã được test ✅
  - Indexes được tối ưu ✅

3. **Code Quality** ✅
  - Code comments bằng tiếng Anh ✅
  - Tuân theo code style của dự án ✅
  - Có unit tests cho services ⏳

## Ưu Tiên Phát Triển

### Cao (Cần thiết cho MVP)

1. Dashboard với charts cơ bản
2. Export CSV functionality
3. Multi-currency PNL calculations
4. Price sync service (CoinGecko)

### Trung Bình (Cải thiện UX)

1. Budget management
2. Recurring transactions
3. Advanced filtering
4. Mobile responsive improvements

### Thấp (Nice to have)

1. PDF export
2. Advanced analytics
3. Push notifications
4. Mobile app

## Timeline Ước Tính

- **Phase 4 (Dashboard)**: 2-3 tuần
- **Phase 5.1 (Budget)**: 1-2 tuần
- **Phase 5.2 (Recurring)**: 1-2 tuần
- **Phase 5.3 (Multi-Currency)**: 1 tuần
- **Phase 5.4 (Export)**: 1 tuần

**Tổng cộng**: ~6-9 tuần để hoàn thành MVP đầy đủ

