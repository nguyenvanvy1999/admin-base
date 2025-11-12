import { type InputBaseProps, Select as MantineSelect } from '@mantine/core';
import { type ForwardedRef, forwardRef, type ReactNode } from 'react';

export interface SelectItem {
  label: ReactNode;
  value: string;
}

export interface SelectProps<T extends SelectItem = SelectItem>
  extends InputBaseProps {
  items: T[];
  value?: string;
  onChange?: (value: string | null) => void;
  optionRenderer?: (item: T) => ReactNode;
  onDropdownClose?: VoidFunction;
  onSearch?: (keyword: string) => void;
  clearable?: boolean;
  searchable?: boolean;
  placeholder?: string;
}

function SelectInner<T extends SelectItem>(
  props: SelectProps<T>,
  ref: ForwardedRef<HTMLInputElement>,
) {
  const { items, optionRenderer: _optionRenderer, ...rest } = props;
  return (
    <MantineSelect
      ref={ref}
      data={items.map((item) => ({
        value: item.value,
        label: String(item.label),
      }))}
      {...rest}
    />
  );
}

export const Select = forwardRef(SelectInner) as <T extends SelectItem>(
  props: SelectProps<T> & { ref?: ForwardedRef<HTMLInputElement> },
) => ReturnType<typeof SelectInner>;
