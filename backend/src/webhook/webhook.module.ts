import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { MessengerModule } from '../messenger/messenger.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [LlmModule, MessengerModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
