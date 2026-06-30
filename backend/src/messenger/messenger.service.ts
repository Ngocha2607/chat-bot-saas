import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Gửi tin nhắn trả lời qua Messenger Send API.
 *
 * Phase 1: dùng 1 page access token duy nhất từ env.
 * Phase 2: nhận token theo từng tenant/page (truyền vào tham số `pageAccessToken`).
 */
@Injectable()
export class MessengerService {
  private readonly logger = new Logger(MessengerService.name);
  private readonly graphVersion: string;
  private readonly defaultPageToken: string;

  constructor(private readonly config: ConfigService) {
    this.graphVersion = this.config.get<string>(
      'facebook.graphApiVersion',
      'v21.0',
    );
    this.defaultPageToken = this.config.get<string>(
      'facebook.pageAccessToken',
      '',
    );
  }

  /**
   * Gửi text tới 1 người dùng (psid).
   * @param recipientId PSID người nhận
   * @param text nội dung
   * @param pageAccessToken token của page (mặc định lấy từ env — Phase 1)
   */
  async sendText(
    recipientId: string,
    text: string,
    pageAccessToken: string = this.defaultPageToken,
  ): Promise<void> {
    const url = `https://graph.facebook.com/${this.graphVersion}/me/messages`;
    try {
      await axios.post(
        url,
        {
          recipient: { id: recipientId },
          messaging_type: 'RESPONSE',
          message: { text },
        },
        { params: { access_token: pageAccessToken } },
      );
    } catch (err) {
      const detail =
        axios.isAxiosError(err) && err.response
          ? JSON.stringify(err.response.data)
          : (err as Error).message;
      this.logger.error(`Send API lỗi: ${detail}`);
    }
  }

  /** Bật chỉ báo "đang soạn tin" để trải nghiệm tự nhiên hơn. */
  async sendTypingOn(
    recipientId: string,
    pageAccessToken: string = this.defaultPageToken,
  ): Promise<void> {
    const url = `https://graph.facebook.com/${this.graphVersion}/me/messages`;
    try {
      await axios.post(
        url,
        { recipient: { id: recipientId }, sender_action: 'typing_on' },
        { params: { access_token: pageAccessToken } },
      );
    } catch {
      // không critical, bỏ qua
    }
  }
}
