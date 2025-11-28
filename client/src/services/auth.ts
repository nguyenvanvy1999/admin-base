import { AUTH_ENDPOINTS } from 'src/config/auth';
import { apiClient } from 'src/lib/api/client';
import type {
  AuthUser,
  BackupCodesGeneratePayload,
  BackupCodesGenerateResponse,
  BackupCodesRemainingResponse,
  BackupCodeVerifyPayload,
  ConfirmMfaLoginPayload,
  LoginMfaPayload,
  LoginPayload,
  LoginResponse,
  LoginSuccessResponse,
  MfaSetupConfirmPayload,
  MfaSetupConfirmResponse,
  MfaSetupRequestPayload,
  MfaSetupRequestResponse,
  MfaStatusResponse,
  RegisterPayload,
  RegisterResponse,
  SendOtpPayload,
  TokenSet,
  VerifyAccountPayload,
} from 'src/types/auth';

export const authService = {
  login(payload: LoginPayload): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>(AUTH_ENDPOINTS.login, payload);
  },

  loginWithMfa(payload: LoginMfaPayload): Promise<LoginSuccessResponse> {
    return apiClient.post<LoginSuccessResponse>(
      AUTH_ENDPOINTS.loginMfa,
      payload,
    );
  },

  confirmMfaLogin(
    payload: ConfirmMfaLoginPayload,
  ): Promise<LoginSuccessResponse> {
    return apiClient.post<LoginSuccessResponse>(
      AUTH_ENDPOINTS.loginMfaConfirm,
      payload,
    );
  },

  register(payload: RegisterPayload): Promise<RegisterResponse | null> {
    return apiClient.post<RegisterResponse | null>(
      AUTH_ENDPOINTS.register,
      payload,
    );
  },

  verifyAccount(payload: VerifyAccountPayload): Promise<void> {
    return apiClient.post<void>(AUTH_ENDPOINTS.verifyAccount, payload);
  },

  sendRegisterOtp(payload: SendOtpPayload): Promise<RegisterResponse | null> {
    return apiClient.post<RegisterResponse | null>(
      AUTH_ENDPOINTS.registerOtp,
      payload,
    );
  },

  requestMfaSetup(
    payload?: MfaSetupRequestPayload,
  ): Promise<MfaSetupRequestResponse> {
    return apiClient.post<MfaSetupRequestResponse>(
      AUTH_ENDPOINTS.mfaSetupRequest,
      payload ?? {},
    );
  },

  confirmMfaSetup(
    payload: MfaSetupConfirmPayload,
  ): Promise<MfaSetupConfirmResponse> {
    return apiClient.post<MfaSetupConfirmResponse>(
      AUTH_ENDPOINTS.mfaSetupConfirm,
      payload,
    );
  },

  verifyBackupCode(
    payload: BackupCodeVerifyPayload,
  ): Promise<LoginSuccessResponse> {
    return apiClient.post<LoginSuccessResponse>(
      AUTH_ENDPOINTS.backupCodesVerify,
      payload,
    );
  },

  generateBackupCodes(
    payload: BackupCodesGeneratePayload,
  ): Promise<BackupCodesGenerateResponse> {
    return apiClient.post<BackupCodesGenerateResponse>(
      AUTH_ENDPOINTS.backupCodesGenerate,
      payload,
    );
  },

  getBackupCodesRemaining(): Promise<BackupCodesRemainingResponse> {
    return apiClient.get<BackupCodesRemainingResponse>(
      AUTH_ENDPOINTS.backupCodesRemaining,
    );
  },

  getMfaStatus(): Promise<MfaStatusResponse> {
    return apiClient.get<MfaStatusResponse>(AUTH_ENDPOINTS.mfaStatus);
  },

  getCurrentUser(): Promise<AuthUser> {
    return apiClient.get<AuthUser>(AUTH_ENDPOINTS.profile);
  },

  logout(): Promise<void> {
    return apiClient.post<void>(AUTH_ENDPOINTS.logout);
  },

  refreshTokens(refreshToken: string): Promise<TokenSet> {
    return apiClient.post<TokenSet>(AUTH_ENDPOINTS.refreshToken, {
      refreshToken,
    });
  },
};
