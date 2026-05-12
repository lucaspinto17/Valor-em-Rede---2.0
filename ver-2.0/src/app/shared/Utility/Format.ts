export const fmt = (val: number | null | undefined): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

export const fmtDate = (iso: string): string => {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00` : iso;
  return new Date(normalized).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const fmtDateShort = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const genId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

export const todayLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const parseValue = (str: string): number =>
  parseFloat(String(str).replace(/\./g, '').replace(',', '.'));

export const parseMasked = parseValue;

export const maskMoney = (str: string): string => {
  const only = str.replace(/\D/g, '');
  const num = (parseInt(only || '0', 10) / 100).toFixed(2);
  return num.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};