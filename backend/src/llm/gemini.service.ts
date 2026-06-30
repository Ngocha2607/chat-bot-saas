import { GoogleGenAI } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Lớp bọc Gemini. Phase 1 chỉ sinh câu trả lời từ tin nhắn người dùng.
 * Phase 3 (RAG) sẽ thêm `context` (các chunk tài liệu) vào prompt.
 *
 * Lưu ý: đây là điểm cô lập LLM provider — đổi sang gói trả phí hoặc
 * provider khác chỉ cần thay file này, không ảnh hưởng webhook/messenger.
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('gemini.apiKey', '');
    this.model = this.config.get<string>('gemini.model', 'gemini-2.0-flash');
    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Sinh câu trả lời.
   * @param userMessage tin nhắn của người dùng
   * @param context (tuỳ chọn) các đoạn tài liệu liên quan cho RAG — Phase 3
   * @param systemPrompt (tuỳ chọn) persona/giọng văn theo bot_config — Phase 4
   */
  async generateReply(
    userMessage: string,
    context?: string,
    systemPrompt?: string,
  ): Promise<string> {
    const instruction =
      systemPrompt ??
      'Bạn là trợ lý chăm sóc khách hàng thân thiện, trả lời ngắn gọn bằng tiếng Việt.';

    const prompt = context
      ? `${instruction}\n\nDựa vào thông tin sau để trả lời:\n"""\n${context}\n"""\n\nCâu hỏi của khách: ${userMessage}`
      : `${instruction}\n\nCâu hỏi của khách: ${userMessage}`;

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
      });
      return (
        response.text?.trim() ||
        'Xin lỗi, mình chưa trả lời được câu này. Bạn vui lòng thử lại nhé.'
      );
    } catch (err) {
      this.logger.error(`Gemini lỗi: ${(err as Error).message}`);
      return 'Xin lỗi, hệ thống đang bận. Bạn vui lòng nhắn lại sau ít phút nhé.';
    }
  }
}
