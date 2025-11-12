import { zodResolver } from '@hookform/resolvers/zod';
import {
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
  useForm,
} from 'react-hook-form';
import type { DistributedOmit } from 'type-fest';
import type { z } from 'zod';

interface ZodFormInput<TSchema extends z.ZodType<any, any, any>>
  extends DistributedOmit<
    UseFormProps<TSchema['_output'] & FieldValues>,
    'resolver'
  > {
  zod: TSchema | (() => TSchema);
  modifySchema?: (schema: TSchema) => z.ZodType<any, any, any>;
}

export type UseZodFormReturn<T extends FieldValues> = Omit<
  UseFormReturn<T>,
  'register'
>;

export function useZodForm<TSchema extends z.ZodType<any, any, any>>({
  zod,
  modifySchema,
  ...configs
}: ZodFormInput<TSchema>): UseZodFormReturn<TSchema['_output'] & FieldValues> {
  const schema = typeof zod === 'function' ? zod() : zod;
  const finalSchema = modifySchema ? modifySchema(schema) : schema;

  const form = useForm<TSchema['_output'] & FieldValues>({
    ...configs,
    resolver: zodResolver(finalSchema),
  });

  return form;
}
