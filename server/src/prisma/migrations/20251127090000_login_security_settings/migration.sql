INSERT INTO "settings" ("id", "key", "value", "description", "is_secret", "type")
VALUES
  ('setting_security_device_recognition', 'ENB_SECURITY_DEVICE_RECOGNITION', 'false', 'Toggle device fingerprint checks during login', false, 'boolean'),
  ('setting_security_block_unknown_device', 'ENB_SECURITY_BLOCK_UNKNOWN_DEVICE', 'false', 'Block logins from unrecognized devices', false, 'boolean'),
  ('setting_security_audit_warning', 'ENB_SECURITY_AUDIT_WARNING', 'true', 'Emit security warnings for unrecognized devices', false, 'boolean')
ON CONFLICT ("key") DO NOTHING;
