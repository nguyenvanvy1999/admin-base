export interface UserIpWhitelist {
  id: string;
  userId: string;
  ip: string;
  note: string | null;
  created: string;
  modified: string;
}

export interface UserIpWhitelistListParams {
  userIds?: string;
  ip?: string;
  search?: string;
  take?: number;
  skip?: number;
}

export interface UserIpWhitelistFormData {
  id?: string;
  userId: string;
  ip: string;
  note?: string;
}
