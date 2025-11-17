# Tổng Quan Dự Án

Tài liệu này mô tả tổng quan về dự án FinTrack, các tính năng chính và yêu cầu kỹ thuật.

## Giới Thiệu

FinTrack là một ứng dụng web quản lý tài chính cá nhân kết hợp quản lý đầu tư, cho phép người dùng:

- Theo dõi thu/chi, ngân sách, vay, nợ
- Quản lý các danh mục đầu tư (coin, CCQ, đầu tư tự do)
- Xem báo cáo và phân tích tài chính

## Yêu Cầu

- Trực quan, dễ sử dụng
- Mobile-friendly
- Bảo mật cao
- Dễ mở rộng (thêm kênh đầu tư, tích hợp ngân hàng, kết nối exchange)

## Tính Năng Chính (MVP)

### 1. Core Finance (Tài Chính Cốt Lõi)

- **CRUD Giao Dịch**: Thu/chi, vay, nợ, chuyển khoản
  - Số tiền, ngày, tài khoản, danh mục, ghi chú, receipt URL
  - Hỗ trợ transfer giữa các tài khoản
  - Liên kết với Events để nhóm giao dịch
- **Quản Lý Tài Khoản**: Cash, bank, credit_card, investment account
- **Danh Mục**: Income/expense/transfer/investment/loan, hỗ trợ danh mục con (parentId)
- **Giao Dịch Định Kỳ**: Daily/weekly/monthly (RecurringTransaction)
- **Ngân Sách**: ✅ Đã triển khai
  - Đặt ngân sách theo chu kỳ (daily/monthly/quarterly/yearly/none)
  - Liên kết với nhiều danh mục và tài khoản
  - Tracking theo từng chu kỳ với carry-over
  - Xem chi tiết từng chu kỳ
- **Events**: Nhóm giao dịch theo sự kiện hoặc khoảng thời gian
- **Entities**: Quản lý đối tác vay nợ (cá nhân/tổ chức)
- **Tags**: Gắn tag cho giao dịch để phân loại

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

## Người Dùng & Phân Quyền

### Hệ Thống RBAC (Role-Based Access Control)

Hệ thống sử dụng RBAC linh hoạt với:

- **Roles**: Vai trò người dùng (ví dụ: user, admin, manager)
- **Permissions**: Quyền hệ thống chi tiết
- **RolePlayer**: Gán nhiều roles cho một user
- **RolePermission**: Gán nhiều permissions cho một role

### Authentication & Security

- **JWT Authentication**: Token-based authentication với refresh token
- **Session Management**: Quản lý sessions với device và IP tracking
- **MFA Support**: Hỗ trợ Multi-Factor Authentication (TOTP)
- **External Auth Providers**: Hỗ trợ đăng nhập qua Google, Telegram, etc. (qua AuthProvider)
- **Password Security**: Password hashing với pepper, password expiration, attempt tracking
- **Referral Program**: Chương trình giới thiệu người dùng

### Tính Năng Đa Tài Khoản

- Hỗ trợ nhiều tài khoản cho mỗi người dùng
- Mỗi tài khoản có thể có loại khác nhau (cash, bank, credit_card, investment)

## API Endpoints Tổng Quan

### Authentication

- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập (trả về accessToken và refreshToken)
- `POST /api/auth/refresh` - Làm mới token
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `POST /api/auth/logout` - Đăng xuất (revoke session)

### Accounts (Tài Khoản)

- `GET /api/accounts` - Lấy danh sách tài khoản
- `POST /api/accounts` - Tạo/cập nhật tài khoản (upsert)
- `DELETE /api/accounts/:id` - Xóa tài khoản
- `POST /api/accounts/delete-many` - Xóa nhiều tài khoản

### Categories (Danh Mục)

- `GET /api/categories` - Lấy danh sách danh mục
- `POST /api/categories` - Tạo danh mục mới
- `PUT /api/categories/:id` - Cập nhật danh mục
- `DELETE /api/categories/:id` - Xóa danh mục

### Transactions (Giao Dịch)

- `GET /api/transactions` - Lấy danh sách giao dịch (có filters)
- `POST /api/transactions` - Tạo/cập nhật giao dịch (upsert)
- `DELETE /api/transactions/:id` - Xóa giao dịch
- `POST /api/transactions/delete-many` - Xóa nhiều giao dịch
- `POST /api/transactions/bulk` - Tạo nhiều giao dịch cùng lúc

**Lưu ý**:

- Tự động cập nhật balance của account khi tạo/cập nhật/xóa transaction
- Hỗ trợ transfer giữa các account (type = 'transfer')
- Hỗ trợ liên kết với Events, Entities, Investments

### Investments (Đầu Tư)

- `GET /api/investments` - Lấy danh sách tài sản đầu tư
- `POST /api/investments` - Tạo/cập nhật tài sản đầu tư (upsert)
- `DELETE /api/investments/:id` - Xóa tài sản đầu tư
- `GET /api/investments/:id/holdings` - Lấy thông tin holdings và P&L
- `GET /api/investments/:id/trades` - Lấy danh sách lệnh mua/bán
- `POST /api/investments/:id/trades` - Thêm lệnh mua/bán
- `GET /api/investments/:id/contributions` - Lấy danh sách đóng góp/rút tiền
- `POST /api/investments/:id/contributions` - Thêm đóng góp/rút tiền
- `GET /api/investments/:id/valuations` - Lấy lịch sử giá trị
- `POST /api/investments/:id/valuations` - Cập nhật giá trị hiện tại

**Lưu ý**:

- Investment transactions được gộp vào bảng transactions (type = 'investment')
- Sử dụng `investmentId` để liên kết
- Hỗ trợ 2 chế độ: `priced` (có lệnh mua/bán) và `manual` (cập nhật thủ công)

### Budgets (Ngân Sách) ✅

- `GET /api/budgets` - Lấy danh sách ngân sách
- `POST /api/budgets` - Tạo/cập nhật ngân sách (upsert)
- `GET /api/budgets/:id` - Lấy chi tiết ngân sách
- `DELETE /api/budgets/:id` - Xóa ngân sách
- `POST /api/budgets/delete-many` - Xóa nhiều ngân sách
- `GET /api/budgets/:id/periods` - Lấy danh sách chu kỳ
- `GET /api/budgets/:id/periods/:periodId` - Lấy chi tiết chu kỳ

**Lưu ý**:

- Hỗ trợ nhiều chu kỳ: daily, monthly, quarterly, yearly, none
- Tracking chi tiết theo từng chu kỳ
- Hỗ trợ carry-over số dư sang chu kỳ sau

### Reports (Báo Cáo)

- `GET /api/reports/portfolio` - Tổng quan portfolio
- `GET /api/reports/cashflow` - Báo cáo dòng tiền
- `GET /api/reports/pnl` - Báo cáo lãi/lỗ
- `GET /api/reports/balance-timeline` - Timeline số dư

### Admin (Quản Trị)

- `POST /api/admin/price-sync` - Đồng bộ giá từ API (protected, admin only)

## Quy Tắc Tính Toán Quan Trọng

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

## Tiêu Chí Chấp Nhận (MVP)

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

## Tính Năng Nâng Cao (Tương Lai)

- Hỗ trợ multi-user family shares
- Multi-currency nâng cao
- Kết nối tự động ngân hàng (Plaid-like) hoặc import OFX
- Push notifications cho budget alerts
- Role-based access cho multi-user team
- Mobile app (React Native)

