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

## Người Dùng & Phân Quyền

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

## API Endpoints Tổng Quan

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

