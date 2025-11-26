import { Button, Flex, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Flex align="center" justify="center" style={{ minHeight: '60vh' }}>
      <Result
        status="404"
        title="Không tìm thấy trang"
        subTitle="Bạn có thể quay lại bảng điều khiển để tiếp tục làm việc."
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            Về trang chủ
          </Button>
        }
      />
    </Flex>
  );
}
