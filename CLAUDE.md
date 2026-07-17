# de Writer development notes

## Product boundaries

- Phase 1 quản lý sản phẩm, topic batch, bài viết, lịch thủ công và ZIP export.
- Không tự đăng lên mạng xã hội.
- OpenAI và Anthropic là hai provider được hỗ trợ; provider/model mặc định ở workspace và có thể override ở sản phẩm.

## UI conventions

- Sidebar là điều hướng chính; view được đồng bộ với URL hash (`#content`, `#products`, `#workspace`, `#activity`).
- Chỉ hiển thị thông tin cần cho tác vụ hiện tại. Cấu hình dài, topic batch và editor mở trong drawer.
- Model luôn chọn qua `select`; danh sách mặc định có sẵn và được làm mới bằng API provider.
- Mỗi sản phẩm có `color` hex để nhận diện ở danh sách sản phẩm.

## Verification

```bash
rtk npm run build
rtk npm test
rtk git diff --check
```

Không dùng API key thật khi chạy test. Nếu không có key, provider trả mock data để kiểm thử workflow.
