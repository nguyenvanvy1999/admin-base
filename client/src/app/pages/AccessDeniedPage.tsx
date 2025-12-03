import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function AccessDeniedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Result
      status="403"
      title={t('accessDeniedPage.title')}
      subTitle={t('accessDeniedPage.subtitle')}
      extra={
        <Button type="primary" onClick={() => navigate('/', { replace: true })}>
          {t('accessDeniedPage.backHome')}
        </Button>
      }
    />
  );
}
