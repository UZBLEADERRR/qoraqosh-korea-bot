process.env.BOT_TOKEN='111111:TEST'; process.env.ADMIN_LOGIN='a';
process.env.ADMIN_PASSWORD='parol12345'; process.env.ADMIN_JWT_SECRET='x'.repeat(30);
process.env.PORT='4523'; process.env.PUBLIC_URL='http://127.0.0.1:4523';
process.env.TELEGRAM_API='http://127.0.0.1:4522';
const { soxtaServer } = await import('./test/soxta-server.mjs');
await soxtaServer(4522);
await import('./src/server.js');
