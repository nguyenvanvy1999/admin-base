# API Reference

Tài liệu này mô tả các API endpoints của FinTrack.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Tất cả các endpoints (trừ auth) đều yêu cầu authentication qua JWT token.

### Headers

```
Authorization: Bearer <token>
```

## Swagger Documentation

API documentation đầy đủ có thể xem tại:
- **Swagger UI**: http://localhost:3000/docs

## Authentication Endpoints

### POST /api/auth/register

Đăng ký tài khoản mới.

**Request Body**:
```json
{
  "username": "string",
  "password": "string",
  "name": "string?",
  "baseCurrencyId": "string"
}
```

**Response**:
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "name": "string"
  },
  "token": "string"
}
```

### POST /api/auth/login

Đăng nhập.

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response**:
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "name": "string"
  },
  "token": "string"
}
```

## Accounts Endpoints

### GET /api/accounts

Lấy danh sách tài khoản.

**Query Parameters**:
- `type`: AccountType[] (optional)
- `currencyId`: string[] (optional)
- `search`: string (optional)
- `page`: number (optional, default: 1)
- `limit`: number (optional, default: 20)

**Response**:
```json
{
  "accounts": [
    {
      "id": "string",
      "type": "cash",
      "name": "string",
      "balance": "string",
      "currency": {
        "id": "string",
        "code": "string",
        "symbol": "string"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### POST /api/accounts

Tạo tài khoản mới.

**Request Body**:
```json
{
  "id": "string?",
  "type": "cash",
  "name": "string",
  "currencyId": "string",
  "initialBalance": 0
}
```

**Response**:
```json
{
  "id": "string",
  "type": "cash",
  "name": "string",
  "balance": "0",
  "currency": { ... }
}
```

### PUT /api/accounts/:id

Cập nhật tài khoản.

**Request Body**: Tương tự POST

**Response**: Tương tự POST

### DELETE /api/accounts/:id

Xóa tài khoản.

**Response**:
```json
{
  "success": true
}
```

## Categories Endpoints

### GET /api/categories

Lấy danh sách danh mục.

**Query Parameters**:
- `type`: CategoryType[] (optional)
- `parentId`: string (optional)
- `search`: string (optional)

**Response**:
```json
{
  "categories": [
    {
      "id": "string",
      "type": "expense",
      "name": "string",
      "parentId": "string?",
      "icon": "string?",
      "color": "string?"
    }
  ]
}
```

### POST /api/categories

Tạo danh mục mới.

**Request Body**:
```json
{
  "id": "string?",
  "type": "expense",
  "name": "string",
  "parentId": "string?",
  "icon": "string?",
  "color": "string?"
}
```

### PUT /api/categories/:id

Cập nhật danh mục.

### DELETE /api/categories/:id

Xóa danh mục.

## Transactions Endpoints

### GET /api/transactions

Lấy danh sách giao dịch.

**Query Parameters**:
- `accountId`: string (optional)
- `toAccountId`: string (optional)
- `categoryId`: string (optional)
- `investmentId`: string (optional)
- `entityId`: string (optional)
- `type`: TransactionType[] (optional)
- `dateFrom`: string (optional, ISO date)
- `dateTo`: string (optional, ISO date)
- `search`: string (optional)
- `page`: number (optional)
- `limit`: number (optional)

**Response**:
```json
{
  "transactions": [
    {
      "id": "string",
      "type": "expense",
      "amount": "1000000",
      "date": "2024-01-01T00:00:00Z",
      "account": { ... },
      "category": { ... }
    }
  ],
  "pagination": { ... }
}
```

### POST /api/transactions

Tạo giao dịch mới.

**Request Body**:
```json
{
  "id": "string?",
  "accountId": "string",
  "toAccountId": "string?",
  "type": "expense",
  "categoryId": "string?",
  "investmentId": "string?",
  "entityId": "string?",
  "amount": 1000000,
  "currencyId": "string",
  "price": 0,
  "quantity": 0,
  "fee": 0,
  "date": "2024-01-01T00:00:00Z",
  "dueDate": "string?",
  "note": "string?"
}
```

### PUT /api/transactions/:id

Cập nhật giao dịch.

### DELETE /api/transactions/:id

Xóa giao dịch.

## Investments Endpoints

### GET /api/investments

Lấy danh sách đầu tư.

**Query Parameters**:
- `assetType`: InvestmentAssetType[] (optional)
- `mode`: InvestmentMode[] (optional)
- `search`: string (optional)
- `page`: number (optional)
- `limit`: number (optional)

**Response**:
```json
{
  "investments": [
    {
      "id": "string",
      "symbol": "BTC",
      "name": "Bitcoin",
      "assetType": "coin",
      "mode": "priced",
      "currency": { ... }
    }
  ],
  "pagination": { ... }
}
```

### POST /api/investments

Tạo đầu tư mới.

**Request Body**:
```json
{
  "id": "string?",
  "symbol": "BTC",
  "name": "Bitcoin",
  "assetType": "coin",
  "mode": "priced",
  "currencyId": "string",
  "baseCurrencyId": "string?",
  "extra": {}
}
```

### GET /api/investments/:id/holdings

Lấy thông tin holdings và P&L.

**Response**:
```json
{
  "quantity": 1.5,
  "avgCost": 50000,
  "costBasis": 75000,
  "realizedPnl": 5000,
  "unrealizedPnl": 10000,
  "lastPrice": 60000,
  "lastValue": 90000,
  "lastValuationAt": "2024-01-01T00:00:00Z",
  "netContributions": 75000
}
```

### PUT /api/investments/:id

Cập nhật đầu tư.

### DELETE /api/investments/:id

Xóa đầu tư.

## Investment Trades Endpoints

### GET /api/investments/:id/trades

Lấy danh sách lệnh mua/bán.

**Query Parameters**:
- `side`: TradeSide[] (optional)
- `page`: number (optional)
- `limit`: number (optional)

### POST /api/investments/:id/trades

Thêm lệnh mua/bán.

**Request Body**:
```json
{
  "accountId": "string",
  "side": "buy",
  "timestamp": "2024-01-01T00:00:00Z",
  "price": 50000,
  "quantity": 0.1,
  "amount": 5000,
  "fee": 50,
  "currencyId": "string",
  "exchangeRate": 25000,
  "baseCurrencyId": "string?"
}
```

## Investment Contributions Endpoints

### GET /api/investments/:id/contributions

Lấy danh sách đóng góp/rút tiền.

### POST /api/investments/:id/contributions

Thêm đóng góp/rút tiền.

**Request Body**:
```json
{
  "accountId": "string?",
  "amount": 1000000,
  "currencyId": "string",
  "type": "deposit",
  "timestamp": "2024-01-01T00:00:00Z",
  "exchangeRate": 25000,
  "baseCurrencyId": "string?",
  "note": "string?"
}
```

## Investment Valuations Endpoints

### GET /api/investments/:id/valuations

Lấy lịch sử giá trị.

### POST /api/investments/:id/valuations

Cập nhật giá trị hiện tại.

**Request Body**:
```json
{
  "price": 60000,
  "currencyId": "string",
  "timestamp": "2024-01-01T00:00:00Z",
  "source": "coingecko",
  "exchangeRate": 25000,
  "baseCurrencyId": "string?"
}
```

## Reports Endpoints (Sắp Có)

### GET /api/reports/portfolio

Tổng quan portfolio.

### GET /api/reports/cashflow

Báo cáo dòng tiền.

**Query Parameters**:
- `dateFrom`: string (ISO date)
- `dateTo`: string (ISO date)

### GET /api/reports/pnl

Báo cáo lãi/lỗ.

**Query Parameters**:
- `dateFrom`: string (ISO date)
- `dateTo`: string (ISO date)
- `investmentId`: string (optional)

### GET /api/reports/balance-timeline

Timeline số dư.

**Query Parameters**:
- `dateFrom`: string (ISO date)
- `dateTo`: string (ISO date)
- `accountId`: string[] (optional)

## Error Responses

Tất cả các endpoints có thể trả về lỗi:

```json
{
  "error": {
    "message": "Error message",
    "status": 400
  }
}
```

**Status Codes**:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

Hiện tại chưa có rate limiting. Sẽ được thêm trong tương lai.

## Testing API với Swagger UI

1. Start server: `bun run dev`
2. Mở: http://localhost:3000/docs
3. Click **Authorize** và nhập JWT token
4. Test endpoints trực tiếp trong Swagger UI

## Testing API với cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}'

# Get accounts (với token)
curl -X GET http://localhost:3000/api/accounts \
  -H "Authorization: Bearer <token>"
```

## Testing API với Eden Treaty (Frontend)

```typescript
import { api } from "@client/libs/api";

// Fully typed API call
const response = await api.api.accounts.post({
    type: AccountType.cash,
    name: "Cash Account",
    currencyId: "xxx",
});

if (response.error) {
    console.error(response.error.value?.message);
} else {
    console.log(response.data);
}
```

