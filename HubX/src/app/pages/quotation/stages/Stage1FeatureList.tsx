import { useMemo, useState } from 'react';
import {
  Button, Card, Dropdown, Empty, Input, Menu, Message, Popover, Space, Table, Typography,
} from '@arco-design/web-react';
import {
  IconPlusCircle, IconMinusCircle, IconImport, IconSend, IconDown, IconApps,
} from '@arco-design/web-react/icon';
import { useQuotation } from '../QuotationContext';
import { validateFeatureList } from '../quoteFlow';
import type { FeatureModule, FeatureSubFeature, Quote } from '../types';

const { Text, Title } = Typography;

export interface StageProps {
  quote: Quote;
  readonly: boolean;
}

/** 生成稳定的本地 id */
function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function Stage1FeatureList({ quote, readonly }: StageProps) {
  const { saveFeatureList, submitFeatureList, setDeadline } = useQuotation();
  const [localList, setLocalList] = useState<FeatureModule[]>(quote.featureList);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // 编辑态以本地为准，只读态以 quote 为准
  const featureList = readonly ? quote.featureList : localList;
  // 底部浮动栏计数：一级模块数与二级子功能总数
  const subCount = useMemo(() => featureList.reduce((n, m) => n + m.subFeatures.length, 0), [featureList]);

  const persist = (next: FeatureModule[]) => {
    setLocalList(next);
    saveFeatureList(quote.id, next);
  };

  const addModule = (afterModuleId?: string) => {
    const moduleId = uid('m');
    const newModule = {
      id: moduleId,
      name: '',
      sort: 0,
      subFeatures: [{ id: uid('fs'), name: '', description: '' }],
    };
    let next: FeatureModule[];
    if (afterModuleId) {
      const idx = featureList.findIndex((m) => m.id === afterModuleId);
      if (idx >= 0) {
        next = [...featureList.slice(0, idx + 1), newModule, ...featureList.slice(idx + 1)];
      } else {
        next = [...featureList, newModule];
      }
    } else {
      next = [...featureList, newModule];
    }
    // 重新计算 sort
    next = next.map((m, i) => ({ ...m, sort: i + 1 }));
    persist(next);
  };

  const addSubFeature = (moduleId: string, afterSubId?: string) => {
    const next = featureList.map((m) => {
      if (m.id !== moduleId) return m;
      const newSub = { id: uid('fs'), name: '', description: '' };
      if (afterSubId) {
        const idx = m.subFeatures.findIndex((f) => f.id === afterSubId);
        if (idx >= 0) {
          return { ...m, subFeatures: [...m.subFeatures.slice(0, idx + 1), newSub, ...m.subFeatures.slice(idx + 1)] };
        }
      }
      return { ...m, subFeatures: [...m.subFeatures, newSub] };
    });
    persist(next);
  };

  const updateField = <K extends keyof FeatureSubFeature>(
    moduleId: string,
    subId: string,
    key: K,
    value: FeatureSubFeature[K],
  ) => {
    const next = featureList.map((m) =>
      m.id === moduleId
        ? {
            ...m,
            subFeatures: m.subFeatures.map((f) => (f.id === subId ? { ...f, [key]: value } : f)),
          }
        : m,
    );
    persist(next);
  };

  const removeSubFeature = (moduleId: string, subId: string) => {
    const module = featureList.find((m) => m.id === moduleId);
    if (!module) return;
    // 如果模块只有一个子功能，删除子功能的同时删除整个模块
    if (module.subFeatures.length <= 1) {
      persist(featureList.filter((m) => m.id !== moduleId));
    } else {
      persist(featureList.map((m) => (m.id === moduleId ? { ...m, subFeatures: m.subFeatures.filter((f) => f.id !== subId) } : m)));
    }
  };

  const removeModule = (moduleId: string) => {
    persist(featureList.filter((m) => m.id !== moduleId));
  };

  const updateModuleName = (moduleId: string, name: string) => {
    const next = featureList.map((m) => (m.id === moduleId ? { ...m, name } : m));
    persist(next);
  };

  const handleSubmit = () => {
    const issues = validateFeatureList(featureList);
    if (issues.length) {
      Message.warning(issues[0].message);
      return;
    }
    if (quote.deadline) {
      setDeadline(quote.id, quote.deadline, quote.ccSalesNames);
    }
    submitFeatureList(quote.id);
    Message.success('功能清单已确认，转派技术评估');
  };

  const columns = [
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>序号</span>, dataIndex: 'seq', width: 56,
      render: (_: unknown, record: { seq: number }) => <Text type="secondary">{record.seq}</Text>,
    },
    {
      title: '一级模块', dataIndex: 'moduleName', width: 200,
      render: (name: string, record: { moduleId: string }) => (
        <div className="module-name-cell" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
          {readonly ? (
            <Text bold style={{ whiteSpace: 'nowrap' }}>{name}</Text>
          ) : (
            <Input size="small" value={name} onChange={(v) => updateModuleName(record.moduleId, v)} style={{ fontWeight: 600, width: '100%' }} />
          )}
          {!readonly && (
            <Button
              type="text" size="mini" status="success" icon={<IconPlusCircle />}
              className="module-add-btn"
              onClick={() => addModule(record.moduleId)}
              title="在下方新增一级模块"
            />
          )}
        </div>
      ),
    },
    {
      title: '二级子功能', dataIndex: 'name', width: 250,
      render: (name: string, record: { moduleId: string; id: string }) => (
        <div className="sub-feature-cell" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {readonly ? (
            <Text>{name}</Text>
          ) : (
            <>
              <Input id={`sub-feature-${record.id}`} size="small" value={name} onChange={(v) => updateField(record.moduleId, record.id, 'name', v)} style={{ flex: 1 }} />
              <Button
                type="text" size="mini" status="success" icon={<IconPlusCircle />}
                className="sub-feature-add-btn"
                onClick={() => addSubFeature(record.moduleId, record.id)}
                title="在下方新增子功能"
              />
            </>
          )}
        </div>
      ),
    },
    {
      title: '功能描述与交互规则', dataIndex: 'description',
      render: (desc: string, record: { moduleId: string; id: string }) =>
        readonly ? (
          <Text>{desc || '-'}</Text>
        ) : (
          <Input.TextArea
            id={`desc-${record.id}`}
            autoSize={{ minRows: 1, maxRows: 3 }}
            size="small"
            value={desc}
            onChange={(v) => updateField(record.moduleId, record.id, 'description', v)}
            placeholder="详细交互逻辑与范围边界"
          />
        ),
    },
    {
      title: '备注', dataIndex: 'remark', width: 160,
      render: (remark: string | undefined, record: { moduleId: string; id: string }) =>
        readonly ? (
          <Text type="secondary">{remark || '-'}</Text>
        ) : (
          <Input size="small" value={remark ?? ''} onChange={(v) => updateField(record.moduleId, record.id, 'remark', v)} placeholder="选填" />
        ),
    },
    {
      title: '操作', dataIndex: 'op', width: 100, fixed: 'right' as const,
      render: (_: unknown, record: { moduleId: string; id: string; empty?: boolean }) => {
        if (readonly) return null;
        // 占位行：删除整个模块（无需确认）
        if (record.empty) {
          return (
            <Button type="text" size="small" status="danger" icon={<IconMinusCircle />} onClick={() => removeModule(record.moduleId)} />
          );
        }
        // 检查当前模块是否有多个子功能，以及当前子功能是否有内容
        const module = featureList.find((m) => m.id === record.moduleId);
        const hasMultipleSubs = module && module.subFeatures.length > 1;
        const currentSub = module?.subFeatures.find((f) => f.id === record.id);
        const isEmpty = !currentSub?.name && !currentSub?.description;
        // 如果是待确认状态，显示确认按钮
        if (pendingDeleteId === record.id) {
          return (
            <Button size="mini" status="danger" onClick={() => {
              removeSubFeature(record.moduleId, record.id);
              setPendingDeleteId(null);
            }}>
              确认
            </Button>
          );
        }
        // 如果子功能为空，或者模块只有一个子功能，直接删除；否则需要确认
        return (
          <Button type="text" size="small" status="danger" icon={<IconMinusCircle />} onClick={() => {
            if (isEmpty || !hasMultipleSubs) {
              removeSubFeature(record.moduleId, record.id);
            } else {
              setPendingDeleteId(record.id);
            }
          }} />
        );
      },
    },
  ];

  // 把树展平成行，便于 Table 渲染并保留模块归属
  let seqCounter = 0;
  const rows = featureList.flatMap((m) => {
    if (m.subFeatures.length === 0) {
      seqCounter += 1;
      return [{ moduleId: m.id, moduleName: m.name, id: 'empty', name: '（暂无子功能）', description: '', remark: '', empty: true, seq: seqCounter }];
    }
    return m.subFeatures.map((f) => {
      seqCounter += 1;
      return { moduleId: m.id, moduleName: m.name, ...f, seq: seqCounter };
    });
  });

  return (
    <>
      <Card
        title={<Title heading={6} style={{ margin: 0 }}>工作台一 · 产品经理功能清单</Title>}
      extra={
        !readonly && (
          <Space>
            <Button icon={<IconImport />} onClick={() => Message.info('Excel 导入待后端接入，本轮可手动录入')}>导入</Button>
          </Space>
        )
      }
    >
      {!readonly && (
        <Space style={{ marginBottom: 12 }}>
          <Button type="primary" icon={<IconPlusCircle />} onClick={addModule}>新增一级模块</Button>
          <Dropdown
            droplist={
              <Menu
                onClickMenuItem={(key: string) => addSubFeature(key)}
                style={{ maxHeight: 240, overflow: 'auto' }}
              >
                {featureList.length === 0 ? (
                  <Menu.Item key="__empty" disabled>暂无一级模块，请先新增</Menu.Item>
                ) : (
                  featureList.map((m) => (
                    <Menu.Item key={m.id} icon={<IconPlusCircle />}>{m.name}</Menu.Item>
                  ))
                )}
              </Menu>
            }
            position="bl"
            disabled={featureList.length === 0}
          >
            <Button icon={<IconPlusCircle />}>新增子功能 <IconDown style={{ fontSize: 12 }} /></Button>
          </Dropdown>
        </Space>
      )}

      {rows.length === 0 || (rows.length === 1 && rows[0].empty) ? (
        <Empty description="暂无功能清单，请新增模块" />
      ) : (
        <Table
          columns={columns}
          data={rows}
          rowKey={(row: { id: string }) => row.id}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      )}

      <style>{`
        .module-add-btn, .sub-feature-add-btn { opacity: 0; transition: opacity 0.15s; }
        .module-name-cell:hover .module-add-btn { opacity: 1; }
        .sub-feature-cell:hover .sub-feature-add-btn { opacity: 1; }
      `}</style>
    </Card>

    {/* 页面底部浮动栏：一级/二级计数 + 提交工时 */}
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        marginTop: 16,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 16px',
        background: 'var(--color-bg-2)',
        border: '1px solid var(--color-border-2)',
        borderRadius: 8,
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.06)',
      }}
    >
      <Space size={20}>
        <Dropdown
          trigger="click"
          position="bl"
          droplist={
            <Menu style={{ maxHeight: 400, overflow: 'auto' }}>
              {featureList.map((m) => (
                <Menu.SubMenu key={m.id} title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 120 }}>
                    <span>{m.name || '未命名模块'}</span>
                    <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>{m.subFeatures.length}</span>
                  </div>
                }>
                  {m.subFeatures.length === 0 ? (
                    <Menu.Item key="empty" disabled>暂无子功能</Menu.Item>
                  ) : (
                    m.subFeatures.map((f) => (
                      <Menu.Item key={f.id} onClick={() => {
                        const el = document.getElementById(`desc-${f.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setTimeout(() => {
                            el.focus();
                            const len = el.value?.length || 0;
                            el.setSelectionRange(len, len);
                          }, 300);
                        }
                      }}>
                        {f.name || '未命名'}
                      </Menu.Item>
                    ))
                  )}
                </Menu.SubMenu>
              ))}
            </Menu>
          }
        >
          <Button style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconApps style={{ fontSize: 18 }} />
            <span>模块 <Text bold>{featureList.length}</Text> 个</span>
            <span>功能 <Text bold>{subCount}</Text> 项</span>
          </Button>
        </Dropdown>
      </Space>
      {!readonly && (
        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            提交后功能清单锁定，技术评估阶段将基于此生成人天评估表
          </Text>
          <Button type="primary" icon={<IconSend />} onClick={handleSubmit}>校验并提交工时评估</Button>
        </Space>
      )}
    </div>
    </>
  );
}
