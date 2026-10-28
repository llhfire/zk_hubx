import { Button, PageHeader, PageShell, Result, Space, Typography } from '@/design-system';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router';

const { Paragraph } = Typography;

/**
 * 路由级错误边界。
 *
 * 原先路由表没有 `errorElement`：任一页面组件在渲染期抛错（含 lazy chunk 加载失败、
 * 后端返回畸形数据导致的取属性异常），React Router 会卸载整棵树 —— 用户看到白屏，
 * 控制台之外的错误信息完全丢失。这里接住错误，保留「重试 / 回工作台」两条出路。
 *
 * 注意：这是渲染期兜底，不是请求错误的替代品；接口失败仍应在页面内自行降级。
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = '页面出错了';
  let detail = '';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText || ''}`.trim();
    detail = typeof error.data === 'string' ? error.data : '';
  } else if (error instanceof Error) {
    title = '页面出错了';
    detail = error.message;
  } else if (typeof error === 'string') {
    detail = error;
  }

  return (
    <PageShell>
      <PageHeader title={title} />
      <Result
        status="500"
        subTitle="该页面渲染时发生异常。可以重试加载，或返回工作台继续其它操作。"
        extra={
          <Space>
            <Button type="primary" onClick={() => window.location.reload()}>
              重新加载
            </Button>
            <Button onClick={() => navigate('/')}>返回工作台</Button>
          </Space>
        }
      >
        {detail && <Paragraph type="secondary">{detail}</Paragraph>}
      </Result>
    </PageShell>
  );
}
