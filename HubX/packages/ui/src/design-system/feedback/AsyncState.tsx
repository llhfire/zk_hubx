import { Button, Spin } from '@arco-design/web-react';
import type { ReactNode } from 'react';
import '../components.css';

export type AsyncStatus = 'loading' | 'error' | 'forbidden' | 'ready';

export interface AsyncStateProps {
  status: AsyncStatus;
  /** 加载态辅助文案，适用于需要解释等待原因的详情页。 */
  loadingText?: ReactNode;
  /** 失败文案，默认「加载失败」 */
  errorText?: ReactNode;
  /** 无权限文案，默认「无权查看」 */
  forbiddenText?: ReactNode;
  onRetry?: () => void;
  children?: ReactNode;
}

/**
 * 异步三态：加载 / 失败 / 无权限。
 *
 * 页面此前各自拼 `loading ? <Spin/> : error ? <Empty/> : ...`，
 * 失败与无权限经常被渲染成空白——用户分不清「没有数据」和「没加载出来」。
 */
export function AsyncState({ status, loadingText, errorText = '加载失败', forbiddenText = '无权查看该内容', onRetry, children }: AsyncStateProps) {
  if (status === 'ready') return <>{children}</>;

  if (status === 'loading') {
    return (
      <div className="hubx-async-state">
        <Spin />
        {loadingText && <span>{loadingText}</span>}
      </div>
    );
  }

  return (
    <div className="hubx-async-state">
      <span>{status === 'forbidden' ? forbiddenText : errorText}</span>
      {status === 'error' && onRetry && (
        <Button size="small" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  );
}
