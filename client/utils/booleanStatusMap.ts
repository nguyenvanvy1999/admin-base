import { MetaMap } from './MetaMap';

export const booleanStatusMap = new MetaMap<'true' | 'false'>({
  true: {
    i18nKey: 'common.yes',
    color: 'var(--mantine-color-teal-6)',
  },
  false: {
    i18nKey: 'common.no',
    color: 'var(--mantine-color-red-6)',
  },
});
