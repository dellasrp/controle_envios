import { writeDb, connectLambda } from './_lib/db.js';
import { authenticate, requireRole, json, parseBody } from './_lib/security.js';

const PERIODOS = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','anual'];

function validarBackup(data) {
  if (!data || typeof data !== 'object') return 'Arquivo inválido.';
  if (!Array.isArray(data.clientes)) return 'Campo clientes ausente ou inválido.';
  if (!Array.isArray(data.usuarios)) return 'Campo usuarios ausente ou inválido.';
  if (!data.prazos || typeof data.prazos !== 'object') return 'Campo prazos ausente ou inválido.';
  if (data.usuarios.length === 0) return 'Backup não contém usuários.';
  if (!data.usuarios.some((u) => u.role === 'administrador' && u.ativo !== false)) {
    return 'Backup precisa ter ao menos um administrador ativo.';
  }
  for (const u of data.usuarios) {
    if (!u.id || !u.username || !u.senha || !u.role) return 'Usuário com campos obrigatórios ausentes.';
  }
  return null;
}

function sanitizarBackup(data) {
  const anos = Object.keys(data.prazos);
  const clientes = data.clientes.map((c) => {
    const periodos = {};
    for (const ano of anos) {
      periodos[ano] = {};
      const origem = (c.periodos && c.periodos[ano]) || {};
      for (const p of PERIODOS) {
        const src = origem[p] || {};
        periodos[ano][p] = {
          dataValidacao: String(src.dataValidacao || ''),
          tecnico: String(src.tecnico || ''),
          observacoes: String(src.observacoes || ''),
          contato: String(src.contato || '')
        };
      }
    }
    return {
      id: String(c.id || ''),
      cliente: String(c.cliente || ''),
      integracaoAmCp: c.integracaoAmCp === 'Sim' ? 'Sim' : 'Não',
      clienteComGerador: c.clienteComGerador === 'Sim' ? 'Sim' : 'Não',
      org: String(c.org || ''),
      abertura: {
        data: String((c.abertura && c.abertura.data) || ''),
        tecnico: String((c.abertura && c.abertura.tecnico) || ''),
        webOuDd: ['Web','DD'].includes(c.abertura && c.abertura.webOuDd) ? c.abertura.webOuDd : ''
      },
      periodos
    };
  });

  const usuarios = data.usuarios.map((u) => ({
    id: String(u.id),
    nome: String(u.nome || ''),
    username: String(u.username || '').toLowerCase(),
    role: ['administrador','diretoria','operacional'].includes(u.role) ? u.role : 'operacional',
    senha: String(u.senha),
    ativo: u.ativo !== false,
    mustChangePassword: u.mustChangePassword === true
  }));

  const prazos = {};
  for (const ano of anos) {
    prazos[ano] = {};
    for (const p of PERIODOS) {
      const v = data.prazos[ano][p];
      prazos[ano][p] = (v && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)) ? v : null;
    }
  }

  return {
    seedVersion: data.seedVersion || 3,
    usuarios,
    prazos,
    clientes
  };
}

export const handler = async (event) => {
  connectLambda(event);
  const user = authenticate(event);
  if (!requireRole(user, ['administrador'])) return json(403, { error: 'forbidden' });
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  let body;
  try {
    body = parseBody(event, 10 * 1024 * 1024);
  } catch (e) {
    return json(400, { error: 'payload_invalido' });
  }

  const erro = validarBackup(body);
  if (erro) return json(400, { error: erro });

  const db = sanitizarBackup(body);
  await writeDb(db);

  return json(200, {
    ok: true,
    clientes: db.clientes.length,
    usuarios: db.usuarios.length,
    anos: Object.keys(db.prazos)
  });
};
