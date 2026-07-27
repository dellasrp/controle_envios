import { getStore, connectLambda } from '@netlify/blobs';
import initialData from './database.json' with { type: 'json' };

export { connectLambda };

const STORE_NAME = 'controle-envios';
const KEY = 'database';

function precisaAtualizarSemente(data) {
  if (!data || !Array.isArray(data.clientes)) return true;
  return data.seedVersion !== initialData.seedVersion;
}

function aplicarSemente(data) {
  return {
    seedVersion: initialData.seedVersion,
    usuarios: Array.isArray(data.usuarios) && data.usuarios.length > 0 ? data.usuarios : initialData.usuarios,
    prazos: initialData.prazos,
    clientes: initialData.clientes
  };
}

export async function readDb() {
  const store = getStore(STORE_NAME);
  let data = await store.get(KEY, { type: 'json' });
  if (!data) {
    await store.setJSON(KEY, initialData);
    return initialData;
  }
  if (precisaAtualizarSemente(data)) {
    data = aplicarSemente(data);
    await store.setJSON(KEY, data);
  }
  return data;
}

export async function writeDb(data) {
  const store = getStore(STORE_NAME);
  await store.setJSON(KEY, data);
  return data;
}
