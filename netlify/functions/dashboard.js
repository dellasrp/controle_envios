import { readDb } from './_lib/db.js';
import { authenticate, requireRole, json } from './_lib/security.js';

const MESES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const handler = async (event) => {
  const user = authenticate(event);
  if (!requireRole(user, ['diretoria', 'administrador'])) return json(403, { error: 'forbidden' });

  const db = await readDb();
  const clientes = db.clientes || [];
  const total = clientes.length;

  const porMes = MESES.map((m, i) => {
    let concluido = 0;
    for (const c of clientes) {
      const mes = c.meses && c.meses[m];
      if (mes && mes.dataValidacao) concluido += 1;
    }
    return { mes: NOMES[i], concluido, pendente: total - concluido };
  });

  const porOrgMap = {};
  for (const c of clientes) {
    const org = c.org || 'N/D';
    porOrgMap[org] = (porOrgMap[org] || 0) + 1;
  }

  const semTecnicoMes = MESES.map((m, i) => {
    let semTec = 0;
    for (const c of clientes) {
      const mes = c.meses && c.meses[m];
      if (!mes || !mes.tecnico) semTec += 1;
    }
    return { mes: NOMES[i], semTecnico: semTec };
  });

  return json(200, {
    total,
    comIntegracao: clientes.filter((c) => c.integracaoAmCp === 'Sim').length,
    comGerador: clientes.filter((c) => c.clienteComGerador === 'Sim').length,
    porMes,
    porOrg: Object.entries(porOrgMap)
      .map(([org, qtd]) => ({ org, qtd }))
      .sort((a, b) => b.qtd - a.qtd),
    semTecnicoMes
  });
};
