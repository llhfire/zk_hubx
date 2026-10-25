import { describe, expect, it } from 'vitest';
import { publishContractTemplate, validateTemplateVariables, type VersionedContractTemplate } from '../templateStore';

const draft: VersionedContractTemplate = { id: 't1', name: '模板', signingEntity: '中科软通', productCategories: ['软件开发'], status: 'draft', isDefault: false, draftHtml: '<p>{{customerName}}</p>', versions: [], updatedAt: '2026-08-31' };

describe('contract template store', () => {
  it('只允许白名单变量', () => {
    expect(validateTemplateVariables('<p>{{customerName}} {{unknown}}</p>')).toEqual({ variables: ['customerName', 'unknown'], invalid: ['unknown'] });
  });

  it('发布形成不可变版本而不覆盖旧版', () => {
    const v1 = publishContractTemplate(draft, '张三', '2026-08-31T01:00:00Z');
    const v2 = publishContractTemplate({ ...v1, draftHtml: '<p>{{customerName}} V2</p>' }, '张三', '2026-08-31T02:00:00Z');
    expect(v2.versions).toHaveLength(2);
    expect(v2.versions[0].html).toBe('<p>{{customerName}}</p>');
    expect(v2.versions[1].versionNo).toBe(2);
  });
});
