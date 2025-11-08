import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { MantineProvider as MantineProviderBase } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';

const MantineProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <MantineProviderBase
      defaultColorScheme="light"
      theme={{
        primaryColor: 'indigo',
        defaultRadius: 'md',
      }}
    >
      <DatesProvider settings={{ firstDayOfWeek: 0 }}>{children}</DatesProvider>
    </MantineProviderBase>
  );
};

export default MantineProvider;
