# de Writer

Ứng dụng content operations nội bộ cho từng sản phẩm: cấu hình brand và AI provider, tạo topic batch, chọn chủ đề phù hợp, biên tập bài viết đa kênh, lên lịch thủ công và export ZIP.

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Dữ liệu Phase 1 được lưu trong `data/workspace-state.json`.

## Scripts

```bash
npm run build  # Production build
npm test       # node:test cho logic Phase 1
npm start      # Chạy production build
```

## Luồng sử dụng

1. Trong **Workspace**, chọn provider và model; lưu API key nếu muốn gọi model thật.
2. Trong **Sản phẩm**, tạo sản phẩm, chọn màu nhận diện, kênh, brand context và prompt.
3. Trong **Nội dung**, tạo batch; mở batch để giữ hoặc xoá chủ đề.
4. Lưu chủ đề phù hợp thành bài viết, sau đó mở editor để viết, lên lịch và export.

Không có API key, ứng dụng dùng dữ liệu mock để thử toàn bộ luồng mà không phát sinh chi phí. Khi có API key, nút **Tải models** lấy danh sách model từ provider và cập nhật các select model.

## Cấu trúc chính

- `app/`: Next.js pages và API routes.
- `components/phase-one-app.js`: giao diện Phase 1.
- `lib/phase-one/`: state store, service, provider AI, templates và mock.
- `data/workspace-state.json`: state local có thể chỉnh trong lúc phát triển.
- `tests/`: kiểm thử logic.

## Lưu ý bảo mật

API key được mã hoá ở server trước khi ghi state. Không commit API key hoặc nội dung nhạy cảm trong `data/workspace-state.json`.
