import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-react-table-open/styles.css';
import { mantineTheme } from '@client/styles/mantine-theme';
import { MantineProvider as MantineProviderBase } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';

const MantineProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <MantineProviderBase defaultColorScheme="light" theme={mantineTheme}>
      <DatesProvider settings={{ firstDayOfWeek: 0 }}>
        <Notifications position="top-right" zIndex={1000} />
        {children}
      </DatesProvider>
    </MantineProviderBase>
  );
};

export default MantineProvider;
