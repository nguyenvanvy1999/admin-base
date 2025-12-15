export function applyPermissionFilter<T extends { userId?: any }>(
  where: T,
  params: {
    currentUserId: string;
    hasViewPermission: boolean;
    userIds?: string[];
    userId?: string;
  },
): T {
  if (!params.hasViewPermission) {
    return { ...where, userId: params.currentUserId };
  }

  if (params.userIds?.length) {
    return { ...where, userId: { in: params.userIds } };
  }

  if (params.userId) {
    return { ...where, userId: params.userId };
  }

  return where;
}
