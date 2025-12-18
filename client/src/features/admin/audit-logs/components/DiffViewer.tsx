import { Card, Col, List, Row, Typography } from 'antd';
import { formatValue } from '../utils/auditLogUtils';

interface ChangeSet {
  previous: unknown;
  next: unknown;
}

interface DiffViewerProps {
  changes: Record<string, ChangeSet>;
}

export function DiffViewer({ changes }: DiffViewerProps) {
  return (
    <List
      dataSource={Object.entries(changes)}
      renderItem={([field, { previous, next }]) => (
        <List.Item>
          <div style={{ width: '100%' }}>
            <Typography.Text strong>{field}</Typography.Text>
            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col span={12}>
                <Card size="small" title="Previous">
                  <Typography.Text delete type="secondary">
                    {formatValue(previous)}
                  </Typography.Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="Next">
                  <Typography.Text type="success" strong>
                    {formatValue(next)}
                  </Typography.Text>
                </Card>
              </Col>
            </Row>
          </div>
        </List.Item>
      )}
    />
  );
}
