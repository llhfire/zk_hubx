import { Button, PageHeader, PageShell, Result } from '@/design-system';
import { useNavigate } from 'react-router';

/**
 * 404 兜底页。
 *
 * 路由表原先没有 catch-all，访问未知路径时 React Router 渲染空白 —— 用户看到的是
 * "整页白屏 + 侧边栏还在"，无法判断是地址错了还是系统挂了。挂在 MainLayout 的
 * children 末尾（`path: "*"`），保持侧边栏可用。
 */
export function NotFound() {
  const navigate = useNavigate();
  return (
    <PageShell>
      <PageHeader title="页面不存在" />
      <Result
        status="404"
        subTitle="地址可能有误，或该页面已被移除。"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            返回工作台
          </Button>
        }
      />
    </PageShell>
  );
}
