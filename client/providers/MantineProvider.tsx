import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import useThemeStore from '@client/store/theme';
import { MantineProvider as MantineProviderBase } from '@mantine/core';
import { useMemo } from 'react';

const MantineProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useThemeStore();

  const mantineTheme = useMemo(
    () => ({
      colorScheme: theme,
      primaryColor: 'indigo',
      defaultRadius: 'md',
    }),
    [theme],
  );

  return (
    <MantineProviderBase theme={mantineTheme}>{children}</MantineProviderBase>
  );
};

export default MantineProvider;
