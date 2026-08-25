import { useMemo } from 'react';
import { Card, Table, Typography, Tag } from '@arco-design/web-react';
import { CATEGORY_SEED } from './categorySeed';

const { Text } = Typography;

interface CategoryRow {
  id: string;
  name: string;
  level: 1 | 2;
  parentId?: string;
  parentName?: string;
  isLabor: boolean;
}

export function CategoryTab() {
  const rows = useMemo(() => {
    const result: CategoryRow[] = [];
    for (const primary of CATEGORY_SEED) {
      result.push({
        id: primary.id,
        name: primary.name,
        level: 1,
        isLabor: primary.id === 'LABOR',
      });
      for (const child of primary.children ?? []) {
        result.push({
          id: child.id,
          name: child.name,
          level: 2,
          parentId: primary.id,
          parentName: primary.name,
          isLabor: primary.id === 'LABOR',
        });
      }
    }
    return result;
  }, []);

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <Card title="费用科目（系统费用分类）">
        <Table
          rowKey="id"
          data={rows}
          pagination={false}
          columns={[
            {
              title: '级别',
              dataIndex: 'level',
              width: 80,
              render: (v: number) => v === 1 ? <Tag color="blue">一级</Tag> : <Tag>二级</Tag>,
            },
            { title: '科目名称', dataIndex: 'name' },
            {
              title: '上级科目',
              dataIndex: 'parentName',
              render: (v: string | undefined) => v || '-',
            },
            {
              title: '状态',
              dataIndex: 'isLabor',
              width: 100,
              render: (v: boolean) => v
                ? <Tag color="red">只读</Tag>
                : <Tag color="green">可录入</Tag>,
            },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 12, marginTop: 12, display: 'block' }}>
          LABOR（人力成本）为内置科目，不可新增、编辑或删除。其余八个一级科目可管理二级子目。
        </Text>
      </Card>
    </div>
  );
}
