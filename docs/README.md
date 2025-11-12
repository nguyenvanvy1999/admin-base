# FinTrack - Tài Liệu Dự Án

Chào mừng đến với tài liệu dự án FinTrack - Ứng dụng Quản Lý Tài Chính Cá Nhân & Đầu Tư.

## Tổng Quan

FinTrack là một ứng dụng web fullstack hiện đại được xây dựng bằng TypeScript, sử dụng Elysia.js cho backend và React cho frontend, với end-to-end type safety thông qua Eden Treaty.

## Cấu Trúc Tài Liệu

Tài liệu được tổ chức thành 3 phần chính:

### 📚 [Tài Liệu Công Nghệ](./technology/)
Tài liệu về công nghệ, kiến trúc và quy tắc phát triển:

- [**Tech Stack**](./technology/tech-stack.md) - Danh sách công nghệ và công cụ sử dụng
- [**Kiến Trúc Hệ Thống**](./technology/architecture.md) - Patterns và kiến trúc backend/frontend
- [**Quy Tắc Code**](./technology/coding-rules.md) - Conventions và quy tắc bắt buộc
- [**Hướng Dẫn Phát Triển**](./technology/development-guide.md) - Common tasks và troubleshooting

### 🎯 [Tài Liệu Dự Án](./project/)
Tài liệu về ý tưởng, thiết kế và kế hoạch dự án:

- [**Tổng Quan Dự Án**](./project/overview.md) - Giới thiệu dự án, tính năng và yêu cầu
- [**Database Schema**](./project/database-schema.md) - Thiết kế database và models
- [**Đánh Giá Đầu Tư**](./project/investment-evaluation.md) - Đánh giá schema cho tính năng đầu tư
- [**Roadmap**](./project/roadmap.md) - Kế hoạch triển khai và trạng thái implementation

### 👤 [Hướng Dẫn Sử Dụng](./user-guide/)
Tài liệu hướng dẫn cho người dùng và developer:

- [**Bắt Đầu Sử Dụng**](./user-guide/getting-started.md) - Cài đặt và cấu hình
- [**Tính Năng**](./user-guide/features.md) - Hướng dẫn sử dụng các tính năng chính
- [**API Reference**](./user-guide/api-reference.md) - Tham chiếu API endpoints

## Quick Start

Để bắt đầu với dự án, xem [Hướng Dẫn Bắt Đầu](./user-guide/getting-started.md).

### Yêu Cầu Hệ Thống

- [Bun](https://bun.sh) runtime
- PostgreSQL database
- Node.js 18+ (nếu không dùng Bun)

### Cài Đặt Nhanh

```bash
# Clone repository
git clone <repository-url>
cd fin-track

# Cài đặt dependencies
bun install

# Cấu hình environment variables
cp .env.example .env
# Chỉnh sửa .env với thông tin database của bạn

# Chạy migrations
bun run db:migrate
bun run db:generate

# Khởi động development server
bun run dev
```

Truy cập ứng dụng tại `http://localhost:3000`

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

**Lưu ý**: Tất cả code comments phải bằng tiếng Anh, nhưng documentation này được viết bằng tiếng Việt để dễ hiểu hơn cho team.

