import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { GeminiService } from './src/llm/gemini.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const gemini = app.get(GeminiService);

  const cauHoi = 'Cửa hàng có giao hàng tận nơi không? Phí ship bao nhiêu?';
  console.log('❓ Khách hỏi:', cauHoi);
  const traLoi = await gemini.generateReply(cauHoi);
  console.log('🤖 Bot trả lời:', traLoi);

  await app.close();
}

main().catch((e) => {
  console.error('Lỗi:', e);
  process.exit(1);
});
