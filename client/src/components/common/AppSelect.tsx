import type { SelectProps } from 'antd';
import { Select, Tag } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export type AppEnumKey = string | number;

export interface AppSelectProps<ValueType extends AppEnumKey = string>
  extends Omit<SelectProps<ValueType>, 'options'> {
  keys: ValueType[];
  i18nPrefix: string;
  colorMap?: Record<ValueType, string>;
  mode?: 'multiple' | 'tags' | undefined;
}

export function AppSelect<ValueType extends AppEnumKey = string>({
  keys,
  i18nPrefix,
  colorMap,
  mode,
  allowClear = true,
  showSearch = true,
  ...rest
}: AppSelectProps<ValueType>) {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      keys.map((key) => ({
        value: key,
        label: t(`${i18nPrefix}.${String(key)}` as any),
      })),
    [keys, i18nPrefix, t],
  );

  const showSearchConfig =
    typeof showSearch === 'boolean'
      ? showSearch
        ? { optionFilterProp: 'label' as const }
        : false
      : showSearch;

  return (
    <Select<ValueType>
      mode={mode}
      allowClear={allowClear}
      showSearch={showSearchConfig}
      options={options as SelectProps<ValueType>['options']}
      optionRender={(option) => {
        const value = option.value as ValueType;
        const label = option.label as string;
        const color = colorMap?.[value];

        if (!color) {
          return <span>{label}</span>;
        }

        return <Tag color={color}>{label}</Tag>;
      }}
      {...rest}
    />
  );
}

export interface AppEnumSelectProps<ValueType extends AppEnumKey = string>
  extends Omit<SelectProps<ValueType>, 'options' | 'mode'> {
  keys: ValueType[];
  i18nPrefix: string;
  colorMap?: Record<ValueType, string>;
}

export function AppEnumSelect<ValueType extends AppEnumKey = string>(
  props: AppEnumSelectProps<ValueType>,
) {
  return <AppSelect<ValueType> {...props} />;
}

export interface AppEnumMultiSelectProps<ValueType extends AppEnumKey = string>
  extends Omit<SelectProps<ValueType>, 'options'> {
  keys: ValueType[];
  i18nPrefix: string;
  colorMap?: Record<ValueType, string>;
}

export function AppEnumMultiSelect<ValueType extends AppEnumKey = string>(
  props: AppEnumMultiSelectProps<ValueType>,
) {
  return <AppSelect<ValueType> {...props} mode="multiple" />;
}
