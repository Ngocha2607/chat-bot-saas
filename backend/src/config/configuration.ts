export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  facebook: {
    verifyToken: process.env.FB_VERIFY_TOKEN ?? '',
    appSecret: process.env.FB_APP_SECRET ?? '',
    pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN ?? '',
    graphApiVersion: process.env.FB_GRAPH_API_VERSION ?? 'v21.0',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004',
  },
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
});
