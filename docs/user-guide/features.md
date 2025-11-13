# Hướng Dẫn Sử Dụng Tính Năng

Tài liệu này hướng dẫn cách sử dụng các tính năng chính của FinTrack.

## Quản Lý Tài Khoản

### Tạo Tài Khoản Mới

1. Vào trang **Tài Khoản** từ menu
2. Click nút **Thêm Mới**
3. Điền thông tin:
   - **Loại**: Chọn loại tài khoản (Tiền mặt, Ngân hàng, Thẻ tín dụng, Đầu tư)
   - **Tên**: Tên tài khoản
   - **Tiền tệ**: Chọn loại tiền tệ
   - **Số dư ban đầu**: (Tùy chọn)
4. Click **Lưu**

### Chỉnh Sửa Tài Khoản

1. Tìm tài khoản cần chỉnh sửa trong danh sách
2. Click icon **Chỉnh sửa**
3. Cập nhật thông tin
4. Click **Lưu**

### Xóa Tài Khoản

1. Tìm tài khoản cần xóa
2. Click icon **Xóa**
3. Xác nhận xóa

**Lưu ý**: Xóa tài khoản sẽ không xóa các giao dịch liên quan, nhưng sẽ ảnh hưởng đến báo cáo.

## Quản Lý Giao Dịch

### Thêm Giao Dịch Thu/Chi

1. Vào trang **Giao Dịch**
2. Click **Thêm Mới**
3. Điền thông tin:
   - **Loại**: Thu nhập hoặc Chi tiêu
   - **Tài khoản**: Chọn tài khoản
   - **Danh mục**: Chọn danh mục
   - **Số tiền**: Nhập số tiền
   - **Ngày**: Chọn ngày giao dịch
   - **Ghi chú**: (Tùy chọn)
4. Click **Lưu**

**Lưu ý**: Số dư tài khoản sẽ tự động cập nhật sau khi tạo giao dịch.

### Chuyển Khoản Giữa Các Tài Khoản

1. Tạo giao dịch mới
2. Chọn **Loại**: Chuyển khoản
3. Chọn **Tài khoản nguồn** và **Tài khoản đích**
4. Nhập số tiền
5. Click **Lưu**

**Lưu ý**: Hệ thống tự động tạo 2 giao dịch (gửi và nhận) để đảm bảo số dư chính xác.

### Lọc và Tìm Kiếm Giao Dịch

- **Lọc theo ngày**: Sử dụng date picker
- **Lọc theo tài khoản**: Chọn từ dropdown
- **Lọc theo danh mục**: Chọn từ dropdown
- **Tìm kiếm**: Nhập từ khóa vào ô tìm kiếm
- **Sắp xếp**: Click vào header cột để sắp xếp

## Quản Lý Đầu Tư

### Tạo Đầu Tư Mới

1. Vào trang **Đầu Tư**
2. Click **Thêm Mới**
3. Điền thông tin:
   - **Mã**: Mã tài sản (BTC, ETH, etc.)
   - **Tên**: Tên tài sản
   - **Loại**: Coin, CCQ, hoặc Tùy chỉnh
   - **Chế độ**: 
     - **Priced**: Có lệnh mua/bán chi tiết
     - **Manual**: Cập nhật số dư thủ công
   - **Tiền tệ**: Currency của asset
   - **Tiền tệ cơ sở**: (Tùy chọn) Currency của tài khoản nguồn
4. Click **Lưu**

### Thêm Lệnh Mua/Bán (Priced Mode)

1. Vào trang chi tiết đầu tư
2. Click **Thêm Lệnh**
3. Điền thông tin:
   - **Loại**: Mua hoặc Bán
   - **Tài khoản**: Tài khoản thực hiện giao dịch
   - **Ngày giờ**: Thời điểm giao dịch
   - **Giá**: Giá mua/bán
   - **Số lượng**: Số lượng asset
   - **Phí**: Phí giao dịch
   - **Tỉ giá**: (Nếu có) Tỉ giá tại thời điểm giao dịch
4. Click **Lưu**

**Lưu ý**: Hệ thống tự động tính average cost và cập nhật holdings.

### Thêm Đóng Góp/Rút Tiền (Manual Mode)

1. Vào trang chi tiết đầu tư
2. Click **Thêm Đóng Góp** hoặc **Rút Tiền**
3. Điền thông tin:
   - **Loại**: Đóng góp hoặc Rút tiền
   - **Tài khoản**: (Tùy chọn) Tài khoản nguồn
   - **Số tiền**: Số tiền đóng góp/rút
   - **Ngày**: Thời điểm
   - **Tỉ giá**: (Nếu có) Tỉ giá tại thời điểm
   - **Ghi chú**: (Tùy chọn)
4. Click **Lưu**

### Cập Nhật Giá Trị Hiện Tại

1. Vào trang chi tiết đầu tư
2. Click **Cập Nhật Giá Trị**
3. Điền thông tin:
   - **Giá trị**: Giá trị hiện tại
   - **Ngày**: Thời điểm cập nhật
   - **Nguồn**: (Tùy chọn) Nguồn giá
   - **Tỉ giá**: (Nếu có) Tỉ giá tại thời điểm
4. Click **Lưu**

**Lưu ý**: Giá trị hiện tại được sử dụng để tính unrealized P&L.

### Xem Holdings và P&L

Trong trang chi tiết đầu tư, bạn có thể xem:

- **Số lượng**: Số lượng asset đang nắm giữ
- **Chi phí trung bình**: Average cost
- **Cost Basis**: Tổng chi phí
- **Realized P&L**: Lãi/lỗ đã thực hiện
- **Unrealized P&L**: Lãi/lỗ chưa thực hiện
- **Giá trị hiện tại**: Giá trị theo giá thị trường

## Quản Lý Danh Mục

### Tạo Danh Mục Mới

1. Vào trang **Danh Mục**
2. Click **Thêm Mới**
3. Điền thông tin:
   - **Loại**: Thu nhập, Chi tiêu, Chuyển khoản, Đầu tư, hoặc Vay nợ
   - **Tên**: Tên danh mục
   - **Danh mục cha**: (Tùy chọn) Chọn danh mục cha để tạo danh mục con
   - **Icon**: (Tùy chọn) Chọn icon
   - **Màu**: (Tùy chọn) Chọn màu
4. Click **Lưu**

### Tạo Danh Mục Con

1. Tạo danh mục mới
2. Chọn **Danh mục cha** từ dropdown
3. Điền các thông tin khác
4. Click **Lưu**

**Lưu ý**: Danh mục con giúp tổ chức giao dịch tốt hơn và hỗ trợ báo cáo chi tiết.

## Quản Lý Entities (Đối Tác)

### Tạo Entity Mới

1. Vào trang **Đối Tác**
2. Click **Thêm Mới**
3. Điền thông tin:
   - **Tên**: Tên đối tác
   - **Loại**: Cá nhân hoặc Tổ chức
   - **Số điện thoại**: (Tùy chọn)
   - **Email**: (Tùy chọn)
   - **Địa chỉ**: (Tùy chọn)
   - **Ghi chú**: (Tùy chọn)
4. Click **Lưu**

**Lưu ý**: Entities được sử dụng để track các giao dịch vay nợ.

## Quản Lý Tags

### Tạo Tag Mới

1. Vào trang **Tags**
2. Click **Thêm Mới**
3. Điền thông tin:
   - **Tên**: Tên tag
   - **Mô tả**: (Tùy chọn) Mô tả tag
4. Click **Lưu**

**Lưu ý**: Tags giúp phân loại và tìm kiếm giao dịch dễ dàng hơn.

## Dashboard (Sắp Có)

Dashboard sẽ hiển thị:

- **Tổng tài sản**: Tổng giá trị tất cả tài khoản và đầu tư
- **Biểu đồ số dư**: Timeline số dư theo thời gian
- **Biểu đồ dòng tiền**: Thu/chi theo thời gian
- **Top chi tiêu**: Các danh mục chi tiêu nhiều nhất
- **Phân bổ tài sản**: Pie chart phân bổ đầu tư
- **P&L Chart**: Biểu đồ lãi/lỗ theo thời gian

## Báo Cáo (Sắp Có)

Các báo cáo sẽ bao gồm:

- **Báo cáo Portfolio**: Tổng quan danh mục đầu tư
- **Báo cáo Dòng Tiền**: Phân tích thu/chi
- **Báo cáo P&L**: Lãi/lỗ theo khoảng thời gian
- **Timeline Số Dư**: Lịch sử số dư theo thời gian
- **Export CSV/PDF**: Xuất báo cáo ra file

## Tips & Best Practices

1. **Tổ chức danh mục**: Tạo danh mục rõ ràng và có cấu trúc để dễ quản lý
2. **Ghi chú đầy đủ**: Thêm ghi chú cho các giao dịch quan trọng
3. **Cập nhật giá thường xuyên**: Để có unrealized P&L chính xác
4. **Sử dụng tags**: Tag các giao dịch để tìm kiếm dễ dàng
5. **Kiểm tra số dư**: Thường xuyên kiểm tra số dư để đảm bảo chính xác

## Keyboard Shortcuts

- `Ctrl/Cmd + K`: Mở search (sắp có)
- `Ctrl/Cmd + N`: Tạo mới (trong các trang list)
- `Esc`: Đóng dialog/modal

## FAQs

### Làm sao để xóa nhiều giao dịch cùng lúc?

Hiện tại chưa hỗ trợ xóa hàng loạt. Bạn cần xóa từng giao dịch một.

### Làm sao để import dữ liệu từ file CSV?

Tính năng import CSV đang được phát triển.

### Làm sao để backup dữ liệu?

Bạn có thể backup database PostgreSQL trực tiếp hoặc export dữ liệu qua API (sắp có).

### Làm sao để sync giá tự động?

Tính năng sync giá tự động từ CoinGecko đang được phát triển.

