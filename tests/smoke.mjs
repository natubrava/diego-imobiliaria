globalThis.window = { addEventListener() {} };
globalThis.document = { addEventListener() {} };

const modules = [
  '../js/app.js', '../js/dashboard.js', '../js/imoveis.js',
  '../js/pagamentos.js', '../js/vendas.js', '../js/configuracoes.js'
];
await Promise.all(modules.map(path => import(path)));

const { parseMoney, formatCurrency, daysFromToday, escHtml } = await import('../js/utils.js');
const { readAccessTokenFromHash } = await import('../js/api.js');
if (parseMoney('R$ 5.200,00') !== 5200) throw new Error('Falha ao interpretar moeda brasileira.');
if (!formatCurrency(5200).includes('5.200,00')) throw new Error('Falha ao formatar moeda.');
if (escHtml('<script>') !== '&lt;script&gt;') throw new Error('Falha ao escapar HTML.');
if (typeof daysFromToday('2026-08-01') !== 'number') throw new Error('Falha no cálculo de datas.');
if (readAccessTokenFromHash('#acesso=abc%20123') !== 'abc 123') throw new Error('Falha ao interpretar link privado.');
if (readAccessTokenFromHash('#dashboard') !== '') throw new Error('Rota comum foi interpretada como acesso privado.');

console.log('Smoke test: módulos e utilitários OK');
