## de Writer repository guide

- Đây là Next.js 15, React 19; UI chính ở `components/phase-one-app.js`.
- Ưu tiên luồng thao tác nội bộ gọn: nội dung dài nằm trong drawer hoặc `details`, không nhồi tất cả form vào một trang.
- Giữ tiếng Việt nhất quán trong nhãn, thông báo và empty state.
- Dùng CodeGraph trước khi dò/đọc code khi `.codegraph/` tồn tại.
- Dùng `rtk` trước các lệnh shell trong repo.
- Dữ liệu local ở `data/workspace-state.json`; không xoá hoặc reset file này khi không được yêu cầu rõ ràng.
- API key chỉ xử lý ở server qua `lib/phase-one/service.js` và `crypto.js`; không trả key về component/client.
- Khi đổi data shape, cập nhật cả `blankProduct`, validation trong service, serialization và UI liên quan.
- Trước khi bàn giao, chạy `npm run build`, `npm test` và `git diff --check`.
