import { Alert, type AlertProps } from '@mantine/core';
import { IconBug } from '@tabler/icons-react';
import type { ReactNode } from 'react';

type ErrorAlertProps = { message: ReactNode } & AlertProps;

export const ErrorAlert = ({ message, ...others }: ErrorAlertProps) => {
  const icon = <IconBug size={18} />;
  const { title } = others;

  return (
    <Alert variant="light" color="red" title={title} icon={icon} {...others}>
      {message || ''}
    </Alert>
  );
};
