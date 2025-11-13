import { type PaperProps, SimpleGrid, Skeleton } from '@mantine/core';
import type { ReactNode } from 'react';
import { ErrorAlert } from '../feedback';
import { StatsCard } from './StatsCard';

type StatsGridProps = {
  data?: { title: string; value: string; diff: number; period?: string }[];
  paperProps?: PaperProps;
  error: ReactNode | Error | undefined | null;
  loading?: boolean;
};

export const StatsGrid = ({
  data,
  loading,
  error,
  paperProps,
}: StatsGridProps) => {
  const stats = data?.map((stat) => (
    <StatsCard key={stat.title} data={stat} {...paperProps} />
  ));

  return (
    <div>
      {error ? (
        <ErrorAlert title="Error loading stats" message={error.toString()} />
      ) : (
        <SimpleGrid
          cols={{ base: 1, sm: 2, lg: 4 }}
          spacing={{ base: 10, sm: 'xl' }}
          verticalSpacing={{ base: 'md', sm: 'xl' }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={`stats-loading-${i}`}
                  visible={true}
                  height={200}
                />
              ))
            : stats}
        </SimpleGrid>
      )}
    </div>
  );
};
