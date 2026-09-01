import { useMemo, useState } from 'react';
import {
  Button, Card, Checkbox, Dropdown, Empty, Input, Menu, Message, Modal, Popover, Space, Table, Tag, Typography,
} from '@arco-design/web-react';
import {
  IconPlusCircle, IconMinusCircle, IconImport, IconSend, IconDown, IconApps, IconDelete, IconDownload,
} from '@arco-design/web-react/icon';
import { useQuotation } from '../QuotationContext';
import { validateFeatureList } from '../quoteFlow';
import { PLATFORM_OPTIONS } from '../types';
import type { EndpointConfig, FeatureModule, FeatureSubFeature, Quote } from '../types';
import { FeatureListUpload } from '../components/FeatureListUpload';

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
  const { saveFeatureList, submitFeatureList, setDeadline, updateQuote, isLeadFrozen } = useQuotation();
  const leadFrozen = isLeadFrozen(quote.id);
  const [localList, setLocalList] = useState<FeatureModule[]>(quote.featureList);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingEndpoint, setEditingEndpoint] = useState<string | null>(null);
  const [importVisible, setImportVisible] = useState(false);

  // 编辑态以本地为准，只读态以 quote 为准
  const featureList = readonly ? quote.featureList : localList;
  const endpointConfigs = quote.endpointConfigs || [];
  // 底部浮动栏计数：一级模块数与二级子功能总数
  const subCount = useMemo(() => featureList.reduce((n, m) => n + m.subFeatures.length, 0), [featureList]);

  const persist = (next: FeatureModule[]) => {
    setLocalList(next);
    saveFeatureList(quote.id, next);
  };

  // ─── 端配置函数 ─────────────────────────────────────────

  const addEndpoint = () => {
    const newEpId = uid('ep');
    const newEp: EndpointConfig = { id: newEpId, name: '新端', platforms: [] };
    updateQuote(quote.id, (q) => ({
      ...q,
      endpointConfigs: [...q.endpointConfigs, newEp],
    }));
    // 同时在清单末尾新增一个属于该端的空模块
    const newModule: FeatureModule = {
      id: uid('m'),
      name: '',
      sort: featureList.length + 1,
      endpointId: newEpId,
      subFeatures: [{ id: uid('fs'), name: '', description: '' }],
    };
    persist([...featureList, newModule]);
    // 焦点移到端名称输入框
    setTimeout(() => {
      const inputs = document.querySelectorAll('input');
      for (const input of inputs) {
        if (input.value === '新端') { input.focus(); input.select(); break; }
      }
    }, 100);
  };

  const updateEndpoint = (epId: string, patch: Partial<EndpointConfig>) => {
    updateQuote(quote.id, (q) => ({
      ...q,
      endpointConfigs: q.endpointConfigs.map((ep) => (ep.id === epId ? { ...ep, ...patch } : ep)),
    }));
  };

  const removeEndpoint = (epId: string) => {
    updateQuote(quote.id, (q) => ({
      ...q,
      endpointConfigs: q.endpointConfigs.filter((ep) => ep.id !== epId),
      featureList: q.featureList.map((m) => (m.endpointId === epId ? { ...m, endpointId: '' } : m)),
    }));
  };

  const toggleEndpointPlatform = (epId: string, platformId: string) => {
    updateQuote(quote.id, (q) => ({
      ...q,
      endpointConfigs: q.endpointConfigs.map((ep) => {
        if (ep.id !== epId) return ep;
        const platforms = ep.platforms.includes(platformId)
          ? ep.platforms.filter((p) => p !== platformId)
          : [...ep.platforms, platformId];
        return { ...ep, platforms };
      }),
    }));
  };

  const addModule = (afterModuleId?: string, endpointId?: string) => {
    const moduleId = uid('m');
    const newModule = {
      id: moduleId,
      name: '',
      sort: 0,
      endpointId: endpointId || endpointConfigs[0]?.id || '',
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
    // 焦点移到新模块的名称输入框
    setTimeout(() => {
      const rows = document.querySelectorAll('tr');
      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        const input = lastRow.querySelector('input[type="text"], input:not([type])') as HTMLInputElement;
        if (input) { input.focus(); input.select(); }
      }
    }, 100);
  };

  const updateModuleEndpoint = (moduleId: string, endpointId: string) => {
    const next = featureList.map((m) => (m.id === moduleId ? { ...m, endpointId } : m));
    persist(next);
  };

  const addSubFeature = (moduleId: string, afterSubId?: string) => {
    const newSubId = uid('fs');
    const next = featureList.map((m) => {
      if (m.id !== moduleId) return m;
      const newSub = { id: newSubId, name: '', description: '' };
      if (afterSubId) {
        const idx = m.subFeatures.findIndex((f) => f.id === afterSubId);
        if (idx >= 0) {
          return { ...m, subFeatures: [...m.subFeatures.slice(0, idx + 1), newSub, ...m.subFeatures.slice(idx + 1)] };
        }
      }
      return { ...m, subFeatures: [...m.subFeatures, newSub] };
    });
    persist(next);
    // 焦点移到新子功能的描述输入框
    setTimeout(() => {
      const el = document.getElementById(`desc-${newSubId}`);
      if (el) el.focus();
    }, 100);
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

  const handleExport = async () => {
    if (featureList.length === 0) {
      Message.warning('当前没有可导出的功能清单');
      return;
    }
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('功能清单');
      sheet.columns = [
        { header: '模块', key: 'module', width: 22 }, { header: '子功能', key: 'feature', width: 26 },
        { header: '描述', key: 'description', width: 48 }, { header: '备注', key: 'remark', width: 24 },
        { header: '端', key: 'endpoint', width: 18 },
      ];
      featureList.forEach((module) => {
        const endpoint = endpointConfigs.find((item) => item.id === module.endpointId)?.name || '';
        module.subFeatures.forEach((feature) => sheet.addRow({
          module: module.name, feature: feature.name, description: feature.description,
          remark: feature.remark || '', endpoint,
        }));
      });
      sheet.getRow(1).font = { bold: true };
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quote.quoteNo}_功能清单.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      Message.success('功能清单已导出');
    } catch {
      Message.error('导出失败，请重试');
    }
  };

  const columns = [
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>序号</span>, dataIndex: 'seq', width: 56,
      render: (_: unknown, record: { seq: number }) => <Text type="secondary">{record.seq}</Text>,
    },
    {
      title: '端', dataIndex: 'endpointId', width: 130,
      render: (epId: string, record: Record<string, unknown>) => {
        const ep = endpointConfigs.find((e) => e.id === epId);
        if (!ep) return <Text type="secondary">-</Text>;
        const platformNames = (ep.platforms || []).map((pid: string) => PLATFORM_OPTIONS.find((p) => p.id === pid)?.name || pid);
        const isEndpointStart = record._isEndpointStart as boolean;
        if (!isEndpointStart) return null;
        return (
          <div style={{ borderRight: '1px solid var(--color-border-2)', paddingRight: 8, paddingTop: 8, paddingBottom: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{ep.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {platformNames.map((name: string) => (
                <Tag key={name} size="small" color="arcoblue" style={{ width: 'fit-content' }}>{name}</Tag>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      title: '一级模块', dataIndex: 'moduleName', width: 200,
      render: (name: string, record: { moduleId: string; endpointId: string }) => (
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
  // 记录每个端的模块数量，用于计算占位高度
  const epModuleCounts: Record<string, number> = {};
  const epFirstModId: Record<string, string> = {};
  for (const m of featureList) {
    const epId = m.endpointId || '';
    epModuleCounts[epId] = (epModuleCounts[epId] || 0) + 1;
    if (!epFirstModId[epId]) epFirstModId[epId] = m.id;
  }

  const rows = featureList.flatMap((m) => {
    const isFirstOfEndpoint = epFirstModId[m.endpointId] === m.id;
    if (m.subFeatures.length === 0) {
      seqCounter += 1;
      return [{ moduleId: m.id, moduleName: m.name, endpointId: m.endpointId, _isEndpointStart: isFirstOfEndpoint, id: 'empty', name: '（暂无子功能）', description: '', remark: '', empty: true, seq: seqCounter }];
    }
    return m.subFeatures.map((f, fIdx) => {
      seqCounter += 1;
      return { moduleId: m.id, moduleName: m.name, endpointId: m.endpointId, _isEndpointStart: isFirstOfEndpoint && fIdx === 0, ...f, seq: seqCounter };
    });
  });

  return (
    <>
      <Card
        title={<Title heading={6} style={{ margin: 0 }}>数据流转 · 工作台一 · 在线功能清单</Title>}
      extra={
        <Space>
          {!readonly && <Button icon={<IconImport />} onClick={() => setImportVisible(true)}>导入</Button>}
          <Button icon={<IconDownload />} onClick={handleExport}>导出</Button>
        </Space>
      }
    >
      {/* 端配置区域已移至表格端列中 */}

      {!readonly && (
        <Space style={{ marginBottom: 12 }}>
          <Button icon={<IconPlusCircle />} onClick={addEndpoint}>新增端</Button>
          <Dropdown
            trigger="click"
            droplist={
              <Menu onClickMenuItem={(key: string) => addModule(undefined, key)}>
                {endpointConfigs.length === 0 ? (
                  <Menu.Item key="__empty" disabled>请先新增端</Menu.Item>
                ) : (
                  endpointConfigs.map((ep) => (
                    <Menu.Item key={ep.id}>{ep.name}</Menu.Item>
                  ))
                )}
              </Menu>
            }
            disabled={endpointConfigs.length === 0}
          >
            <Button icon={<IconPlusCircle />}>新增一级模块 <IconDown style={{ fontSize: 12 }} /></Button>
          </Dropdown>
          <Dropdown
            trigger="click"
            droplist={
              <Menu style={{ maxHeight: 300, overflow: 'auto' }}>
                {endpointConfigs.length === 0 ? (
                  <Menu.Item key="__empty" disabled>请先新增端和模块</Menu.Item>
                ) : (
                  endpointConfigs.map((ep) => {
                    const epModules = featureList.filter((m) => m.endpointId === ep.id);
                    return (
                      <Menu.SubMenu key={ep.id} title={ep.name}>
                        {epModules.length === 0 ? (
                          <Menu.Item key="__empty_mod" disabled>暂无模块</Menu.Item>
                        ) : (
                          epModules.map((m) => (
                            <Menu.Item key={m.id} onClick={() => addSubFeature(m.id)}>
                              {m.name || '未命名模块'}
                            </Menu.Item>
                          ))
                        )}
                      </Menu.SubMenu>
                    );
                  })
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--color-fill-1)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 56 }}>序号</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 130 }}>端</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 200 }}>一级模块</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 250 }}>二级子功能</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500 }}>功能描述与交互规则</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 160 }}>备注</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border-2)', fontWeight: 500, width: 100 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // 计算每个端的行数（用于 rowspan）
                const epRowSpans: Record<string, number> = {};
                const epFirstRowIdx: Record<string, number> = {};
                let idx = 0;
                for (const row of rows) {
                  const epId = row.endpointId || '';
                  if (!(epId in epFirstRowIdx)) {
                    epFirstRowIdx[epId] = idx;
                    epRowSpans[epId] = 0;
                  }
                  epRowSpans[epId]++;
                  idx++;
                }

                return rows.map((row, rowIdx) => {
                  const epId = row.endpointId || '';
                  const isFirstOfEp = epFirstRowIdx[epId] === rowIdx;
                  const rowspan = isFirstOfEp ? epRowSpans[epId] : 0;
                  const ep = endpointConfigs.find((e) => e.id === epId);
                  const platformNames = ep ? (ep.platforms || []).map((pid: string) => PLATFORM_OPTIONS.find((p) => p.id === pid)?.name || pid) : [];

                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border-2)' }}>
                      <td style={{ padding: '10px 12px', borderRight: '1px solid var(--color-border-2)' }}>
                        <Text type="secondary">{row.seq}</Text>
                      </td>
                      {isFirstOfEp && (
                        <td rowSpan={rowspan} style={{ padding: '10px 12px', verticalAlign: 'top', borderRight: '1px solid var(--color-border-2)' }}>
                          {readonly ? (
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{ep?.name || '未分配'}</div>
                          ) : (
                            <Input
                              size="small"
                              value={ep?.name || ''}
                              onChange={(v) => ep && updateEndpoint(ep.id, { name: v })}
                              style={{ fontWeight: 600, marginBottom: 4 }}
                            />
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {platformNames.map((name: string) => (
                              <Tag key={name} size="small" color="arcoblue" style={{ width: 'fit-content' }}>{name}</Tag>
                            ))}
                          </div>
                          {!readonly && (
                            <Popover
                              trigger="click"
                              position="bottom"
                              content={
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 200 }}>
                                  {PLATFORM_OPTIONS.map((p) => (
                                    <Tag
                                      key={p.id}
                                      size="small"
                                      color={ep?.platforms.includes(p.id) ? 'arcoblue' : undefined}
                                      style={{
                                        cursor: 'pointer',
                                        opacity: ep?.platforms.includes(p.id) ? 1 : 0.5,
                                        border: ep?.platforms.includes(p.id) ? undefined : '1px solid var(--color-border-3)',
                                        color: ep?.platforms.includes(p.id) ? undefined : 'var(--color-text-3)',
                                      }}
                                      onClick={() => ep && toggleEndpointPlatform(ep.id, p.id)}
                                    >
                                      {p.name}
                                    </Tag>
                                  ))}
                                </div>
                              }
                            >
                              <Button size="mini" type="text" icon={<IconPlusCircle />} style={{ marginTop: 4 }}>添加平台</Button>
                            </Popover>
                          )}
                        </td>
                      )}
                      <td style={{ padding: '10px 12px', borderRight: '1px solid var(--color-border-2)' }}>
                        <div className="module-name-cell" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {readonly ? (
                            <Text bold style={{ whiteSpace: 'nowrap' }}>{row.moduleName}</Text>
                          ) : (
                            <Input size="small" value={row.moduleName} onChange={(v) => updateModuleName(row.moduleId, v)} style={{ fontWeight: 600, width: '100%' }} />
                          )}
                          {!readonly && (
                            <Button
                              type="text" size="mini" status="success" icon={<IconPlusCircle />}
                              className="module-add-btn"
                              onClick={() => addModule(row.moduleId)}
                              title="在下方新增一级模块"
                            />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', borderRight: '1px solid var(--color-border-2)' }}>
                        <div className="sub-feature-cell" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {readonly ? (
                            <Text>{row.name}</Text>
                          ) : (
                            <>
                              <Input id={`sub-feature-${row.id}`} size="small" value={row.name} onChange={(v) => updateField(row.moduleId, row.id, 'name', v)} style={{ flex: 1 }} />
                              <Button
                                type="text" size="mini" status="success" icon={<IconPlusCircle />}
                                className="sub-feature-add-btn"
                                onClick={() => addSubFeature(row.moduleId, row.id)}
                                title="在下方新增子功能"
                              />
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', borderRight: '1px solid var(--color-border-2)' }}>
                        {readonly ? (
                          <Text>{row.description || '-'}</Text>
                        ) : (
                          <Input.TextArea
                            id={`desc-${row.id}`}
                            autoSize={{ minRows: 1, maxRows: 3 }}
                            size="small"
                            value={row.description}
                            onChange={(v) => updateField(row.moduleId, row.id, 'description', v)}
                            placeholder="详细交互逻辑与范围边界"
                          />
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', borderRight: '1px solid var(--color-border-2)' }}>
                        {readonly ? (
                          <Text type="secondary">{row.remark || '-'}</Text>
                        ) : (
                          <Input size="small" value={row.remark ?? ''} onChange={(v) => updateField(row.moduleId, row.id, 'remark', v)} placeholder="选填" />
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {!readonly && (
                          row.empty ? (
                            <Button type="text" size="small" status="danger" icon={<IconMinusCircle />} onClick={() => removeModule(row.moduleId)} />
                          ) : pendingDeleteId === row.id ? (
                            <Button size="mini" status="danger" onClick={() => { removeSubFeature(row.moduleId, row.id); setPendingDeleteId(null); }}>确认</Button>
                          ) : (
                            <Button type="text" size="small" status="danger" icon={<IconMinusCircle />} onClick={() => {
                              const module = featureList.find((m) => m.id === row.moduleId);
                              const hasMultipleSubs = module && module.subFeatures.length > 1;
                              const currentSub = module?.subFeatures.find((f) => f.id === row.id);
                              const isEmpty = !currentSub?.name && !currentSub?.description;
                              if (isEmpty || !hasMultipleSubs) {
                                removeSubFeature(row.moduleId, row.id);
                              } else {
                                setPendingDeleteId(row.id);
                              }
                            }} />
                          )
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
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
            <span><Text bold>{endpointConfigs.length}</Text> 端</span>
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
          <Button type="primary" icon={<IconSend />} disabled={leadFrozen} onClick={handleSubmit}>校验并提交工时评估</Button>
        </Space>
      )}
    </div>
    <Modal title="导入功能清单" visible={importVisible} footer={null} onCancel={() => setImportVisible(false)} unmountOnExit style={{ width: 760 }}>
      <FeatureListUpload
        initialModules={featureList}
        onParsed={(modules) => {
          persist(modules.map((module, index) => ({
            ...module,
            sort: index + 1,
            endpointId: module.endpointId || endpointConfigs[0]?.id || '',
          })));
          setImportVisible(false);
        }}
      />
    </Modal>
    </>
  );
}
