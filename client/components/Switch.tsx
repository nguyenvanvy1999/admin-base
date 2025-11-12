import { Switch as MantineSwitch, rem, type SwitchProps } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { FC } from 'react';

export const Switch: FC<SwitchProps> = (props) => {
  const { checked, ...rest } = props;
  const thumbIcon = checked ? (
    <IconCheck
      style={{ width: rem(12), height: rem(12) }}
      color="var(--mantine-color-green-6)"
      stroke={3}
    />
  ) : (
    <IconX
      style={{ width: rem(12), height: rem(12) }}
      color="var(--mantine-color-red-6)"
      stroke={3}
    />
  );

  return <MantineSwitch {...rest} checked={checked} thumbIcon={thumbIcon} />;
};
