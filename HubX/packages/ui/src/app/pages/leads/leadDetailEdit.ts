import type { Attachment, LeadDetailInfo, LeadListItem } from './types';

export interface LeadEditValues {
  name: string;
  contact: string;
  phone: string;
  wechat: string;
  source: string;
  keyword: string;
  status: string;
  level: string;
  customerLevel?: string;
  tags: string[];
  entity: string;
  owner: string;
  optimizer: string;
  assistant: string;
  presalesGroupName?: string;
  requirement: string;
  customerNote?: string;
  attachments: Attachment[];
}

export function findLeadByRouteId(leads: LeadListItem[], routeId?: string): LeadListItem | undefined {
  return leads.find((lead) => lead.id === routeId || lead.key === routeId);
}

export function mergeLeadDetail(
  profileLead: LeadDetailInfo | undefined,
  listLead: LeadListItem | undefined,
  override: Partial<LeadDetailInfo> | null,
): LeadDetailInfo | undefined {
  if (!profileLead) return undefined;

  const liveValues: Partial<LeadDetailInfo> = listLead
    ? {
        name: listLead.name,
        customer: listLead.customer,
        contact: listLead.contact,
        phone: listLead.phone,
        wechat: listLead.wechat,
        source: listLead.source,
        keyword: listLead.keyword,
        status: listLead.status,
        clueType: listLead.clueType,
        level: listLead.level,
        customerLevel: listLead.customerLevel,
        tags: listLead.tags,
        entity: listLead.entity,
        owner: listLead.owner,
        optimizer: listLead.optimizer,
        assistant: listLead.assistant,
        createTime: listLead.createTime,
        lastFollowTime: listLead.lastFollowTime,
        nextFollowTime: listLead.nextFollowTime,
        followCount: listLead.followCount,
        daysHeld: listLead.daysHeld,
        presalesGroupName: listLead.presalesGroupName,
        prototypeLink: listLead.prototypeLink,
        trashCount: listLead.trashCount,
        transformStatus: listLead.transformStatus,
        requirement: listLead.remark ?? profileLead.requirement,
        initialRequirement: listLead.remark ?? profileLead.initialRequirement,
        customerBudget: listLead.budget == null
          ? profileLead.customerBudget
          : `¥${listLead.budget.toLocaleString('zh-CN')}`,
        attachments: listLead.attachments ?? profileLead.attachments,
      }
    : {};

  return { ...profileLead, ...liveValues, ...override };
}

export function applyLeadEdit(current: LeadListItem, values: LeadEditValues): LeadListItem {
  return {
    ...current,
    name: values.name,
    contact: values.contact,
    phone: values.phone,
    wechat: values.wechat,
    source: values.source,
    keyword: values.keyword,
    status: values.status,
    level: values.level,
    customerLevel: values.customerLevel,
    tags: values.tags,
    entity: values.entity,
    owner: values.owner,
    optimizer: values.optimizer,
    assistant: values.assistant,
    presalesGroupName: values.presalesGroupName,
    remark: values.requirement,
    attachments: values.attachments,
  };
}
