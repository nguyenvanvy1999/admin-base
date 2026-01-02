export interface IAuthenticationService {
  verifyCredentials(
    email: string,
    password: string,
  ): Promise<{ userId: string; isValid: boolean }>;
  validateUserStatus(userId: string): Promise<void>;
}
