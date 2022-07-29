import fastify from 'fastify';
import S from 'jsonschema-definer';

import fastifyCors from '@fastify/cors';

import { makeTokenizer } from './tokenizer';

// import fastifyWebsocket from '@fastify/websocket';

async function main() {
  const PORT = process.env['PORT'] || '7000';

  const app = fastify({
    logger: true,
  });
  app.register(fastifyCors);

  makeTokenizer();

  // app.register(fastifyWebsocket);

  // app.get('/app/tokenizer/vocab', { websocket: true }, (conn, req) => {
  //   conn.socket.on('message', (msg) => {});
  // });

  {
    const sBody = S.shape({
      text: S.string(),
    });

    app.post<{
      Body: typeof sBody.type;
    }>(
      '/api/tokenizer/kuromoji',
      {
        schema: {
          body: sBody.valueOf(),
        },
      },
      async (req) => {
        const tokenizer = await makeTokenizer();
        return {
          tokens: tokenizer.tokenize(req.body.text),
        };
      },
    );
  }

  app.listen(
    {
      port: parseInt(PORT),
      host: '0.0.0.0',
    },
    (err) => {
      if (err) {
        throw err;
      }
    },
  );
}

main();
