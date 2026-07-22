import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.MOCK_PORT || 4173);
const rentals = [
  { id:'1', nome:'VILLA TOSCANA 701', locatario:'Marina Souza', diaVencimentoPadrao:1, valorPadrao:5200, mesReajuste:8, dataFim:'2026-08-15', status:'ativo', statusMes:'vencido', diasVencimento:-21, diasRenovacao:24 },
  { id:'2', nome:'ULUWATTO 902', locatario:'Carlos Mendes', diaVencimentoPadrao:10, valorPadrao:7000, mesReajuste:5, status:'ativo', statusMes:'pago', diasVencimento:-12, diasRenovacao:283 },
  { id:'3', nome:'ANA JAQUELINE 101', diaVencimentoPadrao:10, valorPadrao:4417.24, mesReajuste:9, status:'ativo', statusMes:'vencido', diasVencimento:-12, diasRenovacao:41 },
  { id:'4', nome:'BOTHANICA 1102', diaVencimentoPadrao:24, valorPadrao:5650.98, mesReajuste:6, status:'ativo', statusMes:'vencendo', diasVencimento:2, diasRenovacao:314 }
];
const sales = [
  { id:'s1', titulo:'Apartamento quadra do mar', preco:1350000, status:'publicado', cidade:'Balneário Camboriú', bairro:'Centro', quartos:3, area:128, google:true, instagram:true, portais:false, whatsapp:true },
  { id:'s2', titulo:'2 suítes no Centro', preco:1560000, status:'preparando', cidade:'Balneário Camboriú', bairro:'Centro', quartos:2, area:96, google:false, instagram:true, portais:false, whatsapp:true },
  { id:'s3', titulo:'Apartamento frente mar', preco:3900000, status:'publicado', cidade:'Balneário Camboriú', bairro:'Barra Sul', quartos:4, area:210, google:true, instagram:true, portais:true, whatsapp:true }
];

function api(action, url) {
  if (action === 'ping') return { ok:true, version:'2.0.0' };
  if (action === 'getImoveis') return { data:rentals };
  if (action === 'getImovel') return { data:rentals.find(item => item.id === url.searchParams.get('id')) };
  if (action === 'getVendas') return { data:sales };
  if (action === 'getVenda') return { data:sales.find(item => item.id === url.searchParams.get('id')) };
  if (action === 'getConfig') return { data:{ emailAlerta:'diego@exemplo.com', diasAntecedencia:5, diasRenovacao:60, alertasAtivos:true } };
  if (action === 'getDashboard') return { totalAtivos:4, pagosMes:1, vencidos:2, vencendoHoje:0, renovacoesProximas:2, receitaMes:7000, receitaPrevista:22268.22, vendasAtivas:3, vendasDesatualizadas:1, acoes:[{tipo:'vencido',imovelId:'1',imovelNome:'VILLA TOSCANA 701',valor:5200,diaVencimento:1,diasRestantes:-21},{tipo:'renovacao',imovelId:'1',imovelNome:'VILLA TOSCANA 701',data:'2026-08-15',diasRestantes:24},{tipo:'vencendo',imovelId:'4',imovelNome:'BOTHANICA 1102',valor:5650.98,diaVencimento:24,diasRestantes:2}], fluxoMensal:['fev','mar','abr','mai','jun','jul'].map((mes,index)=>({mes,previsto:22000,recebido:16000+index*1100})) };
  if (action === 'getFinanceiro') return { data:rentals.map((item,row)=>({ ...item, meses:Array.from({length:12},(_,month)=>({status:month<6?(month===row?'overdue':'pago'):month===6?'due':'future', pagamentoId:month<6&&month!==row?`${item.id}-${month}`:''})) })), totais:{previsto:267218.64,recebido:112450,atrasados:3} };
  return { ok:true, created:3, updated:20, sent:true };
}

const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.csv':'text/csv; charset=utf-8' };
http.createServer(async (req,res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api') {
    let action = url.searchParams.get('action');
    if (req.method === 'POST') { let body=''; for await (const chunk of req) body+=chunk; action = new URLSearchParams(body).get('action'); }
    res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}); res.end(JSON.stringify(api(action,url))); return;
  }
  try {
    const requestPath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//,'');
    const file = join(root, requestPath); const content = await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'}); res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port,'127.0.0.1',()=>console.log(`Mock: http://127.0.0.1:${port}`));
