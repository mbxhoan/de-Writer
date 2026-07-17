# Kế hoạch triển khai de Writer

## 1. Kiến trúc mục tiêu

Nâng prototype hiện tại từ dữ liệu mock trong [app/page.js](/Users/leviackerman/Codes/products/de-Writer/app/page.js) thành SaaS Next.js + Supabase:

- Supabase Auth, PostgreSQL, Row Level Security và Storage.
- Mỗi khách hàng là một `workspace`; dữ liệu giữa các workspace được cô lập bằng RLS.
- V1: mỗi workspace có một Owner. Chưa triển khai team, reviewer hay billing.
- Workspace tự nhập API key OpenAI/Anthropic; khóa chỉ được giải mã phía server.
- Model mặc định ở workspace, có thể override theo sản phẩm.
- Ngôn ngữ mặc định ở workspace, có thể override từng sản phẩm thành `VI` hoặc `VI + EN`.
- Không tự đăng mạng xã hội; chỉ quản lý lịch, trạng thái và xuất nội dung.

## 2. Data model

Các bảng chính:

- `workspaces`: tenant, ngôn ngữ mặc định, timezone.
- `workspace_members`: liên kết người dùng–workspace; V1 chỉ dùng role `owner`.
- `provider_credentials`: provider, API key đã mã hóa AES-256-GCM, 4 ký tự cuối để nhận diện.
- `ai_settings`: provider/model mặc định của workspace.
- `products`: tên, context thương hiệu, kênh, ngôn ngữ override, provider/model override.
- `prompt_templates`: một template đang hoạt động cho mỗi `product + kind`, với `kind = topic | article | image`.
- `topic_batches`: số lượng, context, lưu ý, yêu cầu bổ sung và trạng thái lần tạo.
- `topics`: các chủ đề đã sinh; chủ đề được chọn có thể chuyển thành bài viết.
- `posts`: chủ đề gốc, trạng thái và nội dung hiện tại dạng JSONB.
- `publication_records`: kênh, ngày dự kiến, ngày thực tế và trạng thái đăng.
- `generation_runs`: snapshot template, prompt thực tế, provider/model, kết quả, usage và lỗi.
- Phase 2 thêm `image_prompts` và `image_assets`; `parent_image_id` thể hiện lịch sử chỉnh sửa.

Mọi bảng nghiệp vụ có `workspace_id`. Bảng chứa credential không được phép đọc trực tiếp từ browser, kể cả Owner.

Cấu trúc nội dung bài viết:

```text
languages[]
  language: vi | en
  title
  audience
  body
  hashtags[]
  seo:
    primary_keyword
    meta_title
    meta_description
  cta
  channel_variants[]
    channel
    body
```

`generation_runs` giữ snapshot prompt nên không cần thêm hệ thống version prompt riêng.

## 3. Phase 1 — Chủ đề, bài viết và xuất bản thủ công

### Thiết lập sản phẩm

- CRUD sản phẩm.
- Chọn kênh nội dung.
- Cấu hình `VI` hoặc `VI + EN`, kế thừa mặc định workspace nếu không override.
- Lưu brand context, giọng văn, từ nên dùng/tránh.
- Chỉnh hai template: tạo chủ đề và mở rộng bài viết.
- Hỗ trợ biến như `{{quantity}}`, `{{product_context}}`, `{{languages}}`, `{{topic}}`, `{{additional_context}}`, `{{notes}}`, `{{requirements}}`.

### Tạo chủ đề

- Người dùng chọn sản phẩm, nhập số lượng từ 1–50.
- Có các trường tùy chọn: context bổ sung, lưu ý và yêu cầu thêm.
- Server render template, gọi AI và yêu cầu structured output:

```json
{
  "topics": [
    { "title": "...", "angle": "..." }
  ]
}
```

- Toàn bộ batch được lưu để xem lại.
- Cho phép chọn nhiều chủ đề; mỗi chủ đề được lưu thành bài ở trạng thái `idea`.
- Người dùng có thể dừng ở đây, không bắt buộc tạo bài viết.

### Mở rộng bài viết

- Từ một chủ đề đã lưu, gọi template bài viết.
- AI trả về đúng các ngôn ngữ được cấu hình cho sản phẩm.
- Sinh tiêu đề, đối tượng, nội dung, hashtags, SEO, CTA và biến thể từng kênh.
- Người dùng chỉnh sửa trực tiếp rồi lưu.
- Trạng thái tối giản: `idea → draft → ready → scheduled → published`.
- Không tự fallback sang provider khác khi lỗi để tránh phát sinh chi phí hoặc gửi dữ liệu ngoài ý muốn.

OpenAI dùng Responses API với Structured Outputs để đảm bảo kết quả theo JSON Schema, thay vì parse JSON tự do. [Tài liệu OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs)

Anthropic dùng Messages API và structured output trên các model hỗ trợ. [Messages API](https://platform.claude.com/docs/en/api/messages/create), [Models API](https://platform.claude.com/docs/en/api/models/list)

### Provider và model

- Gọi API bằng `fetch` phía server; không tạo framework provider phức tạp.
- Chỉ có hai hàm dùng chung: `listModels()` và `generateStructured()`.
- OpenAI là provider mặc định.
- Model gợi ý ban đầu:
  - OpenAI: `gpt-5.6-terra`, cân bằng chất lượng và chi phí theo hướng dẫn hiện tại. [OpenAI Models](https://developers.openai.com/api/docs/models)
  - Anthropic: `claude-sonnet-5`, hướng đến cân bằng tốc độ và chất lượng. [Claude Models](https://platform.claude.com/docs/en/about-claude/models/overview)
- UI cho phép tải danh sách model bằng API key của workspace và nhập model ID tùy chỉnh.
- Product không override thì kế thừa workspace.

### Lịch và export

- Một bài có thể có lịch riêng theo từng kênh.
- Người dùng đánh dấu `planned`, `published` hoặc bỏ lịch.
- Nút copy nội dung theo ngôn ngữ/kênh.
- Export ZIP gồm:
  - `manifest.json`
  - `seo.md`
  - các file như `vi/facebook.md`, `en/instagram.md`
  - Phase 2 bổ sung thư mục `images/`.

## 4. Phase 2 — Prompt ảnh và lịch sử chỉnh sửa

- Từ nội dung bài viết và image template của sản phẩm, AI sinh một hoặc nhiều image brief.
- Mỗi brief gồm mục đích, prompt, alt text, tỷ lệ ảnh và số lượng.
- Người dùng được chỉnh prompt, thêm hoặc xóa brief trước khi tạo ảnh.
- Prompt ảnh hiện tại lưu trong `image_prompts`; mọi prompt thực sự đã gọi được snapshot trong `generation_runs`.
- Render ảnh bằng OpenAI Image API; provider tạo nội dung vẫn có thể là Anthropic.
- Nếu workspace chỉ có Anthropic key, người dùng vẫn lưu được prompt nhưng nút render ảnh yêu cầu thêm OpenAI key.
- Mỗi lần sửa ảnh tạo asset mới với `parent_image_id`; ảnh cũ không bị ghi đè.
- Ảnh lưu trong private Supabase Storage theo đường dẫn workspace/post và chỉ truy cập bằng signed URL.
- Cho phép chọn ảnh hiện hành để đưa vào gói export.

Image API hỗ trợ tạo, chỉnh sửa và sinh nhiều ảnh bằng `n`, phù hợp hơn một conversation workflow phức tạp cho nhu cầu này. [OpenAI Image API](https://developers.openai.com/api/docs/guides/image-generation)

## 5. Bảo mật và xử lý lỗi

- API key mã hóa bằng khóa master chỉ nằm trong biến môi trường server.
- Không trả key đã giải mã về client, không ghi key vào log hoặc `generation_runs`.
- RLS kiểm tra membership trên mọi truy vấn.
- Validate số lượng, độ dài prompt, provider/model và structured output ở server.
- Mỗi lần gọi AI tạo record `pending`; sau đó chuyển `completed` hoặc `failed`.
- Cho phép retry từ lần lỗi nhưng tạo run mới, không sửa lịch sử.
- V1 gọi AI đồng bộ, một thao tác mỗi lần; chưa thêm queue/background worker cho đến khi thời gian xử lý thực tế chứng minh cần thiết.

## 6. Kiểm thử và tiêu chí hoàn thành

- RLS: Owner workspace A không thể đọc sản phẩm, prompt, bài viết, ảnh hoặc credential của workspace B.
- Credential: mã hóa/giải mã đúng; API response và log không làm lộ khóa.
- Ngôn ngữ: sản phẩm VI không sinh EN; sản phẩm VI+EN bắt buộc có đủ hai bản.
- Prompt: quantity/context/notes/requirements được render đúng và snapshot đầy đủ.
- Workflow: tạo batch → chọn nhiều chủ đề → mở rộng một chủ đề → chỉnh sửa → lưu.
- Provider: cùng JSON schema hoạt động với OpenAI và Anthropic; lỗi model/key hiển thị rõ.
- Publication: lưu lịch từng kênh, đánh dấu đã đăng và xuất ZIP đúng nội dung.
- Phase 2: tạo nhiều ảnh, sửa từ ảnh cũ, xem đầy đủ cây lịch sử và export ảnh đã chọn.
- Chạy `npm run build`, kiểm thử logic bằng `node:test`, và kiểm thử RLS qua Supabase CLI.

Ngoài phạm vi V1: team/reviewer, subscription billing, quota AI do nền tảng tài trợ, tự đăng mạng xã hội, semantic duplicate detection và job queue. Đây là phần `ponytail` giúp giữ lại cho đến khi có nhu cầu thực tế.

Bổ sung vào plan phần môi trường như sau:

## Môi trường local, test và production

- Local và test không kết nối Supabase Cloud.
- Dùng Supabase CLI chạy bằng Docker (`supabase start`). Dữ liệu nằm trong PostgreSQL local và có sẵn Auth, RLS, PostgREST, Storage để hành vi giống production.
- Không nên chạy duy nhất container PostgreSQL thuần vì sẽ không kiểm thử được Supabase Auth, Storage và RLS theo JWT; điều này tạo hai kiến trúc khác nhau giữa local và production.
- Migration và seed đặt trong repo, dùng chung cho mọi môi trường:
  - Local: `supabase db reset`.
  - Test/CI: khởi tạo local stack, chạy migration và seed test riêng.
  - Production: áp dụng cùng migration lên Supabase managed.
- Ảnh Phase 2 được lưu trong Supabase Storage local khi phát triển và Supabase Storage managed khi production.
- Biến môi trường được tách:
  - `.env.local`: URL/key của Supabase local và khóa mã hóa development.
  - `.env.test`: database/test user độc lập.
  - Production secrets: cấu hình trên nền tảng deploy, không commit vào repo.
- API key OpenAI/Anthropic dùng key test riêng theo workspace; test tự động phải mock provider để không phát sinh chi phí.
- Không thêm Kubernetes, Terraform hoặc tự vận hành PostgreSQL production trong giai đoạn này.

Luồng triển khai:

```text
Local/Test
Docker → Supabase local stack → PostgreSQL local
                         ↓
              migrations + RLS + seed

Production
Supabase managed ← cùng migrations và RLS
```

Tiêu chí bổ sung:

- Một migration phải chạy thành công trên cả local stack mới được áp dụng production.
- RLS test chạy trên PostgreSQL/Supabase local với ít nhất hai workspace.
- CI không phụ thuộc Supabase Cloud và không gọi API AI thật.
- Trước khi deploy, chạy `supabase db diff`, migration smoke test và `npm run build`.

Cách này vẫn đạt mục tiêu hạn chế DevOps: local hoàn toàn bằng Docker, còn production giao cho Supabase managed.