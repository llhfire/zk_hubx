import { useState, useRef, useCallback } from 'react';
import { AsyncState, Modal, Button, Space, Typography, Grid, Spin, Message } from '@/design-system';
import {
  IconUpload,
  IconImage,
  IconLoading,
  IconCheckCircle,
  IconExclamationCircle,
  IconRight,
  IconCamera,
  IconClose,
} from '@/design-system';
import {
  DateText,
  MetricGrid,
  MoneyText,
  StatusTag,
  STATUS_TONE_VARS,
  ProgressBar,
  SectionCard,
  type StatusTone,
} from '@/design-system';

const { Text, Title } = Typography;
const { Row, Col } = Grid;

interface ExpenseOCRProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OCRResult {
  invoiceNo: string;
  amount: number;
  date: string;
  route: string;
  company: string;
  type: 'transport' | 'accommodation' | 'meal' | 'other';
  compliant: boolean;
  issues: string[];
}

const MOCK_OCR_RESULTS: OCRResult[] = [
  {
    invoiceNo: '012002400311',
    amount: 1053.00,
    date: '2026-04-28',
    route: '北京南 - 杭州东',
    company: '中国铁路上海局集团有限公司',
    type: 'transport',
    compliant: true,
    issues: [],
  },
  {
    invoiceNo: '146002400201',
    amount: 438.00,
    date: '2026-04-28',
    route: '',
    company: '杭州西湖国宾馆有限公司',
    type: 'accommodation',
    compliant: false,
    issues: ['住宿单价 438 元超出当日标准（二线城市 350 元/天）'],
  },
  {
    invoiceNo: '044002400112',
    amount: 156.00,
    date: '2026-04-29',
    route: '',
    company: '杭州知味观味庄餐饮有限公司',
    type: 'meal',
    compliant: true,
    issues: [],
  },
];

type ProcessingState = 'idle' | 'uploading' | 'processing' | 'done';

const typeLabels: Record<string, string> = {
  transport: '交通费',
  accommodation: '住宿费',
  meal: '餐饮费',
  other: '其他',
};

const typeTones: Record<string, StatusTone> = {
  transport: 'info',
  accommodation: 'purple',
  meal: 'warning',
  other: 'neutral',
};

export function ExpenseOCR({ open, onOpenChange }: ExpenseOCRProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<OCRResult[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const simulateOCR = useCallback(() => {
    setProcessingState('uploading');
    setProgress(0);
    setResults([]);

    const uploadTimer = setTimeout(() => {
      setProcessingState('processing');
      setSelectedFiles(['行程单_G101.pdf', '酒店发票_西湖国宾馆.pdf', '餐饮发票_知味观.pdf']);

      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 15 + 5;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          setProgress(100);
          setProcessingState('done');
          setResults(MOCK_OCR_RESULTS);
        } else {
          setProgress(Math.min(currentProgress, 99));
        }
      }, 300);
    }, 800);

    return () => {
      clearTimeout(uploadTimer);
    };
  }, []);

  const handleReset = () => {
    setProcessingState('idle');
    setProgress(0);
    setResults([]);
    setSelectedFiles([]);
  };

  const totalAmount = results.reduce((sum, r) => sum + r.amount, 0);
  const compliantCount = results.filter(r => r.compliant).length;
  const issueCount = results.filter(r => !r.compliant).length;

  return (
    <Modal
      title={
        <Space>
          <IconCamera style={{ color: 'rgb(var(--primary-6))' }} />
          <span>票据 OCR 识别</span>
        </Space>
      }
      visible={open}
      onCancel={() => onOpenChange(false)}
      footer={null}
      style={{ width: 700 }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        style={{ display: 'none' }}
      />

      {processingState === 'idle' && (
        <div
          style={{
            border: '2px dashed var(--color-border-2)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 0',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={handleUploadClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            simulateOCR();
          }}
        >
          <IconUpload style={{ fontSize: 'var(--ds-icon-lg)', color: 'var(--color-border-2)', marginBottom: 16 }} />
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-1)', marginBottom: 8 }}>上传票据图片或 PDF</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)', marginBottom: 16 }}>支持 JPG、PNG、PDF 格式，可批量上传</div>
          <Button onClick={(e) => { e.stopPropagation(); simulateOCR(); }}>
            <IconImage style={{ marginRight: 8 }} />选择文件
          </Button>
        </div>
      )}

      {(processingState === 'uploading' || processingState === 'processing') && (
        <div style={{ padding: '32px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            {processingState === 'processing' ? (
              <AsyncState status="loading" />
            ) : (
              <Spin size={40} />
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 500, color: 'var(--color-text-1)', marginBottom: 4 }}>
              {processingState === 'uploading' ? '正在上传票据...' : '正在 OCR 识别...'}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)', marginBottom: 16 }}>AI 正在解析票据信息</div>
            <ProgressBar percent={Math.round(progress)} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-border-2)' }}>{Math.round(progress)}%</div>
          </div>
          {selectedFiles.length > 0 && (
            <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 24 }}>
              {selectedFiles.map((file, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-1)',
                    background: 'var(--color-fill-1)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                  }}
                >
                  <IconImage style={{ color: 'rgb(var(--primary-6))' }} />
                  <span style={{ flex: 1 }}>{file}</span>
                  {progress > (i + 1) * 30 && (
                    <IconCheckCircle style={{ color: 'rgb(var(--success-6))' }} />
                  )}
                </div>
              ))}
            </Space>
          )}
        </div>
      )}

      {processingState === 'done' && results.length > 0 && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <MetricGrid
              items={[
                { key: 'count', label: '识别票据', value: results.length },
                { key: 'amount', label: '识别总额', value: <MoneyText value={totalAmount} /> },
                { key: 'compliant', label: '合规检查', value: `${compliantCount}/${results.length}`, tone: 'success' },
              ]}
            />
          </div>

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {results.map((result, index) => (
              <SectionCard
                key={index}
                style={{ border: `1px solid ${STATUS_TONE_VARS[result.compliant ? 'success' : 'danger'].border}` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Space>
                    <span style={{ fontWeight: 500 }}>{typeLabels[result.type]}</span>
                    <StatusTag tone={typeTones[result.type]}>{typeLabels[result.type]}</StatusTag>
                  </Space>
                  {result.compliant ? (
                    <StatusTag meta={{ label: <><IconCheckCircle /> 合规</>, tone: 'success' }} />
                  ) : (
                    <StatusTag meta={{ label: <><IconExclamationCircle /> 异常</>, tone: 'danger' }} />
                  )}
                </div>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">发票号</Text>
                      <Text code>{result.invoiceNo}</Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">金额</Text>
                      <Text style={{ fontWeight: 500 }}><MoneyText value={result.amount} fractionDigits={2} /></Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">日期</Text>
                      <Text><DateText value={result.date} /></Text>
                    </div>
                  </Col>
                  {result.route && (
                    <Col span={12}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">路线</Text>
                        <Text>{result.route}</Text>
                      </div>
                    </Col>
                  )}
                  <Col span={24}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">开票单位</Text>
                      <Text style={{ textAlign: 'right' }}>{result.company}</Text>
                    </div>
                  </Col>
                </Row>
                {result.issues.length > 0 && (
                  <div style={{ marginTop: 12, padding: 8, background: 'rgb(var(--danger-1))', borderRadius: 'var(--radius-md)' }}>
                    {result.issues.map((issue, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, fontSize: 'var(--text-xs)', color: 'rgb(var(--danger-6))' }}>
                        <IconExclamationCircle style={{ marginTop: 2, flexShrink: 0 }} />
                        <span>{issue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            ))}
          </Space>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <Button style={{ flex: 1 }} onClick={handleReset}>
              <IconClose style={{ marginRight: 8 }} />重新识别
            </Button>
            <Button type="primary" style={{ flex: 1 }} onClick={() => onOpenChange(false)}>
              <IconRight style={{ marginRight: 8 }} />自动填入报销单
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
