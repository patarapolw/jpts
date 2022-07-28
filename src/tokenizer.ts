import { FastifyRequest } from 'fastify';
import { builder, IpadicFeatures, Tokenizer } from 'kuromoji';

import { SocketStream } from '@fastify/websocket';

const reJa = /[\p{sc=Han}\p{sc=Katakana}\p{sc=Hiragana}]/u;
const nonPOS = new Set(['助詞', '助動詞']);

let tokenizer: Tokenizer<IpadicFeatures>;

export async function makeTokenizer(dicPath = 'kuromoji.js/dict') {
  if (!tokenizer) {
    tokenizer = await new Promise((resolve, reject) => {
      builder({
        dicPath, // Default path value
      }).build((e, t) => (e ? reject(e) : resolve(t)));
    });
  }

  return tokenizer;
}

function makePOS(t: IpadicFeatures) {
  return [t.pos, t.pos_detail_1, t.pos_detail_2, t.pos_detail_3]
    .filter((s) => s !== '*')
    .join('・');
}

function tokenDictID(t: IpadicFeatures) {
  return [
    t.basic_form,
    t.reading || '',
    t.pronunciation || '',
    t.pos,
    t.pos_detail_1,
    t.pos_detail_2,
    t.pos_detail_3,
  ].join('\t');
}

type TokenCount = {
  token: IpadicFeatures;
  count: number;
};

async function makeCount(
  fns: {
    loader: string;
    action: () => Promise<string>;
  }[],
) {
  if (!tokenizer) {
    loader.value = `Loading segmentation engine...`;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  output.value = [];

  const map = new Map<
    string,
    {
      token: k.IpadicFeatures;
      count: number;
    }
  >();

  for (const f of fns) {
    loader.value = f.loader;

    for (const t of tokenizer.tokenize(await f.action())) {
      if (!reJa.test(t.basic_form)) {
        continue;
      }

      if (nonPOS.has(t.pos)) {
        continue;
      }

      const id = tokenDictID(t);
      const v = map.get(id);

      if (v) {
        v.count++;
        map.set(id, v);
      } else {
        map.set(id, { token: t, count: 1 });
      }
    }
  }

  output.value = Array.from(map)
    .sort(([, v1], [, v2]) => v2.count - v1.count)
    .map(([, v]) => v);

  loader.value = '';
}

export function wsHandler(conn: SocketStream, req: FastifyRequest) {
  makeTokenizer();

  const map = new Map<
    string,
    {
      token: IpadicFeatures;
      count: number;
    }
  >();

  conn.socket.on('message', async (msg, isBinary) => {
    const s = msg.toString();
    if (!reJa.test(s)) {
      return;
    }

    if (!tokenizer) {
      conn.socket.send(`Loading segmentation engine...`);
      while (!tokenizer) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    conn.socket.send('[loading]');

    for (const t of tokenizer.tokenize(s)) {
      if (!reJa.test(t.basic_form)) {
        continue;
      }

      if (nonPOS.has(t.pos)) {
        continue;
      }

      const id = tokenDictID(t);
      const v = map.get(id);

      if (v) {
        v.count++;
        map.set(id, v);
      } else {
        map.set(id, { token: t, count: 1 });
      }
    }
  });

  conn.socket.on('close');
}
