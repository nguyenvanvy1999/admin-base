# FinTrack - Tài Liệu Dự Án

Chào mừng đến với tài liệu dự án FinTrack - Ứng dụng Quản Lý Tài Chính Cá Nhân & Đầu Tư.

## Tổng Quan

FinTrack là một ứng dụng web fullstack hiện đại được xây dựng bằng TypeScript, sử dụng Elysia.js cho backend và React
cho frontend, với end-to-end type safety thông qua Eden Treaty.

## Cấu Trúc Tài Liệu

Các tài liệu cũ mô tả modules quản lý tài chính (accounts, budgets, investments, …) đã bị gỡ bỏ vì không còn khớp với
codebase hiện tại. Tài liệu mới được tổ chức thành 2 nhóm:

### 📚 [Tài Liệu Công Nghệ](./technology/)

- [**Tech Stack**](./technology/tech-stack.md): tổng quan công nghệ
- [**Kiến Trúc Hệ Thống**](./technology/architecture.md): cấu trúc monorepo và patterns đang dùng
- [**Quy Tắc Code**](./technology/coding-rules.md): conventions và rule bắt buộc
- [**Hướng Dẫn Phát Triển**](./technology/development-guide.md): checklist thao tác và troubleshooting

### 👤 [Hướng Dẫn Sử Dụng](./user-guide/)

- [**Bắt Đầu Sử Dụng**](./user-guide/getting-started.md): setup backend/frontend
- [**Tính Năng**](./user-guide/features.md): mô tả Dashboard demo, Workspace, Settings
- [**API Reference**](./user-guide/api-reference.md): endpoints thực tế (Auth, MFA, Admin, Misc)

## Quick Start

Để bắt đầu với dự án, xem [Hướng Dẫn Bắt Đầu](./user-guide/getting-started.md).

### Yêu Cầu Hệ Thống

- [Bun](https://bun.sh) runtime
- PostgreSQL database
- Node.js 18+ (tùy chọn cho công cụ CLI)

### Cài Đặt Nhanh

```bash
# Clone repository
git clone <repository-url>
cd investment

# Cài đặt dependencies (mono-repo)
bun install

# Cấu hình environment variables cho backend
cp server/.env.example server/.env

# Chạy migrations
cd server
bun run db:migrate
bun run db:generate

# Khởi động backend
bun run dev

# Mở một terminal khác để chạy frontend
cd ../client
bun run dev
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

## Tài Liệu Tham Khảo

- [Elysia.js Documentation](https://elysiajs.com)
- [Bun Documentation](https://bun.sh/docs)
- [Eden Treaty Guide](https://elysiajs.com/eden/overview.html)
- [Mantine UI](https://mantine.dev)
- [TanStack Query](https://tanstack.com/query)
- [Prisma Documentation](https://www.prisma.io/docs)

## Đóng Góp

Khi đóng góp vào dự án, vui lòng:

1. Đọc [Quy Tắc Code](./technology/coding-rules.md)
2. Tuân theo [Hướng Dẫn Phát Triển](./technology/development-guide.md)
3. Cập nhật documentation nếu cần thiết

---

**Lưu ý**: Tất cả code comments phải bằng tiếng Anh, nhưng documentation này được viết bằng tiếng Việt để dễ hiểu hơn
cho team.

