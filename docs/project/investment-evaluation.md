# Đánh Giá Schema Database cho 2 Loại Đầu Tư

## Tổng Quan

Schema hiện tại đã được thiết kế để hỗ trợ 2 loại đầu tư thông qua trường `mode` trong model `Investment`:

- `priced`: Đầu tư có các lệnh mua/bán chi tiết
- `manual`: Đầu tư chỉ cập nhật số dư thủ công

## Loại 1: Priced Mode (Đầu tư có lệnh mua/bán chi tiết)

### Đánh Giá: **ĐÁP ỨNG ĐẦY ĐỦ** ✅

### Schema hỗ trợ:

1. **InvestmentTrade Model** - Lưu các lệnh mua/bán:
  - `side`: TradeSide (buy/sell)
  - `price`: Decimal (giá mua/bán)
  - `quantity`: Decimal (số lượng)
  - `amount`: Decimal (tổng giá trị)
  - `fee`: Decimal (phí giao dịch)
  - `timestamp`: DateTime
  - `priceInBaseCurrency`: Decimal? (giá quy đổi)
  - `amountInBaseCurrency`: Decimal? (số tiền quy đổi)
  - `exchangeRate`: Decimal? (tỉ giá tại thời điểm trade)
  - `baseCurrencyId`: String? (currency của tài khoản nguồn)

2. **InvestmentValuation Model** - Lưu giá hiện tại:
  - `price`: Decimal (giá hiện tại)
  - `timestamp`: DateTime
  - `source`: String? (nguồn giá)
  - `fetchedAt`: DateTime? (thời gian fetch)
  - `priceInBaseCurrency`: Decimal? (giá quy đổi)
  - `exchangeRate`: Decimal? (tỉ giá tại thời điểm valuation)
  - `baseCurrencyId`: String? (currency của tài khoản nguồn)

3. **Holding Model** - Lưu trữ position (chưa được sử dụng nhiều trong code):
  - `quantity`: Decimal
  - `avgCost`: Decimal
  - `unrealizedPnl`: Decimal?
  - `lastPrice`: Decimal?

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

## Loại 2: Manual Mode (Đầu tư cập nhật số dư thủ công)

### Đánh Giá: **ĐÁP ỨNG ĐẦY ĐỦ** ✅

### Schema hỗ trợ:

1. **InvestmentContribution Model** - Lưu các khoản đóng góp:
  - `amount`: Decimal (số tiền đóng góp)
  - `type`: ContributionType (deposit/withdrawal)
  - `timestamp`: DateTime
  - `accountId`: String? (tài khoản nguồn)
  - `note`: String?
  - `amountInBaseCurrency`: Decimal? (số tiền quy đổi)
  - `exchangeRate`: Decimal? (tỉ giá tại thời điểm contribution)
  - `baseCurrencyId`: String? (currency của tài khoản nguồn)

2. **InvestmentValuation Model** - Lưu giá trị hiện tại:
  - `price`: Decimal (giá trị hiện tại)
  - `timestamp`: DateTime
  - `priceInBaseCurrency`: Decimal? (giá trị quy đổi)
  - `exchangeRate`: Decimal? (tỉ giá tại thời điểm valuation)
  - `baseCurrencyId`: String? (currency của tài khoản nguồn)

### Logic tính toán (trong `InvestmentService.computeManualPosition`):

✅ **Unrealized PNL**: Tính được

- `unrealizedPnl = currentValue - netContributions`
- `currentValue` lấy từ `InvestmentValuation`
- `netContributions` = tổng các `InvestmentContribution` (deposit - withdrawal)

✅ **Cost Basis**: Tính được

- `costBasis = tổng các contributions deposit - withdrawals`

✅ **Realized PNL**: Tính được

- Khi có withdrawal: `realizedPnl = withdrawalAmount - costBasisAtWithdrawal`
- Tính theo tỷ lệ cost basis được rút

## Tracking Đa Tiền Tệ (Multi-Currency Tracking)

### Mô Tả Vấn Đề

Người dùng có các khoản đầu tư bằng USD, nhưng:

- **Tiền đầu vào**: Từ tài khoản VND
- **Tiền đầu ra**: Về tài khoản VND
- **Cần tracking**: Cả theo USD (giá trị đầu tư) và VND (số tiền thực tế) để biết:
  - Chênh lệch tỉ giá (exchange rate impact)
  - Lạm phát giữa 2 đồng tiền
  - Lãi/lỗ kép (cả từ giá trị đầu tư và tỉ giá)

### Ví Dụ Cụ Thể

**Scenario**:

- Đầu tư 100,000,000 VND vào Bitcoin (BTC/USD)
- Tỉ giá lúc đầu: 1 USD = 25,000 VND → 4,000 USD
- Sau 1 năm, giá trị: 5,000 USD
- Tỉ giá lúc rút: 1 USD = 24,000 VND → 120,000,000 VND

**Kết quả**:

- PNL theo USD: +1,000 USD (lãi từ đầu tư)
- PNL theo VND: +20,000,000 VND (lãi tổng hợp)
- Nếu tỉ giá tăng lên 26,000 VND/USD: 5,000 * 26,000 = 130,000,000 VND → +30,000,000 VND lãi

**Vấn đề**: Cần phân biệt:

- Lãi từ đầu tư: 1,000 USD
- Lãi từ tỉ giá: Phụ thuộc vào tỉ giá tại thời điểm rút

### Schema Hỗ Trợ Đa Tiền Tệ

#### ✅ **ĐÁP ỨNG ĐẦY ĐỦ** - Schema đã hỗ trợ:

1. **Investment Model**:
  - ✅ `baseCurrencyId` - Currency của tài khoản nguồn (VND)

2. **InvestmentTrade**:
  - ✅ `priceInBaseCurrency` - Giá quy đổi
  - ✅ `amountInBaseCurrency` - Số tiền VND thực tế đã bỏ ra
  - ✅ `exchangeRate` - Tỉ giá tại thời điểm trade
  - ✅ `baseCurrencyId` - Currency của tài khoản nguồn

3. **InvestmentContribution**:
  - ✅ `amountInBaseCurrency` - Số tiền VND thực tế đã bỏ ra
  - ✅ `exchangeRate` - Tỉ giá tại thời điểm contribution
  - ✅ `baseCurrencyId` - Currency của tài khoản nguồn

4. **InvestmentValuation**:
  - ✅ `priceInBaseCurrency` - Giá trị quy đổi về VND
  - ✅ `exchangeRate` - Tỉ giá tại thời điểm valuation
  - ✅ `baseCurrencyId` - Currency của tài khoản nguồn

### Logic Tính Toán Đa Tiền Tệ

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

## Kết Luận

### Loại 1 (Priced Mode): ✅ **HOÀN TOÀN ĐÁP ỨNG**

- Schema đầy đủ
- Logic tính toán đúng
- Có thể cập nhật giá hiện tại để tính unrealized PNL
- Có thể tính realized PNL từ các lệnh bán
- Hỗ trợ đa tiền tệ đầy đủ

### Loại 2 (Manual Mode): ✅ **HOÀN TOÀN ĐÁP ỨNG**

- ✅ Có thể cập nhật số dư thủ công (qua InvestmentContribution)
- ✅ Có thể cập nhật giá trị hiện tại (qua InvestmentValuation)
- ✅ Có thể tính unrealized PNL
- ✅ Có thể tính realized PNL khi quyết toán (qua withdrawal)
- ✅ Hỗ trợ đa tiền tệ đầy đủ

### Đã Được Implement:

1. ✅ Schema hỗ trợ cả 2 loại đầu tư
2. ✅ Multi-currency tracking với các trường cần thiết
3. ✅ ContributionType enum cho deposit/withdrawal
4. ✅ Exchange rate tracking trong các models

### Cần Hoàn Thiện:

1. ⚠️ Logic tính toán PNL theo base currency trong services
2. ⚠️ UI để nhập tỉ giá khi tạo trade/contribution/valuation
3. ⚠️ Hiển thị PNL theo cả 2 currency trong frontend
4. ⚠️ Hiển thị exchange rate impact

