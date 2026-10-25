import { useState, useCallback } from 'react';
import {
  Button,
  Table,
  Message,
  Alert,
  Typography,
  Dropdown,
  Menu,
  Space,
  Tag,
  Badge,
} from '@arco-design/web-react';
import {
  IconUpload,
  IconDownload,
  IconDown,
  IconCheckCircleFill,
  IconExclamationCircleFill,
  IconFile,
} from '@arco-design/web-react/icon';
import {
  parseFeature清单,
  detectHeaders,
  validateHeaders,
  downloadFeatureTemplate,
  type Raw清单Row,
  type ParseResult,
} from '../fileFlow';
import type { FeatureModule } from '../types';

const { Text } = Typography;

interface Props {
  onParsed: (modules: FeatureModule[]) => void;
  initialModules?: FeatureModule[];
}

/**
 * 功能清单上传组件：Excel 五列→两级功能清单
 * 支持标准模板下载、智能别名列映射、自动解析与体检横幅
 */
export function FeatureListUpload({ onParsed, initialModules = [] }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [previewModules, setPreviewModules] = useState<FeatureModule[]>(initialModules);

  const handleParse = useCallback(async (file: File) => {
    setIsParsing(true);
    try {
      const ExcelJS = await import('exceljs');
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) {
        Message.error('Excel 文件无有效工作表');
        setIsParsing(false);
        return;
      }

      // 提取表头
      const headerRow = sheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell) => {
        headers.push(cell.value ? String(cell.value).trim() : '');
      });

      if (!validateHeaders(headers)) {
        Message.error('表头匹配失败：未能识别到「模块」、「子功能」或「描述」列，请使用标准模板');
        setIsParsing(false);
        return;
      }

      // 智能识别列索引
      const mapping = detectHeaders(headers);
      const modIdx = mapping ? mapping.moduleIdx : 0;
      const subIdx = mapping ? mapping.subFeatureIdx : 1;
      const descIdx = mapping ? mapping.descriptionIdx : 2;
      const remIdx = mapping ? mapping.remarkIdx : 3;
      const epIdx = mapping ? mapping.endpointIdx : 4;

      // 提取数据行
      const rows: Raw清单Row[] = [];
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          cells.push(cell.value ? String(cell.value).trim() : '');
        });

        // 全空行跳过
        if (cells.length === 0 || cells.every((c) => !c)) continue;

        rows.push({
          模块: (cells[modIdx] ?? '').trim(),
          子功能: (cells[subIdx] ?? '').trim(),
          描述: (cells[descIdx] ?? '').trim(),
          备注: remIdx !== -1 && cells[remIdx] ? cells[remIdx].trim() : undefined,
          端: epIdx !== -1 && cells[epIdx] ? cells[epIdx].trim() : undefined,
        });
      }

      const result = parseFeature清单(rows);
      setParseResult(result);
      if (result.modules.length > 0) {
        setPreviewModules(result.modules);
        Message.success(`成功解析 ${result.modules.length} 个模块，共 ${result.subFeatureCount} 项子功能`);
      } else {
        Message.warning('未在文件中解析出有效功能项');
      }
    } catch (err) {
      Message.error('Excel 解析失败：' + (err instanceof Error ? err.message : '文件损坏或格式不支持'));
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleSelectFile = (file: File) => {
    setSelectedFile(file);
    setParseResult(null);
    handleParse(file);
  };

  const handleConfirm = () => {
    if (previewModules.length === 0) {
      Message.warning('无有效功能清单可供导入');
      return;
    }
    onParsed(previewModules);
    Message.success(`已确认导入 ${previewModules.length} 个功能模块`);
  };

  const templateMenu = (
    <Menu>
      <Menu.Item
        key="sample"
        onClick={async () => {
          try {
            await downloadFeatureTemplate('sample');
            Message.success('已下载示例模板（电商系统）');
          } catch (e) {
            Message.error('下载模板失败');
          }
        }}
      >
        <Space>
          <IconFile />
          <span>下载示例模板（含典型电商功能行）</span>
        </Space>
      </Menu.Item>
      <Menu.Item
        key="blank"
        onClick={async () => {
          try {
            await downloadFeatureTemplate('blank');
            Message.success('已下载标准空白模板');
          } catch (e) {
            Message.error('下载模板失败');
          }
        }}
      >
        <Space>
          <IconFile />
          <span>下载空白标准模板</span>
        </Space>
      </Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: '序号',
      dataIndex: 'sort',
      width: 70,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '功能模块',
      dataIndex: 'name',
      width: 180,
      render: (name: string, record: FeatureModule) => (
        <div>
          <Text bold>{name}</Text>
          {record.endpointId && (
            <div style={{ marginTop: 2 }}>
              <Tag size="small" color="arcoblue">{record.endpointId}</Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '子功能明细与描述',
      dataIndex: 'subFeatures',
      render: (subs: FeatureModule['subFeatures']) => (
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          {subs.map((s, idx) => (
            <div
              key={s.id || idx}
              style={{
                padding: '4px 8px',
                background: 'var(--color-fill-2)',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text bold>{idx + 1}. {s.name}</Text>
                {s.remark && <Tag size="small" color="orange">{s.remark}</Tag>}
              </div>
              {s.description ? (
                <div style={{ color: 'var(--color-text-3)', marginTop: 2 }}>{s.description}</div>
              ) : (
                <div style={{ color: 'var(--color-danger-light-4)', marginTop: 2 }}>[未填写功能描述]</div>
              )}
            </div>
          ))}
        </Space>
      ),
    },
    {
      title: '功能点数',
      dataIndex: 'subFeatures',
      width: 90,
      align: 'center' as const,
      render: (subs: FeatureModule['subFeatures']) => (
        <Badge count={subs.length} maxCount={999} style={{ backgroundColor: 'var(--color-primary-light-1)', color: 'var(--primary-6)' }} />
      ),
    },
  ];

  return (
    <div style={{ background: 'var(--color-bg-2)', borderRadius: 6 }}>
      {/* 顶部操作区 */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space wrap size={12}>
          <Button
            type="primary"
            icon={<IconUpload />}
            loading={isParsing}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.xlsx,.xls';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleSelectFile(file);
              };
              input.click();
            }}
          >
            上传并解析 Excel 清单
          </Button>

          <Dropdown droplist={templateMenu} position="bl">
            <Button icon={<IconDownload />}>
              下载标准模板 <IconDown style={{ marginLeft: 4 }} />
            </Button>
          </Dropdown>

          {selectedFile && (
            <Text
              type="secondary"
              style={{
                lineHeight: '32px',
                maxWidth: 260,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              当前文件：{selectedFile.name}
            </Text>
          )}
        </Space>

        <Text type="secondary" style={{ fontSize: 12 }}>
          支持列名：模块 / 子功能 / 描述（可选：备注、端）
        </Text>
      </div>

      {/* 体检报告横幅 */}
      {parseResult && (
        <div style={{ marginBottom: 16 }}>
          {parseResult.errors.length > 0 ? (
            <Alert
              type="error"
              icon={<IconExclamationCircleFill />}
              title={`清单存在 ${parseResult.errors.length} 处格式错误，部分行未导入`}
              content={
                <ul style={{ margin: '4px 0 0 0', paddingLeft: 18 }}>
                  {parseResult.errors.slice(0, 5).map((e, idx) => (
                    <li key={idx}>第 {e.row} 行：{e.message}</li>
                  ))}
                  {parseResult.errors.length > 5 && <li>...等其余 {parseResult.errors.length - 5} 项错误</li>}
                </ul>
              }
              style={{ marginBottom: 12 }}
            />
          ) : (
            <Alert
              type="success"
              icon={<IconCheckCircleFill />}
              title="功能清单体检通过"
              content={
                <Space wrap size={8} style={{ marginTop: 4 }}>
                  <Tag color="green">有效模块：{parseResult.modules.length} 个</Tag>
                  <Tag color="blue">子功能总数：{parseResult.subFeatureCount} 项</Tag>
                  {Object.entries(parseResult.endpointSummary).map(([ep, count]) => (
                    <Tag key={ep} color="cyan">{ep}: {count}项</Tag>
                  ))}
                </Space>
              }
              style={{ marginBottom: 12 }}
            />
          )}

          {parseResult.warnings.length > 0 && (
            <Alert
              type="warning"
              content={parseResult.warnings.join('；')}
              style={{ marginBottom: 12 }}
            />
          )}
        </div>
      )}

      {/* 预览与确认表格 */}
      {previewModules.length > 0 ? (
        <>
          <Table
            data={previewModules}
            columns={columns}
            rowKey="id"
            pagination={false}
            border={{ cell: true }}
            style={{ marginBottom: 16 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">
              共解析出 {previewModules.length} 个模块，合计{' '}
              <Text bold style={{ color: 'var(--primary-6)' }}>
                {previewModules.reduce((s, m) => s + m.subFeatures.length, 0)}
              </Text>{' '}
              项子功能
            </Text>
            <Space>
              <Button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewModules([]);
                  setParseResult(null);
                }}
              >
                重置清空
              </Button>
              <Button type="primary" onClick={handleConfirm}>
                确认导入并写入功能清单
              </Button>
            </Space>
          </div>
        </>
      ) : !selectedFile && initialModules.length === 0 ? (
        <div
          style={{
            padding: '32px 16px',
            textAlign: 'center',
            border: '1px dashed var(--color-border-2)',
            borderRadius: 6,
            background: 'var(--color-fill-1)',
          }}
        >
          <Text type="secondary">
            尚未导入功能清单。可先点击「下载标准模板」准备数据，再点击「上传并解析 Excel 清单」。
          </Text>
        </div>
      ) : null}
    </div>
  );
}


