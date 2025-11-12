# Đánh Giá Schema Database cho 2 Loại Đầu Tư

## Tổng Quan

Schema hiện tại đã được thiết kế để hỗ trợ 2 loại đầu tư thông qua trường `mode` trong model `Investment`:
- `priced`: Đầu tư có các lệnh mua/bán chi tiết
- `manual`: Đầu tư chỉ cập nhật số dư thủ công

---

## ✅ Loại 1: Priced Mode (Đầu tư có lệnh mua/bán chi tiết)

### Đánh Giá: **ĐÁP ỨNG ĐẦY ĐỦ** ✅

### Schema hỗ trợ:

1. **InvestmentTrade Model** - Lưu các lệnh mua/bán:
   ```prisma
   - side: TradeSide (buy/sell)
   - price: Decimal (giá mua/bán)
   - quantity: Decimal (số lượng)
   - amount: Decimal (tổng giá trị)
   - fee: Decimal (phí giao dịch)
   - timestamp: DateTime
   - priceInBaseCurrency: Decimal? (giá quy đổi)
   ```

2. **InvestmentValuation Model** - Lưu giá hiện tại:
   ```prisma
   - price: Decimal (giá hiện tại)
   - timestamp: DateTime
   - source: String? (nguồn giá)
   - fetchedAt: DateTime? (thời gian fetch)
   ```

3. **Holding Model** - Lưu trữ position (chưa được sử dụng trong code):
   ```prisma
   - quantity: Decimal
   - avgCost: Decimal
   - unrealizedPnl: Decimal?
   - lastPrice: Decimal?
   ```

### Logic tính toán (trong `InvestmentService.computePricedPosition`):

✅ **Realized PNL**: Tính từ các lệnh bán
- Khi bán: `realizedPnl += (proceeds - costOfSold)`
- Sử dụng weighted average cost để tính cost basis

✅ **Unrealized PNL**: Tính từ giá hiện tại
- `unrealizedPnl = (quantity * lastPrice) - costBasis`
- Lấy giá từ `InvestmentValuation` hoặc giá lệnh cuối cùng

✅ **Quantity & Avg Cost**: Tính từ các lệnh mua/bán
- Tăng khi mua, giảm khi bán
- Weighted average cost tự động cập nhật

✅ **Cập nhật giá hiện tại**: Có thể cập nhật qua `InvestmentValuation` để tính unrealized PNL

---

## ⚠️ Loại 2: Manual Mode (Đầu tư cập nhật số dư thủ công)

### Đánh Giá: **ĐÁP ỨNG MỘT PHẦN** ⚠️

### Schema hỗ trợ:

1. **InvestmentContribution Model** - Lưu các khoản đóng góp:
   ```prisma
   - amount: Decimal (số tiền đóng góp)
   - timestamp: DateTime
   - accountId: String? (tài khoản nguồn)
   - note: String?
   ```

2. **InvestmentValuation Model** - Lưu giá trị hiện tại:
   ```prisma
   - price: Decimal (giá trị hiện tại)
   - timestamp: DateTime
   ```

### Logic tính toán (trong `InvestmentService.computeManualPosition`):

✅ **Unrealized PNL**: Tính được
- `unrealizedPnl = currentValue - netContributions`
- `currentValue` lấy từ `InvestmentValuation`
- `netContributions` = tổng các `InvestmentContribution`

✅ **Cost Basis**: Tính được
- `costBasis = tổng các contributions`

❌ **Realized PNL**: **CHƯA CÓ CÁCH TÍNH**
- Hiện tại luôn trả về `0`
- Khi quyết toán đầu tư, cần có cách tính realized PNL

---

## ❌ Vấn Đề Cần Giải Quyết

### 1. Quyết Toán Đầu Tư (Settlement) cho Manual Mode

**Vấn đề:**
- Khi quyết toán, người dùng cần nhập giá trị nhận về
- Cần tính `realizedPnl = giá trị nhận về - cost basis`
- Hiện tại không có model/trường rõ ràng để đánh dấu "quyết toán"

**Giải pháp đề xuất:**

**Option 1: Sử dụng InvestmentContribution với số âm**
- Thêm contribution với `amount` âm để đánh dấu rút tiền/quyết toán
- Cập nhật `computeManualPosition` để tính realized PNL từ contributions âm
- **Ưu điểm**: Không cần thay đổi schema
- **Nhược điểm**: Không rõ ràng, dễ nhầm lẫn

**Option 2: Thêm trường `type` vào InvestmentContribution**
```prisma
enum ContributionType {
  deposit    // Đóng góp
  withdrawal // Rút tiền/quyết toán
}

model InvestmentContribution {
  // ... existing fields
  type ContributionType @default(deposit)
}
```
- **Ưu điểm**: Rõ ràng, dễ phân biệt
- **Nhược điểm**: Cần migration

**Option 3: Tạo model riêng cho Settlement**
```prisma
model InvestmentSettlement {
  id          String   @id @default(uuid(7))
  userId      String
  investmentId String
  amount      Decimal  // Giá trị nhận về
  timestamp   DateTime
  note        String?
  // ... relations
}
```
- **Ưu điểm**: Tách biệt rõ ràng, dễ mở rộng
- **Nhược điểm**: Phức tạp hơn, cần migration

**Khuyến nghị**: **Option 2** - Thêm `type` vào `InvestmentContribution`

### 2. Cập nhật Logic Tính Toán cho Manual Mode

Cần cập nhật `computeManualPosition` để:
1. Phân biệt contributions dương (đóng góp) và âm (rút tiền/quyết toán)
2. Tính `realizedPnl` từ các contributions âm
3. Tính `unrealizedPnl` từ giá trị hiện tại và cost basis còn lại

**Logic đề xuất:**
```typescript
private computeManualPosition(
  contributions: ContributionLike[],
  valuation: ValuationLike | null,
): PositionResult {
  let netContributions = 0;
  let realizedPnl = 0;
  
  for (const contribution of contributions) {
    const amount = safeNumber(contribution.amount);
    
    if (amount > 0) {
      // Đóng góp
      netContributions += amount;
    } else {
      // Rút tiền/quyết toán
      const costBasisAtWithdrawal = netContributions;
      const withdrawalAmount = Math.abs(amount);
      
      // Tính realized PNL: giá trị nhận về - cost basis
      realizedPnl += withdrawalAmount - costBasisAtWithdrawal;
      
      // Giảm cost basis theo tỷ lệ
      const withdrawalRatio = withdrawalAmount / (costBasisAtWithdrawal || 1);
      netContributions -= costBasisAtWithdrawal * withdrawalRatio;
    }
  }
  
  const currentValue = valuation ? safeNumber(valuation.price) : null;
  const unrealizedPnl =
    currentValue !== null 
      ? Number((currentValue - netContributions).toFixed(2)) 
      : 0;
  
  return {
    quantity: null,
    avgCost: null,
    costBasis: Number(netContributions.toFixed(2)),
    realizedPnl: Number(realizedPnl.toFixed(2)),
    unrealizedPnl,
    lastPrice: currentValue,
    lastValue: currentValue,
    lastValuationAt: valuation?.timestamp ?? null,
    netContributions: Number(netContributions.toFixed(2)),
  };
}
```

### 3. Holding Model chưa được sử dụng

**Vấn đề:**
- Model `Holding` có trong schema nhưng không được sử dụng trong code
- Có thể là cache/snapshot của position, nhưng hiện tại position được tính real-time

**Khuyến nghị:**
- Nếu không cần cache, có thể xóa model này
- Nếu cần cache để tối ưu performance, cần implement logic sync holding khi có trade/valuation mới

---

## Kết Luận

### Loại 1 (Priced Mode): ✅ **HOÀN TOÀN ĐÁP ỨNG**
- Schema đầy đủ
- Logic tính toán đúng
- Có thể cập nhật giá hiện tại để tính unrealized PNL
- Có thể tính realized PNL từ các lệnh bán

### Loại 2 (Manual Mode): ⚠️ **CẦN BỔ SUNG**
- ✅ Có thể cập nhật số dư thủ công (qua InvestmentContribution)
- ✅ Có thể cập nhật giá trị hiện tại (qua InvestmentValuation)
- ✅ Có thể tính unrealized PNL
- ❌ **CHƯA CÓ CÁCH TÍNH REALIZED PNL KHI QUYẾT TOÁN**

### Hành Động Cần Thiết:

1. **Thêm trường `type` vào InvestmentContribution** (hoặc model riêng cho settlement)
2. **Cập nhật `computeManualPosition`** để tính realized PNL
3. **Cập nhật DTO và validation** để hỗ trợ withdrawal/settlement
4. **Cập nhật frontend** để cho phép nhập quyết toán đầu tư

---

## Đề Xuất Implementation

### Bước 1: Migration Schema
```prisma
enum ContributionType {
  deposit
  withdrawal
}

model InvestmentContribution {
  // ... existing fields
  type ContributionType @default(deposit) @map("type")
}
```

### Bước 2: Cập nhật Service
- Cập nhật `computeManualPosition` để tính realized PNL
- Validation: withdrawal không được vượt quá cost basis hiện tại

### Bước 3: Cập nhật DTO
- Thêm `type` vào `ICreateInvestmentContributionDto`
- Validation: `type` là required

### Bước 4: Cập nhật Frontend
- UI để chọn deposit/withdrawal
- Hiển thị realized PNL trong position

---

## 🔴 Vấn Đề Quan Trọng: Tracking Đa Tiền Tệ (Multi-Currency Tracking)

### Mô Tả Vấn Đề

Người dùng có các khoản đầu tư bằng USD, nhưng:
- **Tiền đầu vào**: Từ tài khoản VND
- **Tiền đầu ra**: Về tài khoản VND
- **Cần tracking**: Cả theo USD (giá trị đầu tư) và VND (số tiền thực tế) để biết:
  - Chênh lệch tỉ giá (exchange rate impact)
  - Lạm phát giữa 2 đồng tiền
  - Lãi/lỗ kép (cả từ giá trị đầu tư và tỉ giá)

### Ví Dụ Cụ Thể

**Scenario:**
- Đầu tư 100,000,000 VND vào Bitcoin (BTC/USD)
- Tỉ giá lúc đầu: 1 USD = 25,000 VND → 4,000 USD
- Sau 1 năm, giá trị: 5,000 USD
- Tỉ giá lúc rút: 1 USD = 24,000 VND → 120,000,000 VND

**Kết quả:**
- PNL theo USD: +1,000 USD (lãi từ đầu tư)
- PNL theo VND: +20,000,000 VND (lãi tổng hợp)
- Nếu tỉ giá tăng lên 26,000 VND/USD: 5,000 * 26,000 = 130,000,000 VND → +30,000,000 VND lãi

**Vấn đề:** Cần phân biệt:
- Lãi từ đầu tư: 1,000 USD
- Lãi từ tỉ giá: Phụ thuộc vào tỉ giá tại thời điểm rút

### Đánh Giá Schema Hiện Tại

#### ❌ **KHÔNG ĐÁP ỨNG** - Thiếu thông tin quan trọng:

1. **InvestmentTrade**:
   - ✅ Có `priceInBaseCurrency` (optional) - nhưng không có tỉ giá tại thời điểm trade
   - ❌ Không có `amountInBaseCurrency` - số tiền VND thực tế đã bỏ ra
   - ❌ Không có `exchangeRate` - tỉ giá tại thời điểm trade
   - ❌ Không có `baseCurrencyId` - currency của tài khoản nguồn

2. **InvestmentContribution**:
   - ❌ Chỉ có `amount` và `currencyId` theo investment currency
   - ❌ Không có `amountInBaseCurrency` - số tiền VND thực tế đã bỏ ra
   - ❌ Không có `exchangeRate` - tỉ giá tại thời điểm contribution
   - ❌ Không có `baseCurrencyId` - currency của tài khoản nguồn

3. **InvestmentValuation**:
   - ❌ Chỉ có `price` theo investment currency
   - ❌ Không có `priceInBaseCurrency` - giá trị quy đổi về VND
   - ❌ Không có `exchangeRate` - tỉ giá tại thời điểm valuation

4. **Investment Model**:
   - ❌ Không có `baseCurrencyId` - currency của tài khoản nguồn (VND)
   - ❌ Không có cách để biết investment này có cross-currency hay không

### Giải Pháp Đề Xuất

#### **Option 1: Thêm trường vào các model hiện tại** (Khuyến nghị)

**Ưu điểm:**
- Không cần tạo model mới
- Dễ implement
- Backward compatible (các trường optional)

**Nhược điểm:**
- Cần migration cho nhiều model
- Có thể phức tạp khi có nhiều base currency

**Schema Changes:**

```prisma
model Investment {
  // ... existing fields
  baseCurrencyId String? @map("base_currency_id") // Currency của tài khoản nguồn (VND)
  // ... relations
}

model InvestmentTrade {
  // ... existing fields
  amountInBaseCurrency Decimal? @map("amount_in_base_currency") @db.Decimal(30, 10)
  exchangeRate Decimal? @map("exchange_rate") @db.Decimal(30, 10) // Tỉ giá tại thời điểm trade
  baseCurrencyId String? @map("base_currency_id")
  // ... relations
}

model InvestmentContribution {
  // ... existing fields
  amountInBaseCurrency Decimal? @map("amount_in_base_currency") @db.Decimal(30, 10)
  exchangeRate Decimal? @map("exchange_rate") @db.Decimal(30, 10) // Tỉ giá tại thời điểm contribution
  baseCurrencyId String? @map("base_currency_id")
  // ... relations
}

model InvestmentValuation {
  // ... existing fields
  priceInBaseCurrency Decimal? @map("price_in_base_currency") @db.Decimal(30, 10)
  exchangeRate Decimal? @map("exchange_rate") @db.Decimal(30, 10) // Tỉ giá tại thời điểm valuation
  baseCurrencyId String? @map("base_currency_id")
  // ... relations
}
```

#### **Option 2: Tạo model riêng cho Exchange Rate Tracking**

**Ưu điểm:**
- Tách biệt rõ ràng
- Có thể lưu lịch sử tỉ giá
- Dễ mở rộng

**Nhược điểm:**
- Phức tạp hơn
- Cần join thêm khi query

**Schema:**

```prisma
model InvestmentExchangeRate {
  id           String   @id @default(uuid(7))
  userId       String   @map("user_id")
  investmentId String   @map("investment_id")
  fromCurrencyId String @map("from_currency_id") // USD
  toCurrencyId String   @map("to_currency_id")   // VND
  rate         Decimal  @db.Decimal(30, 10)
  timestamp    DateTime
  source       String?  // "manual", "api", etc.
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  
  user       User       @relation(...)
  investment Investment @relation(...)
  fromCurrency Currency @relation("FromCurrency", ...)
  toCurrency Currency   @relation("ToCurrency", ...)
  
  @@index([userId, investmentId, timestamp])
  @@map("investment_exchange_rates")
}
```

**Khuyến nghị**: **Option 1** - Thêm trường vào các model hiện tại

### Cập Nhật Logic Tính Toán

Cần cập nhật `computePricedPosition` và `computeManualPosition` để:

1. **Tính PNL theo Investment Currency** (USD):
   - Giữ nguyên logic hiện tại
   - `realizedPnlInInvestmentCurrency`
   - `unrealizedPnlInInvestmentCurrency`

2. **Tính PNL theo Base Currency** (VND):
   - `costBasisInBaseCurrency` = tổng `amountInBaseCurrency`
   - `currentValueInBaseCurrency` = `price * exchangeRate` hoặc `priceInBaseCurrency`
   - `realizedPnlInBaseCurrency` = từ các trades với `amountInBaseCurrency`
   - `unrealizedPnlInBaseCurrency` = `currentValueInBaseCurrency - costBasisInBaseCurrency`

3. **Tính Exchange Rate Impact**:
   - `exchangeRateGainLoss` = `realizedPnlInBaseCurrency - (realizedPnlInInvestmentCurrency * currentExchangeRate)`
   - Cho biết lãi/lỗ từ chênh lệch tỉ giá

### Response Structure Đề Xuất

```typescript
type InvestmentPositionResponse = {
  // Investment Currency (USD)
  quantity: number | null;
  avgCost: number | null;
  costBasis: number;
  realizedPnl: number;
  unrealizedPnl: number;
  lastPrice: number | null;
  lastValue: number | null;
  
  // Base Currency (VND) - nếu có
  costBasisInBaseCurrency?: number;
  realizedPnlInBaseCurrency?: number;
  unrealizedPnlInBaseCurrency?: number;
  lastValueInBaseCurrency?: number;
  currentExchangeRate?: number;
  exchangeRateGainLoss?: number; // Lãi/lỗ từ tỉ giá
  
  // Common
  lastValuationAt: string | null;
  netContributions: number;
};
```

### Implementation Steps

1. **Migration Schema**:
   - Thêm các trường `amountInBaseCurrency`, `exchangeRate`, `baseCurrencyId` vào các model
   - Thêm `baseCurrencyId` vào `Investment`

2. **Cập nhật DTOs**:
   - Thêm các trường optional vào DTOs
   - Validation: nếu có `baseCurrencyId` thì phải có `amountInBaseCurrency` và `exchangeRate`

3. **Cập nhật Services**:
   - `computePricedPosition`: Tính PNL theo cả 2 currency
   - `computeManualPosition`: Tính PNL theo cả 2 currency
   - Auto-fill `exchangeRate` từ API hoặc user input

4. **Cập nhật Controllers**:
   - Return position với cả 2 currency metrics

5. **Cập nhật Frontend**:
   - UI để nhập tỉ giá khi tạo trade/contribution/valuation
   - Hiển thị PNL theo cả 2 currency
   - Hiển thị exchange rate impact

---

## Tổng Kết Các Vấn Đề

### ✅ Đã Đáp Ứng:
- Loại 1 (Priced Mode): Tracking trades, tính PNL theo investment currency

### ⚠️ Cần Bổ Sung:
- Loại 2 (Manual Mode): Tính realized PNL khi quyết toán
- Đa tiền tệ: Tracking cả investment currency và base currency
- Exchange rate impact: Tính lãi/lỗ từ chênh lệch tỉ giá

### 🔴 Ưu Tiên:
1. **Cao**: Đa tiền tệ tracking (quan trọng cho use case thực tế)
2. **Trung bình**: Realized PNL cho manual mode
3. **Thấp**: Holding model optimization

