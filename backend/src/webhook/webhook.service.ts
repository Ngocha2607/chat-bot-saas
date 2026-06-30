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
    await this.messenger.sendTypingOn(senderId);

    // Phase 3 sẽ thay bằng: retrieve context theo tenant rồi truyền vào generateReply.
    const reply = await this.gemini.generateReply(text);

    await this.messenger.sendText(senderId, reply);
  }
}
