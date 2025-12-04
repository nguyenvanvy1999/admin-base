import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Button, Space, Upload } from 'antd';
import type { ReactNode } from 'react';

interface ImportExportActionsProps {
  onExport: () => Promise<void> | void;
  onImport: (file: File) => Promise<unknown> | unknown;
  exportLoading?: boolean;
  importLoading?: boolean;
  exportLabel?: ReactNode;
  importLabel?: ReactNode;
  importAccept?: string;
  disabled?: boolean;
}

export function ImportExportActions({
  onExport,
  onImport,
  exportLoading = false,
  importLoading = false,
  exportLabel = 'Export',
  importLabel = 'Import',
  importAccept,
  disabled = false,
}: ImportExportActionsProps) {
  const handleImport: UploadProps['beforeUpload'] = async (file) => {
    await onImport(file as File);
    return false;
  };

  return (
    <Space size="small">
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        onClick={onExport}
        loading={exportLoading}
        disabled={disabled}
      >
        {exportLabel}
      </Button>
      <Upload
        accept={importAccept}
        showUploadList={false}
        beforeUpload={handleImport}
        disabled={disabled}
      >
        <Button
          icon={<UploadOutlined />}
          loading={importLoading}
          disabled={disabled}
        >
          {importLabel}
        </Button>
      </Upload>
    </Space>
  );
}
