import type { ApiKeyStatus } from '../../../../types';

export function getApiKeyStatusColor(status: ApiKeyStatus): string {
  const colors: Record<ApiKeyStatus, string> = {
    active: '#52C41A',
    revoked: '#F5222D',
    expired: '#FA8C16',
  };
  return colors[status] || '#BFBFBF';
}

export function getApiKeyStatusLabel(status: ApiKeyStatus): string {
  const labels: Record<ApiKeyStatus, string> = {
    active: 'Active',
    revoked: 'Revoked',
    expired: 'Expired',
  };
  return labels[status] || status;
}

export function canRevokeApiKey(status: ApiKeyStatus): boolean {
  return status === 'active';
}

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
