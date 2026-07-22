import { getStore } from '@netlify/blobs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(__dirname, 'database.json');
const STORE_NAME = 'controle-envios';
const KEY = 'database';

function seed() {
  const raw = readFileSync(SEED_PATH, 'utf-8');
  return JSON.parse(raw);
}

export async function readDb() {
  const store = getStore(STORE_NAME);
  const existing = await store.get(KEY, { type: 'json' });
  if (existing) return existing;
  const initial = seed();
  await store.setJSON(KEY, initial);
  return initial;
}

export async function writeDb(data) {
  const store = getStore(STORE_NAME);
  await store.setJSON(KEY, data);
  return data;
}
