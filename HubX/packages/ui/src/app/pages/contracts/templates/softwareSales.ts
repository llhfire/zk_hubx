// 软件销售合同模板
// 强调：开发交付物、验收标准、质保期、知识产权归属

import type { ContractTemplate } from '../types';
import {
  escape,
  paragraphs,
  renderAmountClause,
  renderPaymentPlanTable,
  wrapDocument,
} from './shared';

export const softwareSalesTemplate: ContractTemplate = {
  id: 'software_sales',
  name: '软件销售合同模板',
  productCategories: ['软件开发', '系统集成'],
  description: '用于定制软件开发、系统交付类项目；强调验收标准与质保期。',
  render(formData) {
    const body = `
      <h2>第一条 项目内容</h2>
      ${paragraphs(formData.contractContent || '（合同内容待填写）')}

      <h2>第二条 项目周期</h2>
      <p>本合同生效日期为 ${escape(formData.effectiveDate || '____')}，
      项目预计于 ${escape(formData.endDate || '____')} 前完成验收交付。</p>

      <h2>第三条 合同金额与支付方式</h2>
      ${renderAmountClause(formData)}
      <p>付款方式：<strong>${escape(formData.paymentMethod || '对公')}</strong>，按以下回款计划分期支付：</p>
      ${renderPaymentPlanTable(formData.paymentPlans)}
      <p>${formData.rebateAmount ? `本合同包含返点金额：¥${formData.rebateAmount.toLocaleString()}。` : ''}</p>

      <h2>第四条 验收标准</h2>
      <ol>
        <li>乙方按合同附件约定的功能清单完成交付，提供测试报告与用户手册；</li>
        <li>甲方在乙方提交验收申请后 10 个工作日内完成验收；逾期未提出书面异议视为通过；</li>
        <li>验收发现的问题应一次性书面反馈，乙方应在 5 个工作日内修复并重新提交验收；</li>
        <li>验收通过即视为本合同主要标的物交付完成。</li>
      </ol>

      <h2>第五条 知识产权</h2>
      <ol>
        <li>乙方为本项目专门开发的软件源代码及其衍生物，其知识产权归 ${escape(formData.customerName)} 所有；</li>
        <li>乙方原有的通用底层组件、技术工具、可复用模块的知识产权仍归乙方所有，乙方授予甲方在本项目范围内的永久免费使用许可；</li>
        <li>双方在合作中产生的商业机密、技术资料应严格保密，未经书面同意不得向第三方披露。</li>
      </ol>

      <h2>第六条 质保期</h2>
      <p>自验收通过之日起 12 个月内为免费质保期。质保期内非因甲方人为原因导致的软件缺陷，
      乙方负责免费修复。质保期结束后，双方可另行签订运维服务协议。</p>

      <h2>第七条 违约责任</h2>
      <ol>
        <li>乙方逾期交付的，每逾期一日按合同总金额的 0.5‰ 向甲方支付违约金，累计不超过总金额的 5%；</li>
        <li>甲方逾期付款的，每逾期一日按应付未付金额的 0.5‰ 向乙方支付违约金；</li>
        <li>因不可抗力（如自然灾害、政策变更等）导致合同无法履行的，双方互不承担违约责任。</li>
      </ol>

      <h2>第八条 争议解决</h2>
      <p>因本合同发生的争议，双方应首先协商解决；协商不成的，提交合同签订地有管辖权的人民法院诉讼解决。</p>

      <h2>第九条 其他</h2>
      <p>本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。</p>
    `;
    return wrapDocument(formData, body);
  },
};
