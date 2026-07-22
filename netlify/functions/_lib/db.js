import { getStore, connectLambda } from '@netlify/blobs';
import initialData from './database.json' with { type: 'json' };

export { connectLambda };

const STORE_NAME = 'controle-envios';
const KEY = 'database';

export async function readDb() {
  const store = getStore(STORE_NAME);
  const existing = await store.get(KEY, { type: 'json' });
  if (existing) return existing;
  await store.setJSON(KEY, initialData);
  return initialData;
}

export async function writeDb(data) {
  const store = getStore(STORE_NAME);
  await store.setJSON(KEY, data);
  return data;
}
