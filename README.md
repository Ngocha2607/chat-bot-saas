# Messenger Bot SaaS

Chatbot Facebook Messenger **đa doanh nghiệp (multi-tenant)** với **RAG** (mỗi doanh nghiệp upload tài liệu riêng) và LLM **Gemini**.

> Trạng thái hiện tại: **Phase 0 + Phase 1 skeleton** — webhook nhận tin → Gemini sinh câu trả lời → Send API trả lời (chưa multi-tenant, chưa RAG).

## Kiến trúc & lộ trình
Xem tài liệu định hướng đầy đủ trong plan đã duyệt (Phase 0 → 5: Meta setup → MVP → multi-tenant → RAG → dashboard → hardening).

## Cấu trúc
```
messenger-bot-saas/
├── docker-compose.yml      # Postgres(pgvector) + Redis cho các phase sau
└── backend/                # NestJS API
    └── src/
        ├── webhook/        # GET verify + POST nhận message (verify chữ ký)
        ├── messenger/      # Send API trả lời
        ├── llm/            # Gemini (điểm cô lập LLM provider)
        └── config/
```

## Chạy thử (Phase 1)

### 1. Hạ tầng (chuẩn bị cho phase sau)
```bash
docker compose up -d        # khởi động postgres + redis
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # điền GEMINI_API_KEY, FB_* tokens
npm install
npm run start:dev
```
Kiểm tra: `GET http://localhost:3000/health` → `{ "status": "ok" }`.

### 3. Kết nối Facebook (dev)
1. Tạo **Meta App** (loại Business) tại https://developers.facebook.com → thêm sản phẩm **Messenger**.
2. Lấy **Page Access Token** cho page test → điền vào `FB_PAGE_ACCESS_TOKEN`.
3. Lấy **App Secret** (Settings → Basic) → `FB_APP_SECRET`.
4. Mở tunnel HTTPS công khai: `ngrok http 3000` (hoặc `cloudflared`).
5. Trong **Messenger → Webhooks**: Callback URL = `https://<tunnel>/webhook`,
   Verify Token = giá trị `FB_VERIFY_TOKEN`, subscribe field `messages`.
6. Subscribe page test vào webhook.

### 4. Test end-to-end
Nhắn tin vào page test từ tài khoản admin/tester → bot trả lời bằng Gemini.
Theo dõi log webhook trong terminal backend.

> ⚠️ Lưu ý: quyền `pages_messaging` cần **App Review** để chạy public; giai đoạn dev chỉ hoạt động với admin/tester của app. Có giới hạn **24h messaging window**.

## Test
```bash
cd backend && npm test      # gồm test verify chữ ký webhook
```

## Các bước tiếp theo
- **Phase 2**: mô hình `tenant`/`facebook_page`, Facebook Login để kết nối page, map `page_id → tenant`.
- **Phase 3**: upload tài liệu → chunk + embed (Gemini) → pgvector; vector search lọc theo `tenant_id` → đưa context vào prompt.
- **Phase 4**: admin dashboard (Next.js).
- **Phase 5**: rate-limit/queue cho Gemini free, human handoff, analytics.
# chat-bot-saas
