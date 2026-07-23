import * as api from './api.js?v=20260723-1';
import { closeModal, debounce, escHtml, formatCurrency, formatDate, initials, MONTHS_LONG, normalizeText, openModal, parseMoney, renderIcons, setButtonBusy, statusBadge, toast } from './utils.js?v=20260723-1';

let records = [];
let activeFilter = 'todos';

export async function renderLocacoes(container) {
  records = (await api.getLocacoes()).data || [];
  container.innerHTML = `
    <header class="section-heading"><div><h2>${records.length} locações cadastradas</h2><p>O básico basta. Complete os demais dados somente quando forem úteis.</p></div><div style="display:flex;gap:8px"><button class="ghost-button" id="importRentals"><i data-lucide="clipboard-paste"></i><span>Colar planilha</span></button><button class="primary-button" id="newRental"><i data-lucide="plus"></i><span>Nova locação</span></button></div></header>
    <div class="toolbar"><label class="search-field"><i data-lucide="search"></i><input id="rentalSearch" placeholder="Buscar imóvel, locatário ou endereço"></label><select class="select" id="rentalSort"><option value="urgencia">Ordenar: urgência</option><option value="nome">Nome A–Z</option><option value="valor">Maior valor</option><option value="renovacao">Próxima renovação</option></select></div>
    <div class="filter-chips" id="rentalFilters"><button class="filter-chip active" data-filter="todos">Todas</button><button class="filter-chip" data-filter="vencido">Em atraso</button><button class="filter-chip" data-filter="vencendo">Vencendo</button><button class="filter-chip" data-filter="renovacao">Renovação próxima</button><button class="filter-chip" data-filter="pago">Pagas no mês</button></div>
    <div id="rentalResults" style="margin-top:14px"></div>`;

  const update = debounce(() => renderList(container), 120);
  container.querySelector('#rentalSearch').oninput = update;
  container.querySelector('#rentalSort').onchange = () => renderList(container);
  container.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => {
    activeFilter = button.dataset.filter;
    container.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
    renderList(container);
  });
  container.querySelector('#newRental').onclick = () => openLocacaoModal();
  container.querySelector('#importRentals').onclick = openImportModal;
  renderList(container);
  renderIcons(container);
}

function filtered(container) {
  const query = normalizeText(container.querySelector('#rentalSearch')?.value);
  let list = records.filter(item => !query || normalizeText([item.nome,item.locatario,item.endereco].join(' ')).includes(query));
  if (activeFilter !== 'todos') list = list.filter(item => activeFilter === 'renovacao' ? item.diasRenovacao !== null && item.diasRenovacao !== '' && Number(item.diasRenovacao) > -365 && Number(item.diasRenovacao) <= 60 : item.statusMes === activeFilter);
  const sort = container.querySelector('#rentalSort')?.value;
  return [...list].sort((a,b) => {
    if (sort === 'nome') return String(a.nome).localeCompare(String(b.nome), 'pt-BR');
    if (sort === 'valor') return Number(b.valorPadrao) - Number(a.valorPadrao);
    if (sort === 'renovacao') return (Number(a.diasRenovacao)||9999) - (Number(b.diasRenovacao)||9999);
    const rank = { vencido:0, vencendo:1, pendente:2, pago:3 };
    return (rank[a.statusMes] ?? 4) - (rank[b.statusMes] ?? 4) || Number(a.diasVencimento||999) - Number(b.diasVencimento||999);
  });
}

function renderList(container) {
  const list = filtered(container);
  const target = container.querySelector('#rentalResults');
  if (!list.length) {
    target.innerHTML = `<div class="card empty-state"><div class="empty-icon"><i data-lucide="search-x"></i></div><h3>Nenhuma locação encontrada</h3><p>Ajuste os filtros ou faça um cadastro rápido.</p></div>`;
    renderIcons(target); return;
  }
  const rows = list.map(item => `<tr>
    <td><div class="property-cell"><span class="property-avatar">${initials(item.nome)}</span><div><strong>${escHtml(item.nome)}</strong><small>${escHtml(item.locatario || item.endereco || 'Dados complementares opcionais')}</small></div></div></td>
    <td>${formatCurrency(item.valorPadrao)}</td><td>Dia ${item.diaVencimentoPadrao || '—'}</td><td>${renewalLabel(item)}</td><td>${statusBadge(item.statusMes || 'pendente')}</td>
    <td><div class="row-actions">${item.statusMes !== 'pago' ? `<button class="mini-icon" title="Confirmar pagamento" data-pay="${item.id}"><i data-lucide="circle-check-big"></i></button>` : ''}<button class="mini-icon" title="Editar" data-edit="${item.id}"><i data-lucide="pencil"></i></button></div></td>
  </tr>`).join('');
  const cards = list.map(item => `<article class="rental-card"><div class="rental-card-top"><div><h3>${escHtml(item.nome)}</h3><p>${escHtml(item.locatario || 'Locatário não informado')}</p></div>${statusBadge(item.statusMes || 'pendente')}</div><div class="rental-card-grid"><div><span>Aluguel</span><strong>${formatCurrency(item.valorPadrao,true)}</strong></div><div><span>Vencimento</span><strong>Dia ${item.diaVencimentoPadrao||'—'}</strong></div><div><span>Renovação</span><strong>${item.dataFim ? formatDate(item.dataFim,{day:'2-digit',month:'short'}) : item.mesReajuste ? MONTHS_LONG[Number(item.mesReajuste)-1] : '—'}</strong></div></div><div class="rental-card-actions">${item.statusMes !== 'pago' ? `<button class="secondary-button small-button" data-pay="${item.id}"><i data-lucide="check"></i>Confirmar pago</button>` : ''}<button class="ghost-button small-button" data-edit="${item.id}"><i data-lucide="pencil"></i>Editar</button></div></article>`).join('');
  target.innerHTML = `<div class="table-card desktop-table"><div class="table-scroll"><table class="data-table"><thead><tr><th>Imóvel / locatário</th><th>Aluguel</th><th>Vencimento</th><th>Renovação</th><th>Situação</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div><div class="rental-cards">${cards}</div>`;
  target.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => openLocacaoModal(button.dataset.edit));
  target.querySelectorAll('[data-pay]').forEach(button => button.onclick = () => confirmPayment(button.dataset.pay));
  renderIcons(target);
}

function renewalLabel(item) {
  if (item.dataFim) return `<strong>${formatDate(item.dataFim)}</strong>${Number(item.diasRenovacao) <= 60 ? '<br><small style="color:var(--warning)">revisar em breve</small>' : ''}`;
  if (item.mesReajuste) return `<span>${MONTHS_LONG[Number(item.mesReajuste)-1] || item.mesReajuste}</span>`;
  return '<span style="color:var(--soft)">Não informada</span>';
}

async function confirmPayment(id) {
  const item = records.find(record => String(record.id) === String(id));
  if (!item) return;
  const now = new Date();
  const day = Math.min(Number(item.diaVencimentoPadrao)||10, new Date(now.getFullYear(), now.getMonth()+1, 0).getDate());
  try {
    await api.savePagamento({ imovelId:id, mesReferencia:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`, dataVencimento:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`, dataPagamento:new Date().toLocaleDateString('sv-SE'), valor:item.valorPadrao, status:'pago', observacoes:'Confirmação rápida' });
    toast(`${item.nome}: pagamento confirmado.`, 'success');
    api.clearCache();
    window.dispatchEvent(new CustomEvent('app:refresh'));
  } catch (error) { toast(error.message, 'error'); }
}

export async function openLocacaoModal(id = '') {
  let item = records.find(record => String(record.id) === String(id));
  if (id && !item) item = (await api.getLocacao(id)).data;
  item ||= { status:'ativo', indiceReajuste:'IGP-M' };
  openModal({
    title: id ? 'Editar locação' : 'Nova locação', kicker: id ? 'Dados do contrato' : 'Cadastro rápido',
    body: `<div class="form-grid">
      <div class="field full"><label>Imóvel / identificação <em>*</em></label><input id="fNome" value="${escHtml(item.nome)}" placeholder="Ex.: Villa Toscana 701"><small class="field-hint">Use o mesmo nome que você já reconhece na planilha.</small></div>
      <div class="field"><label>Valor mensal <em>*</em></label><input id="fValor" inputmode="decimal" value="${item.valorPadrao || ''}" placeholder="Ex.: 5.200,00"></div>
      <div class="field"><label>Dia do vencimento <em>*</em></label><input id="fDia" type="number" min="1" max="31" value="${item.diaVencimentoPadrao || ''}" placeholder="Ex.: 10"></div>
      <div class="field"><label>Mês do reajuste anual</label><select id="fMes"><option value="">Não informado</option>${MONTHS_LONG.map((month,index)=>`<option value="${index+1}" ${Number(item.mesReajuste)===index+1?'selected':''}>${month[0].toUpperCase()+month.slice(1)}</option>`).join('')}</select></div>
      <div class="field"><label>Fim / renovação do contrato</label><input id="fFim" type="date" value="${String(item.dataFim||'').slice(0,10)}"></div>
      <div class="form-section"><h3>Complementos opcionais</h3></div>
      <div class="field"><label>Locatário</label><input id="fLocatario" value="${escHtml(item.locatario)}" placeholder="Nome do inquilino"></div>
      <div class="field"><label>Telefone / WhatsApp</label><input id="fTelefone" inputmode="tel" value="${escHtml(item.telefone)}" placeholder="(47) 99999-9999"></div>
      <div class="field"><label>Início do contrato</label><input id="fInicio" type="date" value="${String(item.dataInicio||'').slice(0,10)}"></div>
      <div class="field"><label>Índice de reajuste</label><select id="fIndice"><option ${item.indiceReajuste==='IGP-M'?'selected':''}>IGP-M</option><option ${item.indiceReajuste==='IPCA'?'selected':''}>IPCA</option><option ${item.indiceReajuste==='Outro'?'selected':''}>Outro</option></select></div>
      <div class="field full"><label>Endereço</label><input id="fEndereco" value="${escHtml(item.endereco)}" placeholder="Pode ser completado depois"></div>
      <div class="field full"><label>Observações</label><textarea id="fObs" placeholder="Garantia, combinação especial, contato do proprietário…">${escHtml(item.observacoes)}</textarea></div>
      ${id ? `<div class="field"><label>Situação</label><select id="fStatus"><option value="ativo" ${item.status!=='inativo'?'selected':''}>Ativa</option><option value="inativo" ${item.status==='inativo'?'selected':''}>Encerrada / inativa</option></select></div>` : ''}
    </div>`,
    footer: `<button class="ghost-button" id="cancelRental">Cancelar</button><button class="primary-button" id="saveRental"><i data-lucide="save"></i>${id?'Salvar alterações':'Cadastrar locação'}</button>`
  });
  document.getElementById('cancelRental').onclick = () => closeModal();
  document.getElementById('saveRental').onclick = async event => {
    const button = event.currentTarget;
    const nome = document.getElementById('fNome').value.trim();
    const valorPadrao = parseMoney(document.getElementById('fValor').value);
    const dia = Number(document.getElementById('fDia').value);
    if (!nome || !valorPadrao || !dia) return toast('Informe imóvel, valor mensal e dia do vencimento.', 'error');
    const payload = { id, nome, valorPadrao, diaVencimentoPadrao:dia, mesReajuste:document.getElementById('fMes').value, dataFim:document.getElementById('fFim').value, locatario:document.getElementById('fLocatario').value.trim(), telefone:document.getElementById('fTelefone').value.trim(), dataInicio:document.getElementById('fInicio').value, indiceReajuste:document.getElementById('fIndice').value, endereco:document.getElementById('fEndereco').value.trim(), observacoes:document.getElementById('fObs').value.trim(), status:document.getElementById('fStatus')?.value || 'ativo' };
    setButtonBusy(button, true);
    try { await api.saveLocacao(payload); closeModal(); toast(id ? 'Locação atualizada.' : 'Locação cadastrada.', 'success'); window.location.hash = '#locacoes'; window.dispatchEvent(new CustomEvent('app:refresh')); }
    catch (error) { toast(error.message, 'error'); setButtonBusy(button, false); }
  };
}

function parseImported(text) {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const cells = line.split(/\t|;|\|/).map(cell => cell.trim());
    if (cells.length < 3) return null;
    const [nome, mesReajuste, diaVencimentoPadrao, valorPadrao] = cells;
    if (/im[oó]vel/i.test(nome) || !nome) return null;
    return { nome, mesReajuste:Number(mesReajuste)||'', diaVencimentoPadrao:Number(diaVencimentoPadrao)||'', valorPadrao:parseMoney(valorPadrao), status:'ativo' };
  }).filter(item => item && item.valorPadrao);
}

function openImportModal() {
  openModal({ title:'Colar dados da planilha', kicker:'Importação inteligente', wide:true,
    body:`<div class="callout"><i data-lucide="sparkles"></i><div><strong>Sem preencher um por um.</strong><br>Copie as colunas IMÓVEL, MÊS, DIA e VALOR do Google Sheets ou Excel e cole abaixo. Registros com o mesmo nome serão atualizados, sem duplicar.</div></div><div class="field" style="margin-top:15px"><label>Dados copiados</label><textarea id="importText" style="min-height:170px" placeholder="VILLA TOSCANA 701    8    1    R$ 5.200,00"></textarea></div><div id="importPreview"></div>`,
    footer:`<button class="ghost-button" id="cancelImport">Cancelar</button><button class="primary-button" id="confirmImport" disabled><i data-lucide="upload"></i>Importar registros</button>` });
  const text = document.getElementById('importText');
  const button = document.getElementById('confirmImport');
  let parsed = [];
  text.oninput = debounce(() => {
    parsed = parseImported(text.value); button.disabled = !parsed.length;
    document.getElementById('importPreview').innerHTML = parsed.length ? `<div class="import-preview"><table class="data-table"><thead><tr><th>Imóvel</th><th>Mês</th><th>Dia</th><th>Valor</th></tr></thead><tbody>${parsed.map(i=>`<tr><td>${escHtml(i.nome)}</td><td>${i.mesReajuste||'—'}</td><td>${i.diaVencimentoPadrao||'—'}</td><td>${formatCurrency(i.valorPadrao)}</td></tr>`).join('')}</tbody></table></div><p class="field-hint" style="margin-top:8px">${parsed.length} registros prontos para importar.</p>` : '';
  }, 180);
  document.getElementById('cancelImport').onclick = () => closeModal();
  button.onclick = async () => { setButtonBusy(button,true,'Importando…'); try { const result = await api.importLocacoes(parsed); closeModal(); toast(`${result.created||0} criadas e ${result.updated||0} atualizadas.`, 'success'); window.dispatchEvent(new CustomEvent('app:refresh')); } catch(error) { toast(error.message,'error'); setButtonBusy(button,false); } };
}
