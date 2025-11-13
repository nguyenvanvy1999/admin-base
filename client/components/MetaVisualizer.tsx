import type { MetaMap } from '@client/utils/MetaMap';
import { Badge, Center, type CenterProps } from '@mantine/core';
import { useTranslation } from 'react-i18next';

interface Props<T extends string | number> extends CenterProps {
  map: MetaMap<T>;
  k: T;
  minimalist?: boolean;
}

export function MetaVisualizer<T extends string | number>({
  k,
  map,
  minimalist,
  ...props
}: Props<T>) {
  const { t } = useTranslation();
  const color = map.getColor(k);
  const title = map.getTitle(k, t);

  if (minimalist) {
    return <Center {...props}>{title}</Center>;
  }

  return (
    <Center {...props}>
      <Badge color={color} variant="light">
        {title}
      </Badge>
    </Center>
  );
}
