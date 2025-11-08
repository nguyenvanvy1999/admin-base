import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { MantineProvider as MantineProviderBase } from '@mantine/core';

const MantineProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <MantineProviderBase
      defaultColorScheme="light"
      theme={{
        primaryColor: 'indigo',
        defaultRadius: 'md',
      }}
    >
      {children}
    </MantineProviderBase>
  );
};

export default MantineProvider;
