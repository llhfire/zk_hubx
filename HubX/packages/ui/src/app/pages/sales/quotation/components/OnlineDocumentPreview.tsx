import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Message, Modal, Radio, Space, Tag, Tooltip, Typography } from '@arco-design/web-react';
import {
  IconSave,
  IconDownload,
  IconEdit,
  IconPrinter,
  IconRefresh,
  IconCheckCircle,
  IconZoomIn,
  IconZoomOut,
  IconFullscreen,
  IconFullscreenExit,
  IconLeft,
  IconRight,
  IconMenuFold,
  IconMenuUnfold,
} from '@arco-design/web-react/icon';
import { generateQuoteHtml, getDraftWatermark, type PdfTemplateData } from '../quotePdfTemplate';
import { canSubmitWithDocument, type OnlineDocument } from '../fileFlow';
import { ZKRT_QUOTE_TEMPLATE } from '../quoteDocumentTemplate';
import { QuotePageThumbnails } from './QuotePageThumbnails';

const { Text } = Typography;

interface Props {
  data: PdfTemplateData;
  document: OnlineDocument;
  onDocumentChange: (doc: OnlineDocument) => void;
  quoteStatus: string;
}

/**
 * 在线文档预览与实时修改组件
 * 1. 采用 iframe 完全隔离渲染，100% 杜绝样式与字体全局污染；
 * 2. 支持在线修改（所见即所得 contentEditable 编辑），修改后可直接保存为终稿；
 * 3. 左侧高保真 6 页 A4 页面缩略图导航与双向联动定位；
 * 4. 顶部支持上一页/下一页、连续滚动与单页模式切换；
 * 5. 支持大屏宽幅工作台（默认 94vh / 1680px）与一键真全屏沉浸模式；
 * 6. 支持一键调起浏览器打印 / 导出标准 A4 PDF 与下载 HTML。
 */
export function OnlineDocumentPreview({ data, document, onDocumentChange, quoteStatus }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(true); // 默认打开即允许直接修改
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(105); // 默认 105% 略放大，字号清晰适中
  const [isFullscreen, setIsFullscreen] = useState(false); // 全屏沉浸模式
  const [currentPage, setCurrentPage] = useState(1); // 当前阅读/修改页码 (1-6)
  const [showThumbnails, setShowThumbnails] = useState(true); // 左侧页面缩略图栏展开/收起
  const [viewMode, setViewMode] = useState<'continuous' | 'single'>('continuous'); // 连续滚动 vs 单页专注
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const canSubmit = canSubmitWithDocument(document);

  // 获取当前应渲染的 HTML（若无则按当前数据生成）
  const getInitialHtml = () => {
    return (
      document.content ||
      generateQuoteHtml({
        ...data,
        watermark: getDraftWatermark(quoteStatus),
      })
    );
  };

  const [currentHtml, setCurrentHtml] = useState<string>(getInitialHtml);

  // 当外部 data 变化且未保存过时，同步更新
  useEffect(() => {
    if (!document.content) {
      setCurrentHtml(getInitialHtml());
    }
  }, [data, quoteStatus]);

  // 设置 iframe 内的缩放与编辑状态
  const applyStateToIframe = (editable: boolean, zoom: number) => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc || !doc.body) return;

      const container = doc.querySelector('.quote-doc-container') as HTMLElement;
      if (container) {
        container.contentEditable = editable ? 'true' : 'false';
        container.style.outline = 'none';
        // 动态设置缩放
        (container.style as any).zoom = `${zoom}%`;
      } else {
        doc.body.contentEditable = editable ? 'true' : 'false';
        (doc.body.style as any).zoom = `${zoom}%`;
      }

      // 监听用户输入
      doc.body.oninput = () => {
        setHasUnsavedEdits(true);
      };
    } catch (e) {
      console.error('Failed to set iframe state', e);
    }
  };

  const handleIframeLoad = () => {
    applyStateToIframe(isEditing, zoomPercent);
    // 初始化时同步单页模式
    if (viewMode === 'single') {
      applySinglePageToIframe(currentPage);
    }
  };

  // 缩放变更
  useEffect(() => {
    applyStateToIframe(isEditing, zoomPercent);
  }, [zoomPercent]);

  // 单页模式与连续模式底层 DOM 切换（纯 CSS 类名控制，绝不污染内联 display）
  const applySinglePageToIframe = (pageNum: number) => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const container = doc.querySelector('.quote-doc-container');
      if (container) {
        container.classList.add('single-page-mode');
      }
      const pages = doc.querySelectorAll('.a4-page');
      pages.forEach((p, idx) => {
        const pNum = Number((p as HTMLElement).dataset.page || (idx + 1));
        if (pNum === pageNum) {
          p.classList.add('single-page-active');
        } else {
          p.classList.remove('single-page-active');
        }
        // 清理旧可能残留的内联 display
        (p as HTMLElement).style.removeProperty('display');
      });
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.scrollTo(0, 0);
      }
      if (doc.documentElement) {
        doc.documentElement.scrollTop = 0;
      }
      if (doc.body) {
        doc.body.scrollTop = 0;
      }
    } catch (e) {
      console.warn('applySinglePageToIframe error', e);
    }
  };

  const applyContinuousModeToIframe = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const container = doc.querySelector('.quote-doc-container');
      if (container) {
        container.classList.remove('single-page-mode');
      }
      const pages = doc.querySelectorAll('.a4-page');
      pages.forEach((p) => {
        p.classList.remove('single-page-active');
        (p as HTMLElement).style.removeProperty('display');
      });
    } catch (e) {
      console.warn('applyContinuousModeToIframe error', e);
    }
  };

  // 跳转到指定页面 (1-6)
  const scrollToPage = useCallback(
    (pageNum: number) => {
      if (pageNum < 1 || pageNum > 6) return;
      setCurrentPage(pageNum);

      try {
        const iframe = iframeRef.current;
        const doc = iframe?.contentDocument;
        if (!doc) return;

        if (viewMode === 'single') {
          applySinglePageToIframe(pageNum);
        } else {
          applyContinuousModeToIframe();
          const target = doc.getElementById(`quote-page-${pageNum}`);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      } catch (err) {
        console.warn('scrollToPage error', err);
      }
    },
    [viewMode]
  );

  // 切换浏览模式（连续滚动 vs 单页专注）
  const handleToggleViewMode = (mode: 'continuous' | 'single') => {
    setViewMode(mode);
    if (mode === 'single') {
      applySinglePageToIframe(currentPage);
      Message.info(`已切换为单页分页模式（当前第 ${currentPage} 页）`);
    } else {
      applyContinuousModeToIframe();
      setTimeout(() => {
        const target = iframeRef.current?.contentDocument?.getElementById(`quote-page-${currentPage}`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      Message.info('已切换为连续多页滚动模式');
    }
  };

  // 连续滚动模式下：监听主 iframe 滚动，实时同步当前页码和左侧缩略图
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !modalVisible) return;

    let timer: any = null;
    const handleScroll = () => {
      if (viewMode !== 'continuous') return;
      if (timer) return;

      timer = setTimeout(() => {
        timer = null;
        try {
          const doc = iframe.contentDocument;
          if (!doc) return;
          const pages = doc.querySelectorAll('.a4-page');
          const scrollY = iframe.contentWindow?.scrollY || 0;

          let bestPage = 1;
          pages.forEach((p, idx) => {
            const el = p as HTMLElement;
            const pNum = Number(el.dataset.page || (idx + 1));
            if (el.offsetTop - 120 <= scrollY) {
              bestPage = pNum;
            }
          });

          if (bestPage >= 1 && bestPage <= 6) {
            setCurrentPage(bestPage);
          }
        } catch (e) {
          // ignore
        }
      }, 60);
    };

    const win = iframe.contentWindow;
    win?.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      win?.removeEventListener('scroll', handleScroll);
      if (timer) clearTimeout(timer);
    };
  }, [modalVisible, viewMode]);

  // 单页模式下：监听鼠标滚轮智能翻页与键盘翻页
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !modalVisible || viewMode !== 'single') return;

    let wheelCooldown = false;
    const handleWheel = (e: WheelEvent) => {
      if (wheelCooldown) return;

      const doc = iframe.contentDocument;
      if (!doc) return;
      const win = iframe.contentWindow;
      if (!win) return;

      const scrollY = win.scrollY || doc.documentElement.scrollTop || doc.body.scrollTop || 0;
      const viewportH = win.innerHeight || doc.documentElement.clientHeight;
      const docH = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);

      // 向下滚且到底部（带 20px 容差），翻到下一页
      if (e.deltaY > 15 && scrollY + viewportH >= docH - 20) {
        if (currentPage < 6) {
          wheelCooldown = true;
          scrollToPage(currentPage + 1);
          setTimeout(() => {
            wheelCooldown = false;
          }, 360);
        }
      }
      // 向上滚且在顶部（带 15px 容差），翻到上一页
      else if (e.deltaY < -15 && scrollY <= 15) {
        if (currentPage > 1) {
          wheelCooldown = true;
          scrollToPage(currentPage - 1);
          setTimeout(() => {
            wheelCooldown = false;
          }, 360);
        }
      }
    };

    // 键盘快捷键翻页 (PageDown / PageUp / 方向键)
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = iframe.contentDocument?.activeElement || document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (e.key === 'PageDown' || (!isTyping && (e.key === 'ArrowRight' || e.key === 'ArrowDown'))) {
        if (currentPage < 6) {
          e.preventDefault();
          scrollToPage(currentPage + 1);
        }
      } else if (e.key === 'PageUp' || (!isTyping && (e.key === 'ArrowLeft' || e.key === 'ArrowUp'))) {
        if (currentPage > 1) {
          e.preventDefault();
          scrollToPage(currentPage - 1);
        }
      }
    };

    const win = iframe.contentWindow;
    win?.addEventListener('wheel', handleWheel, { passive: true });
    win?.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      win?.removeEventListener('wheel', handleWheel);
      win?.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalVisible, viewMode, currentPage, scrollToPage]);

  // 切换编辑/预览模式
  const handleToggleEditMode = (mode: boolean) => {
    setIsEditing(mode);
    applyStateToIframe(mode, zoomPercent);
    Message.info(mode ? '已开启在线编辑模式：可直接在页面上点击打字修改' : '已切换为审阅预览模式');
  };

  // 保存当前修改（从 iframe 读取最新 HTML 并持久化，自动隔离单页模式临时类）
  const handleSaveDocument = () => {
    let htmlToSave = currentHtml;
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc && doc.documentElement) {
        // 保存前先暂时重置 zoom
        const container = doc.querySelector('.quote-doc-container') as HTMLElement;
        const oldZoom = container ? (container.style as any).zoom : '';
        if (container) (container.style as any).zoom = '100%';

        // 检查并暂时移除单页模式样式类，保证保存出来的 HTML 永远是干净完整的标准文档
        const isSingleMode = container?.classList.contains('single-page-mode');
        const activePages = doc.querySelectorAll('.single-page-active');
        if (container && isSingleMode) {
          container.classList.remove('single-page-mode');
        }
        activePages.forEach((p) => p.classList.remove('single-page-active'));

        // 读取编辑后的最新 HTML
        htmlToSave = '<!doctype html>\n' + doc.documentElement.outerHTML;

        // 还原单页模式状态
        if (container && isSingleMode) {
          container.classList.add('single-page-mode');
          activePages.forEach((p) => p.classList.add('single-page-active'));
        }

        // 还原 zoom
        if (container && oldZoom) (container.style as any).zoom = oldZoom;
      }
    } catch (e) {
      console.warn('Cannot read iframe content, fallback to state', e);
    }

    onDocumentChange({
      status: 'saved',
      savedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      content: htmlToSave,
    });
    setCurrentHtml(htmlToSave);
    setHasUnsavedEdits(false);
    Message.success('报价单文档修改已成功保存并同步到审批链路');
  };

  // 一键按最新表单数据重置
  const handleResetFromForm = () => {
    const freshHtml = generateQuoteHtml({
      ...data,
      watermark: getDraftWatermark(quoteStatus),
    });
    setCurrentHtml(freshHtml);
    setHasUnsavedEdits(true);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = freshHtml;
    }
    Message.success('已根据当前表单最新数据重新生成报价单');
  };

  // 打印或另存为 PDF
  const handlePrint = () => {
    if (!iframeRef.current?.contentWindow) {
      Message.warning('预览环境未就绪');
      return;
    }
    try {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } catch (err) {
      Message.error('调起打印失败，请使用浏览器自带打印功能');
    }
  };

  // 下载离线 HTML 文件
  const handleDownload = () => {
    const content = document.content || currentHtml;
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `报价单_${data.quote.quoteNo || '标准版'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    Message.success('已导出报价单离线 HTML 文件');
  };

  const handleOpenModal = () => {
    const html = getInitialHtml();
    setCurrentHtml(html);
    setModalVisible(true);
  };

  return (
    <div style={{ background: 'var(--color-bg-2)', padding: '16px', borderRadius: 6, border: '1px solid var(--color-border-2)' }}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Text bold style={{ fontSize: 14 }}>{ZKRT_QUOTE_TEMPLATE.name}</Text>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            1:1 标准件排版（6页A4、封面、项目整体报价盖章、公司介绍、六列表清单、自费项目与授权签章）
          </Text>
        </div>

        <div>
          {document.status === 'saved' ? (
            <Tag color="green" icon={<IconCheckCircle />}>✓ 已保存于 {document.savedAt}</Tag>
          ) : (
            <Tag color="orange">未保存 — 必须保存过才能提交审批</Tag>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button type="primary" icon={<IconEdit />} onClick={handleOpenModal}>
          在线预览与修改报价单
        </Button>
        <Button icon={<IconSave />} onClick={handleSaveDocument}>
          一键保存当前版本
        </Button>
        <Button icon={<IconDownload />} onClick={handleDownload}>
          下载报价单 HTML
        </Button>
      </div>

      {!canSubmit && quoteStatus === 'pending_quote' && (
        <div style={{ marginTop: 8 }}>
          <Text type="warning" style={{ fontSize: 12 }}>
            ⚠️ 提示：在提交审批前，请务必点击「在线预览与修改报价单」核对条款并保存终稿。
          </Text>
        </div>
      )}

      {/* 在线文档修改与审阅模态窗（94vh 大视口，支持一键全屏） */}
      <Modal
        className={`quote-workbench-modal ${isFullscreen ? 'is-fullscreen' : ''}`}
        wrapClassName={`quote-workbench-modal-wrapper ${isFullscreen ? 'is-fullscreen' : ''}`}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Text bold style={{ fontSize: 16 }}>报价单在线修改与审阅工作台</Text>
              <Tag color={isEditing ? 'arcoblue' : 'gray'}>
                {isEditing ? '在线编辑模式' : '只读审阅模式'}
              </Tag>
              {hasUnsavedEdits ? (
                <Tag color="red">存在未保存修改</Tag>
              ) : document.status === 'saved' ? (
                <Tag color="green" icon={<IconCheckCircle />}>已保存</Tag>
              ) : null}
            </div>

            {/* 窗口右上角快速全屏切换 */}
            <Tooltip content={isFullscreen ? '退出全屏工作台' : '展开为全屏大工作台'}>
              <Button
                size="mini"
                type="text"
                icon={isFullscreen ? <IconFullscreenExit style={{ fontSize: 16 }} /> : <IconFullscreen style={{ fontSize: 16 }} />}
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? '还原窗口' : '全屏模式'}
              </Button>
            </Tooltip>
          </div>
        }
        visible={modalVisible}
        alignCenter={false}
        onCancel={() => {
          if (hasUnsavedEdits) {
            Modal.confirm({
              title: '提示',
              content: '您有尚未保存的文档修改，确定要退出吗？',
              okText: '退出并不保存',
              cancelText: '留在此页',
              onOk: () => setModalVisible(false),
            });
          } else {
            setModalVisible(false);
          }
        }}
        footer={null}
        style={
          isFullscreen
            ? { width: '100vw', maxWidth: '100vw', height: '100vh', top: 0, margin: 0, paddingBottom: 0, display: 'flex', flexDirection: 'column' }
            : { width: '96vw', maxWidth: 1680, height: '94vh', top: '3vh', margin: '0 auto', paddingBottom: 0, display: 'flex', flexDirection: 'column' }
        }
      >
        {/* 顶部独立专业文档工具栏：宽幅响应式布局 */}
        <div
          style={{
            flexShrink: 0,
            padding: '8px 16px',
            background: 'var(--color-bg-2)',
            borderBottom: '1px solid var(--color-border-2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* 左侧：侧栏切换、编辑/审阅模式与页面缩放 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Tooltip content={showThumbnails ? '收起左侧页面缩略图' : '展开左侧页面缩略图'}>
              <Button
                size="small"
                type={showThumbnails ? 'primary' : 'outline'}
                icon={showThumbnails ? <IconMenuFold /> : <IconMenuUnfold />}
                onClick={() => setShowThumbnails(!showThumbnails)}
              >
                {showThumbnails ? '收起缩略图' : '页面缩略图'}
              </Button>
            </Tooltip>

            <Radio.Group
              type="button"
              size="small"
              value={isEditing ? 'edit' : 'preview'}
              onChange={(val) => handleToggleEditMode(val === 'edit')}
            >
              <Radio value="edit">✏️ 在线直接修改</Radio>
              <Radio value="preview">👁️ 只读审阅模式</Radio>
            </Radio.Group>

            {/* 缩放控制器 */}
            <Space size={4}>
              <Button
                size="mini"
                icon={<IconZoomOut />}
                disabled={zoomPercent <= 60}
                onClick={() => setZoomPercent((z) => Math.max(60, z - 10))}
              />
              <span style={{ fontSize: 12, minWidth: 38, textAlign: 'center', color: 'var(--color-text-2)' }}>
                {zoomPercent}%
              </span>
              <Button
                size="mini"
                icon={<IconZoomIn />}
                disabled={zoomPercent >= 150}
                onClick={() => setZoomPercent((z) => Math.min(150, z + 10))}
              />
              <Button
                size="mini"
                type={zoomPercent === 105 ? 'secondary' : 'outline'}
                onClick={() => setZoomPercent(105)}
              >
                适合宽度
              </Button>
            </Space>
          </div>

          {/* 中间核心：分页导航器与单页/连续模式切换 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--color-fill-2)',
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid var(--color-border-2)',
            }}
          >
            <Button
              size="mini"
              icon={<IconLeft />}
              disabled={currentPage <= 1}
              onClick={() => scrollToPage(currentPage - 1)}
            >
              上一页
            </Button>

            <Tag
              color="arcoblue"
              style={{
                fontWeight: 600,
                fontSize: 12,
                padding: '0 10px',
                height: 24,
                lineHeight: '24px',
                userSelect: 'none',
              }}
            >
              第 {currentPage} / 6 页
            </Tag>

            <Button
              size="mini"
              icon={<IconRight />}
              disabled={currentPage >= 6}
              onClick={() => scrollToPage(currentPage + 1)}
            >
              下一页
            </Button>

            <div style={{ height: 14, width: 1, background: 'var(--color-border-3)', margin: '0 4px' }} />

            <Radio.Group
              type="button"
              size="mini"
              value={viewMode}
              onChange={(val) => handleToggleViewMode(val as any)}
            >
              <Radio value="continuous">连续滚动</Radio>
              <Radio value="single">单页分页</Radio>
            </Radio.Group>
          </div>

          {/* 右侧：高频功能动作按钮组 */}
          <Space size={8} style={{ flexWrap: 'wrap' }}>
            <Button
              size="small"
              type="primary"
              status="success"
              icon={<IconSave />}
              onClick={handleSaveDocument}
            >
              保存修改并生效
            </Button>
            <Tooltip content="放弃当前修改，按最新报价表单数据重新生成">
              <Button
                size="small"
                icon={<IconRefresh />}
                onClick={handleResetFromForm}
              >
                重置
              </Button>
            </Tooltip>
            <Button
              size="small"
              icon={<IconPrinter />}
              onClick={handlePrint}
            >
              打印 / 另存为 PDF
            </Button>
            <Button
              size="small"
              icon={<IconDownload />}
              onClick={handleDownload}
            >
              下载 HTML
            </Button>
            <Button
              size="small"
              type={isFullscreen ? 'primary' : 'default'}
              icon={isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? '退出全屏' : '全屏工作台'}
            </Button>
          </Space>
        </div>

        {/* 操作指导提示条 */}
        <div
          style={{
            flexShrink: 0,
            padding: '6px 16px',
            background: isEditing ? '#eef4ff' : 'var(--color-fill-2)',
            borderBottom: '1px solid var(--color-border-2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
          }}
        >
          <Text style={{ color: 'var(--color-text-1)', fontWeight: isEditing ? 500 : 400 }}>
            {isEditing
              ? '💡 已开启所见即所得修改：您可以直接在页面中点击打字修改；👈 点击左侧缩略图或上方按钮可快速翻页跳转。'
              : '当前处于只读审阅模式。点击上方「在线直接修改」即可修改页面文字；👈 点击左侧缩略图可快速定位。'}
          </Text>
          <Text style={{ color: 'var(--color-text-2)', fontSize: 11, whiteSpace: 'nowrap', marginLeft: 12 }}>
            6 页标准 A4 规格 · 支持单页专注 / 连续滚动 · 左侧缩略图联动
          </Text>
        </div>

        {/* 主工作区：左侧缩略图导航栏 + 右侧隔离沙箱 iframe */}
        <div
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          {/* 左侧页面预览缩略图侧边栏 */}
          <QuotePageThumbnails
            currentPage={currentPage}
            onSelectPage={scrollToPage}
            collapsed={!showThumbnails}
            onToggleCollapse={() => setShowThumbnails(!showThumbnails)}
            customerName={data.quote.basicInfo?.customerName}
            projectName={data.quote.basicInfo?.projectName}
            grandTotal={data.breakdown.grandTotal || data.quote.fileFlow?.quoteAmount}
          />

          {/* 右侧主文档预览与编辑容器 */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              height: '100%',
              position: 'relative',
              background: '#525659',
              overflow: 'hidden',
            }}
          >
            <iframe
              ref={iframeRef}
              title="Quote Document Frame"
              srcDoc={currentHtml}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
                background: '#525659',
              }}
              onLoad={handleIframeLoad}
            />

            {/* 单页模式浮动交互件：左右半透明大翻页按钮 + 底部悬浮控制胶囊 */}
            {viewMode === 'single' && (
              <>
                {/* 左翻页悬浮大按钮 */}
                {currentPage > 1 && (
                  <button
                    type="button"
                    onClick={() => scrollToPage(currentPage - 1)}
                    title="上一页 (Page Up / 滚轮向上 / ← 方向键)"
                    style={{
                      position: 'absolute',
                      left: 20,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(20, 24, 31, 0.65)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      fontSize: 22,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                      transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      zIndex: 30,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(22, 93, 255, 0.9)';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(20, 24, 31, 0.65)';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    }}
                  >
                    <IconLeft />
                  </button>
                )}

                {/* 右翻页悬浮大按钮 */}
                {currentPage < 6 && (
                  <button
                    type="button"
                    onClick={() => scrollToPage(currentPage + 1)}
                    title="下一页 (Page Down / 滚轮向下 / → 方向键)"
                    style={{
                      position: 'absolute',
                      right: 20,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(20, 24, 31, 0.65)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      fontSize: 22,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                      transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      zIndex: 30,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(22, 93, 255, 0.9)';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(20, 24, 31, 0.65)';
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    }}
                  >
                    <IconRight />
                  </button>
                )}

                {/* 底部悬浮控制条 */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 24,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(20, 24, 31, 0.85)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: 30,
                    padding: '6px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
                    color: '#ffffff',
                    zIndex: 30,
                    userSelect: 'none',
                  }}
                >
                  <Button
                    size="mini"
                    type="text"
                    disabled={currentPage <= 1}
                    icon={<IconLeft style={{ color: currentPage <= 1 ? 'rgba(255,255,255,0.3)' : '#ffffff' }} />}
                    onClick={() => scrollToPage(currentPage - 1)}
                    style={{ color: currentPage <= 1 ? 'rgba(255,255,255,0.3)' : '#ffffff' }}
                  >
                    上一页
                  </Button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {[1, 2, 3, 4, 5, 6].map((p) => (
                      <div
                        key={p}
                        onClick={() => scrollToPage(p)}
                        title={`点击快速跳转至第 ${p} 页`}
                        style={{
                          width: p === currentPage ? 22 : 8,
                          height: 8,
                          borderRadius: 4,
                          background: p === currentPage ? '#165dff' : 'rgba(255, 255, 255, 0.35)',
                          cursor: 'pointer',
                          transition: 'all 0.25s ease',
                        }}
                      />
                    ))}
                    <span style={{ fontSize: 12, marginLeft: 8, fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)' }}>
                      第 {currentPage} / 6 页
                    </span>
                  </div>

                  <Button
                    size="mini"
                    type="text"
                    disabled={currentPage >= 6}
                    icon={<IconRight style={{ color: currentPage >= 6 ? 'rgba(255,255,255,0.3)' : '#ffffff' }} />}
                    onClick={() => scrollToPage(currentPage + 1)}
                    style={{ color: currentPage >= 6 ? 'rgba(255,255,255,0.3)' : '#ffffff' }}
                  >
                    下一页
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}


