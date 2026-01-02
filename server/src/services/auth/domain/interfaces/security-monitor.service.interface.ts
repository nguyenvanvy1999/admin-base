import type { SecurityCheckResult } from 'src/services/auth/security/security-monitor.service';
import type { LoginMethod } from 'src/share';

export interface ISecurityMonitorService {
  evaluateLogin(params: {
    userId: string;
    method: LoginMethod;
  }): Promise<SecurityCheckResult>;
}
