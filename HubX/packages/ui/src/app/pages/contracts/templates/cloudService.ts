// 云服务合同模板
// 强调：SLA 可用性指标、按用量/订阅计费、续费、数据归属与迁移

import type { ContractTemplate } from '../types';
import {
  escape,
  paragraphs,
  renderAmountClause,
  renderPaymentPlanTable,
  wrapDocument,
} from './shared';

export const cloudServiceTemplate: ContractTemplate = {
  id: 'cloud_service',
  name: '云服务合同模板',
  productCategories: ['云服务'],
  description: '用于 SaaS / 云资源订阅类项目；强调可用性 SLA、订阅周期与续费、数据归属。',
  render(formData) {
    const body = `
      <h2>第一条 服务内容</h2>
      ${paragraphs(formData.contractContent || '（云服务内容待填写）')}

      <h2>第二条 订阅周期</h2>
      <p>本服务订阅周期自 ${escape(formData.effectiveDate || '____')} 起至
      ${escape(formData.endDate || '____')} 止。订阅到期前 30 日，乙方应主动向甲方发出续约提醒；
      甲方未在订阅到期前 7 日明确续约的，乙方有权在订阅到期后停止服务。</p>

      <h2>第三条 服务费用与支付方式</h2>
      ${renderAmountClause(formData)}
      <p>付款方式：<strong>${escape(formData.paymentMethod || '对公')}</strong>，按以下分期支付：</p>
      ${renderPaymentPlanTable(formData.paymentPlans)}

      <h2>第四条 服务等级（SLA）</h2>
      <ol>
        <li>核心服务月度可用性不低于 <strong>99.5%</strong>（即每月不可用累计时长 ≤ 3.6 小时）；</li>
        <li>计划内的维护窗口（提前 24 小时通知）不计入不可用时长；</li>
        <li>实际可用性低于 99.5% 但不低于 99% 时，乙方退还甲方当月服务费的 10%；
            低于 99% 时，按当月服务费的 30% 退还；</li>
        <li>乙方需提供 7×24 小时技术支持热线和工单系统，紧急工单 30 分钟内响应。</li>
      </ol>

      <h2>第五条 数据归属与安全</h2>
      <ol>
        <li>甲方在云服务上产生的全部业务数据归甲方所有，乙方不得用于本合同约定以外的任何目的；</li>
        <li>乙方应采取符合行业标准的安全措施保护甲方数据，包括但不限于加密存储、访问审计、
            漏洞响应；如发生数据泄露事件，乙方应在 24 小时内书面通知甲方；</li>
        <li>合同终止后 30 日内，乙方应配合甲方完成数据导出，导出格式应为通用、可读的格式
            （如 JSON / CSV / SQL dump 等）；导出完成后 60 日，乙方有权彻底删除甲方数据并出具销毁证明。</li>
      </ol>

      <h2>第六条 服务变更与升级</h2>
      <ol>
        <li>乙方对核心功能进行重大升级或界面改版的，应提前 15 日通知甲方；</li>
        <li>乙方因业务调整需关闭某项功能模块的，应提前 90 日通知甲方，并提供等价替代方案；</li>
        <li>因法律法规要求必须立即调整的，不受上述时限限制，但乙方应在调整后及时书面说明。</li>
      </ol>

      <h2>第七条 违约责任</h2>
      <ol>
        <li>乙方擅自变更服务核心条款或终止服务的，应按合同剩余周期金额的 200% 向甲方支付违约金；</li>
        <li>甲方逾期付款超过 15 日的，乙方有权暂停服务；超过 30 日的，乙方有权解除合同。</li>
      </ol>

      <h2>第八条 争议解决</h2>
      <p>因本合同发生的争议，双方应首先协商解决；协商不成的，提交合同签订地有管辖权的人民法院诉讼解决。</p>

      <h2>第九条 其他</h2>
      <p>本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。
      甲方使用云服务时还需遵守乙方公布的《用户服务条款》和《隐私政策》。</p>
    `;
    return wrapDocument(formData, body);
  },
};
