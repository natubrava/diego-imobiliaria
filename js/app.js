import { renderDashboard } from './dashboard.js';
import { renderLocacoes, openLocacaoModal } from './imoveis.js';
import { renderFinanceiro } from './pagamentos.js';
import { renderVendas, openVendaModal } from './vendas.js';
import { renderConfiguracoes } from './configuracoes.js';
import { clearCache, ping } from './api.js';
import { closeModal, escHtml, openModal, renderIcons } from './utils.js';

const routes = {
  dashboard: { title: 'Visão geral', eyebrow: 'Central de gestão', render: renderDashboard },
  locacoes: { title: 'Locações', eyebrow: 'Contratos e vencimentos', render: renderLocacoes },
  financeiro: { title: 'Grade anual', eyebrow: 'Pagamentos mês a mês', render: renderFinanceiro },
  vendas: { title: 'Imóveis à venda', eyebrow: 'Carteira e divulgação', render: renderVendas },
  configuracoes: { title: 'Configurações', eyebrow: 'Sistema e automações', render: renderConfiguracoes }
};

let currentRoute = '';
let navigationId = 0;

export async function navigate(hash = location.hash, force = false) {
  const name = String(hash || '#dashboard').replace(/^#/, '').split('?')[0];
  const key = routes[name] ? name : 'dashboard';
  if (!force && currentRoute === key) return;
  currentRoute = key;
  const route = routes[key];
  const id = ++navigationId;
  document.getElementById('pageTitle').textContent = route.title;
  document.getElementById('pageEyebrow').textContent = route.eyebrow;
  document.title = `${route.title} — Diego Imóveis`;
  document.querySelectorAll('[data-route]').forEach(el => el.classList.toggle('active', el.dataset.route === key));
  closeSidebar();
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div class="loading-state"><span class="loader"></span><p>Organizando seus dados…</p></div>';
  try {
    await route.render(container);
    if (id !== navigationId) return;
    renderIcons(container);
    container.focus({ preventScroll: true });
    scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    container.innerHTML = `<div class="card empty-state"><div class="empty-icon"><i data-lucide="wifi-off"></i></div><h3>Não foi possível abrir esta área</h3><p>${escHtml(error.message)}</p><a class="primary-button" href="#configuracoes" style="margin-top:14px">Ver conexão</a></div>`;
    renderIcons(container);
    setConnection(false);
  }
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

function setConnection(online) {
  const dot = document.getElementById('connectionDot');
  dot.classList.toggle('online', online);
  dot.classList.toggle('offline', !online);
  document.getElementById('connectionText').textContent = online ? 'Dados sincronizados' : 'Conexão necessária';
}

async function checkConnection() {
  try { await ping(); setConnection(true); } catch { setConnection(false); }
}

function openQuickAdd() {
  openModal({
    title: 'O que você quer cadastrar?', kicker: 'Cadastro rápido',
    body: `<div class="quick-choice">
      <button class="choice-card" id="chooseRental"><span class="choice-icon"><i data-lucide="key-round"></i></span><strong>Nova locação</strong><p>Cadastre só nome, valor, vencimento e renovação. Os outros dados podem esperar.</p></button>
      <button class="choice-card" id="chooseSale"><span class="choice-icon"><i data-lucide="badge-dollar-sign"></i></span><strong>Imóvel à venda</strong><p>Inclua rapidamente na carteira e acompanhe onde já foi divulgado.</p></button>
    </div>`, footer: ''
  });
  document.getElementById('chooseRental').onclick = () => { closeModal(); openLocacaoModal(); };
  document.getElementById('chooseSale').onclick = () => { closeModal(); openVendaModal(); };
}

window.addEventListener('hashchange', () => navigate());
window.addEventListener('app:refresh', () => navigate(location.hash, true));
window.addEventListener('app:connection', event => setConnection(event.detail));

document.addEventListener('DOMContentLoaded', () => {
  renderIcons();
  document.getElementById('menuBtn').onclick = () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('open');
  };
  document.getElementById('sidebarOverlay').onclick = closeSidebar;
  document.getElementById('modalClose').onclick = () => closeModal();
  document.getElementById('modalOverlay').onclick = event => { if (event.target.id === 'modalOverlay') closeModal(); };
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
  document.getElementById('quickAddBtn').onclick = openQuickAdd;
  document.getElementById('mobileAddBtn').onclick = openQuickAdd;
  document.getElementById('refreshBtn').onclick = async event => {
    event.currentTarget.querySelector('svg')?.classList.add('spin');
    clearCache(); await navigate(location.hash, true); await checkConnection();
  };
  navigate(location.hash || '#dashboard');
  checkConnection();
});
