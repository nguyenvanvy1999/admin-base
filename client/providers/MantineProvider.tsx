import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import 'mantine-react-table-open/styles.css';
import i18n from '@client/i18n';
import { mantineTheme } from '@client/styles/mantine-theme';
import { MantineProvider as MantineProviderBase } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import 'dayjs/locale/vi';
import 'dayjs/locale/en';
import { useEffect, useState } from 'react';

const MantineProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocale] = useState<string>(() => {
    const lang = i18n.language || 'vi';
    return lang === 'en' ? 'en' : 'vi';
  });

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setLocale(lng === 'en' ? 'en' : 'vi');
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  return (
    <MantineProviderBase defaultColorScheme="light" theme={mantineTheme}>
      <DatesProvider settings={{ firstDayOfWeek: 0, locale }}>
        <Notifications position="top-right" zIndex={1000} />
        {children}
      </DatesProvider>
    </MantineProviderBase>
  );
};

export default MantineProvider;
