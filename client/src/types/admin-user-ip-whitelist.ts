export interface UserIpWhitelist {
  id: string;
  userId: string;
  ip: string;
  created: string;
}

export interface UserIpWhitelistListParams {
  userIds?: string;
  ip?: string;
  take?: number;
  skip?: number;
}

export interface UserIpWhitelistFormData {
  userId: string;
  ip: string;
  note?: string;
}
