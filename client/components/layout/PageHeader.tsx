import useUserStore from '@client/store/user';
import {
  ActionIcon,
  Breadcrumbs,
  type BreadcrumbsProps,
  Divider,
  Flex,
  type PaperProps,
  rem,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useColorScheme } from '@mantine/hooks';
import { IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import Surface from './Surface';

export type PageHeaderProps = {
  title: string;
  description?: string;
  withActions?: boolean;
  breadcrumbItems?: React.ReactNode[];
  actionButton?: React.ReactNode;
  actionContent?: React.ReactNode;
  onRefresh?: () => void;
  order?: 1 | 2 | 3 | 4 | 5 | 6;
} & PaperProps;

export const PageHeader = (props: PageHeaderProps) => {
  const {
    withActions,
    breadcrumbItems,
    title,
    description,
    actionButton,
    actionContent,
    onRefresh,
    order = 3,
    ...others
  } = props;
  const { user } = useUserStore();
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const colorScheme = useColorScheme();

  const BREADCRUMBS_PROPS: Omit<BreadcrumbsProps, 'children'> = {
    style: {
      a: {
        padding: rem(8),
        borderRadius: theme.radius.sm,
        fontWeight: 500,
        color: colorScheme === 'dark' ? theme.white : theme.black,
        textDecoration: 'none',
        '&:hover': {
          transition: 'all ease 150ms',
          backgroundColor:
            colorScheme === 'dark'
              ? theme.colors.dark[5]
              : theme.colors.gray[2],
          textDecoration: 'none',
        },
      },
    },
  };

  const renderActions = () => {
    if (actionContent) {
      return actionContent;
    }

    if (actionButton) {
      return actionButton;
    }

    if (withActions && onRefresh) {
      return (
        <Flex align="center" gap="sm">
          <ActionIcon variant="subtle" onClick={onRefresh}>
            <IconRefresh size={16} />
          </ActionIcon>
        </Flex>
      );
    }

    return null;
  };

  // Simple mode: no Surface wrapper, no Divider, just title + description
  if (
    !withActions &&
    !breadcrumbItems &&
    !actionButton &&
    !actionContent &&
    !onRefresh
  ) {
    return (
      <Stack gap="xs">
        <Title order={order}>{title}</Title>
        {description && <Text c="dimmed">{description}</Text>}
      </Stack>
    );
  }

  // Full mode: with Surface wrapper
  return (
    <>
      <Surface p="md" {...others}>
        {withActions ? (
          <Flex
            justify="space-between"
            direction={{ base: 'column', sm: 'row' }}
            gap={{ base: 'sm', sm: 4 }}
          >
            <Stack gap={4}>
              <Title order={order}>{title}</Title>
              {description ? (
                <Text c="dimmed">{description}</Text>
              ) : (
                <Text>
                  {t('common.welcomeBack', { defaultValue: 'Welcome back' })},{' '}
                  {user?.name || user?.username}!
                </Text>
              )}
            </Stack>
            {renderActions()}
          </Flex>
        ) : (
          <Flex
            align="center"
            justify="space-between"
            direction={{ base: 'row', sm: 'row' }}
            gap={{ base: 'sm', sm: 4 }}
          >
            <Stack>
              <Title order={order}>{title}</Title>
              {description && <Text c="dimmed">{description}</Text>}
              {breadcrumbItems && breadcrumbItems.length > 0 && (
                <Breadcrumbs {...BREADCRUMBS_PROPS}>
                  {breadcrumbItems.map((item, index) => (
                    <div key={index}>{item}</div>
                  ))}
                </Breadcrumbs>
              )}
            </Stack>
            {renderActions()}
          </Flex>
        )}
      </Surface>
      <Divider />
    </>
  );
};
