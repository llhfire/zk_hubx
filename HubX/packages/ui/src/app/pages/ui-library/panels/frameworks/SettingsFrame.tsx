import { useState } from 'react';
import {
  Button,
  DatePicker,
  Divider,
  FormGrid,
  FormSection,
  Input,
  PageHeader,
  SectionCard,
  SectionTabs,
  Select,
  Space,
  StatusTag,
  Switch,
} from '@/design-system';
import { FrameShell, FrameSlot } from './FrameSlot';

/**
 * 配置设置页框架：填完保存的页面。
 * 适用：系统配置、字典、模板、通知设置。
 */
export function SettingsFrame() {
  const [tab, setTab] = useState('basic');

  return (
    <SectionCard
      title="配置设置页框架"
      description="四段结构：页头、分组页签、字段分组、保存栏。判断标准是「一组设置填完要一起保存」。"
    >
      <FrameShell>
        <FrameSlot index={1} label="页头 PageHeader：标题 + 影响范围说明，不放业务主操作" />
        <PageHeader
          title="系统配置"
          description="这里的改动影响全站默认行为；保存后立即生效，不做灰度。"
          actions={<StatusTag tone="neutral">上次修改：2026-04-26 罗总</StatusTag>}
        />

        <FrameSlot index={2} label="分组页签 SectionTabs：一组设置一个页签，数量按分组计" />
        <SectionTabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'basic',
              label: '基础设置',
              content: (
                <>
                  <FrameSlot index={3} label="字段分组 FormSection + FormGrid：两列，长字段整行" />
                  <FormSection
                    title="公司主体"
                    description="出现在合同、报价单和发票抬头。"
                  >
                    <FormGrid columns={2}>
                      <div><div className="ui-library-demo-caption">公司名称</div><Input defaultValue="中科软通" /></div>
                      <div><div className="ui-library-demo-caption">统一社会信用代码</div><Input defaultValue="91110000MA01ABCD1E" /></div>
                      <div><div className="ui-library-demo-caption">注册地址</div><Input defaultValue="北京市海淀区中关村软件园 18 号楼 5 层" /></div>
                      <div><div className="ui-library-demo-caption">默认签约主体</div><Select defaultValue="中科软通" options={['中科软通', '中科软艺']} /></div>
                    </FormGrid>
                  </FormSection>
                  <Divider />
                  <FormSection
                    title="业务默认值"
                    description="新建单据时的预填值，可被单据本身覆盖。"
                  >
                    <FormGrid columns={3}>
                      <div><div className="ui-library-demo-caption">报价有效期</div><Input defaultValue="30 天" /></div>
                      <div><div className="ui-library-demo-caption">回款起算日</div><DatePicker /></div>
                      <div>
                        <div className="ui-library-demo-caption">启用审批抄送</div>
                        <Space><Switch defaultChecked /><span className="ui-library-demo-caption">审批通过后抄送商务</span></Space>
                      </div>
                    </FormGrid>
                  </FormSection>
                </>
              ),
            },
            {
              key: 'notify',
              label: '通知设置',
              content: (
                <FormSection title="通知渠道" description="按事件类型选择渠道，未勾选的渠道不发送。">
                  <FormGrid columns={2}>
                    <div><div className="ui-library-demo-caption">站内消息</div><Switch defaultChecked /></div>
                    <div><div className="ui-library-demo-caption">企业微信</div><Switch defaultChecked /></div>
                    <div><div className="ui-library-demo-caption">邮件</div><Switch /></div>
                    <div><div className="ui-library-demo-caption">短信</div><Switch /></div>
                  </FormGrid>
                </FormSection>
              ),
            },
            {
              key: 'security',
              label: '安全策略',
              content: (
                <FormSection title="登录与会话" description="影响全站账号的登录方式和会话时长。">
                  <FormGrid columns={2}>
                    <div><div className="ui-library-demo-caption">会话有效期</div><Select defaultValue="8 小时" options={['2 小时', '8 小时', '24 小时']} /></div>
                    <div><div className="ui-library-demo-caption">强制双因素登录</div><Switch /></div>
                  </FormGrid>
                </FormSection>
              ),
            },
          ]}
        />

        <FrameSlot index={4} label="保存栏：Divider + 右对齐操作；未保存离开时二次确认" />
        <Divider />
        <Space>
          <Button type="primary">保存</Button>
          <Button>取消</Button>
          <span className="ui-library-demo-caption">有未保存改动时离开页面，走 confirmAction 二次确认。</span>
        </Space>
      </FrameShell>
      <div className="ui-library-demo-caption">
        参照实现：`/system/config`、`/system/dictionary`。设置页不做「即时保存」，避免一条设置改一半就生效。
      </div>
    </SectionCard>
  );
}
