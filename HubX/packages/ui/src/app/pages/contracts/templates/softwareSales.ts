// 中科软通技术服务合同模板。
// 章节、表格与附件结构依据《中科软通（武汉）科技有限公司（模板）.docx》适配。

import { findCompanyEntityByName } from '../../company-entity/companyEntityData';
import type { ContractFormData, ContractTemplate } from '../types';
import {
  escape,
  paragraphs,
  renderAmountClause,
  renderPaymentPlanTable,
  wrapDocument,
} from './shared';
import { serviceContractTemplate } from './serviceContract';

function partyInformationTable(formData: ContractFormData): string {
  const entity = findCompanyEntityByName(formData.signingEntity);
  const entityName = entity?.name ?? formData.signingEntity;
  return `<table class="contract-table"><thead><tr><th colspan="2">甲方</th><th colspan="2">乙方</th></tr></thead><tbody>
    <tr><td>名称</td><td>${escape(formData.customerName)}</td><td>名称</td><td>${escape(entityName)}</td></tr>
    <tr><td>通讯地址</td><td>${escape(formData.customerAddress)}</td><td>通讯地址</td><td>${escape(formData.signingEntityAddress || entity?.address)}</td></tr>
    <tr><td>邮编</td><td>${escape(formData.customerPostalCode)}</td><td>邮编</td><td>${escape(formData.signingEntityPostalCode)}</td></tr>
    <tr><td>电子邮件</td><td>${escape(formData.customerEmail)}</td><td>电子邮件</td><td>${escape(formData.signingEntityEmail)}</td></tr>
    <tr><td>汇款人</td><td>${escape(formData.customerName)}</td><td>收款人</td><td>${escape(entityName)}</td></tr>
    <tr><td>开户银行</td><td>${escape(formData.bankName)}</td><td>开户银行</td><td>${escape(formData.signingEntityBankName || entity?.invoiceBankName)}</td></tr>
    <tr><td>银行账号</td><td>${escape(formData.bankAccount)}</td><td>银行账号</td><td>${escape(formData.signingEntityBankAccount || entity?.invoiceBankAccount)}</td></tr>
    <tr><td>税务登记号</td><td>${escape(formData.customerTaxNo)}</td><td>税务登记号</td><td>${escape(formData.signingEntityTaxNo || entity?.taxNumber)}</td></tr>
    <tr><td>联系人</td><td>${escape(formData.customerContact)}</td><td>联系人</td><td>${escape(formData.signingPerson || entity?.legalPerson)}</td></tr>
    <tr><td>联系电话</td><td>${escape(formData.customerPhone)}</td><td>联系电话</td><td>${escape(formData.signingEntityPhone || entity?.contactPhone)}</td></tr>
  </tbody></table>`;
}

function serviceTable(formData: ContractFormData): string {
  return `<table class="contract-table"><thead><tr><th>服务产品名称</th><th>服务内容</th></tr></thead><tbody>
    <tr><td>${escape(formData.contractName)}</td><td>${paragraphs(formData.contractContent || '系统搭建、系统功能维护、系统技术支持、技术顾问服务和软件培训使用')}</td></tr>
  </tbody></table>`;
}

function deliveryTable(formData: ContractFormData): string {
  const conditions = formData.deliveryConditions ?? [];
  if (!conditions.length) return '<p>交付内容包括系统源代码、设计稿源文件、账户密码文档及用户手册；具体交付节点以项目计划及附件一为准。</p>';
  return `<table class="contract-table"><thead><tr><th>交付节点</th><th>预计日期</th><th>交付条件</th><th>交付物</th></tr></thead><tbody>${conditions.map((item) => `<tr><td>${escape(item.name)}</td><td>${escape(item.expectedDate)}</td><td>${escape(item.condition)}</td><td>${escape(item.deliverables)}</td></tr>`).join('')}</tbody></table>`;
}

function featureListTable(formData: ContractFormData): string {
  const features = formData.featureList ?? [];
  if (!features.length) return '<p class="empty-hint">（附件功能清单待由成交报价或人工录入补齐）</p>';
  return `<table class="contract-table"><thead><tr><th>端</th><th>功能</th><th>子功能</th><th>功能说明</th></tr></thead><tbody>
    ${features.map((item) => `<tr><td>${escape(item.endpoint)}</td><td>${escape(item.module)}</td><td>${escape(item.feature)}</td><td>${escape(item.description)}</td></tr>`).join('')}
  </tbody></table>`;
}

function invoiceClause(formData: ContractFormData): string {
  const rate = formData.invoiceTaxRate ?? 6;
  const taxAmount = rate > 0 ? formData.totalAmount * rate / (100 + rate) : 0;
  const untaxed = formData.totalAmount - taxAmount;
  const invoiceType = formData.invoiceType === '普票' ? '增值税普通发票' : '增值税专用发票';
  return `<p>本合同总价款（含税）为 ¥${formData.totalAmount.toLocaleString()}，其中不含税金额约 ¥${untaxed.toFixed(2)}，税额约 ¥${taxAmount.toFixed(2)}。开票内容：${escape(formData.invoiceContent || '生产生活服务*研发服务费')}；税率：${rate}%；发票类型：${invoiceType}。购买方、合同甲方与付款方主体名称应保持一致。</p>`;
}

function signatureTable(formData: ContractFormData): string {
  const entity = findCompanyEntityByName(formData.signingEntity);
  return `<table class="contract-table contract-signature-table"><tbody>
    <tr><td><strong>甲方（盖章）：</strong><br><br>授权代表（签字）：<br><br>日期：${escape(formData.signDate)}</td>
    <td><strong>乙方（盖章）：${escape(entity?.name ?? formData.signingEntity)}</strong><br><br>授权代表（签字）：${escape(formData.signingPerson)}<br><br>日期：${escape(formData.signDate)}</td></tr>
  </tbody></table>`;
}

export function renderZkrtTechnicalServiceBody(formData: ContractFormData): string {
  const entity = findCompanyEntityByName(formData.signingEntity);
  const entityName = entity?.name ?? formData.signingEntity;
  const workDays = formData.projectWorkDays ?? 45;
  const prototypeDays = formData.prototypeConfirmDays ?? 3;
  const acceptanceDays = formData.acceptanceDays ?? 5;
  const warrantyMonths = formData.warrantyMonths ?? 12;
  const annualRate = formData.maintenanceAnnualRate ?? 15;
  return `
    <div class="contract-cover-company">${escape(entityName)}</div>
    <div class="contract-cover-title">技术服务合同</div>
    <div class="contract-cover-grid">
      <span>项目名称：</span><div>${escape(formData.contractName)}</div>
      <span>甲方：</span><div>${escape(formData.customerName)}</div>
      <span>乙方：</span><div>${escape(entityName)}</div>
      <span>合同编号：</span><div>${escape(formData.contractNo)}</div>
      <span>签约日期：</span><div>${escape(formData.signDate)}</div>
    </div>

    <p>甲方（委托方）：${escape(formData.customerName)}</p>
    <p>项目代表人：${escape(formData.customerContact)}；地址：${escape(formData.customerAddress)}；联系方式：${escape(formData.customerPhone)}</p>
    <p>乙方（受托方）：${escape(entityName)}</p>
    <p>项目代表人：${escape(formData.signingPerson || entity?.legalPerson)}；地址：${escape(formData.signingEntityAddress || entity?.address)}；联系方式：${escape(formData.signingEntityPhone || entity?.contactPhone)}</p>
    <p>甲乙双方遵循自愿、公平、合法、诚信原则，就甲方委托乙方进行软件开发及技术服务事宜达成本合同。</p>

    <h3 class="chapter-title">第一章　合同说明</h3>
    <p><strong>定义：</strong>项目、开发软件、文档、资料、知识产权、需求变更、商业秘密、测试、上线及工作日等术语，按本合同及附件约定理解。</p>
    <p><strong>联络与送达：</strong>双方正式信函、结算与司法文书均按下表信息送达。账户、地址等重要信息变更应提前 15 日书面通知；项目联系人变更应在变更后 3 日内书面通知。因未及时通知造成的送达或损失，由未通知方承担。</p>
    ${partyInformationTable(formData)}

    <h3 class="chapter-title">第二章　合同标的</h3>
    <p>甲方同意向乙方购买，乙方同意提供以下技术开发与服务；详细服务范围以附件一《项目组成清单》为准。</p>
    ${serviceTable(formData)}

    <h3 class="chapter-title">第三章　项目的内容和要求</h3>
    <p>乙方根据附件一识别并确认业务需求，形成产品原型与 UI 后开展程序开发。甲方应在 ${prototypeDays} 个工作日内确认原型与 UI，逾期未反馈视为确认。</p>
    ${paragraphs(formData.contractContent)}

    <h3 class="chapter-title">第四章　项目的开发工作</h3>
    <p>技术开发（编码与测试）工期为 ${workDays} 个工作日。甲方资料不全或反馈确认延误时，交付时间按实际延误时长顺延。项目联系人代表双方处理项目实施意见，联系人变更应书面通知。</p>

    <h3 class="chapter-title">第五章　项目的测试和验收</h3>
    <p>验收包括功能测试与业务流程测试；实现附件一全部功能、权限分配合理、业务流程正常，测试不通过项占比不高于全部测试项的 5%。甲方应在收到验收申请后 ${acceptanceDays} 个工作日内完成全量测试并签署验收单或一次性书面列明问题，逾期未提出书面异议视为验收合格。</p>

    <h3 class="chapter-title">第六章　项目交付</h3>
    ${deliveryTable(formData)}
    <p>甲方出具的验收证明日期为项目交付日及免费维护期起始日。</p>

    <h3 class="chapter-title">第七章　合同金额与支付结算</h3>
    ${renderAmountClause(formData)}
    ${renderPaymentPlanTable(formData.paymentPlans)}
    <p>甲方按以下账户向乙方支付合同款：收款人 ${escape(entityName)}；开户银行 ${escape(formData.signingEntityBankName || entity?.invoiceBankName)}；银行账号 ${escape(formData.signingEntityBankAccount || entity?.invoiceBankAccount)}。</p>

    <h3 class="chapter-title">第八章　税款（开票事项约定）</h3>
    ${invoiceClause(formData)}
    <p>乙方收到对应合同进度款后，按合同约定向甲方开具相应金额发票。</p>

    <h3 class="chapter-title">第九章　责任和义务</h3>
    <p>甲方负责提供服务器、域名、开发账号、证件及项目资料，配合需求确认、联调测试和验收；因甲方资料或配合延误导致的工期影响由甲方承担。</p>
    <p>乙方按附件一组织开发、测试、交付和培训，提供源代码与相关技术资料，并按项目管理要求保障交付质量。</p>

    <h3 class="chapter-title">第十章　需求变更</h3>
    <p>双方确认需求后，如需调整功能或任务，应评估费用和工期影响并签署附件二《需求变更备忘录》。未签署书面变更文件的临时需求，乙方有权不予执行。</p>
    <table class="contract-table"><thead><tr><th>变更岗位</th><th>计费口径</th><th>实际人天</th><th>变更金额</th></tr></thead><tbody><tr><td>产品/设计/开发/测试等</td><td>按双方确认的岗位日单价</td><td>以变更评估单为准</td><td>岗位日单价 × 实际人天</td></tr></tbody></table>

    <h3 class="chapter-title">第十一章　技术支持与培训</h3>
    <p>项目验收后，乙方提供 ${warrantyMonths} 个月免费维护服务，范围为系统本身的错误、漏洞及功能性缺陷，不含增强或新增功能。免费期结束后，可按合同总金额 ${annualRate}%/年的标准另行提供维护服务。</p>
    <p>免费维护期内，工作日问题应在 4 小时内响应；非工作日提交的问题，原则上于下一工作日响应。紧急故障由双方项目联系人另行确认处置优先级。</p>

    <h3 class="chapter-title">第十二章　所有权和知识产权</h3>
    <p>甲方付清全部合同款项、变更款及其他应付费用后，本项目专门开发形成的应用系统及技术文档知识产权按合同约定转移；乙方既有通用组件、工具及第三方软件的权利不因本合同转移。</p>

    <h3 class="chapter-title">第十三章　保密条款</h3>
    <p>双方仅可为履行本合同使用获悉的商业秘密，并采取合理措施防止未经授权的使用、传播或公开；法律强制披露除外。</p>

    <h3 class="chapter-title">第十四章　违约</h3>
    <p>甲方逾期付款或乙方无正当理由逾期交付的，每逾期一日，违约方按当期应付款或应交付部分对应金额的 0.05%（万分之五）向守约方支付违约金。逾期超过 30 日的，守约方有权要求违约方另行支付当期金额 20% 的违约金，并有权解除合同、追究实际损失。</p>

    <h3 class="chapter-title">第十五章　质量保证和权利保证</h3>
    <p>乙方保证交付的软件、源代码和技术文档符合双方确认的质量与规范要求，具备合理可维护性，且不侵犯第三方知识产权。</p>

    <h3 class="chapter-title">第十六章　合同期限和终止</h3>
    <p>本合同自双方签字盖章之日起生效，至双方履行全部义务且免费维护期结束时终止。需求变更增加的工期按书面变更相应顺延。一方发生重大违约时，守约方应书面催告其在 10 个工作日内整改；逾期未改的，守约方可提前 5 日书面通知解除合同。</p>

    <h3 class="chapter-title">第十七章　不可抗力</h3>
    <p>发生不可预见、不可避免且不可克服的事件时，受影响方应及时书面通知，并在事件发生后 15 日内提供有效证明；双方应协商降低损失。金钱债务的迟延责任，以及一方迟延履行后发生的不可抗力，不因此当然免责。</p>

    <h3 class="chapter-title">第十八章　适用法律和争议解决</h3>
    <p>本合同适用中华人民共和国现行法律。争议应先协商或调解；未能解决的，任一方可向原告住所地有管辖权的人民法院起诉，争议事项之外的条款继续履行。</p>

    <h3 class="chapter-title">第十九章　附则</h3>
    <p>本合同附件与正文具有同等法律效力；正文与附件约定不一致时，以附件约定为准。本合同一式两份，甲乙双方各执一份。</p>
    ${signatureTable(formData)}

    <h3 class="attachment-title">附件一：《项目组成清单》</h3>
    ${featureListTable(formData)}

    <h3 class="attachment-title">附件二：《需求变更备忘录》</h3>
    <table class="contract-table"><tbody>
      <tr><th>项目名称</th><td>${escape(formData.contractName)}</td><th>合同编号</th><td>${escape(formData.contractNo)}</td></tr>
      <tr><th>客户名称</th><td>${escape(formData.customerName)}</td><th>变更时间</th><td>____年__月__日</td></tr>
      <tr><th colspan="4">项目变更需求内容描述</th></tr>
      <tr><td colspan="4" style="height:140px">一、项目变更需求内容：<br><br>二、项目变更需求价格：<br><br>项目负责人：　　　　　　　　　公司确认盖章：</td></tr>
      <tr><th>客户确认</th><td colspan="3" style="height:100px">确认无误；以上需求变更为我司新增需要，请按变更需求重新设计开发。<br><br>确认签章：　　　　　　　　确认日期：</td></tr>
    </tbody></table>
  `;
}

export const ZKRT_TECH_SERVICE_DRAFT_HTML = `
  <h2>第一章 合同说明</h2><p>双方联络与送达信息由合同字段自动生成。</p>
  <h2>第二章 合同标的</h2><p>{{contractContent}}</p>
  <h2>第三章至第十九章</h2><p>项目内容、开发、验收、交付、支付、开票、权责、变更、维护、知识产权、保密、违约、保证、期限、不可抗力、争议与附则按中科软通技术服务合同标准条款生成。</p>
  <h2>附件一 项目组成清单</h2><p>由成交报价功能清单自动带入。</p>
  <h2>附件二 需求变更备忘录</h2><p>保留项目、合同、变更内容、价格及双方签章字段。</p>
`;

export const softwareSalesTemplate: ContractTemplate = {
  id: 'software_sales',
  name: '软件开发服务合同模板',
  productCategories: ['软件开发', '系统集成'],
  description: '中科软通主体使用源 Word 的 19 章合同；其他主体使用通用技术服务合同。',
  render(formData) {
    if (formData.signingEntity !== '中科软通') return serviceContractTemplate.render(formData);
    return wrapDocument(formData, renderZkrtTechnicalServiceBody(formData), {
      documentTitle: '技术服务合同',
      showMeta: false,
      showSignature: false,
    });
  },
};
