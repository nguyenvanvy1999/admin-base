import { Button, Result } from 'antd';
import { useRouteError } from 'react-router-dom';

export default function ErrorPage() {
  const error = useRouteError() as Error | undefined;

  return (
    <Result
      status="500"
      title="Có lỗi xảy ra"
      subTitle={error?.message ?? 'Vui lòng thử tải lại trang.'}
      extra={
        <Button type="primary" onClick={() => window.location.reload()}>
          Tải lại
        </Button>
      }
    />
  );
}
