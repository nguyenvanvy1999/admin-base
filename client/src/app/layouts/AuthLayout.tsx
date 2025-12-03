import { ProCard } from '@ant-design/pro-components';
import { Col, Flex, Row, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from 'src/components/LanguageSwitcher';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation();

  const heroItems = useMemo(
    () => [
      t('auth.hero.items.security'),
      t('auth.hero.items.audit'),
      t('auth.hero.items.mfa'),
    ],
    [t],
  );

  return (
    <div className="login-page">
      <Flex justify="flex-end" style={{ padding: '16px 24px 0' }}>
        <LanguageSwitcher size="small" />
      </Flex>
      <Row className="login-page__wrapper" gutter={0}>
        <Col xs={0} md={12} className="login-page__hero">
          <Flex vertical gap={24}>
            <div>
              <Typography.Title level={2} style={{ color: 'white' }}>
                {t('auth.hero.title')}
              </Typography.Title>
              <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.85)' }}>
                {t('auth.hero.subtitle')}
              </Typography.Paragraph>
            </div>
            <Flex vertical gap={12}>
              {heroItems.map((item) => (
                <Typography.Text
                  key={item}
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  • {item}
                </Typography.Text>
              ))}
            </Flex>
          </Flex>
        </Col>
        <Col xs={24} md={12} className="login-page__form">
          <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
            <ProCard
              style={{ width: '100%', maxWidth: 420, overflow: 'hidden' }}
              ghost
              bodyStyle={{ padding: 32, overflow: 'hidden' }}
            >
              {children}
            </ProCard>
          </Flex>
        </Col>
      </Row>
    </div>
  );
}
