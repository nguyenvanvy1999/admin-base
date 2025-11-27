import { AUTH_ENDPOINTS } from 'src/config/auth';
import { apiClient } from 'src/lib/api/client';
import type {
  AuthUser,
  BackupCodeStatus,
  LoginPayload,
  LoginResponse,
  LoginSuccessResponse,
  MfaChallenge,
  TokenSet,
  VerifyBackupPayload,
  VerifyMfaPayload,
} from 'src/types/auth';

export const authService = {
  login(payload: LoginPayload): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>(AUTH_ENDPOINTS.login, payload);
  },

  verifyMfa(payload: VerifyMfaPayload): Promise<LoginSuccessResponse> {
    return apiClient.post<LoginSuccessResponse>(
      AUTH_ENDPOINTS.verifyMfa,
      payload,
    );
  },

  resendMfa(challengeId: string): Promise<MfaChallenge> {
    return apiClient.post<MfaChallenge>(AUTH_ENDPOINTS.resendMfa, {
      challengeId,
    });
  },

  verifyBackup(payload: VerifyBackupPayload): Promise<LoginSuccessResponse> {
    return apiClient.post<LoginSuccessResponse>(
      AUTH_ENDPOINTS.verifyBackup,
      payload,
    );
  },

  getBackupCodeStatus(): Promise<BackupCodeStatus> {
    return apiClient.get<BackupCodeStatus>(AUTH_ENDPOINTS.backupStatus);
  },

  getCurrentUser(): Promise<AuthUser> {
    return apiClient.get<AuthUser>(AUTH_ENDPOINTS.profile);
  },

  logout(): Promise<void> {
    return apiClient.post<void>(AUTH_ENDPOINTS.logout);
  },

  refreshTokens(refreshToken: string): Promise<TokenSet> {
    return apiClient.post<TokenSet>(AUTH_ENDPOINTS.refresh, {
      refreshToken,
    });
  },
};
