/**
 * 三视角权限过滤纯函数
 *
 * 规约见 lead-dispatch-dev-plan.md §阶段 A + PRD §13：
 * - 管理员：全量
 * - 推广：负责渠道 ∪ 本人录入
 * - 录入员：本人当日录入
 */

export type DispatchRole = 'admin' | 'promoter' | 'recorder';

export const DISPATCH_ROLE_LABEL: Record<DispatchRole, string> = {
  admin: '管理员',
  promoter: '推广',
  recorder: '录入员',
};

export interface RoleFilterParams {
  role: DispatchRole;
  /** 当前用户 ID 或姓名 */
  userId: string;
  /** 当前用户负责渠道（promoter 用） */
  userChannels?: string[];
}

/**
 * 按角色视角过滤线索列表
 *
 * @param leads 线索列表（泛型，只需有 source / owner / createTime 字段）
 * @param params 角色过滤参数
 * @param today 今天日期字符串（YYYY-MM-DD），默认取系统日期
 */
export function filterLeadsByRoleView<T extends { source: string; owner: string; createTime: string }>(
  leads: T[],
  params: RoleFilterParams,
  today?: string,
): T[] {
  const todayStr = today ?? new Date().toISOString().slice(0, 10);

  switch (params.role) {
    case 'admin':
      // 管理员：全量
      return leads;

    case 'promoter': {
      // 推广：负责渠道 ∪ 本人录入
      const channels = new Set(params.userChannels ?? []);
      return leads.filter((l) => {
        // 负责渠道
        if (channels.has(l.source)) return true;
        // 本人录入
        if (l.owner === params.userId) return true;
        return false;
      });
    }

    case 'recorder':
      // 录入员：本人当日录入
      return leads.filter((l) => {
        if (l.owner !== params.userId) return false;
        return l.createTime.slice(0, 10) === todayStr;
      });

    default:
      return leads;
  }
}
