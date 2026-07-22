import * as api from './api.js';
import { dateLabel, escHtml, formatCurrency, formatDate, MONTHS, renderIcons, toast } from './utils.js';

export async function renderDashboard(container) {
  const data = await api.getDashboard();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const actions = data.acoes || data.proximosVencimentos || [];
  const urgent = actions.filter(item => ['vencido','vencendo','renovacao'].includes(item.tipo || item.status));
  const overdue = Number(data.vencidos || 0);
  const renewals = Number(data.renovacoesProximas || actions.filter(a => (a.tipo || a.status) === 'renovacao').length);
  const expected = Number(data.receitaPrevista || 0);
  const received = Number(data.receitaMes || 0);
  const percent = expected ? Math.min(100, Math.round(received / expected * 100)) : 0;

  container.innerHTML = `
    <section class="hero">
      <div class="hero-main">
        <span class="eyebrow"><i data-lucide="sparkles"></i>${greeting}, Diego</span>
        <h2>${urgent.length ? `Você tem ${urgent.length} ${urgent.length === 1 ? 'ponto que pede' : 'pontos que pedem'} atenção.` : 'Tudo sob controle por aqui.'}</h2>
        <p>${urgent.length ? 'Organizei vencimentos e renovações em uma fila única. Comece pelo que aparece primeiro.' : 'Os aluguéis estão em dia e não há renovações urgentes. Aproveite para revisar a carteira de vendas.'}</p>
        <div class="hero-actions"><a class="primary-button" href="#financeiro"><i data-lucide="calendar-check-2"></i>Abrir grade anual</a><a class="ghost-button" href="#locacoes"><i data-lucide="key-round"></i>Ver locações</a></div>
      </div>
      <div class="today-card">
        <div><span class="eyebrow">Hoje</span><div class="today-date">${String(now.getDate()).padStart(2,'0')} <small>${MONTHS[now.getMonth()]} · ${now.getFullYear()}</small></div></div>
        <div class="today-summary"><div class="mini-stat"><strong>${data.vencendoHoje || 0}</strong><span>vencem hoje</span></div><div class="mini-stat"><strong>${renewals}</strong><span>renovações próximas</span></div></div>
      </div>
    </section>

    <section class="kpi-grid">
      ${kpi('key-round', data.totalAtivos || 0, 'Locações ativas', 'brand')}
      ${kpi('circle-dollar-sign', formatCurrency(expected, true), 'Previsto no mês', 'success')}
      ${kpi('triangle-alert', overdue, 'Aluguéis em atraso', overdue ? 'danger' : 'success')}
      ${kpi('calendar-clock', renewals, 'Renovações em 60 dias', renewals ? 'warning' : 'success')}
    </section>

    <section class="content-grid">
      <div class="stack">
        <article class="card">
          <header class="card-header"><div><h2>Fila de atenção</h2><p>Vencimentos, atrasos e renovações em ordem de urgência.</p></div><a class="text-link" href="#locacoes">Ver todas <i data-lucide="arrow-right"></i></a></header>
          ${renderActions(urgent.slice(0, 7))}
        </article>
        <article class="card">
          <header class="card-header"><div><h2>Recebimentos dos últimos meses</h2><p>Previsto x confirmado.</p></div></header>
          ${renderChart(data.fluxoMensal || [])}
        </article>
      </div>
      <div class="stack">
        <article class="card">
          <header class="card-header"><div><h2>Resultado do mês</h2><p>${data.pagosMes || 0} de ${data.totalAtivos || 0} locações confirmadas</p></div></header>
          <div class="finance-summary"><div><span>Recebido</span><strong>${formatCurrency(received)}</strong></div><b>${percent}%</b></div>
          <div class="progress-line"><span style="width:${percent}%"></span></div>
          <div style="display:flex;justify-content:space-between;margin-top:9px;font-size:10px;color:var(--muted)"><span>Faltam ${formatCurrency(Math.max(0, expected - received))}</span><span>Previsto ${formatCurrency(expected)}</span></div>
        </article>
        <article class="card">
          <header class="card-header"><div><h2>Carteira de vendas</h2><p>Acompanhamento de divulgação.</p></div><a class="text-link" href="#vendas">Abrir <i data-lucide="arrow-right"></i></a></header>
          <div class="today-summary"><div class="mini-stat"><strong>${data.vendasAtivas || 0}</strong><span>imóveis ativos</span></div><div class="mini-stat"><strong>${data.vendasDesatualizadas || 0}</strong><span>sem revisão há 30 dias</span></div></div>
          ${data.vendasAtivas ? `<p style="margin-top:15px;color:var(--muted);font-size:11px;line-height:1.5">Mantenha preço, fotos e canais atualizados para não perder oportunidades.</p>` : `<div class="empty-state" style="padding:24px 8px 5px"><div class="empty-icon"><i data-lucide="home"></i></div><h3>Carteira pronta para começar</h3><p>Cadastre os produtos que hoje estão no Google.</p></div>`}
        </article>
      </div>
    </section>`;

  bindPayments(container);
  renderIcons(container);
}

function kpi(icon, value, label, tone) {
  const cls = tone === 'brand' ? '' : tone;
  return `<article class="kpi-card"><div class="kpi-top"><span class="kpi-icon ${cls}"><i data-lucide="${icon}"></i></span><span class="kpi-trend">Atualizado agora</span></div><div class="kpi-value">${value}</div><div class="kpi-label">${label}</div></article>`;
}

function renderActions(items) {
  if (!items.length) return `<div class="empty-state"><div class="empty-icon"><i data-lucide="circle-check-big"></i></div><h3>Nenhuma pendência urgente</h3><p>Quando algo precisar de ação, aparecerá aqui automaticamente.</p></div>`;
  return `<div class="action-list">${items.map(item => {
    const type = item.tipo || item.status;
    const isRenewal = type === 'renovacao';
    const isOverdue = type === 'vencido';
    const tone = isRenewal ? 'blue' : isOverdue ? 'danger' : 'warning';
    const icon = isRenewal ? 'calendar-sync' : isOverdue ? 'triangle-alert' : 'clock-3';
    const days = Number(item.diasRestantes ?? item.dias ?? 0);
    const title = escHtml(item.imovelNome || item.nome);
    const detail = isRenewal ? `Renovação ${dateLabel(days)}` : `${formatCurrency(item.valor)} · vencimento dia ${item.diaVencimento || '—'}`;
    return `<div class="action-item"><span class="action-icon ${tone}"><i data-lucide="${icon}"></i></span><div><div class="action-name">${title}</div><div class="action-detail">${detail}</div></div><div class="action-side"><strong>${isRenewal ? formatDate(item.data) : dateLabel(days)}</strong>${!isRenewal ? `<button class="secondary-button small-button" data-pay="${escHtml(item.imovelId)}" data-value="${Number(item.valor)||0}" data-day="${item.diaVencimento||10}">Confirmar pago</button>` : `<a class="text-link" href="#locacoes">Revisar</a>`}</div></div>`;
  }).join('')}</div>`;
}

function renderChart(flow) {
  const fallback = Array.from({ length: 6 }, (_, index) => ({ mes: MONTHS[(new Date().getMonth() - 5 + index + 12) % 12], previsto: 0, recebido: 0 }));
  const list = flow.length ? flow.slice(-6) : fallback;
  const max = Math.max(1, ...list.flatMap(item => [Number(item.previsto)||0, Number(item.recebido)||0]));
  return `<div class="bar-chart">${list.map(item => `<div class="bar-group"><div class="bars"><i class="bar" title="Previsto: ${formatCurrency(item.previsto)}" style="height:${Math.max(3, Number(item.previsto||0)/max*100)}%"></i><i class="bar received" title="Recebido: ${formatCurrency(item.recebido)}" style="height:${Math.max(3, Number(item.recebido||0)/max*100)}%"></i></div><span class="bar-label">${escHtml(item.mes)}</span></div>`).join('')}</div><div class="legend"><span><i></i>Previsto</span><span><i class="received"></i>Recebido</span></div>`;
}

function bindPayments(container) {
  container.querySelectorAll('[data-pay]').forEach(button => button.onclick = async () => {
    const now = new Date();
    button.disabled = true;
    try {
      await api.savePagamento({
        imovelId: button.dataset.pay,
        mesReferencia: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`,
        dataVencimento: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(button.dataset.day).padStart(2,'0')}`,
        dataPagamento: new Date().toLocaleDateString('sv-SE'), valor: Number(button.dataset.value), status: 'pago', observacoes: 'Confirmado pelo painel'
      });
      toast('Pagamento confirmado. A grade anual foi atualizada.', 'success');
      window.dispatchEvent(new CustomEvent('app:refresh'));
    } catch (error) { toast(error.message, 'error'); button.disabled = false; }
  });
}
