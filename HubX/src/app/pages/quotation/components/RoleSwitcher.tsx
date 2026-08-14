import { Button } from '@arco-design/web-react';
import { useQuotation } from '../QuotationContext';
import { QUOTE_ROLES } from '../types';
import type { QuoteRole } from '../types';

/**
 * 报价流程角色切换器。
 * 原型阶段无真实登录态，用它在六种角色间切换以演示不同视角的工作台内容。
 */
export function RoleSwitcher() {
  const { currentRole, setCurrentRole } = useQuotation();
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ color: 'var(--color-text-3)', fontSize: 12, marginRight: 4 }}>当前视角</span>
      {QUOTE_ROLES.map((r) => (
        <Button
          key={r.key}
          size="mini"
          type={currentRole === r.key ? 'primary' : 'secondary'}
          onClick={() => setCurrentRole(r.key as QuoteRole)}
        >
          {r.name}
        </Button>
      ))}
    </div>
  );
}
