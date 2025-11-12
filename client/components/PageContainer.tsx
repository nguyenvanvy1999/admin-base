import {
  Button,
  Group,
  SimpleGrid,
  Stack,
  type StackProps,
  Tabs,
  Text,
} from '@mantine/core';
import { IconRefresh, IconX } from '@tabler/icons-react';
import type { ParseKeys } from 'i18next';
import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props extends StackProps {
  filterGroup?: ReactNode;
  buttonGroups?: ReactNode;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  onReset?: VoidFunction;
  onAdvancedFilter?: VoidFunction;
  tabs?: {
    key: string;
    titleI18nKey: ParseKeys;
  }[];
  currentTabKey?: string;
  onCurrentTabChange?: (newCurrentTab: string) => void;
  stats?: {
    titleI18nKey: ParseKeys;
    value: number | string | ReactNode;
    color?: string;
  }[];
  autoRefreshEnabled?: boolean;
}

export const PageContainer: FC<Props> = ({
  filterGroup,
  buttonGroups,
  onRefresh,
  refreshing,
  onReset,
  onAdvancedFilter,
  tabs,
  currentTabKey,
  onCurrentTabChange,
  stats,
  autoRefreshEnabled,
  children,
  ...stackProps
}) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md" {...stackProps}>
      {(filterGroup ||
        buttonGroups ||
        onRefresh ||
        onReset ||
        onAdvancedFilter) && (
        <Group justify="space-between" align="flex-start" mt={0}>
          {filterGroup && <Group>{filterGroup}</Group>}
          <Group>
            {onReset && (
              <Button
                variant="light"
                size="sm"
                leftSection={<IconX size={16} />}
                onClick={onReset}
              >
                {t('common.reset', { defaultValue: 'Reset' })}
              </Button>
            )}
            {onAdvancedFilter && (
              <Button variant="light" size="sm" onClick={onAdvancedFilter}>
                {t('common.advancedFilter', {
                  defaultValue: 'Advanced Filter',
                })}
              </Button>
            )}
            {onRefresh && (
              <Button
                variant="light"
                size="sm"
                leftSection={<IconRefresh size={16} />}
                onClick={onRefresh}
                loading={refreshing}
              >
                {t('common.refresh', { defaultValue: 'Refresh' })}
              </Button>
            )}
            {buttonGroups}
          </Group>
        </Group>
      )}

      {tabs && tabs.length > 0 && (
        <Tabs
          value={currentTabKey}
          onChange={(value) => onCurrentTabChange?.(value || '')}
        >
          <Tabs.List>
            {tabs.map((tab) => (
              <Tabs.Tab key={tab.key} value={tab.key}>
                {t(tab.titleI18nKey)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      )}

      {stats && stats.length > 0 && (
        <SimpleGrid cols={stats.length} spacing="md">
          {stats.map((stat, index) => (
            <Stack
              key={index}
              gap="xs"
              p="md"
              style={{
                border: '1px solid var(--mantine-color-gray-3)',
                borderRadius: 'var(--mantine-radius-sm)',
              }}
            >
              <Text size="sm" c="dimmed">
                {t(stat.titleI18nKey)}
              </Text>
              <Text size="xl" fw={700} c={stat.color}>
                {typeof stat.value === 'number'
                  ? t('common.int', { value: stat.value })
                  : typeof stat.value === 'string'
                    ? stat.value
                    : stat.value}
              </Text>
            </Stack>
          ))}
        </SimpleGrid>
      )}

      {children}
    </Stack>
  );
};
