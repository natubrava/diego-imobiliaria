globalThis.window = { addEventListener() {} };
globalThis.document = { addEventListener() {} };
const { readFile } = await import('node:fs/promises');
const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
};
const session = new Map();
globalThis.sessionStorage = {
  getItem: key => session.get(key) || null,
  setItem: (key, value) => session.set(key, String(value)),
  removeItem: key => session.delete(key)
};
globalThis.location = { hash:'', pathname:'/diego-imobiliaria/', search:'' };
globalThis.history = { replaceState() {} };

const modules = [
  '../js/app.js', '../js/dashboard.js', '../js/imoveis.js',
  '../js/pagamentos.js', '../js/vendas.js', '../js/configuracoes.js'
];
await Promise.all(modules.map(path => import(path)));

const { parseMoney, formatCurrency, daysFromToday, escHtml } = await import('../js/utils.js');
const api = await import('../js/api.js');
const { readAccessTokenFromHash } = api;
if (parseMoney('R$ 5.200,00') !== 5200) throw new Error('Falha ao interpretar moeda brasileira.');
if (!formatCurrency(5200).includes('5.200,00')) throw new Error('Falha ao formatar moeda.');
if (escHtml('<script>') !== '&lt;script&gt;') throw new Error('Falha ao escapar HTML.');
if (typeof daysFromToday('2026-08-01') !== 'number') throw new Error('Falha no cálculo de datas.');
if (readAccessTokenFromHash('#acesso=abc%20123') !== 'abc 123') throw new Error('Falha ao interpretar link privado.');
if (readAccessTokenFromHash('#dashboard') !== '') throw new Error('Rota comum foi interpretada como acesso privado.');

api.setApiUrl('https://backend-antigo.example/exec');
location.hash = '#acesso=acesso-atual';
if (!api.consumePrivateAccessLink()) throw new Error('Link privado não foi consumido.');
if (api.getApiUrl() === 'https://backend-antigo.example/exec') throw new Error('Link privado manteve uma URL antiga do backend.');

api.setApiUrl('https://backend-antigo.example/exec');
let calls = 0;
globalThis.fetch = async url => {
  calls += 1;
  if (url === 'https://backend-antigo.example/exec') return { ok:false, status:404 };
  return { ok:true, status:200, json:async () => ({ ok:true, version:'2.0.0' }) };
};
await api.ping();
if (calls !== 2) throw new Error('A conexão 404 não tentou automaticamente o backend oficial.');
if (api.getApiUrl() === 'https://backend-antigo.example/exec') throw new Error('A URL antiga não foi removida após a recuperação.');

api.setApiUrl('');
calls = 0;
globalThis.fetch = async () => {
  calls += 1;
  if (calls === 1) return { ok:false, status:404 };
  return { ok:true, status:200, json:async () => ({ ok:true, version:'2.0.0' }) };
};
await api.ping();
if (calls !== 2) throw new Error('Um 404 transitório no backend oficial não foi repetido.');

api.clearCache();
calls = 0;
globalThis.fetch = async (_url, options) => {
  calls += 1;
  const action = options.body.get('action');
  if (action !== 'getBootstrap') throw new Error(`Consulta inesperada: ${action}`);
  return { ok:true, status:200, json:async () => ({
    ok:true,
    dashboard:{ totalAtivos:26 },
    locacoes:{ data:Array.from({ length:26 }, (_, index) => ({ id:String(index + 1) })) },
    financeiro:{ data:[], year:new Date().getFullYear() },
    vendas:{ data:Array.from({ length:6 }, (_, index) => ({ id:String(index + 1) })) },
    config:{ data:{ alertasAtivos:true } }
  }) };
};
const [dashboard, locacoes, vendas, config] = await Promise.all([
  api.getDashboard(), api.getLocacoes(), api.getVendas(), api.getConfig()
]);
if (calls !== 1) throw new Error('As telas principais não compartilharam a mesma consulta inicial.');
if (dashboard.totalAtivos !== 26 || locacoes.data.length !== 26 || vendas.data.length !== 6 || !config.data.alertasAtivos) throw new Error('O pacote inicial não foi distribuído corretamente entre as telas.');
await api.getDashboard();
if (calls !== 1) throw new Error('O cache da sessão não evitou uma consulta repetida.');

api.clearCache();
calls = 0;
globalThis.fetch = async (_url, options) => {
  calls += 1;
  const action = options.body.get('action');
  if (action === 'getBootstrap') throw new TypeError('pacote indisponível');
  if (action === 'getDashboard') return { ok:true, status:200, json:async () => ({ totalAtivos:26 }) };
  throw new Error(`Consulta inesperada: ${action}`);
};
const fallbackDashboard = await api.getDashboard();
if (calls !== 2 || fallbackDashboard.totalAtivos !== 26) throw new Error('A tela não usou a consulta leve quando o pacote inicial falhou.');

api.clearCache();
calls = 0;
globalThis.fetch = async () => { calls += 1; throw new TypeError('offline'); };
try { await api.saveLocacao({ nome:'Teste' }); } catch {}
if (calls !== 1) throw new Error('Uma gravação foi repetida e poderia duplicar dados.');

const backendSource = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
new Function(backendSource);

console.log('Smoke test: frontend, conexão e backend OK');
