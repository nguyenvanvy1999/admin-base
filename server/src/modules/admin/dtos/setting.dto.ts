import { t } from 'elysia';
import { SettingDataType } from 'src/generated';

export const SettingResDto = t.Object({
  id: t.String(),
  key: t.String(),
  description: t.Nullable(t.String()),
  type: t.Enum(SettingDataType),
  value: t.String(),
  isSecret: t.Boolean(),
});

export const UpdateSettingDto = t.Object({
  value: t.String(),
  isSecret: t.Boolean(),
  description: t.Optional(t.Nullable(t.String())),
});
