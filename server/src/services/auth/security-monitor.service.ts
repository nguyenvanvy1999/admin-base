import crypto from 'node:crypto';
import { db, type IDb } from 'src/config/db';
import {
  AuditLogVisibility,
  SecurityEventSeverity,
  SecurityEventType,
} from 'src/generated';
import {
  type AuditLogsService,
  auditLogsService,
} from 'src/services/audit-logs/audit-logs.service';
import {
  type SettingsService,
  settingsService,
} from 'src/services/settings/settings.service';
import {
  ctxStore,
  getIpAndUa,
  type LoginMethod,
  type SecurityDeviceInsight,
} from 'src/share';

export type SecurityCheckResult = SecurityDeviceInsight & {
  action: 'allow' | 'block';
  reason?: 'unknown_device';
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
};

type EvaluateParams = {
  userId: string;
  method: LoginMethod;
};

export class SecurityMonitorService {
  constructor(
    private readonly deps: {
      db: IDb;
      auditLogService: AuditLogsService;
      settingService: SettingsService;
    } = {
      db,
      auditLogService: auditLogsService,
      settingService: settingsService,
    },
  ) {}

  async evaluateLogin(params: EvaluateParams): Promise<SecurityCheckResult> {
    const { userId, method } = params;
    const securitySettings = await this.deps.settingService.loginSecurity();

    if (!securitySettings.deviceRecognition) {
      return {
        action: 'allow',
        deviceFingerprint: null,
        isNewDevice: false,
        risk: 'LOW',
      };
    }
    const { userAgent, clientIp } = getIpAndUa();
    const deviceFingerprint = this.generateFingerprint(userAgent, clientIp);
    const knownDevice = await this.deps.db.session.findFirst({
      where: { createdById: userId, deviceFingerprint },
      select: { id: true },
    });

    const isNewDevice = !knownDevice;

    if (isNewDevice && securitySettings.auditWarning) {
      await this.recordUnknownDeviceWarning({
        userId,
        method,
      });
    }

    if (isNewDevice && securitySettings.blockUnknownDevice) {
      return {
        action: 'block',
        reason: 'unknown_device',
        deviceFingerprint,
        isNewDevice: true,
        risk: 'HIGH',
      };
    }

    return {
      action: 'allow',
      deviceFingerprint,
      isNewDevice,
      risk: isNewDevice ? 'MEDIUM' : 'LOW',
    };
  }

  private generateFingerprint(userAgent: string, clientIp: string): string {
    return crypto
      .createHash('sha256')
      .update(`${userAgent}::${clientIp}`)
      .digest('hex');
  }

  private async recordUnknownDeviceWarning(params: {
    userId: string;
    method: LoginMethod;
  }): Promise<void> {
    const { userId, method } = params;
    const { sessionId } = ctxStore.getStore() ?? {};

    await this.deps.auditLogService.pushSecurity(
      {
        category: 'security',
        eventType: SecurityEventType.suspicious_activity,
        severity: SecurityEventSeverity.high,
        activity: 'unknown_device',
        details: { method },
      },
      {
        subjectUserId: userId,
        userId,
        sessionId,
        visibility: AuditLogVisibility.actor_and_subject,
      },
    );
  }
}

export const securityMonitorService = new SecurityMonitorService();
