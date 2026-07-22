import * as api from './api.js';
import { closeModal, debounce, escHtml, formatCurrency, normalizeText, openModal, parseMoney, renderIcons, setButtonBusy, statusBadge, toast } from './utils.js';

let listings = [];

export async function renderVendas(container) {
  listings = (await api.getVendas()).data || [];
  container.innerHTML = `
    <header class="section-heading"><div><h2>Carteira de imóveis à venda</h2><p>Organize a captação e veja, de relance, onde cada imóvel já foi divulgado.</p></div><button class="primary-button" id="newListing"><i data-lucide="plus"></i><span>Novo imóvel</span></button></header>
    <div class="toolbar"><label class="search-field"><i data-lucide="search"></i><input id="listingSearch" placeholder="Buscar imóvel, bairro ou cidade"></label><select class="select" id="listingStatus"><option value="">Todos os estágios</option><option value="captado">Captado</option><option value="preparando">Preparando</option><option value="publicado">Publicado</option><option value="pausado">Pausado</option><option value="vendido">Vendido</option></select></div>
    <div class="callout" style="margin-bottom:14px"><i data-lucide="lightbulb"></i><div><strong>Rotina sugerida:</strong> cadastre o imóvel uma vez e marque os canais publicados. Registros sem atualização há 30 dias voltam para a sua fila de atenção.</div></div>
    <div class="listing-grid" id="listingGrid"></div>`;
  const update = debounce(() => renderGrid(container), 120);
  container.querySelector('#listingSearch').oninput = update;
  container.querySelector('#listingStatus').onchange = () => renderGrid(container);
  container.querySelector('#newListing').onclick = () => openVendaModal();
  renderGrid(container); renderIcons(container);
}

function renderGrid(container) {
  const query = normalizeText(container.querySelector('#listingSearch')?.value);
  const status = container.querySelector('#listingStatus')?.value;
  const filtered = listings.filter(item => (!query || normalizeText([item.titulo,item.bairro,item.cidade].join(' ')).includes(query)) && (!status || item.status === status));
  const grid = container.querySelector('#listingGrid');
  if (!filtered.length) {
    grid.innerHTML = `<div class="card empty-state" style="grid-column:1/-1"><div class="empty-icon"><i data-lucide="home"></i></div><h3>${listings.length?'Nenhum imóvel neste filtro':'Comece pela carteira que já está no Google'}</h3><p>${listings.length?'Tente outra busca ou estágio.':'Cadastre título, preço e link. Fotos e detalhes podem ser completados depois.'}</p><button class="primary-button" id="emptyNew" style="margin-top:14px">Cadastrar primeiro imóvel</button></div>`;
    grid.querySelector('#emptyNew').onclick = () => openVendaModal(); renderIcons(grid); return;
  }
  grid.innerHTML = filtered.map(item => `<article class="listing-card"><div class="listing-cover">${item.fotoUrl?`<img src="${escHtml(item.fotoUrl)}" alt="${escHtml(item.titulo)}" loading="lazy" onerror="this.remove()">`:'<i data-lucide="image"></i>'}<span class="listing-status">${statusBadge(item.status||'captado')}</span></div><div class="listing-body"><h3>${escHtml(item.titulo)}</h3><span class="listing-location"><i data-lucide="map-pin"></i>${escHtml([item.bairro,item.cidade].filter(Boolean).join(' · ') || 'Localização pendente')}</span><div class="listing-price">${formatCurrency(item.preco)}</div><div class="listing-meta">${item.quartos?`<span><i data-lucide="bed-double"></i>${item.quartos} quartos</span>`:''}${item.area?`<span><i data-lucide="maximize"></i>${item.area} m²</span>`:''}</div><div class="listing-footer"><div class="channels"><span class="channel ${truthy(item.google)?'active':''}" title="Perfil do Google"><i data-lucide="map"></i></span><span class="channel ${truthy(item.instagram)?'active':''}" title="Instagram"><i data-lucide="instagram"></i></span><span class="channel ${truthy(item.portais)?'active':''}" title="Portais"><i data-lucide="globe-2"></i></span><span class="channel ${truthy(item.whatsapp)?'active':''}" title="WhatsApp"><i data-lucide="message-circle"></i></span></div><button class="mini-icon" data-edit-listing="${item.id}" title="Editar"><i data-lucide="pencil"></i></button></div></div></article>`).join('');
  grid.querySelectorAll('[data-edit-listing]').forEach(button => button.onclick = () => openVendaModal(button.dataset.editListing));
  renderIcons(grid);
}

const truthy = value => value === true || String(value).toLowerCase() === 'true' || String(value) === '1' || String(value).toLowerCase() === 'sim';

export async function openVendaModal(id = '') {
  let item = listings.find(record => String(record.id) === String(id));
  if (id && !item) item = (await api.getVenda(id)).data;
  item ||= { status:'captado' };
  openModal({ title:id?'Editar imóvel à venda':'Novo imóvel à venda', kicker:id?'Carteira de vendas':'Captação rápida',
    body:`<div class="form-grid">
      <div class="field full"><label>Título do anúncio <em>*</em></label><input id="sTitle" value="${escHtml(item.titulo)}" placeholder="Ex.: Apartamento quadra do mar"></div>
      <div class="field"><label>Preço <em>*</em></label><input id="sPrice" inputmode="decimal" value="${item.preco||''}" placeholder="1.350.000,00"></div><div class="field"><label>Estágio</label><select id="sStatus">${[['captado','Captado'],['preparando','Preparando anúncio'],['publicado','Publicado'],['pausado','Pausado'],['vendido','Vendido']].map(([v,l])=>`<option value="${v}" ${item.status===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>Cidade</label><input id="sCity" value="${escHtml(item.cidade||'Balneário Camboriú')}"></div><div class="field"><label>Bairro</label><input id="sDistrict" value="${escHtml(item.bairro)}" placeholder="Centro"></div>
      <div class="field"><label>Quartos</label><input id="sRooms" type="number" min="0" value="${item.quartos||''}"></div><div class="field"><label>Área privativa (m²)</label><input id="sArea" inputmode="decimal" value="${item.area||''}"></div>
      <div class="field full"><label>URL da foto principal</label><input id="sPhoto" type="url" value="${escHtml(item.fotoUrl)}" placeholder="https://..."></div><div class="field full"><label>Link do anúncio / Google</label><input id="sLink" type="url" value="${escHtml(item.link)}" placeholder="https://..."></div>
      <div class="form-section"><h3>Onde já foi divulgado?</h3></div>
      <div class="field full" style="display:flex;flex-direction:row;gap:18px;flex-wrap:wrap">${[['Google','google'],['Instagram','instagram'],['Portais','portais'],['WhatsApp','whatsapp']].map(([label,key])=>`<label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="s${key}" ${truthy(item[key])?'checked':''}>${label}</label>`).join('')}</div>
      <div class="field full"><label>Observações</label><textarea id="sNotes" placeholder="Proprietário, diferenciais, pendências de fotos…">${escHtml(item.observacoes)}</textarea></div>
    </div>`,
    footer:`<button class="ghost-button" id="cancelSale">Cancelar</button><button class="primary-button" id="saveSale"><i data-lucide="save"></i>${id?'Salvar':'Adicionar à carteira'}</button>` });
  document.getElementById('cancelSale').onclick = () => closeModal();
  document.getElementById('saveSale').onclick = async event => {
    const button = event.currentTarget;
    const titulo = document.getElementById('sTitle').value.trim(); const preco = parseMoney(document.getElementById('sPrice').value);
    if (!titulo || !preco) return toast('Informe pelo menos título e preço.', 'error');
    setButtonBusy(button,true);
    try { await api.saveVenda({ id, titulo, preco, status:document.getElementById('sStatus').value, cidade:document.getElementById('sCity').value.trim(), bairro:document.getElementById('sDistrict').value.trim(), quartos:document.getElementById('sRooms').value, area:document.getElementById('sArea').value, fotoUrl:document.getElementById('sPhoto').value.trim(), link:document.getElementById('sLink').value.trim(), google:document.getElementById('sgoogle').checked, instagram:document.getElementById('sinstagram').checked, portais:document.getElementById('sportais').checked, whatsapp:document.getElementById('swhatsapp').checked, observacoes:document.getElementById('sNotes').value.trim() }); closeModal(); toast(id?'Imóvel atualizado.':'Imóvel adicionado à carteira.','success'); window.location.hash='#vendas'; window.dispatchEvent(new CustomEvent('app:refresh')); }
    catch(error){ toast(error.message,'error'); setButtonBusy(button,false); }
  };
}
