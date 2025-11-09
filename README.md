# 🚀 Elysia Fullstack Template

A modern, production-ready fullstack template built with **Elysia** (backend) and **React** (frontend), powered by **Bun
** runtime for lightning-fast development and hot reloading.

## ✨ Features

### 🔥 **Hot Reload Development**

- **Bun-powered hot reload** for both frontend and backend
- **No bundlers needed** - Bun handles everything natively
- **Instant development feedback** with automatic reloading

### 🛡️ **Backend (Elysia)**

- **Prisma ORM** for database management with PostgreSQL
- **JWT Authentication** with macro-based auth checking
- **Swagger Documentation** automatically generated
- **Type-safe API** with full TypeScript support
- **CORS, Static file serving** and other essential middleware

### ⚛️ **Frontend (React)**

- **Auto-bundled with Bun** - no Vite, Webpack, or other bundlers
- **Hash Router** to avoid conflicts with server routes
- **Mantine UI v8** - Modern React component library
- **Tailwind CSS v4** - Utility-first CSS framework
- **State Management**:
    - **Zustand** - Lightweight global state management
    - **TanStack Query** - Powerful server state management
- **TanStack Form** - Type-safe form management
- **TanStack Table** - Headless table component
- **i18next** - Internationalization support
- **Eden Treaty** - End-to-end type safety

### 🔐 **Authentication System**

- **JWT-based authentication** with secure token handling
- **Protected routes** with automatic redirects
- **User state management** with Zustand store
- **Login/Register** pages with form validation

### 🎨 **UI/UX**

- **Modern, responsive design** with Mantine UI + Tailwind CSS
- **Beautiful login/register** forms with TanStack Form validation
- **Data tables** with sorting, filtering, pagination
- **Toast notifications** for user feedback
- **Internationalization** support (i18n)
- **Dark mode** support (via Mantine theme)

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed on your system

### Installation

1. **Create new project using this template**

```bash
bun create codingcat0405/elysia-fullstack-template awesome-web-app
cd awesome-web-app
```

2. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your database configuration
```

3. **Start development server**

```bash
bun run dev
```

4. **Open your browser**
   Navigate to `http://localhost:3000` to see your application!

## 📁 Project Structure

```
fin-track/
├── client/                 # Frontend React application
│   ├── components/         # Reusable UI components
│   │   ├── DataTable/      # DataTable component & utilities
│   │   └── utils/          # Component utilities
│   ├── pages/              # Page components
│   ├── layouts/            # Layout components
│   ├── hooks/              # Custom React hooks
│   │   ├── queries/        # TanStack Query hooks
│   │   ├── mutations/       # TanStack Query mutation hooks
│   │   └── useToast.tsx    # Toast notification hook
│   ├── store/              # Zustand stores (global state)
│   ├── libs/               # API client and utilities
│   ├── types/              # TypeScript type definitions
│   ├── providers/          # React context providers
│   ├── styles/             # Global styles & theme
│   ├── locales/            # i18n translation files
│   └── public/             # Static assets
├── src/                    # Backend Elysia application
│   ├── controllers/        # API route handlers
│   ├── services/           # Business logic
│   ├── middlewares/        # Custom middlewares
│   ├── macros/             # Authentication macros
│   ├── dto/                # Data Transfer Objects
│   ├── constants/         # Backend constants
│   ├── libs/               # Utilities (db, logger, env)
│   └── generated/         # Generated Prisma client
├── prisma/                 # Prisma schema and migrations
└── package.json            # Dependencies and scripts
```

## 🛠️ Development

### Backend Development

The backend runs on Elysia with the following features:

- **Database**: Prisma ORM with PostgreSQL
- **Authentication**: JWT with macro-based route protection
- **API Documentation**: Auto-generated Swagger docs
- **Hot Reload**: Automatic server restart on file changes

### Frontend Development

The frontend is a React SPA with:

- **Bun bundling**: No additional bundlers required
- **Hash Router**: Prevents conflicts with server routes
- **UI Components**: Mantine UI v8 for modern components
- **Styling**: Tailwind CSS v4 for utility classes
- **Type Safety**: Eden Treaty provides end-to-end types
- **State Management**:
    - Zustand for global state (user, theme)
    - TanStack Query for server state (API data)
- **Forms**: TanStack Form for type-safe form handling
- **Tables**: TanStack Table for data tables
- **i18n**: i18next for internationalization

### Available Scripts

```bash
# Start development server (both frontend & backend)
bun run dev

# Build for production
bun run build

# Start production server
bun start
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
POSTGRES_URL=postgresql://user:password@localhost:5432/investment
JWT_SECRET=your-super-secret-jwt-key
PORT=3000
```

### Database Setup

1. Ensure PostgreSQL is running
2. Create a database (e.g., `investment`)
3. Update `POSTGRES_URL` in your `.env` file
4. Run Prisma migrations:
   ```bash
   bun run db:migrate
   bun run db:generate
   ```

## 🚀 Production Deployment

### Important Note: Hash Router Requirement

The frontend **must use hash router** to avoid conflicts with server routes. The static file serving mounts the client
folder at the root path (`/`), so any SPA routes need corresponding files in the client folder.

### Production Build Process

For production deployment:

1. **Build static files** for the frontend
2. **Serve only static files** from the server (not the entire React JSX)
3. **Use Docker** for containerization (optional but recommended)

### Docker Deployment

```dockerfile
# Example Dockerfile structure
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Build application
COPY . .
RUN bun run build

# Production stage
FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
EXPOSE 3000
CMD ["bun", "start"]
```

## 🎯 Key Technologies

### Backend

- **Runtime**: [Bun](https://bun.sh) - Fast JavaScript runtime
- **Framework**: [Elysia](https://elysiajs.com) - High-performance TypeScript framework
- **Database**: [Prisma](https://www.prisma.io) - Type-safe ORM with PostgreSQL
- **Logging**: [Logtape](https://logtape.logtape.dev) - Structured logging

### Frontend

- **UI Library**: [React](https://reactjs.org) - UI library
- **Component Library**: [Mantine UI](https://mantine.dev) - Modern React components
- **Styling**: [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- **State Management**:
    - [Zustand](https://zustand-demo.pmnd.rs) - Lightweight global state
    - [TanStack Query](https://tanstack.com/query) - Server state management
- **Forms**: [TanStack Form](https://tanstack.com/form) - Type-safe forms
- **Tables**: [TanStack Table](https://tanstack.com/table) - Headless tables
- **i18n**: [i18next](https://www.i18next.com) - Internationalization
- **Type Safety**: [Eden Treaty](https://elysiajs.com/eden/overview.html) - End-to-end type safety

### Development Tools

- **Formatter/Linter**: [Biome](https://biomejs.dev) - Fast formatter and linter

## 📚 API Documentation

Once the server is running, visit `http://localhost:3000/docs` to view the interactive API documentation (Swagger UI).

## 🔄 State Management

### Global State (Zustand)

Use Zustand for global state that needs to be shared across components:

```typescript
import useUserStore from '@client/store/user';

const ProfilePage = () => {
  const { user, setUser } = useUserStore();
  // ...
};
```

### Server State (TanStack Query)

Use TanStack Query for all API data:

```typescript
import { useAccountsQuery } from '@client/hooks/queries/useAccountQueries';

const AccountPage = () => {
  const { data, isLoading } = useAccountsQuery({ page: 1, limit: 20 });
  // ...
};
```

## 🔒 Type Safety

### Eden Treaty (End-to-End Types)

Eden Treaty automatically generates types from your Elysia backend:

```typescript
import { api } from '@client/libs/api';

// Fully typed API call
const response = await api.api.accounts.post({
  type: AccountType.cash,
  name: 'Cash Account',
  currencyId: 'xxx',
});

// TypeScript knows the exact shape of response.data and response.error
if (response.error) {
  console.error(response.error.value?.message);
} else {
  console.log(response.data.id);
}
```

## 🎨 UI Components

### Mantine UI

The project uses Mantine UI v8 as the primary component library:

```typescript
import { Button, Modal, TextInput } from '@mantine/core';

const MyComponent = () => {
  return (
    <Modal opened={opened} onClose={onClose}>
      <TextInput label="Name" />
      <Button>Submit</Button>
    </Modal>
  );
};
```

### DataTable Component

Reusable DataTable component with sorting, filtering, pagination:

```typescript
import DataTable from '@client/components/DataTable';

<DataTable
  data={accounts}
  columns={columns}
  pagination={pagination}
  search={{ onSearch: handleSearch }}
  filters={{ slots: filterSlots }}
/>
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Elysia](https://elysiajs.com) for the amazing TypeScript framework
- [Bun](https://bun.sh) for the fast JavaScript runtime
- [Tailwind CSS](https://tailwindcss.com) for the utility-first CSS framework

---

**⭐ Star this repository if you found it helpful!**

Made with ❤️ by [CodingCat](https://github.com/codingcat0405)
