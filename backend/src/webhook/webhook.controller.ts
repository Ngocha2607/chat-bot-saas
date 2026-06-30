import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  Headers,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { verifySignature } from './signature.util';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly webhookService: WebhookService,
  ) {}

  /**
   * GET /webhook — Meta gọi 1 lần khi đăng ký webhook để verify.
   * Trả lại hub.challenge nếu hub.verify_token khớp.
   */
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
    const expected = this.config.get<string>('facebook.verifyToken', '');
    if (mode === 'subscribe' && token === expected) {
      this.logger.log('Webhook verified ✅');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }

  /**
   * POST /webhook — nhận sự kiện tin nhắn.
   * Phải verify chữ ký X-Hub-Signature-256 trước khi xử lý,
   * và trả 200 nhanh (xử lý bất đồng bộ) để Meta không retry.
   */
  @Post()
  async receive(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-hub-signature-256') signature: string,
    @Res() res: Response,
  ): Promise<void> {
    const appSecret = this.config.get<string>('facebook.appSecret', '');
    if (!verifySignature(appSecret, req.rawBody, signature)) {
      this.logger.warn('Chữ ký webhook không hợp lệ — từ chối.');
      res.sendStatus(403);
      return;
    }

    // Trả 200 ngay; xử lý nền để tránh Meta timeout/retry.
    res.sendStatus(200);
    this.webhookService
      .handlePageEvent(req.body)
      .catch((err) => this.logger.error(`Xử lý webhook lỗi: ${err.message}`));
  }
}
