export const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
export const MONTHS_LONG = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

export function formatCurrency(value, compact = false) {
  const number = Number(String(value ?? 0).replace(',', '.')) || 0;
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: compact ? 'compact' : 'standard', maximumFractionDigits: compact ? 1 : 2 });
}

export function parseMoney(value) {
  if (typeof value === 'number') return value;
  const raw = String(value || '').replace(/R\$/gi, '').replace(/\s/g, '');
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  return Number(normalized) || 0;
}

export function localISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDate(value, options = {}) {
  if (!value) return '—';
  const parts = String(value).slice(0, 10).split('-').map(Number);
  const date = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2], 12) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', options);
}

export function formatMonthRef(value) {
  const [year, month] = String(value || '').split('-').map(Number);
  if (!year || !month) return value || '—';
  return `${MONTHS[month - 1]}/${String(year).slice(-2)}`;
}

export function daysFromToday(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export function dateLabel(days, futureVerb = 'em') {
  const n = Number(days);
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  return n > 0 ? `${futureVerb} ${n} dias` : `há ${Math.abs(n)} dias`;
}

export function escHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
}

export function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function initials(value) {
  const words = String(value || '?').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?';
}

export function debounce(fn, delay = 250) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

export function statusBadge(status, customLabel) {
  const map = {
    pago:['badge-success','Pago'], em_dia:['badge-success','Em dia'], ativo:['badge-success','Ativa'], publicado:['badge-success','Publicado'], vendido:['badge-success','Vendido'],
    vencendo:['badge-warning','Vence em breve'], renovacao:['badge-warning','Renovação próxima'], preparando:['badge-warning','Preparando'],
    vencido:['badge-danger','Em atraso'], pendente:['badge-neutral','Pendente'], captado:['badge-blue','Captado'], pausado:['badge-neutral','Pausado'], inativo:['badge-neutral','Inativa']
  };
  const [css, label] = map[status] || ['badge-neutral', status || '—'];
  return `<span class="badge ${css}">${escHtml(customLabel || label)}</span>`;
}

export function emptyState(icon, title, text, action = '') {
  return `<div class="empty-state"><div class="empty-icon"><i data-lucide="${icon}"></i></div><h3>${escHtml(title)}</h3><p>${escHtml(text)}</p>${action}</div>`;
}

export function toast(message, type = 'info', duration = 3600) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  const icon = type === 'success' ? 'check-circle-2' : type === 'error' ? 'circle-alert' : 'info';
  el.className = `toast ${type}`;
  el.innerHTML = `<i data-lucide="${icon}"></i><span>${escHtml(message)}</span>`;
  container.appendChild(el);
  window.lucide?.createIcons({ nodes: [el] });
  const remove = () => { el.classList.add('hiding'); setTimeout(() => el.remove(), 220); };
  el.addEventListener('click', remove);
  setTimeout(remove, duration);
}

let resolver = null;
export function openModal({ title, kicker = 'Cadastro', body = '', footer = '', wide = false }) {
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalKicker').textContent = kicker;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalFooter').innerHTML = footer;
  document.getElementById('modal').style.maxWidth = wide ? '940px' : '';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  wireLabels(document.getElementById('modal'));
  window.lucide?.createIcons({ nodes: [document.getElementById('modal')] });
  setTimeout(() => overlay.querySelector('input,select,textarea,button')?.focus(), 30);
  return new Promise(resolve => { resolver = resolve; });
}

export function closeModal(value) {
  document.getElementById('modalOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
  if (resolver) { resolver(value); resolver = null; }
}

export function confirmDialog(message, confirmLabel = 'Confirmar') {
  openModal({
    title: 'Confirmar ação', kicker: 'Atenção',
    body: `<p style="font-size:13px;color:var(--muted);line-height:1.6">${escHtml(message)}</p>`,
    footer: `<button class="ghost-button" data-modal-cancel>Cancelar</button><button class="primary-button" data-modal-confirm>${escHtml(confirmLabel)}</button>`
  });
  return new Promise(resolve => {
    document.querySelector('[data-modal-cancel]').onclick = () => { closeModal(); resolve(false); };
    document.querySelector('[data-modal-confirm]').onclick = () => { closeModal(); resolve(true); };
  });
}

export function setButtonBusy(button, busy, label = 'Salvando…') {
  if (!button) return;
  if (busy) { button.dataset.original = button.innerHTML; button.disabled = true; button.innerHTML = `<span class="loader" style="width:16px;height:16px;border-width:2px"></span>${label}`; }
  else { button.disabled = false; if (button.dataset.original) button.innerHTML = button.dataset.original; }
}

function wireLabels(root) {
  root?.querySelectorAll?.('.field').forEach((field, index) => {
    const label = field.querySelector(':scope > label');
    const control = field.querySelector('input,select,textarea');
    if (!label || !control) return;
    if (!control.id) control.id = `field-${Date.now()}-${index}`;
    label.htmlFor = control.id;
  });
}

export function renderIcons(root = document) {
  wireLabels(root);
  window.lucide?.createIcons({ nodes: [root] });
}
