import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { GeminiService } from './src/llm/gemini.service';

/**
 * Demo tác dụng của RAG: cùng 1 câu hỏi, nhưng lần 2 ta "nhét" thông tin
 * thật của shop vào `context`. So sánh: lần 1 bot BỊA, lần 2 bot trả ĐÚNG.
 */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const gemini = app.get(GeminiService);

  const cauHoi = 'Cửa hàng có giao hàng tận nơi không? Phí ship bao nhiêu?';

  // ── Lần 1: KHÔNG có context (giống Phase 1 hiện tại) ──────────────
  console.log('\n=========================================');
  console.log('❌ LẦN 1 — KHÔNG có dữ liệu shop (bot tự bịa)');
  console.log('=========================================');
  console.log('❓ Khách hỏi:', cauHoi);
  const traLoi1 = await gemini.generateReply(cauHoi);
  console.log('🤖 Bot:', traLoi1);

  // ── Lần 2: CÓ context — đây là phần RAG sẽ tự tìm ra ở Phase 3 ─────
  const thongTinShop = `
- Shop tên "Cà phê Nhà Mình", chỉ bán tại Đà Nẵng.
- CHỈ giao hàng nội thành Đà Nẵng, phí ship đồng giá 15.000đ.
- KHÔNG giao tỉnh khác.
- Miễn phí ship cho đơn từ 200.000đ.
- Giờ mở cửa: 7h - 22h hằng ngày.
`;

  console.log('\n=========================================');
  console.log('✅ LẦN 2 — CÓ dữ liệu shop (RAG, bot trả đúng)');
  console.log('=========================================');
  console.log('❓ Khách hỏi:', cauHoi);
  const traLoi2 = await gemini.generateReply(cauHoi, thongTinShop);
  console.log('🤖 Bot:', traLoi2);

  await app.close();
}

main().catch((e) => {
  console.error('Lỗi:', e);
  process.exit(1);
});
