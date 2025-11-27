# Bắt Đầu Sử Dụng

Hướng dẫn cài đặt và cấu hình dự án FinTrack.

## Prerequisites

- [Bun](https://bun.sh) runtime (khuyến nghị) hoặc Node.js 18+
- PostgreSQL database
- Git

## Installation

### Bước 1: Clone Repository

```bash
git clone <repository-url>
cd fin-track
```

### Bước 2: Cài Đặt Dependencies

```bash
bun install
```

Hoặc nếu dùng npm:

```bash
npm install
```

### Bước 3: Cấu Hình Environment Variables

Tạo file `.env` trong thư mục root:

```bash
cp .env.example .env
```

Chỉnh sửa `.env` với thông tin của bạn:

```env
POSTGRESQL_URI=postgresql://user:password@localhost:5432/investment
JWT_SECRET=your-super-secret-jwt-key-here
PORT=3000
```

### Bước 4: Database Setup

1. Đảm bảo PostgreSQL đang chạy
2. Tạo database (ví dụ: `investment`)
3. Cập nhật `POSTGRESQL_URI` trong `.env`
4. Chạy migrations:

```bash
# Tạo migration
bun run db:migrate

# Generate Prisma client
bun run db:generate
```

### Bước 5: Khởi Động Development Server

```bash
bun run dev
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

## Development Commands

```bash
# Install dependencies
bun install

# Database migrations
bun run db:migrate      # Tạo migration
bun run db:generate     # Generate Prisma client
bun run db:deploy       # Deploy migrations
bun run db:dev:reset    # Reset database (dev only)

# Code formatting & linting
bun run format          # Format code với Biome
bun run lint            # Lint code với Biome
bun run check           # Format và lint

# Development với hot reload
bun run dev

# Build cho production (compile to binary)
bun run build

# Start production server
bun start
```

## Cấu Hình Chi Tiết

### Database Configuration

#### PostgreSQL Setup

1. Cài đặt PostgreSQL:
   ```bash
   # macOS (Homebrew)
   brew install postgresql
   brew services start postgresql

   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. Tạo database:
   ```sql
   CREATE DATABASE investment;
   ```

3. Cập nhật connection string trong `.env`:
   ```env
   POSTGRESQL_URI=postgresql://username:password@localhost:5432/investment
   ```

#### Prisma Migrations

```bash
# Tạo migration mới sau khi thay đổi schema
bun run db:migrate

# Xem migration status
bunx prisma migrate status

# Reset database (dev only - xóa tất cả data)
bun run db:dev:reset
```

### Environment Variables

#### Required Variables

- `POSTGRESQL_URI`: Connection string cho PostgreSQL
- `JWT_SECRET`: Secret key cho JWT tokens (nên dùng random string mạnh)

#### Optional Variables

- `PORT`: Port cho server (default: 3000)
- `NODE_ENV`: Environment (development/production)

### Development Tools

#### Biome (Formatter & Linter)

Cấu hình trong `biome.json`. Chạy:

```bash
# Format code
bun run format

# Lint code
bun run lint

# Format và lint
bun run check
```

#### TypeScript

Type checking tự động trong IDE. Có thể chạy:

```bash
bunx tsc --noEmit
```

## Production Deployment

### Build Process

```bash
# Build cho production
bun run build

# Build sẽ tạo file binary `server` trong root
```

### Docker Deployment

```bash
# Build image
docker build -t fin-track .

# Run container
docker run -p 3000:3000 --env-file .env fin-track
```

### Environment Setup

Đảm bảo các biến môi trường được set trong production:

```env
POSTGRESQL_URI=postgresql://user:password@host:5432/database
JWT_SECRET=production-secret-key
PORT=3000
NODE_ENV=production
```

### Database Migrations trong Production

```bash
# Deploy migrations
bun run db:deploy

# Hoặc sử dụng Prisma migrate deploy
bunx prisma migrate deploy
```

## Troubleshooting

### Database Connection Fails

1. Kiểm tra PostgreSQL đang chạy:
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Verify connection string trong `.env`
3. Kiểm tra database tồn tại
4. Kiểm tra user có quyền truy cập

### Port Already in Use

```bash
# Tìm process đang dùng port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Hoặc đổi PORT trong .env
PORT=3001
```

### Prisma Client Not Generated

```bash
# Generate lại Prisma client
bun run db:generate

# Nếu vẫn lỗi, xóa và generate lại
rm -rf src/generated/prisma
bun run db:generate
```

### Types Not Syncing

1. Restart dev server
2. Kiểm tra `src` path alias trong `tsconfig.json`
3. Verify Eden Treaty configuration

### Bun Not Found

Cài đặt Bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

Hoặc sử dụng npm:

```bash
npm install -g bun
```

## Next Steps

Sau khi setup xong:

1. Đọc [Tính Năng](./features.md) để hiểu cách sử dụng
2. Xem [API Reference](./api-reference.md) để tích hợp API
3. Đọc [Development Guide](../technology/development-guide.md) để phát triển

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Elysia.js Documentation](https://elysiajs.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

