import { useState, useCallback } from 'react';
import { Button, Table, Message, Alert, Typography } from '@arco-design/web-react';
import { IconUpload, IconFile } from '@arco-design/web-react/icon';
import { parseFeature清单, validateHeaders, type Raw清单Row, type ParseResult } from '../fileFlow';
import type { FeatureModule } from '../types';

const { Text } = Typography;

interface Props {
  onParsed: (modules: FeatureModule[]) => void;
  initialModules?: FeatureModule[];
}

/**
 * 清单上传组件：Excel 五列→两级功能清单
 * 支持粘贴/上传，解析后预览+确认
 */
export function FeatureListUpload({ onParsed, initialModules = [] }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [previewModules, setPreviewModules] = useState<FeatureModule[]>(initialModules);

  const handleParse = useCallback(async (file: File) => {
    try {
      const ExcelJS = await import('exceljs');
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) {
        Message.error('Excel 文件无工作表');
        return;
      }

      // 读取表头
      const headerRow = sheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell) => headers.push(String(cell.value ?? '')));

      if (!validateHeaders(headers)) {
        Message.error('表头不匹配，需要：模块、子功能、描述（备注、端可选）');
        return;
      }

      // 读取数据行
      const rows: Raw清单Row[] = [];
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => cells.push(String(cell.value ?? '')));
        if (cells.every(c => !c.trim())) continue; // 跳过空行
        rows.push({
          模块: cells[0] ?? '',
          子功能: cells[1] ?? '',
          描述: cells[2] ?? '',
          备注: cells[3] ?? undefined,
          端: cells[4] ?? undefined,
        });
      }

      const result = parseFeature清单(rows);
      setParseResult(result);
      if (result.modules.length > 0) {
        setPreviewModules(result.modules);
      }
    } catch (err) {
      Message.error('解析失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  }, []);

  const handleSelectFile = (file: File) => {
    setSelectedFile(file);
    setParseResult(null);
    setPreviewModules([]);
  };

  const handleConfirm = () => {
    if (previewModules.length === 0) {
      Message.warning('无有效功能清单');
      return;
    }
    onParsed(previewModules);
    Message.success(`已导入 ${previewModules.length} 个模块`);
  };

  const columns = [
    { title: '模块', dataIndex: 'name', width: 150 },
    {
      title: '子功能',
      dataIndex: 'subFeatures',
      render: (subs: { name: string }[]) => subs.map(s => s.name).join('、'),
    },
    {
      title: '数量',
      dataIndex: 'subFeatures',
      width: 80,
      render: (subs: { name: string }[]) => subs.length,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button icon={<IconUpload />} onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.xlsx';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) handleSelectFile(file);
          };
          input.click();
        }}>
          上传 Excel 清单
        </Button>
        <Button
          type="outline"
          icon={<IconFile />}
          disabled={!selectedFile}
          onClick={() => selectedFile && handleParse(selectedFile)}
        >
          解析文件
        </Button>
        {selectedFile && (
          <Text type="secondary" style={{ lineHeight: '32px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            已选择：{selectedFile.name}
          </Text>
        )}
        {!selectedFile && <Text type="secondary" style={{ lineHeight: '32px' }}>
          格式：模块 | 子功能 | 描述 | 备注 | 端
        </Text>}
      </div>

      {parseResult && parseResult.errors.length > 0 && (
        <Alert
          type="warning"
          content={`解析有 ${parseResult.errors.length} 个错误`}
          style={{ marginBottom: 16 }}
        />
      )}

      {previewModules.length > 0 && (
        <>
          <Table
            data={previewModules}
            columns={columns}
            rowKey="id"
            pagination={false}
            style={{ marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" onClick={handleConfirm}>
              确认导入（{previewModules.reduce((s, m) => s + m.subFeatures.length, 0)} 项）
            </Button>
            <Button onClick={() => { setSelectedFile(null); setPreviewModules([]); setParseResult(null); }}>
              清空
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
