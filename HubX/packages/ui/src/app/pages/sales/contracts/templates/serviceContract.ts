// 技术服务合同模板
// 强调：服务范围、响应时效（SLA）、人天/工时计价、服务报告

import type { ContractTemplate } from '../types';
import {
  escape,
  paragraphs,
  renderAmountClause,
  renderPaymentPlanTable,
  wrapDocument,
} from './shared';

export const serviceContractTemplate: ContractTemplate = {
  id: 'service_contract',
  name: '技术服务合同模板',
  productCategories: ['技术服务', '系统集成'],
  description: '用于咨询、定制开发支持、技术驻场等服务类项目；按服务时效与质量结算。',
  render(formData) {
    const body = `
      <h2>第一条 服务内容</h2>
      ${paragraphs(formData.contractContent || '（服务内容待填写）')}

      <h2>第二条 服务期限</h2>
      <p>服务期限自 ${escape(formData.effectiveDate || '____')} 起至
      ${escape(formData.endDate || '____')} 止；服务到期后，双方协商一致可签订续约协议。</p>

      <h2>第三条 服务费用与支付方式</h2>
      ${renderAmountClause(formData)}
      <p>付款方式：<strong>${escape(formData.paymentMethod || '对公')}</strong>，按以下分期支付：</p>
      ${renderPaymentPlanTable(formData.paymentPlans)}

      <h2>第四条 服务响应时效（SLA）</h2>
      <ol>
        <li>常规问题：乙方在工作日 4 小时内响应，1 个工作日内给出处理方案；</li>
        <li>重要问题：乙方在工作日 1 小时内响应，4 个工作小时内给出处理方案；</li>
        <li>紧急问题（系统不可用）：乙方在 30 分钟内响应，4 小时内恢复或提供临时解决方案；</li>
        <li>实际响应时效未达上述标准的，乙方按月度服务费的 5% 向甲方支付补偿，单次封顶 20%。</li>
      </ol>

      <h2>第五条 服务报告</h2>
      <p>乙方每月向甲方提交一份服务报告，内容包括：当月处理的问题清单、服务工时统计、
      重大事件分析、下月服务计划。甲方在收到报告后 5 个工作日内完成确认。</p>

      <h2>第六条 双方义务</h2>
      <ol>
        <li>甲方应为乙方提供必要的工作环境、系统访问权限和业务背景资料；</li>
        <li>乙方应安排专职服务人员，并保证人员的稳定性；如需更换主要服务人员，需提前 5 个工作日书面通知甲方；</li>
        <li>乙方对在服务过程中接触到的甲方业务数据、系统配置、商业信息严格保密。</li>
      </ol>

      <h2>第七条 违约责任</h2>
      <ol>
        <li>乙方未能按约提供服务的，甲方有权单方解除合同并要求退还未消耗服务费；</li>
        <li>甲方逾期付款超过 30 日的，乙方有权暂停服务，由此产生的责任由甲方承担。</li>
      </ol>

      <h2>第八条 争议解决</h2>
      <p>因本合同发生的争议，双方应首先协商解决；协商不成的，提交合同签订地有管辖权的人民法院诉讼解决。</p>

      <h2>第九条 其他</h2>
      <p>本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。</p>
    `;
    return wrapDocument(formData, body);
  },
};
