import { describe, expect, it } from 'vitest';
import { CONTRACT_STATUS_COLOR, CONTRACT_STATUS_LABEL } from '../utils';
import { CUSTOMER_LEVEL_COLOR } from '../../leads/types';

/**
 * 状态色一致性回归。
 *
 * 缺陷背景：同一领域的状态曾在多个页面各定义一份，且取值不同 ——
 * 线索详情的合同状态表把 `voided` 映射为 `gray`、`approving` 映射为 `orange`，
 * 而合同域权威表是 `red` / `arcoblue`；项目列表与线索派发的客户等级表把
 * S 级映射为 `red`，而 CRM 权威表是 `green`。同一实体在不同页面显示不同颜色。
 *
 * 这些表必须只有一份定义。本测试同时锁定「唯一事实源」与「取值本身」。
 */

describe('合同状态色唯一事实源', () => {
  it('已作废必须是红色（不能是灰色 —— 灰会让人误以为只是归档）', () => {
    expect(CONTRACT_STATUS_COLOR.voided).toBe('red');
  });

  it('覆盖全部六个状态且取值稳定', () => {
    expect(CONTRACT_STATUS_COLOR).toEqual({
      draft: 'gray',
      approving: 'arcoblue',
      pending_mail: 'orange',
      pending_return: 'cyan',
      archived: 'green',
      voided: 'red',
    });
  });

  it('标签与状态一一对应', () => {
    expect(CONTRACT_STATUS_LABEL).toEqual({
      draft: '草稿',
      approving: '审批中',
      pending_mail: '待寄出',
      pending_return: '待回寄',
      archived: '已归档',
      voided: '已作废',
    });
  });
});

describe('客户等级色唯一事实源', () => {
  it('S 级为绿色（项目列表与线索派发曾错用红色）', () => {
    expect(CUSTOMER_LEVEL_COLOR.S).toBe('green');
  });

  it('覆盖 S/A/B/C 四级', () => {
    expect(CUSTOMER_LEVEL_COLOR).toEqual({
      S: 'green',
      A: 'blue',
      B: 'gray',
      C: 'gray',
    });
  });
});
