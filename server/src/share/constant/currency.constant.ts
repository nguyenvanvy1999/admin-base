export const DEFAULT_CURRENCIES: {
  id: string;
  code: string;
  name: string;
  symbol?: string;
}[] = [
  {
    id: 'currency_usd_default',
    code: 'USD',
    name: 'United States Dollar',
    symbol: '$',
  },
  {
    id: 'currency_eur_default',
    code: 'EUR',
    name: 'Euro',
  },
  {
    id: 'currency_vnd_default',
    code: 'VND',
    name: 'Vietnamese Dong',
  },
];

export const DEFAULT_BASE_CURRENCY_ID = 'currency_vnd_default';
