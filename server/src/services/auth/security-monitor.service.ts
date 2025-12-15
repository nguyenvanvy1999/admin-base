import crypto from 'node:crypto';
import { db, type IDb } from 'src/config/db';
import { SecurityEventType } from 'src/generated';
import {
  type AuditLogsService,
  auditLogsService,
} from 'src/services/audit-logs/audit-logs.service';
import {
  type SecurityEventsService,
  securityEventsService,
} from 'src/services/security';
import {
  type SettingsService,
  settingsService,
} from 'src/services/settings/settings.service';
import {
  ACTIVITY_TYPE,
  getIpAndUa,
  LOG_LEVEL,
  type LoginMethod,
  type SecurityDeviceInsight,
} from 'src/share';

export type SecurityCheckResult = SecurityDeviceInsight & {
  action: 'allow' | 'block';
  reason?: 'unknown_device';
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
      securityEventService: SecurityEventsService;
      settingService: SettingsService;
    } = {
      db,
      auditLogService: auditLogsService,
      securityEventService: securityEventsService,
      settingService: settingsService,
    },
  ) {}

  async evaluateLogin(params: EvaluateParams): Promise<SecurityCheckResult> {
    const { userId, method } = params;
    const securitySettings = await this.deps.settingService.loginSecurity();

    if (!securitySettings.deviceRecognition) {
      return { action: 'allow', deviceFingerprint: null, isNewDevice: false };
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
        deviceFingerprint,
        method,
      });
    }

    if (isNewDevice && securitySettings.blockUnknownDevice) {
      return {
        action: 'block',
        reason: 'unknown_device',
        deviceFingerprint,
        isNewDevice: true,
      };
    }

    return {
      action: 'allow',
      deviceFingerprint,
      isNewDevice,
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
    deviceFingerprint: string;
    method: LoginMethod;
  }): Promise<void> {
    const { userId, deviceFingerprint, method } = params;
    const { userAgent, clientIp } = getIpAndUa();

    await this.deps.securityEventService.create({
      userId,
      eventType: SecurityEventType.suspicious_activity,
      ip: clientIp,
      userAgent,
      metadata: {
        deviceFingerprint,
        reason: 'unknown_device',
        method,
      },
    });

    await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.LOGIN,
      payload: { method, error: 'unknown_device' },
      level: LOG_LEVEL.WARNING,
    });
  }
}

export const securityMonitorService = new SecurityMonitorService();
