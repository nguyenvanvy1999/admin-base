# Phân tích và Cải tiến Ràng buộc onDelete trong Prisma Schema

## Tổng quan

Tài liệu này phân tích các ràng buộc `onDelete` trong schema Prisma và đưa ra các đề xuất cải tiến để đảm bảo tính toàn vẹn dữ liệu và hành vi xóa phù hợp.

## Các vấn đề đã được sửa

### 1. UserAuthProvider - Thiếu onDelete

**Trước:**
```prisma
provider     AuthProvider @relation(fields: [providerCode], references: [code])
authUser User @relation(fields: [authUserId], references: [id])
```

**Sau:**
```prisma
provider     AuthProvider @relation(fields: [providerCode], references: [code], onDelete: Restrict)
authUser User @relation(fields: [authUserId], references: [id], onDelete: Cascade)
```

**Lý do:**
- `provider`: Sử dụng `Restrict` vì `AuthProvider` là dữ liệu hệ thống, không nên xóa khi còn user đang sử dụng
- `authUser`: Sử dụng `Cascade` vì khi user bị xóa, các liên kết auth provider của họ cũng nên bị xóa

### 2. Referral - Thiếu onDelete

**Trước:**
```prisma
referrer User @relation("UserReferrer", fields: [referrerId], references: [id])
referred User @relation("UserReferred", fields: [referredId], references: [id])
```

**Sau:**
```prisma
referrer User @relation("UserReferrer", fields: [referrerId], references: [id], onDelete: Cascade)
referred User @relation("UserReferred", fields: [referredId], references: [id], onDelete: Cascade)
```

**Lý do:**
- Cả hai đều sử dụng `Cascade` vì khi user bị xóa, các referral records liên quan không còn ý nghĩa

### 3. Budget.category - Thiếu onDelete

**Trước:**
```prisma
category   Category?            @relation(fields: [categoryId], references: [id])
```

**Sau:**
```prisma
category   Category?            @relation(fields: [categoryId], references: [id], onDelete: SetNull)
```

**Lý do:**
- Sử dụng `SetNull` vì đây là quan hệ optional, khi category bị xóa, budget vẫn có thể tồn tại nhưng không còn category cụ thể

## Phân tích các ràng buộc hiện có

### ✅ Cascade - Đúng đắn

Các quan hệ sau sử dụng `Cascade` phù hợp:

1. **User → User data (Cascade)**
   - `User → Account`, `Category`, `Investment`, `Transaction`, etc.
   - ✅ Đúng: Khi user bị xóa, tất cả dữ liệu của họ nên bị xóa

2. **Budget → Budget related (Cascade)**
   - `Budget → BudgetCategory`, `BudgetAccount`, `BudgetPeriodRecord`
   - ✅ Đúng: Các bản ghi con phụ thuộc vào budget cha

3. **Investment → Investment related (Cascade)**
   - `Investment → InvestmentTrade`, `InvestmentContribution`, `InvestmentValuation`, `Holding`
   - ✅ Đúng: Các bản ghi giao dịch và đánh giá phụ thuộc vào investment

4. **Role/Permission → RolePermission (Cascade)**
   - ✅ Đúng: Bảng trung gian nên xóa khi role hoặc permission bị xóa

5. **User → Session (Cascade)**
   - ✅ Đúng: Session không có ý nghĩa khi user không còn

### ✅ Restrict - Đúng đắn

Các quan hệ sau sử dụng `Restrict` phù hợp:

1. **Currency → User data (Restrict)**
   - `Currency → Account`, `Transaction`, `Investment`, etc.
   - ✅ Đúng: Currency là dữ liệu tham chiếu, không nên xóa khi còn đang sử dụng

2. **Category → Transaction (Restrict)**
   - ✅ Đúng: Transaction phải có category, không nên cho phép xóa category khi còn transaction

### ✅ SetNull - Đúng đắn

Các quan hệ sau sử dụng `SetNull` phù hợp:

1. **Category.parent → Category (SetNull)**
   - ✅ Đúng: Khi parent category bị xóa, children vẫn tồn tại nhưng không còn parent

2. **Transaction → Optional relations (SetNull)**
   - `Transaction.toAccount`, `investment`, `entity`, `event`
   - ✅ Đúng: Các quan hệ optional, transaction vẫn có thể tồn tại khi các entity này bị xóa

3. **InvestmentTrade.transaction → Transaction (SetNull)**
   - ✅ Đúng: Trade có thể tồn tại độc lập, nhưng nếu transaction bị xóa thì link sẽ null

## Đề xuất cải tiến

### 1. Transaction.category - Nên xem xét lại

**Hiện tại:**
```prisma
category   Category         @relation(fields: [categoryId], references: [id], onDelete: Restrict)
```

**Phân tích:**
- `Restrict` ngăn xóa category khi còn transaction
- Điều này có thể gây khó khăn khi muốn xóa category không còn sử dụng
- Tuy nhiên, transaction bắt buộc phải có category (không phải optional)

**Đề xuất:**
- Giữ nguyên `Restrict` nếu muốn đảm bảo tính toàn vẹn nghiêm ngặt
- Hoặc thay đổi thành `SetNull` và cho phép categoryId nullable nếu muốn linh hoạt hơn (nhưng cần cập nhật business logic)

### 2. RecurringTransaction.category - Đã đúng

**Hiện tại:**
```prisma
category Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
```

**Phân tích:**
- ✅ Đúng: Category là optional, sử dụng `SetNull` phù hợp

### 3. InvestmentContribution.account - Đã đúng

**Hiện tại:**
```prisma
account      Account?   @relation(fields: [accountId], references: [id], onDelete: SetNull)
```

**Phân tích:**
- ✅ Đúng: Account là optional, sử dụng `SetNull` phù hợp

## Tóm tắt các quy tắc áp dụng

1. **Cascade**: Sử dụng khi bản ghi con không có ý nghĩa khi bản ghi cha bị xóa
   - User data → User
   - Child records → Parent records
   - Join tables → Parent tables

2. **Restrict**: Sử dụng khi bản ghi cha là dữ liệu tham chiếu quan trọng
   - Currency → User data
   - Required foreign keys → Parent records

3. **SetNull**: Sử dụng khi quan hệ là optional và bản ghi con vẫn có thể tồn tại độc lập
   - Optional foreign keys
   - Hierarchical relationships (parent-child)

## Kết luận

Sau khi kiểm tra và sửa chữa, tất cả các ràng buộc `onDelete` đã được thiết lập phù hợp:

- ✅ Tất cả quan hệ đều có `onDelete` constraint
- ✅ Các ràng buộc phù hợp với business logic
- ✅ Đảm bảo tính toàn vẹn dữ liệu
- ✅ Tránh orphaned records
- ✅ Hành vi xóa rõ ràng và nhất quán

## Lưu ý khi migrate

Khi chạy migration với các thay đổi này:

1. **UserAuthProvider**: Cần đảm bảo không có orphaned records
2. **Referral**: Cần đảm bảo không có referral trỏ đến user đã bị xóa
3. **Budget.category**: Các budget có categoryId sẽ được set null nếu category bị xóa

Nên chạy migration trong môi trường test trước để đảm bảo không có vấn đề với dữ liệu hiện có.

