import {
  Button,
  Center,
  Container,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

const NotFoundPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Center component="section" h="100vh" px="md">
      <Container size="sm">
        <Paper radius="xl" shadow="lg" p="xl" withBorder>
          <Stack align="center" gap="lg" ta="center">
            <Title
              order={1}
              fz={{ base: 72, sm: 96 }}
              c="gray.5"
              fw={700}
              lh={1}
            >
              404
            </Title>
            <Stack align="center" gap="sm" maw={420}>
              <Title order={2} fz={{ base: 24, sm: 32 }}>
                {t('notFound.title')}
              </Title>
              <Text c="dimmed">{t('notFound.description')}</Text>
            </Stack>
            <Button onClick={handleGoHome} size="md" mt="md">
              {t('notFound.goHome')}
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Center>
  );
};

export default NotFoundPage;
