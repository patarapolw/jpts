import fastify from 'fastify';
import S from 'jsonschema-definer';

import fastifyCors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';

async function main() {
  const app = fastify();
  app.register(fastifyCors);
  app.register(fastifyWebsocket);

  app.get('/app/tokenizer/vocab', { websocket: true }, (conn, req) => {
    conn.socket.on('message', (msg) => {});
  });

  {
    const sBody = S.shape({
      text: S.string(),
    });

    app.post<{
      Body: typeof sBody.type;
    }>(
      '/api/tokenizer/vocab',
      {
        schema: {
          body: sBody.valueOf(),
        },
      },
      async (req) => {},
    );
  }
}

main();
