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
      className="contract-text-viewer"
      style={{
        background: "var(--ds-doc-paper)",
        padding: 16,
        borderRadius: 'var(--radius-md)',
        maxHeight: 'calc(100vh - 300px)',
        overflow: 'auto',
        fontSize: 'var(--text-sm)',
        lineHeight: 1.8,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
