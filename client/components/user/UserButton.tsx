import { ACCESS_TOKEN_KEY } from '@client/constants';
import useUserStore from '@client/store/user';
import {
  Avatar,
  Group,
  Menu,
  Text,
  UnstyledButton,
  type UnstyledButtonProps,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import {
  IconChevronDown,
  IconLogout,
  IconShield,
  IconUser,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

type UserButtonProps = {
  image?: string;
  name?: string;
  email?: string;
  showText?: boolean;
} & UnstyledButtonProps;

export const UserButton = ({
  image,
  name,
  email,
  showText = true,
  ...others
}: UserButtonProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const displayName = name || user?.name || user?.username || '';
  const displayEmail = email || '';
  const avatarSrc = image || '/public/logo.svg';

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    navigate('/login');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleSessionsClick = () => {
    navigate('/sessions');
  };

  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <UnstyledButton
          style={{
            padding: 'var(--mantine-spacing-md)',
            borderRadius: 'var(--mantine-radius-default)',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              colorScheme === 'dark'
                ? theme.colors.dark[6]
                : theme.colors.gray[0];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          {...others}
        >
          <Group>
            <Avatar src={avatarSrc} radius="xl" size="sm" />
            {showText && (
              <div style={{ flex: 1 }}>
                <Text size="sm" fw={500}>
                  {displayName}
                </Text>
                {displayEmail && (
                  <Text size="xs" c="dimmed">
                    {displayEmail}
                  </Text>
                )}
              </div>
            )}
            <IconChevronDown size="0.9rem" stroke={1.5} />
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Text size="sm" fw={500}>
            {displayName}
          </Text>
          {displayEmail && (
            <Text size="xs" c="dimmed">
              {displayEmail}
            </Text>
          )}
        </Menu.Label>
        <Menu.Divider />
        <Menu.Item
          leftSection={<IconUser size={14} />}
          onClick={handleProfileClick}
        >
          {t('header.profile')}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconShield size={14} />}
          onClick={handleSessionsClick}
        >
          {t('header.sessions')}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconLogout size={14} />}
          onClick={handleLogout}
        >
          {t('header.logout')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
