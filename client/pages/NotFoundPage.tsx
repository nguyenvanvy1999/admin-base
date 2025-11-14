import { Button, Center, Container, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

const NotFoundPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Center h="100vh" p="md">
      <Container size="sm">
        <Stack align="center" gap="xl">
          <Title order={1} size="9xl" c="gray.4" fw={700}>
            404
          </Title>
          <Stack align="center" gap="md">
            <Title order={2}>{t('notFound.title')}</Title>
            <Text c="dimmed" ta="center" maw="md">
              {t('notFound.description')}
            </Text>
          </Stack>
          <Button onClick={handleGoHome} size="md">
            {t('notFound.goHome')}
          </Button>
        </Stack>
      </Container>
    </Center>
  );
};

export default NotFoundPage;
