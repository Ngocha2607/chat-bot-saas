import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../llm/gemini.service';
import { MessengerService } from '../messenger/messenger.service';

/**
 * Điều phối luồng trả lời (Phase 1):
 *   tin nhắn đến → Gemini sinh câu trả lời → Send API trả lời.
 *
 * Phase 2: thêm bước map page_id → tenant + lấy page access token theo tenant.
 * Phase 3: thêm bước RAG (embed câu hỏi → vector search → đưa context vào Gemini).
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly gemini: GeminiService,
    private readonly messenger: MessengerService,
  ) {}

  /**
   * Xử lý payload webhook dạng `object: "page"`.
   * Lặp qua từng entry / messaging event.
   */
  async handlePageEvent(body: any): Promise<void> {
    if (body?.object !== 'page' || !Array.isArray(body.entry)) {
      return;
    }

    for (const entry of body.entry) {
      const pageId = entry.id as string; // Phase 2: dùng để map sang tenant
      const events = entry.messaging ?? [];
      for (const event of events) {
        const senderId = event.sender?.id as string | undefined;
        const text = event.message?.text as string | undefined;

        // Bỏ qua echo (tin do chính page gửi) và sự kiện không phải text.
        if (!senderId || !text || event.message?.is_echo) {
          continue;
        }

        await this.processTextMessage(pageId, senderId, text);
      }
    }
  }

  private async processTextMessage(
    pageId: string,
    senderId: string,
    text: string,
  ): Promise<void> {
    this.logger.log(`[page ${pageId}] ${senderId}: ${text}`);
    // Bật "đang nhập…" ngay khi nhận tin để khách thấy bot đã tiếp nhận.
    await this.messenger.sendTypingOn(senderId);

    // Phase 3 sẽ thay bằng: retrieve context theo tenant rồi truyền vào generateReply.
    const reply = await this.gemini.generateReply(text);

    // Giả lập nhịp gõ của người: giữ "đang nhập…" thêm một chút tỉ lệ độ dài câu
    // trả lời, để cảm giác tự nhiên thay vì bot bắn tin tức thì.
    await this.messenger.sendTypingOn(senderId);
    await this.delay(this.humanTypingDelayMs(reply));

    await this.messenger.sendText(senderId, reply);
  }

  /** Thời gian "gõ" mô phỏng theo độ dài câu trả lời (giây * tốc độ gõ người). */
  private humanTypingDelayMs(text: string): number {
    const CHARS_PER_SECOND = 45; // tốc độ gõ ~ người thật
    const MIN_MS = 800;
    const MAX_MS = 4000;
    const estimated = (text.length / CHARS_PER_SECOND) * 1000;
    return Math.min(MAX_MS, Math.max(MIN_MS, estimated));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
