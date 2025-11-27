# Hướng Dẫn Sử Dụng Tính Năng

> **Lưu ý:** Phiên bản hiện tại tập trung vào nền tảng (authentication, admin tooling, healthcheck). Các mô-đun tài chính (accounts, budgets, investments, …) đang trong giai đoạn thiết kế nên không xuất hiện trong UI hay API.

## 1. Dashboard (HomePage)

`client/src/app/pages/HomePage.tsx`

- Hiển thị mock KPI (AUM, YTD Return, Portfolio Count) để minh hoạ card layout.
- Bảng phân bổ portfolio sử dụng `AppTable` + `@ant-design/pro-components` để demo cột percent, render tag.
- Nút “Send sample notification” gọi hook `useNotify` để hiển thị toast.
- Phần “System status” đọc API thực tế `GET /misc/health` thông qua hook `useHealthcheck`.

**Cách thử:**

1. Chạy backend + frontend.
2. Truy cập `/`.
3. Bấm nút “Send sample notification” để xem toast.
4. Tắt backend rồi refresh, bạn sẽ thấy status chuyển sang `unknown/error` → xác nhận healthcheck hoạt động.

## 2. Workspace Page

`client/src/app/pages/WorkspacePage.tsx`

- List mock workstreams với `List` + `Flex`.
- Nút “Tạo workspace” mở `AppDrawer` dùng chung pattern (primary action bên phải, secondary bên trái).
- Drawer chứa mô tả giúp developer hình dung nơi gắn form thực tế.

**Workflow mẫu:**

1. Vào tab `Workspaces`.
2. Bấm “Tạo workspace” → Drawer mở với nút `Huỷ` và `Lưu`.
3. Chèn form thật bằng cách đặt `AppForm` vào vùng nội dung Drawer (xem `SettingsPage` để tham khảo form pattern).

## 3. Settings Page

`client/src/app/pages/SettingsPage.tsx`

- Form cấu hình minh hoạ dùng `AppForm` + `AppFormItem`.
- Có Select (timezone), InputNumber (risk limit) và Switch (email digest).
- Submit handler hiện log trong console, developer thay bằng API thực tế.

**Best practice:**

- Định nghĩa type `SettingForm` để `AppForm` nắm schema.
- Sử dụng `rules` của AntD để validate tối thiểu.
- Sau này, nối với service thật bằng `useMutation` hoặc `fetch`.

## 4. Common Components & Hooks

| Component/Hook | Vị trí | Mục đích |
| -------------- | ------ | -------- |
| `PageHeader` | `client/src/components/common/PageHeader.tsx` | Tiêu đề trang + breadcrumb + actions |
| `AppTable` | `client/src/components/common/AppTable.tsx` | Bọc `Table` của AntD với props thống nhất |
| `AppForm`/`AppFormItem` | `client/src/components/common/AppForm.tsx` | Generic form wrapper với typing |
| `AppDrawer`/`AppModal` | `client/src/components/common` | Layout chuẩn cho dialog |
| `useHealthcheck` | `client/src/hooks/api/useHealthcheck.ts` | Gọi API `/misc/health` |
| `useNotify` | `client/src/hooks/useNotify.ts` | Wrapper thông báo success/error |

Khi triển khai màn hình mới, ưu tiên tái sử dụng các component này để giữ UI/UX đồng nhất.

## 5. API Liên Quan UI

- **Healthcheck**: HomePage đọc `GET /misc/health`.
- **System info**: Có thể mở rộng để hiển thị dữ liệu `GET /misc/system-info` (hiện chưa render).
- **File upload**: `fileController` sẵn sàng, có thể kết hợp với `AppForm` khi cần upload avatar/logo.

Chi tiết payload xem trong `docs/user-guide/api-reference.md`.

## 6. Module Đang Chờ Triển Khai

Các phần dưới đây từng xuất hiện trong tài liệu cũ nhưng **chưa có trong code hiện tại**:

- CRUD Accounts / Transactions / Budgets / Investments.
- Entities, Tags, Events, Cashflow reports.
- Import/Export dữ liệu, recurring transactions.

Khi các mô-đun trên được phát triển, vui lòng bổ sung lại hướng dẫn tương ứng và liên kết tới component/file cụ thể.

## 7. Tips cho Developers

1. **Mock trước, nối API sau**: dựng giao diện bằng dữ liệu giả như ở Home/Workspace để chốt layout nhanh.
2. **Tận dụng hook chung**: mọi API nên được wrap trong hook `client/src/hooks/api/**` để dễ caching/invalidate.
3. **Giữ Hash Router**: khi thêm route mới, cập nhật `client/src/app/routes.tsx` (đang dùng `createHashRouter`).
4. **i18n**: strings nên đặt trong `client/src/locales/**`. Các trang demo hiện đã dùng `useTranslation`.
5. **Thông báo nhất quán**: dùng `useNotify().success/error` thay vì gọi trực tiếp `notification`.

---

Nếu phát hiện trang nào còn mô tả tính năng không tồn tại, hãy cập nhật file này ngay sau khi merge PR để tránh thông tin sai lệch.*** End Patch

