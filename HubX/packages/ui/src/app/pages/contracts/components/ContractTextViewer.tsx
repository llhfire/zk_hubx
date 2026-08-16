import type { Contract } from '../types';
import { renderContractDocument } from '../templates';

interface Props {
  contract: Contract;
}

export function ContractTextViewer({ contract }: Props) {
  const html = (() => {
    try {
      return renderContractDocument(contract.current);
    } catch {
      return `<p style="color:var(--grey-400)">合同模板渲染失败</p>`;
    }
  })();

  return (
    <div
      style={{
        background: '#fff',
        padding: 16,
        borderRadius: 8,
        maxHeight: 'calc(100vh - 300px)',
        overflow: 'auto',
        fontSize: 14,
        lineHeight: 1.8,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
