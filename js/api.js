const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycby4S2kc98PpiKueLvb1lcDzTFiPc2Bwqusgdrtcw51x0ENLZeZzFfSaICTaRPvTvBzt/exec';
const URL_KEY = 'diego_api_url_v2';
const TOKEN_KEY = 'diego_access_token_v2';
const CACHE_TTL = 25000;
const cache = new Map();

export const getApiUrl = () => localStorage.getItem(URL_KEY) || DEFAULT_API_URL;
export const setApiUrl = url => url ? localStorage.setItem(URL_KEY, url.trim()) : localStorage.removeItem(URL_KEY);
export const getAccessToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setAccessToken = token => token ? localStorage.setItem(TOKEN_KEY, token.trim()) : localStorage.removeItem(TOKEN_KEY);
export const clearCache = () => cache.clear();

async function request(action, { data, params = {}, method = 'GET', fresh = false } = {}) {
  const url = getApiUrl();
  if (!url) throw new Error('Conecte o sistema ao Google Apps Script nas Configurações.');
  const token = getAccessToken();
  const cacheKey = `${action}:${JSON.stringify(params)}`;
  const cached = cache.get(cacheKey);
  if (method === 'GET' && !fresh && cached && Date.now() - cached.at < CACHE_TTL) return cached.value;

  // Todas as chamadas via POST: o código de acesso não fica exposto na URL,
  // no histórico do navegador ou em logs de query string.
  const body = new URLSearchParams({ action, token, ...params, data: JSON.stringify(data || {}) });
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body, redirect: 'follow', cache: 'no-store' });
  if (!response.ok) throw new Error(`Falha de conexão (${response.status}).`);
  let json;
  try { json = await response.json(); } catch { throw new Error('O backend respondeu em formato inválido. Confira a implantação.'); }
  if (json.error) {
    const error = new Error(json.error);
    error.code = json.code;
    throw error;
  }
  if (method === 'GET') cache.set(cacheKey, { at: Date.now(), value: json });
  else clearCache();
  return json;
}

export const ping = () => request('ping', { fresh: true });
export const getDashboard = () => request('getDashboard');

export const getLocacoes = () => request('getImoveis');
export const getLocacao = id => request('getImovel', { params: { id } });
export const saveLocacao = data => request('saveImovel', { method: 'POST', data });
export const importLocacoes = items => request('importLocacoes', { method: 'POST', data: { items } });

export const getFinanceiro = year => request('getFinanceiro', { params: { year } });
export const savePagamento = data => request('savePagamento', { method: 'POST', data });
export const deletePagamento = id => request('deletePagamento', { method: 'POST', data: { id } });

export const getVendas = () => request('getVendas');
export const getVenda = id => request('getVenda', { params: { id } });
export const saveVenda = data => request('saveVenda', { method: 'POST', data });

export const getConfig = () => request('getConfig');
export const saveConfig = data => request('saveConfig', { method: 'POST', data });
export const runAlertCheck = () => request('runAlertCheck', { method: 'POST', data: {} });
export const setupSystem = () => request('setupSystem', { method: 'POST', data: {} });
