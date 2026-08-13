import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Badge,
  Message,
  Space,
  Typography,
  Tag,
  Tooltip,
} from '@arco-design/web-react';
import { IconSearch, IconEye, IconUserAdd, IconReply } from '@arco-design/web-react/icon';

const Title = Typography.Title;

export function TrashLeads() {
  const navigate = useNavigate();

  const trashLeads = [
    {
      key: '1',
      name: '某餐饮APP虚假需求',
      source: '百度推广',
      contact: '张某',
      phone: '138****0000',
      reason: '重复线索，已在系统中存在',
      discardBy: '李四',
      discardTime: '2026-04-18 10:30',
      tags: ['小程序', '餐饮'],
    },
    {
      key: '2',
      name: '无效联系方式',
      source: '抖音',
      contact: '王某',
      phone: '139****1111',
      reason: '电话无法接通，疑似虚假信息',
      discardBy: '张三',
      discardTime: '2026-04-17 14:20',
      tags: ['APP'],
    },
    {
      key: '3',
      name: '恶意询价',
      source: '小红书',
      contact: '刘某',
      phone: '136****2222',
      reason: '多次询价从未签单，浪费时间',
      discardBy: '王五',
      discardTime: '2026-04-16 16:45',
      tags: ['管理系统'],
    },
  ];

  const columns = [
    {
      title: '线索名称',
      dataIndex: 'name',
      width: 200,
      render: (name: string, record: any) => (
        <Button
          type="text"
          size="small"
          style={{ padding: 0 }}
          onClick={() => navigate(`/leads/${record.key}`, { state: { from: 'trash' } })}
        >
          {name}
        </Button>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 120,
      render: (source: string) => <Badge status="default" text={source} />,
    },
    { title: '联系人', dataIndex: 'contact', width: 100 },
    { title: '手机号', dataIndex: 'phone', width: 120 },
    {
      title: '意向标签',
      dataIndex: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <Space>
          {tags.map((tag, index) => (
            <Tag key={index} color="arcoblue">
              {tag}
            </Tag>
          ))}
        </Space>
      ),
    },
    { title: '丢弃原因', dataIndex: 'reason', width: 200 },
    { title: '丢弃人', dataIndex: 'discardBy', width: 100 },
    { title: '丢弃时间', dataIndex: 'discardTime', width: 160 },
    {
      title: '操作',
      width: 130,
      fixed: 'right' as const,
      render: (_, record: any) => (
        <Space>
          <Tooltip key={`tooltip-view-${record.key}`} content="查看详情">
            <Button
              type="text"
              icon={<IconEye />}
              size="small"
              onClick={() => navigate(`/leads/${record.key}`, { state: { from: 'trash' } })}
            />
          </Tooltip>
          <Tooltip key={`tooltip-claim-${record.key}`} content="重新认领">
            <Button
              type="text"
              icon={<IconUserAdd />}
              size="small"
              onClick={() => {
                Message.success('线索认领成功');
              }}
            />
          </Tooltip>
          <Tooltip key={`tooltip-public-${record.key}`} content="扔回公海">
            <Button
              type="text"
              icon={<IconReply />}
              size="small"
              onClick={() => {
                Message.success('已扔回公海线索');
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Title heading={4}>垃圾线索池</Title>
      </div>

      <Card>
        <div className="flex gap-4" style={{ marginBottom: 16 }}>
          <Input
            style={{ width: 240 }}
            placeholder="搜索线索名称、联系人"
            prefix={<IconSearch />}
          />
          <Select placeholder="线索来源" style={{ width: 160 }} allowClear>
            <Select.Option key="source-baidu" value="baidu">百度推广</Select.Option>
            <Select.Option key="source-douyin" value="douyin">抖音</Select.Option>
            <Select.Option key="source-xiaohongshu" value="xiaohongshu">小红书</Select.Option>
            <Select.Option key="source-wechat" value="wechat">微信推广</Select.Option>
          </Select>
          <Button type="primary">搜索</Button>
        </div>

        <Table
          columns={columns}
          data={trashLeads}
          scroll={{ x: 1400 }}
          pagination={{
            total: 15,
            pageSize: 10,
            showTotal: true,
            showJumper: true,
          }}
        />
      </Card>
    </div>
  );
}
