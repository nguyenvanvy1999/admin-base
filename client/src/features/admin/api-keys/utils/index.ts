import type { ApiKeyStatus } from '../../../../types/admin-api-keys';

/**
 * Lấy màu status cho API key
 */
export function getApiKeyStatusColor(status: ApiKeyStatus): string {
  const colors: Record<ApiKeyStatus, string> = {
    active: '#52C41A',
    revoked: '#F5222D',
    expired: '#FA8C16',
  };
  return colors[status] || '#BFBFBF';
}

/**
 * Lấy nhãn status cho API key
 */
export function getApiKeyStatusLabel(status: ApiKeyStatus): string {
  const labels: Record<ApiKeyStatus, string> = {
    active: 'Active',
    revoked: 'Revoked',
    expired: 'Expired',
  };
  return labels[status] || status;
}

/**
 * Kiểm tra xem API key có hoạt động không
 */
export function isApiKeyActive(status: ApiKeyStatus): boolean {
  return status === 'active';
}

/**
 * Kiểm tra xem API key có thể được sử dụng không
 */
export function canUseApiKey(status: ApiKeyStatus): boolean {
  return status === 'active';
}

/**
 * Kiểm tra xem API key có thể được revoke không
 */
export function canRevokeApiKey(status: ApiKeyStatus): boolean {
  return status === 'active';
}

/**
 * Kiểm tra xem API key có thể được regenerate không
 */
export function canRegenerateApiKey(status: ApiKeyStatus): boolean {
  return status === 'active' || status === 'expired';
}

/**
 * Format key prefix để hiển thị
 * Input: "sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 * Output: "sk_live_xxxx...xxxx"
 */
export function formatKeyPrefix(key: string): string {
  if (!key || key.length < 8) {
    return key;
  }

  const prefix = key.substring(0, 8);
  const suffix = key.substring(key.length - 4);
  return `${prefix}...${suffix}`;
}

/**
 * Mask API key để hiển thị an toàn
 */
export function maskApiKey(key: string): string {
  if (!key) {
    return '';
  }
  return formatKeyPrefix(key);
}
