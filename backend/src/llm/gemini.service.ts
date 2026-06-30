import { GoogleGenAI } from "@google/genai";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** Quá thời gian này (ms) coi như Gemini không phản hồi → trả lời tạm, không treo vô hạn. */
const GEMINI_TIMEOUT_MS = 15_000;

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
    const apiKey = this.config.get<string>("gemini.apiKey", "");
    this.model = this.config.get<string>("gemini.model", "gemini-3.5-flash");
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
      "Bạn là trợ lý chăm sóc khách hàng thân thiện, trả lời ngắn gọn bằng tiếng Việt.";

    const prompt = context
      ? `${instruction}\n\nDựa vào thông tin sau để trả lời:\n"""\n${context}\n"""\n\nCâu hỏi của khách: ${userMessage}`
      : `${instruction}\n\nCâu hỏi của khách: ${userMessage}`;

    try {
      const response = await this.withTimeout(
        this.client.models.generateContent({
          model: this.model,
          contents: prompt,
          // Giới hạn thời gian từng request ở tầng SDK (chặn retry kéo dài).
          config: { httpOptions: { timeout: GEMINI_TIMEOUT_MS } },
        }),
        GEMINI_TIMEOUT_MS,
      );
      return (
        response.text?.trim() ||
        "Xin lỗi, mình chưa trả lời được câu này. Bạn vui lòng thử lại nhé."
      );
    } catch (err) {
      return this.toFriendlyError(err);
    }
  }

  /**
   * Backstop chống treo: nếu lời gọi không xong trong `ms` thì ném lỗi timeout.
   * Lưu ý: chỉ giải phóng luồng của ta, request nền có thể vẫn chạy — nhưng
   * người dùng không phải chờ vô hạn vì SDK tự retry khi gặp 429/503.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`GEMINI_TIMEOUT sau ${ms}ms`)), ms),
      ),
    ]);
  }

  /**
   * Chuyển lỗi kỹ thuật của Gemini thành câu trả lời thân thiện cho khách,
   * đồng thời log đúng mức độ để dễ theo dõi/giám sát (Phase 5).
   */
  private toFriendlyError(err: unknown): string {
    const msg = (err as Error)?.message ?? String(err);

    // 429 / hết hạn mức (free tier 20 req/ngày/model).
    if (
      msg.includes("429") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.toLowerCase().includes("quota")
    ) {
      this.logger.warn(`Gemini quá hạn mức (429): ${msg}`);
      return "Hệ thống đang nhận quá nhiều yêu cầu. Bạn vui lòng nhắn lại sau ít phút nhé!";
    }

    // 503 / model quá tải tạm thời.
    if (
      msg.includes("503") ||
      msg.includes("UNAVAILABLE") ||
      msg.toLowerCase().includes("overloaded") ||
      msg.toLowerCase().includes("high demand")
    ) {
      this.logger.warn(`Gemini quá tải (503): ${msg}`);
      return "Trợ lý đang hơi bận, bạn chờ một chút rồi nhắn lại giúp mình nhé!";
    }

    // Hết thời gian chờ.
    if (msg.includes("GEMINI_TIMEOUT")) {
      this.logger.error(`Gemini timeout: ${msg}`);
      return "Mình xử lý hơi lâu, bạn thử nhắn lại câu hỏi nhé!";
    }

    // Lỗi khác chưa phân loại — log mức error để điều tra.
    this.logger.error(`Gemini lỗi không xác định: ${msg}`);
    return "Xin lỗi, hệ thống đang gặp sự cố. Bạn vui lòng nhắn lại sau ít phút nhé.";
  }
}
