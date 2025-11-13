import { Box, Group, Image, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import ExchangeRateStatus from './ExchangeRateStatus';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import { UserButton } from './user';

const Header = () => {
  const { t } = useTranslation();

  return (
    <Box
      h={64}
      px="md"
      style={{
        borderBottom: '1px solid var(--mantine-color-gray-3)',
        backgroundColor: 'var(--mantine-color-body)',
        boxShadow: 'var(--mantine-shadow-sm)',
      }}
    >
      <Group justify="space-between" h="100%">
        <Group>
          <Image
            src="/public/logo.svg"
            alt="Logo"
            h={40}
            w={40}
            radius="xl"
            style={{ border: '2px solid var(--mantine-color-gray-3)' }}
          />
          <Title order={4}>{t('header.appName')}</Title>
        </Group>

        <Group>
          <ExchangeRateStatus />
          <ThemeToggle />
          <LanguageSwitcher />
          <UserButton />
        </Group>
      </Group>
    </Box>
  );
};

export default Header;
