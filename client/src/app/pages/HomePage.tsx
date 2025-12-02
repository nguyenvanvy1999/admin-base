import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { AppPage } from 'src/components/common/AppPage';

const { Title, Paragraph } = Typography;

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <AppPage title={t('dashboard.title')} subtitle={t('dashboard.subtitle')}>
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Title level={2}>{t('dashboard.welcomeTitle')}</Title>
        <Paragraph style={{ fontSize: '16px', color: '#666' }}>
          {t('dashboard.welcomeMessage')}
        </Paragraph>
      </div>
    </AppPage>
  );
}
