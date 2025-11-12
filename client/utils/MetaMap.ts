import type { ParseKeys } from 'i18next';
import type { ReactNode } from 'react';
import type { SelectItem } from '../components/Select';

type Title = {
  title: ReactNode;
  description?: ReactNode;
};

export type TitleI18n = {
  i18nKey: ParseKeys;
  descriptionKey?: ParseKeys;
};

export type MetaDescription = {
  color?: string;
} & (Title | TitleI18n);

export class MetaMap<Key extends string | number> {
  private readonly map: Record<Key, MetaDescription>;
  private ds?: SelectItem[];

  constructor(map: Record<Key, MetaDescription>) {
    this.map = map;
  }

  getRawValue(key: Key): Record<Key, MetaDescription>[Key] {
    return this.map[key];
  }

  getColor(key: Key): string {
    const value = this.map[key];
    return value?.color || 'var(--mantine-color-gray-6)';
  }

  getTitle(key: Key, t?: (key: ParseKeys) => string): ReactNode {
    const value = this.map[key];
    if (!value) {
      return null;
    }
    if ('i18nKey' in value) {
      if (t) {
        return t(value.i18nKey);
      }
      return value.i18nKey;
    }
    return value.title;
  }

  toSelectDataSource(
    labelRenderer?: (item: SelectItem) => ReactNode,
    t?: (key: ParseKeys) => string,
  ): SelectItem[] {
    if (labelRenderer) {
      return Object.keys(this.map).map((key) => {
        const item: SelectItem = {
          value: String(key),
          label: this.getTitle(key as Key, t),
        };
        return {
          value: item.value,
          label: labelRenderer(item),
        };
      });
    }

    if (this.ds && !t) {
      return this.ds;
    }

    const items = Object.keys(this.map).map((key) => {
      return {
        value: String(key),
        label: this.getTitle(key as Key, t),
      };
    });

    if (!t) {
      this.ds = items;
    }

    return items;
  }
}
