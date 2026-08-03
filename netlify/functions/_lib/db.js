import { getStore, connectLambda } from '@netlify/blobs';
import initialData from './database.json' with { type: 'json' };

export { connectLambda };

const STORE_NAME = 'controle-envios';
const KEY = 'database';
const PERIODOS = ['abertura','01','02','03','04','05','06','07','08','09','10','11','12','13','14','anual'];

function vazio() {
  return { dataValidacao: '', tecnico: '', observacoes: '', contato: '' };
}

function precisaMigrar(data) {
  if (!data || !Array.isArray(data.clientes)) return true;
  return (data.seedVersion || 0) < initialData.seedVersion;
}

function migrar(data) {
  const anos = Object.keys(initialData.prazos);
  const sementeMap = {};
  for (const c of initialData.clientes) {
    sementeMap[c.cliente] = c;
  }

  const clientes = data.clientes.map((c) => {
    const periodos = {};
    for (const ano of anos) {
      const origemAno = (c.periodos && c.periodos[ano]) || {};
      periodos[ano] = {};
      for (const p of PERIODOS) {
        const dadoExistente = origemAno[p];
        periodos[ano][p] = dadoExistente && typeof dadoExistente === 'object'
          ? { dataValidacao: dadoExistente.dataValidacao || '', tecnico: dadoExistente.tecnico || '', observacoes: dadoExistente.observacoes || '', contato: dadoExistente.contato || '' }
          : vazio();
      }
    }
    return {
      id: c.id,
      cliente: c.cliente,
      integracaoAmCp: c.integracaoAmCp || 'Não',
      clienteComGerador: c.clienteComGerador || 'Não',
      org: c.org || '',
      loginEmail: c.loginEmail || '',
      senhaEmail: c.senhaEmail || '',
      periodos
    };
  });

  const clientesNovos = initialData.clientes.filter(
    (ic) => !clientes.some((c) => c.cliente === ic.cliente)
  ).map((ic) => ({
    ...ic,
    loginEmail: ic.loginEmail || '',
    senhaEmail: ic.senhaEmail || ''
  }));

  return {
    seedVersion: initialData.seedVersion,
    usuarios: Array.isArray(data.usuarios) && data.usuarios.length > 0
      ? data.usuarios
      : initialData.usuarios,
    prazos: initialData.prazos,
    clientes: [...clientes, ...clientesNovos]
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
