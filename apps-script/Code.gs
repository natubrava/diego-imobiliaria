/**
 * DIEGO IMÓVEIS — Backend v2
 * Google Apps Script + Google Sheets
 *
 * Propriedade obrigatória do script:
 *   APP_TOKEN = código longo usado pelo frontend
 *
 * Não grave senhas ou chaves neste arquivo.
 */

var VERSION = '2.0.0';
var SHEETS = {
  Imoveis: ['id','nome','locatario','telefone','email','diaVencimentoPadrao','valorPadrao','mesReajuste','dataInicio','dataFim','indiceReajuste','status','proprietario','endereco','observacoes','dataCadastro','atualizadoEm'],
  Pagamentos: ['id','imovelId','mesReferencia','dataVencimento','dataPagamento','valor','status','observacoes','atualizadoEm'],
  Vendas: ['id','titulo','preco','status','cidade','bairro','quartos','area','fotoUrl','link','google','instagram','portais','whatsapp','observacoes','dataCadastro','atualizadoEm'],
  AlertasLog: ['id','evento','tipo','referenciaId','dataEnvio','destinatario'],
  Auditoria: ['id','dataHora','acao','entidade','entidadeId','detalhes'],
  Config: ['chave','valor']
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🏠 Diego Imóveis')
    .addItem('✨ Preparar / atualizar sistema', 'setupSystemFromMenu')
    .addItem('🔔 Verificar alertas agora', 'checkVencimentos')
    .addSeparator()
    .addItem('⏰ Ativar resumo diário (8h)', 'createDailyTrigger')
    .addItem('🗑️ Remover resumo diário', 'removeDailyTrigger')
    .addToUi();
}

function setupSystemFromMenu() {
  ensureAllSheets();
  seedDefaultConfig();
  createDailyTrigger();
  SpreadsheetApp.getUi().alert('Sistema preparado. Colunas existentes foram preservadas e as novas foram adicionadas.');
}

function setupSystem() {
  return withWriteLock(function() {
    ensureAllSheets(); seedDefaultConfig(); createDailyTrigger();
    audit('setup','sistema','',VERSION);
    return { ok:true, version:VERSION };
  });
}

function createDailyTrigger() {
  removeDailyTrigger();
  ScriptApp.newTrigger('checkVencimentos').timeBased().everyDays(1).atHour(8).create();
  return { ok:true };
}

function removeDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'checkVencimentos') ScriptApp.deleteTrigger(trigger);
  });
  return { ok:true };
}

// -------------------- HTTP / SEGURANÇA --------------------
function doGet(e) { return handleRequest(e, false); }
function doPost(e) { return handleRequest(e, true); }

function handleRequest(e, isPost) {
  try {
    var params = (e && e.parameter) || {};
    var data = isPost && params.data ? JSON.parse(params.data) : {};
    authorize(params.token || data.token || '');
    var result = route(params.action, params, data, isPost);
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error:error.message || String(error), code:error.code || 'SERVER_ERROR' });
  }
}

function authorize(received) {
  var expected = PropertiesService.getScriptProperties().getProperty('APP_TOKEN');
  if (!expected) throw codedError('Defina APP_TOKEN nas Propriedades do script antes de usar o sistema.', 'SETUP_REQUIRED');
  if (!received || !constantTimeEquals(String(received), String(expected))) throw codedError('Código de acesso inválido.', 'UNAUTHORIZED');
}

function constantTimeEquals(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i=0; i<a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function codedError(message, code) { var error = new Error(message); error.code = code; return error; }

function route(action, params, data, isPost) {
  if (!action) throw codedError('Ação não informada.', 'BAD_REQUEST');
  if (action === 'ping') return { ok:true, version:VERSION, time:isoNow() };
  if (action === 'getDashboard') return getDashboard();
  if (action === 'getImoveis') return getImoveis();
  if (action === 'getImovel') return getImovel(params.id);
  if (action === 'getFinanceiro') return getFinanceiro(Number(params.year));
  if (action === 'getPagamentos') return getPagamentos(params.imovelId);
  if (action === 'getVendas') return getVendas();
  if (action === 'getVenda') return getVenda(params.id);
  if (action === 'getConfig') return getConfig();
  if (!isPost) throw codedError('Esta ação exige POST.', 'METHOD_NOT_ALLOWED');
  if (action === 'saveImovel') return saveImovel(data);
  if (action === 'importLocacoes') return importLocacoes(data.items || []);
  if (action === 'savePagamento') return savePagamento(data);
  if (action === 'deletePagamento') return deleteById('Pagamentos', data.id);
  if (action === 'saveVenda') return saveVenda(data);
  if (action === 'saveConfig') return saveConfig(data);
  if (action === 'runAlertCheck') return checkVencimentos();
  if (action === 'setupSystem') return setupSystem();
  throw codedError('Ação desconhecida: ' + action, 'BAD_REQUEST');
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

// -------------------- PLANILHAS --------------------
function spreadsheet() { return SpreadsheetApp.getActiveSpreadsheet(); }

function ensureAllSheets() {
  Object.keys(SHEETS).forEach(function(name) { ensureSheet(name); });
}

function ensureSheet(name) {
  var ss = spreadsheet();
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  var required = SHEETS[name];
  if (!required) return sheet;
  var lastColumn = sheet.getLastColumn();
  if (!lastColumn) {
    sheet.getRange(1,1,1,required.length).setValues([required]);
    styleHeader(sheet, required.length);
    return sheet;
  }
  var existing = sheet.getRange(1,1,1,lastColumn).getValues()[0].map(String);
  var missing = required.filter(function(header) { return existing.indexOf(header) < 0; });
  if (missing.length) {
    sheet.getRange(1,lastColumn+1,1,missing.length).setValues([missing]);
    styleHeader(sheet, lastColumn + missing.length);
  }
  return sheet;
}

function styleHeader(sheet, columns) {
  sheet.setFrozenRows(1);
  sheet.getRange(1,1,1,columns).setFontWeight('bold').setBackground('#12372a').setFontColor('#ffffff');
}

function objects(name) {
  var sheet = ensureSheet(name);
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  return values.slice(1).map(function(row, index) {
    var obj = { _row:index + 2 };
    headers.forEach(function(header, column) { obj[header] = cellValue(row[column]); });
    return obj;
  }).filter(function(obj) { return obj.id || (name === 'Config' && obj.chave); });
}

function cellValue(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) return dateISO(value);
  return value === null || value === undefined ? '' : value;
}

function upsert(name, data, idField) {
  var sheet = ensureSheet(name);
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);
  var idKey = idField || 'id';
  var existing = objects(name).filter(function(item) { return String(item[idKey]) === String(data[idKey]); })[0];
  var row = headers.map(function(header) {
    var value = data[header];
    if (value === undefined && existing) value = existing[header];
    return safeCell(value === undefined ? '' : value);
  });
  if (existing) sheet.getRange(existing._row,1,1,headers.length).setValues([row]);
  else sheet.appendRow(row);
  return data;
}

function safeCell(value) {
  if (typeof value === 'string' && /^[=+\-@]/.test(value)) return "'" + value;
  return value;
}

function deleteById(name, id) {
  if (!id) throw codedError('ID não informado.', 'VALIDATION');
  return withWriteLock(function() {
    var item = objects(name).filter(function(row) { return String(row.id) === String(id); })[0];
    if (!item) throw codedError('Registro não encontrado.', 'NOT_FOUND');
    ensureSheet(name).deleteRow(item._row);
    audit('excluir',name,id,'');
    return { ok:true };
  });
}

function withWriteLock(callback) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return callback(); } finally { lock.releaseLock(); }
}

function audit(action, entity, id, details) {
  upsert('Auditoria', { id:uuid(), dataHora:isoNow(), acao:action, entidade:entity, entidadeId:id || '', detalhes:String(details || '').slice(0,500) });
}

// -------------------- LOCAÇÕES --------------------
function getImoveis() {
  var rentals = activeRentals();
  var payments = objects('Pagamentos');
  var config = configObject();
  var result = rentals.map(function(item) { return enrichRental(item, payments, config); });
  return { data:result };
}

function activeRentals() {
  return objects('Imoveis').filter(function(item) { return item.id && String(item.status || 'ativo') !== 'inativo'; });
}

function getImovel(id) {
  var item = objects('Imoveis').filter(function(row) { return String(row.id) === String(id); })[0];
  if (!item) throw codedError('Locação não encontrada.', 'NOT_FOUND');
  return { data:enrichRental(item, objects('Pagamentos'), configObject()) };
}

function enrichRental(item, payments, config) {
  var now = startOfDay(new Date());
  var reference = monthReference(now);
  var payment = payments.filter(function(row) { return String(row.imovelId) === String(item.id) && String(row.mesReferencia) === reference && String(row.status) === 'pago'; })[0];
  var due = dueDate(now.getFullYear(), now.getMonth()+1, Number(item.diaVencimentoPadrao)||10);
  var daysDue = daysBetween(now, due);
  item.statusMes = payment ? 'pago' : daysDue < 0 ? 'vencido' : daysDue <= Number(config.diasAntecedencia || 5) ? 'vencendo' : 'pendente';
  item.diasVencimento = daysDue;
  item.diasRenovacao = renewalDays(item, now);
  delete item._row;
  return item;
}

function saveImovel(input) {
  return withWriteLock(function() {
    var data = validateRental(input || {});
    var now = isoNow();
    if (!data.id) { data.id = uuid(); data.dataCadastro = today(); }
    data.atualizadoEm = now;
    upsert('Imoveis', data);
    audit(input.id ? 'atualizar' : 'criar','locacao',data.id,data.nome);
    return { ok:true, id:data.id };
  });
}

function validateRental(input) {
  var name = clean(input.nome, 120);
  var value = number(input.valorPadrao);
  var day = integer(input.diaVencimentoPadrao);
  if (!name) throw codedError('Informe o imóvel.', 'VALIDATION');
  if (value <= 0) throw codedError('Informe um valor de aluguel válido.', 'VALIDATION');
  if (day < 1 || day > 31) throw codedError('O vencimento deve estar entre 1 e 31.', 'VALIDATION');
  var month = input.mesReajuste === '' ? '' : integer(input.mesReajuste);
  if (month !== '' && (month < 1 || month > 12)) throw codedError('Mês de reajuste inválido.', 'VALIDATION');
  return {
    id:clean(input.id,40), nome:name, locatario:clean(input.locatario,120), telefone:clean(input.telefone,40), email:clean(input.email,120),
    diaVencimentoPadrao:day, valorPadrao:value, mesReajuste:month, dataInicio:validDate(input.dataInicio), dataFim:validDate(input.dataFim),
    indiceReajuste:clean(input.indiceReajuste || 'IGP-M',30), status:input.status === 'inativo' ? 'inativo' : 'ativo',
    proprietario:clean(input.proprietario,120), endereco:clean(input.endereco,240), observacoes:clean(input.observacoes,1000)
  };
}

function importLocacoes(items) {
  if (!Array.isArray(items) || !items.length) throw codedError('Nenhum registro válido para importar.', 'VALIDATION');
  if (items.length > 300) throw codedError('Importe no máximo 300 registros por vez.', 'VALIDATION');
  return withWriteLock(function() {
    var existing = objects('Imoveis');
    var created = 0, updated = 0, errors = [];
    items.forEach(function(input, index) {
      try {
        var data = validateRental(input);
        var match = existing.filter(function(row) { return normalize(row.nome) === normalize(data.nome); })[0];
        if (match) { data.id = match.id; data.dataCadastro = match.dataCadastro; updated++; }
        else { data.id = uuid(); data.dataCadastro = today(); created++; existing.push(data); }
        data.atualizadoEm = isoNow(); upsert('Imoveis',data);
      } catch (error) { errors.push({ linha:index+1, erro:error.message }); }
    });
    audit('importar','locacao','',created + ' criadas, ' + updated + ' atualizadas');
    return { ok:true, created:created, updated:updated, errors:errors };
  });
}

// -------------------- FINANCEIRO --------------------
function getFinanceiro(year) {
  year = year >= 2020 && year <= 2100 ? year : new Date().getFullYear();
  var rentals = activeRentals();
  var payments = objects('Pagamentos');
  var now = startOfDay(new Date());
  var totals = { previsto:0, recebido:0, atrasados:0 };
  var data = rentals.map(function(item) {
    var monthly = [];
    for (var month=1; month<=12; month++) {
      var reference = year + '-' + pad(month);
      var payment = payments.filter(function(row) { return String(row.imovelId) === String(item.id) && String(row.mesReferencia) === reference && String(row.status) === 'pago'; })[0];
      var due = dueDate(year,month,Number(item.diaVencimentoPadrao)||10);
      var status = payment ? 'pago' : due < now ? 'overdue' : (year === now.getFullYear() && month === now.getMonth()+1 ? 'due' : 'future');
      if (payment) totals.recebido += number(payment.valor);
      if (status === 'overdue') totals.atrasados++;
      totals.previsto += number(item.valorPadrao);
      monthly.push({ status:status, pagamentoId:payment ? payment.id : '', valor:payment ? payment.valor : '' });
    }
    return { id:item.id, nome:item.nome, valorPadrao:item.valorPadrao, diaVencimentoPadrao:item.diaVencimentoPadrao, meses:monthly };
  });
  return { data:data, totais:totals, year:year };
}

function getPagamentos(imovelId) {
  var rentals = objects('Imoveis');
  var data = objects('Pagamentos').filter(function(item) { return !imovelId || String(item.imovelId) === String(imovelId); }).map(function(item) {
    var rental = rentals.filter(function(row) { return String(row.id) === String(item.imovelId); })[0];
    item.imovelNome = rental ? rental.nome : 'Imóvel removido'; delete item._row; return item;
  }).sort(function(a,b) { return String(b.mesReferencia).localeCompare(String(a.mesReferencia)); });
  return { data:data };
}

function savePagamento(input) {
  return withWriteLock(function() {
    var rental = objects('Imoveis').filter(function(row) { return String(row.id) === String(input.imovelId); })[0];
    if (!rental) throw codedError('Locação não encontrada.', 'VALIDATION');
    if (!/^\d{4}-\d{2}$/.test(String(input.mesReferencia || ''))) throw codedError('Mês de referência inválido.', 'VALIDATION');
    var existing = objects('Pagamentos').filter(function(row) { return String(row.imovelId) === String(input.imovelId) && String(row.mesReferencia) === String(input.mesReferencia); })[0];
    var data = {
      id:clean(input.id || (existing && existing.id) || uuid(),40), imovelId:rental.id, mesReferencia:input.mesReferencia,
      dataVencimento:validDate(input.dataVencimento), dataPagamento:validDate(input.dataPagamento) || today(), valor:number(input.valor) || number(rental.valorPadrao),
      status:'pago', observacoes:clean(input.observacoes,500), atualizadoEm:isoNow()
    };
    upsert('Pagamentos',data); audit(existing ? 'atualizar' : 'criar','pagamento',data.id,data.mesReferencia);
    return { ok:true, id:data.id };
  });
}

// -------------------- VENDAS --------------------
function getVendas() {
  var data = objects('Vendas').map(function(item) { delete item._row; return item; }).sort(function(a,b) { return String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)); });
  return { data:data };
}

function getVenda(id) {
  var item = objects('Vendas').filter(function(row) { return String(row.id) === String(id); })[0];
  if (!item) throw codedError('Imóvel à venda não encontrado.', 'NOT_FOUND');
  delete item._row; return { data:item };
}

function saveVenda(input) {
  return withWriteLock(function() {
    var title = clean(input.titulo,160), price = number(input.preco);
    if (!title || price <= 0) throw codedError('Informe título e preço do imóvel.', 'VALIDATION');
    var data = {
      id:clean(input.id,40) || uuid(), titulo:title, preco:price, status:['captado','preparando','publicado','pausado','vendido'].indexOf(input.status)>=0 ? input.status : 'captado',
      cidade:clean(input.cidade,100), bairro:clean(input.bairro,100), quartos:integer(input.quartos)||'', area:number(input.area)||'', fotoUrl:safeUrl(input.fotoUrl), link:safeUrl(input.link),
      google:Boolean(input.google), instagram:Boolean(input.instagram), portais:Boolean(input.portais), whatsapp:Boolean(input.whatsapp), observacoes:clean(input.observacoes,1000),
      dataCadastro:input.id ? undefined : today(), atualizadoEm:isoNow()
    };
    upsert('Vendas',data); audit(input.id ? 'atualizar':'criar','venda',data.id,data.titulo);
    return { ok:true, id:data.id };
  });
}

// -------------------- DASHBOARD --------------------
function getDashboard() {
  var now = startOfDay(new Date());
  var config = configObject();
  var payments = objects('Pagamentos');
  var rentals = activeRentals().map(function(item) { return enrichRental(item,payments,config); });
  var reference = monthReference(now);
  var monthPayments = payments.filter(function(item) { return String(item.mesReferencia) === reference && String(item.status) === 'pago'; });
  var expected = rentals.reduce(function(sum,item) { return sum + number(item.valorPadrao); },0);
  var received = monthPayments.reduce(function(sum,item) { return sum + number(item.valor); },0);
  var actions = [];
  rentals.forEach(function(item) {
    if (item.statusMes === 'vencido' || item.statusMes === 'vencendo') actions.push({ tipo:item.statusMes, imovelId:item.id, imovelNome:item.nome, valor:item.valorPadrao, diaVencimento:item.diaVencimentoPadrao, diasRestantes:item.diasVencimento });
    if (item.diasRenovacao !== null && item.diasRenovacao <= Number(config.diasRenovacao || 60) && item.diasRenovacao > -365) actions.push({ tipo:'renovacao', imovelId:item.id, imovelNome:item.nome, diasRestantes:item.diasRenovacao, data:item.dataFim || nextMonthDate(item.mesReajuste,now) });
  });
  actions.sort(function(a,b) {
    var rank = { vencido:0, renovacao:1, vencendo:2 };
    return (rank[a.tipo]-rank[b.tipo]) || Number(a.diasRestantes)-Number(b.diasRestantes);
  });
  var sales = objects('Vendas').filter(function(item) { return ['vendido','pausado'].indexOf(String(item.status)) < 0; });
  var stale = sales.filter(function(item) { return item.atualizadoEm && daysBetween(parseDate(item.atualizadoEm),now) > 30; }).length;
  return {
    totalAtivos:rentals.length, pagosMes:unique(monthPayments.map(function(p){return p.imovelId;})).length,
    vencendo:rentals.filter(function(i){return i.statusMes==='vencendo';}).length, vencendoHoje:rentals.filter(function(i){return i.statusMes!=='pago' && i.diasVencimento===0;}).length,
    vencidos:rentals.filter(function(i){return i.statusMes==='vencido';}).length, renovacoesProximas:rentals.filter(function(i){return i.diasRenovacao!==null && i.diasRenovacao>=0 && i.diasRenovacao<=Number(config.diasRenovacao||60);}).length,
    receitaMes:received, receitaPrevista:expected, acoes:actions, fluxoMensal:monthlyFlow(rentals,payments,now), vendasAtivas:sales.length, vendasDesatualizadas:stale
  };
}

function monthlyFlow(rentals,payments,now) {
  var result=[];
  for (var offset=5; offset>=0; offset--) {
    var date = new Date(now.getFullYear(),now.getMonth()-offset,1);
    var reference = monthReference(date);
    result.push({ mes:['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][date.getMonth()], previsto:rentals.reduce(function(sum,item){return sum+number(item.valorPadrao);},0), recebido:payments.filter(function(p){return String(p.mesReferencia)===reference && String(p.status)==='pago';}).reduce(function(sum,p){return sum+number(p.valor);},0) });
  }
  return result;
}

// -------------------- CONFIGURAÇÃO --------------------
function seedDefaultConfig() {
  var defaults = { emailAlerta:'', diasAntecedencia:5, diasRenovacao:60, alertasAtivos:true };
  var existing = {};
  objects('Config').forEach(function(item) { existing[item.chave] = item.valor; });
  Object.keys(defaults).forEach(function(key) { if (existing[key] === undefined) upsert('Config',{ chave:key, valor:defaults[key] },'chave'); });
}

function configObject() {
  var result = { emailAlerta:'', diasAntecedencia:5, diasRenovacao:60, alertasAtivos:true };
  objects('Config').forEach(function(item) { result[item.chave] = item.valor; });
  return result;
}

function getConfig() { return { data:configObject() }; }

function saveConfig(input) {
  return withWriteLock(function() {
    var allowed = ['emailAlerta','diasAntecedencia','diasRenovacao','alertasAtivos'];
    allowed.forEach(function(key) { if (input[key] !== undefined) upsert('Config',{ chave:key, valor:safeCell(input[key]) },'chave'); });
    audit('atualizar','config','','alertas'); return { ok:true };
  });
}

// -------------------- ALERTA DIÁRIO CONSOLIDADO --------------------
function checkVencimentos() {
  ensureAllSheets(); seedDefaultConfig();
  var config = configObject();
  if (String(config.alertasAtivos) === 'false') return { ok:true, sent:false, reason:'disabled' };
  var email = String(config.emailAlerta || '').trim();
  if (!email) return { ok:true, sent:false, reason:'no-email' };
  var rentals = getImoveis().data;
  var events = [], logs = objects('AlertasLog');
  rentals.forEach(function(item) {
    if (item.statusMes === 'vencendo') addAlert(events,logs,'aluguel',item,item.diasVencimento,'due-' + monthReference(new Date()));
    if (item.statusMes === 'vencido' && [1,3,7,15,30].indexOf(Math.abs(Number(item.diasVencimento))) >= 0) addAlert(events,logs,'atraso',item,item.diasVencimento,'late-' + monthReference(new Date()) + '-' + Math.abs(item.diasVencimento));
    var renewalDaysValue = item.diasRenovacao === null ? null : Number(item.diasRenovacao);
    var renewalThreshold = alertThreshold(renewalDaysValue, [Number(config.diasRenovacao||60),30,15,7,1,0]);
    if (renewalThreshold !== null) addAlert(events,logs,'renovacao',item,renewalDaysValue,'renew-' + renewalThreshold + '-' + (item.dataFim || new Date().getFullYear()));
    if (renewalDaysValue !== null && renewalDaysValue < 0 && [1,7,30,60,90].indexOf(Math.abs(renewalDaysValue)) >= 0) addAlert(events,logs,'renovacao',item,renewalDaysValue,'renew-late-' + Math.abs(renewalDaysValue) + '-' + (item.dataFim || new Date().getFullYear()));
  });
  if (!events.length) return { ok:true, sent:false };
  MailApp.sendEmail({ to:email, subject:'Diego Imóveis — ' + events.length + (events.length===1?' item para revisar':' itens para revisar'), htmlBody:digestHtml(events), name:'Diego Imóveis' });
  withWriteLock(function() { events.forEach(function(event) { upsert('AlertasLog',{ id:uuid(), evento:event.key, tipo:event.type, referenciaId:event.item.id, dataEnvio:today(), destinatario:email }); }); });
  return { ok:true, sent:true, count:events.length };
}

function addAlert(events,logs,type,item,days,key) {
  if (!logs.some(function(log){return String(log.evento)===String(key + '-' + item.id);})) events.push({ type:type,item:item,days:days,key:key+'-'+item.id });
}

function alertThreshold(days, thresholds) {
  if (days === null || isNaN(days) || days < 0) return null;
  thresholds = unique(thresholds).sort(function(a,b){return a-b;});
  for (var i=0;i<thresholds.length;i++) if (days <= thresholds[i]) return thresholds[i];
  return null;
}

function digestHtml(events) {
  var rows = events.map(function(event) {
    var label = event.type === 'renovacao' ? 'Renovação' : event.type === 'atraso' ? 'Em atraso' : 'Vencimento';
    var detail = event.type === 'renovacao' ? (event.days===0?'hoje':'em '+event.days+' dias') : event.days<0 ? 'há '+Math.abs(event.days)+' dias' : event.days===0 ? 'hoje' : 'em '+event.days+' dias';
    return '<tr><td style="padding:12px;border-bottom:1px solid #e5e7eb"><strong>'+escapeHtml(event.item.nome)+'</strong><br><span style="color:#64748b;font-size:12px">'+label+' '+detail+'</span></td><td style="padding:12px;text-align:right;border-bottom:1px solid #e5e7eb">'+(event.type==='renovacao'?'—':brl(event.item.valorPadrao))+'</td></tr>';
  }).join('');
  return '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#17221d"><div style="background:#12372a;color:white;padding:24px;border-radius:14px 14px 0 0"><div style="font-size:12px;color:#b7ccc3">RESUMO AUTOMÁTICO</div><h1 style="font-size:22px;margin:7px 0 0">Sua fila de atenção</h1></div><div style="border:1px solid #dde4de;border-top:0;padding:20px;border-radius:0 0 14px 14px"><p style="color:#66746d;font-size:13px">Separei somente o que precisa ser visto hoje.</p><table style="width:100%;border-collapse:collapse;margin-top:12px">'+rows+'</table><p style="color:#94a3b8;font-size:11px;margin-top:18px">Enviado pelo sistema Diego Imóveis. Itens já avisados não são repetidos no mesmo estágio.</p></div></div>';
}

// -------------------- DATAS / VALIDAÇÃO --------------------
function renewalDays(item, now) {
  if (item.dataFim) return daysBetween(now,parseDate(item.dataFim));
  if (!item.mesReajuste) return null;
  return daysBetween(now,parseDate(nextMonthDate(item.mesReajuste,now)));
}

function nextMonthDate(month, now) {
  var date = new Date(now.getFullYear(),Number(month)-1,1);
  if (date < now) date = new Date(now.getFullYear()+1,Number(month)-1,1);
  return dateISO(date);
}

function dueDate(year,month,day) { return new Date(year,month-1,Math.min(day,new Date(year,month,0).getDate())); }
function startOfDay(date) { return new Date(date.getFullYear(),date.getMonth(),date.getDate()); }
function daysBetween(a,b) { return Math.round((startOfDay(b)-startOfDay(a))/86400000); }
function parseDate(value) { var match=String(value||'').slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/); return match ? new Date(Number(match[1]),Number(match[2])-1,Number(match[3])) : new Date(value); }
function dateISO(date) { return Utilities.formatDate(date,Session.getScriptTimeZone(),'yyyy-MM-dd'); }
function today() { return dateISO(new Date()); }
function isoNow() { return Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd'T'HH:mm:ss"); }
function monthReference(date) { return date.getFullYear() + '-' + pad(date.getMonth()+1); }
function pad(value) { return String(value).padStart(2,'0'); }
function uuid() { return Utilities.getUuid().replace(/-/g,'').slice(0,16); }
function number(value) { if (typeof value === 'number') return isFinite(value)?value:0; var text=String(value||'').replace(/R\$/gi,'').replace(/\s/g,''); if (text.indexOf(',')>=0) text=text.replace(/\./g,'').replace(',','.'); var parsed=Number(text); return isFinite(parsed)?parsed:0; }
function integer(value) { var parsed=parseInt(value,10); return isFinite(parsed)?parsed:0; }
function clean(value,max) { return String(value===undefined||value===null?'':value).trim().slice(0,max||500); }
function normalize(value) { return clean(value,300).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function validDate(value) { var text=clean(value,10); return /^\d{4}-\d{2}-\d{2}$/.test(text)?text:''; }
function safeUrl(value) { var text=clean(value,1000); return !text || /^https?:\/\//i.test(text) ? text : ''; }
function unique(values) { return values.filter(function(value,index,array){return array.indexOf(value)===index;}); }
function brl(value) { return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function escapeHtml(value) { return String(value||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
