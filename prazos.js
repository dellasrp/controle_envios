import { getStore, connectLambda } from '@netlify/blobs';
import initialData from './database.json' with { type: 'json' };

export { connectLambda };

const STORE_NAME = 'controle-envios';
const KEY = 'database';

function precisaMigrar(data) {
  if (!data || !Array.isArray(data.clientes)) return false;
  if (!data.prazos) return true;
  if (data.clientes.length > 0 && !data.clientes[0].periodos) return true;
  return false;
}

function migrar(data) {
  const semente = initialData;
  return {
    usuarios: data.usuarios || semente.usuarios,
    prazos: data.prazos || semente.prazos,
    clientes: semente.clientes
  };
}

export async function readDb() {
  const store = getStore(STORE_NAME);
  let data = await store.get(KEY, { type: 'json' });
  if (!data) {
    await store.setJSON(KEY, initialData);
    return initialData;
  }
  if (precisaMigrar(data)) {
    data = migrar(data);
    await store.setJSON(KEY, data);
  }
  return data;
}

export async function writeDb(data) {
  const store = getStore(STORE_NAME);
  await store.setJSON(KEY, data);
  return data;
}
