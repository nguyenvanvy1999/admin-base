import { ACCESS_TOKEN_KEY } from '@client/constants';
import useUserStore from '@client/store/user';
import { Avatar, Box, Button, Group, Image, Menu, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

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
          <ThemeToggle />
          <LanguageSwitcher />
          <UserMenu />
        </Group>
      </Group>
    </Box>
  );
};

export default Header;

const UserMenu = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, clearUser } = useUserStore();

  const initials = user.username
    ? user.username
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    clearUser();
    navigate('/login');
  };

  return (
    <Menu shadow="md" position="bottom-end" width={200}>
      <Menu.Target>
        <Button
          variant="subtle"
          color="gray"
          leftSection={<Avatar radius="xl">{initials}</Avatar>}
        >
          {user.username || t('header.account', { defaultValue: 'Account' })}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          {user.name ||
            user.username ||
            t('header.account', { defaultValue: 'Account' })}
        </Menu.Label>
        <Menu.Item onClick={() => navigate('/profile')}>
          {t('header.profile', { defaultValue: 'Profile' })}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" onClick={handleLogout}>
          {t('header.logout', { defaultValue: 'Log out' })}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
