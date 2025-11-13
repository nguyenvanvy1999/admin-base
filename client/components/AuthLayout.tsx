import { Center, Container, Image, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
  title: string;
  children: ReactNode;
  subtitle?: string;
}

export const AuthLayout = ({ title, children }: AuthLayoutProps) => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <Center
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, var(--mantine-color-blue-1) 0%, var(--mantine-color-blue-6) 100%)',
      }}
      p="xl"
    >
      <Container size="xs" w="100%">
        <Stack gap="xl">
          <Stack align="center" gap="md">
            <Image
              src="/public/logo.svg"
              alt="Logo"
              h={80}
              w={80}
              radius="xl"
              style={{
                border: '4px solid white',
                boxShadow: 'var(--mantine-shadow-lg)',
              }}
            />
            <Title order={1} ta="center">
              {title}
            </Title>
          </Stack>

          {children}

          <Text
            size="xs"
            c="dimmed"
            ta="center"
            pt="md"
            style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}
          >
            {t('common.copyright', { year: currentYear })}
          </Text>
        </Stack>
      </Container>
    </Center>
  );
};
