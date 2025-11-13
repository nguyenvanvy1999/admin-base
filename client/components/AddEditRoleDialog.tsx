import { usePermissionsQuery } from '@client/hooks/queries/usePermissionQueries';
import { useZodForm } from '@client/hooks/useZodForm';
import { userService } from '@client/services';
import {
  Modal,
  MultiSelect,
  Stack,
  Switch,
  Textarea,
  TextInput,
} from '@mantine/core';
import type { RoleResponse } from '@server/modules/admin/dtos/role.dto';
import { UpsertRoleDtoZod } from '@server/modules/admin/dtos/role.dto';
import type { UserResponse } from '@server/modules/admin/dtos/user.dto';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { DialogFooterButtons } from './DialogFooterButtons';
import { ZodFormController } from './ZodFormController';

const FROZEN_ROLE_IDS = ['role_user_default', 'role_admin_default'];

function isFrozenRole(roleId: string): boolean {
  return FROZEN_ROLE_IDS.includes(roleId);
}

const schema = UpsertRoleDtoZod.extend({
  title: UpsertRoleDtoZod.shape.title.min(3, 'roles.titleMinLength'),
});

type FormValue = z.infer<typeof schema>;

type AddEditRoleDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  role: RoleResponse | null;
  onSubmit: (data: FormValue) => void;
  isLoading?: boolean;
  resetTrigger?: number;
};

const AddEditRoleDialog = ({
  isOpen,
  onClose,
  role,
  onSubmit,
  isLoading = false,
  resetTrigger = 0,
}: AddEditRoleDialogProps) => {
  const { t } = useTranslation();
  const { data: permissionsData } = usePermissionsQuery();
  const { data: usersData } = useQuery({
    queryKey: ['admin-users-all'],
    queryFn: () => userService.listUsers({ page: 1, limit: 1000 }),
  });

  const isEditMode = !!role;
  const isFrozen = role ? isFrozenRole(role.id) : false;

  const defaultValues: FormValue = {
    title: '',
    description: null,
    enabled: true,
    permissionIds: [],
    playerIds: [],
  };

  const { control, handleSubmit, reset } = useZodForm({
    zod: schema,
    defaultValues,
  });

  useEffect(() => {
    if (role) {
      reset({
        id: role.id,
        title: role.title,
        description: role.description ?? null,
        enabled: role.enabled,
        permissionIds: role.permissionIds || [],
        playerIds: role.playerIds || [],
      });
    } else {
      reset(defaultValues);
    }
  }, [role, isOpen, reset, resetTrigger]);

  const permissionOptions = useMemo(() => {
    if (!permissionsData) return [];
    return permissionsData.map((perm) => ({
      value: perm.id,
      label: perm.title,
    }));
  }, [permissionsData]);

  const userOptions = useMemo(() => {
    if (!usersData?.users) return [];
    return usersData.users.map((user: UserResponse) => ({
      value: user.id,
      label: user.username + (user.name ? ` (${user.name})` : ''),
    }));
  }, [usersData]);

  const onSubmitForm = handleSubmit((data) => {
    onSubmit(data);
  });

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={isEditMode ? t('roles.editRole') : t('roles.addRole')}
      size="md"
    >
      <form onSubmit={onSubmitForm}>
        <Stack gap="md">
          <ZodFormController
            control={control}
            name="title"
            render={({ field, fieldState: { error } }) => (
              <TextInput
                label={t('roles.title')}
                placeholder={t('roles.titlePlaceholder')}
                required
                error={error}
                disabled={isFrozen}
                {...field}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="description"
            render={({ field, fieldState: { error } }) => (
              <Textarea
                label={t('roles.description')}
                placeholder={t('roles.descriptionPlaceholder')}
                error={error}
                disabled={isFrozen}
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="enabled"
            render={({ field }) => (
              <Switch
                label={t('roles.enabled')}
                checked={field.value}
                onChange={(e) => field.onChange(e.currentTarget.checked)}
                disabled={isFrozen}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="permissionIds"
            render={({ field, fieldState: { error } }) => (
              <MultiSelect
                label={t('roles.permissions')}
                placeholder={t('roles.permissionsPlaceholder')}
                required
                data={permissionOptions}
                value={field.value || []}
                onChange={(value) => field.onChange(value)}
                error={error}
                searchable
                disabled={isFrozen}
              />
            )}
          />

          <ZodFormController
            control={control}
            name="playerIds"
            render={({ field, fieldState: { error } }) => (
              <MultiSelect
                label={t('roles.players')}
                placeholder={t('roles.playersPlaceholder')}
                data={userOptions}
                value={field.value || []}
                onChange={(value) => field.onChange(value)}
                error={error}
                searchable
                disabled={isFrozen}
              />
            )}
          />

          <DialogFooterButtons
            isEditMode={isEditMode}
            isLoading={isLoading}
            onCancel={onClose}
            onSave={onSubmitForm}
            showSaveAndAdd={false}
          />
        </Stack>
      </form>
    </Modal>
  );
};

export default AddEditRoleDialog;
