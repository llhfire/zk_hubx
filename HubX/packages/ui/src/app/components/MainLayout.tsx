import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import logo from '@/assets/zk-hubx-logo.png';
import { Layout, Menu, Avatar, Dropdown, Badge } from '@arco-design/web-react';
import {
  IconHome,
  IconCustomerService,
  IconUser,
  IconFile,
  IconApps,
  IconDashboard,
  IconSettings,
  IconPoweroff,
  IconCalendar,
  IconQuestionCircle,
  IconExperiment,
  IconMessage,
  IconUserGroup,
  IconCheckSquare,
  IconQuote,
} from '@arco-design/web-react/icon';
import { DailyReportModal } from '../pages/daily-report/DailyReportModal';
import { DailyReport } from '../pages/daily-report/types';
import { RoleSelectModal } from '../pages/daily-report/RoleSelectModal';
import { getDailyReportRuleForUser } from '../pages/daily-report/templateConfig';
import { ReminderBell, hasDailyReportUnsubmittedReminder } from '../reminders/components/ReminderBell';
import { useReminders } from '../reminders/ReminderContext';
import { FeedbackModal } from '../feedback/FeedbackModal';
import { useQuotation } from '../pages/quotation/QuotationContext';
import { QUOTE_ROLES, QUOTE_ROLE_ACTORS } from '../pages/quotation/types';
import type { QuoteRole } from '../pages/quotation/types';

const Sider = Layout.Sider;
const Header = Layout.Header;
const Content = Layout.Content;
const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [dailyReportVisible, setDailyReportVisible] = useState(false);
  const [roleSelectVisible, setRoleSelectVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'sales' | 'general' | 'ad-delivery' | 'dev'>('sales');
  const [currentUserId] = useState('user-sales-zhangsan');
  const { dailyReports, reminders, submitDailyReport } = useReminders();
  const showUnsubmittedBadge = hasDailyReportUnsubmittedReminder(reminders);
  const { currentRole, setCurrentRole } = useQuotation();
  const currentActor = QUOTE_ROLE_ACTORS[currentRole];

  const handleDailyReportOpen = () => {
    setSelectedRole(getDailyReportRuleForUser(currentUserId).templateType);
    setDailyReportVisible(true);
  };

  const handleRoleSelect = (role: 'sales' | 'general' | 'ad-delivery' | 'dev') => {
    setSelectedRole(role);
    setRoleSelectVisible(false);
    setDailyReportVisible(true);
  };

  const handleDailyReportSubmit = (report: DailyReport) => {
    submitDailyReport(report);
  };

  const menuItems = [
    { key: '/', icon: <IconHome />, label: '工作台' },
    { key: '/workbench', icon: <IconUser />, label: '个人工作台' },
    { key: '/todos', icon: <IconCheckSquare />, label: '待办中心' },
    {
      key: 'leads',
      icon: <IconCustomerService />,
      label: '线索管理',
      children: [
        { key: '/leads/public', label: '公海线索' },
        { key: '/leads/my', label: '我的线索' },
        { key: '/leads/closed', label: '已成交线索' },
        { key: '/leads/trash', label: '垃圾线索' },
        { key: '/leads/governance', label: '线索治理' },
      ],
    },
    {
      key: 'lead-cost',
      icon: <IconExperiment />,
      label: '线索成本',
      children: [
        { key: '/lead-cost/dashboard', label: '成本看板' },
        { key: '/lead-cost/daily', label: '投放日报' },
        { key: '/lead-cost/recharge', label: '充值记录' },
        { key: '/lead-cost/analysis', label: '渠道分析' },
      ],
    },
    { key: '/customers', icon: <IconUser />, label: '客户管理' },
    { key: '/quotation', icon: <IconQuote />, label: '报价管理' },
    {
      key: 'contracts',
      icon: <IconFile />,
      label: '合同管理',
      children: [
        { key: '/contracts', label: '合同列表' },
      ],
    },
    { key: '/projects', icon: <IconApps />, label: '项目管理' },
    {
      key: 'dailyreport',
      icon: <IconCalendar />,
      label: '日报',
      children: [
        { key: '/dailyreport/list', label: '日报列表' },
        { key: '/dailyreport/view', label: '日报视图' },
        { key: '/dailyreport/projectlog', label: '项目视图' },
        { key: '/dailyreport/job-work-config', label: '日报配置' },
      ],
    },
    { key: '/reports', icon: <IconDashboard />, label: '数据报表' },
    { key: '/assets', icon: <IconApps />, label: '资产管理' },
    { key: '/maintenance', icon: <IconCustomerService />, label: '售后运维' },
    { key: '/suppliers', icon: <IconUser />, label: '供应商管理' },
    { key: '/knowledge', icon: <IconFile />, label: '知识库' },
    { key: '/meetings', icon: <IconCalendar />, label: '会议管理' },
    { key: '/roi', icon: <IconExperiment />, label: '全链路 ROI' },
    { key: '/ai', icon: <IconApps />, label: 'AI 智能助手' },
    {
      key: 'employees',
      icon: <IconUserGroup />,
      label: '员工管理',
      children: [
        { key: '/employees', label: '员工列表' },
        { key: '/employees/attendance', label: '考勤管理' },
        { key: '/employees/performance', label: '绩效考核' },
        { key: '/employees/level-rates', label: '职位管理' },
      ],
    },
    {
      key: 'hr',
      icon: <IconUserGroup />,
      label: '人资管理',
      children: [
        { key: '/hr/expenses', label: '费用管理' },
      ],
    },
    {
      key: 'finance',
      icon: <IconFile />,
      label: '财务管理',
      children: [
        { key: '/finance/dashboard', label: '财务统计' },
        { key: '/finance/project-cost', label: '项目成本核算' },
        { key: '/finance/salary', label: '工资表' },
        { key: '/finance/project-invoices', label: '开票审核' },
        { key: '/businesstrip', label: '出差申请' },
        { key: '/reimbursement', label: '报销申请' },
      ],
    },
    {
      key: 'approvals',
      icon: <IconFile />,
      label: '审批管理',
      children: [
        { key: '/approvals', label: '审批中心' },
        { key: '/approvals/templates', label: '审批模板' },
        { key: '/approvals/business', label: '业务审批配置' },
      ],
    },
    {
      key: 'system',
      icon: <IconSettings />,
      label: '系统管理',
      children: [
        { key: '/system/organization', label: '组织架构' },
        { key: '/system/permission', label: '用户权限' },
        { key: '/system/company', label: '本公司主体' },
        { key: '/system/dictionary', label: '数据字典' },
        { key: '/system/log', label: '系统日志' },
        { key: '/system/config', label: '系统配置' },
        { key: '/system/expensecategory', label: '费用分类管理' },
        { key: '/system/wecom', label: '企业微信集成' },
        { key: '/system/message-settings', label: '消息提醒设置' },
        { key: '/system/message-center', label: '消息发送记录' },
        { key: '/system/feedback', label: '意见反馈管理' },
      ],
    },
  ];

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/leads/')) {
      if (path === '/leads/public' || path === '/leads/my' || path === '/leads/closed' || path === '/leads/trash' || path === '/leads/governance') {
        return [path];
      }
      return ['/leads/my'];
    }
    if (path.startsWith('/lead-cost/')) {
      return [path];
    }
    if (path.startsWith('/dailyreport/')) {
      if (path === '/dailyreport/list' || path === '/dailyreport/view' || path === '/dailyreport/projectlog' || path === '/dailyreport/job-work-config') {
        return [path];
      }
      return ['/dailyreport/list'];
    }
    if (path === '/approvals' || path.startsWith('/approvals/')) {
      return [path];
    }
    if (path.startsWith('/customers/')) {
      return ['/customers'];
    }
    if (path === '/quotation' || path.startsWith('/quotation/')) {
      return ['/quotation'];
    }
    if (path === '/contracts' || path.startsWith('/contracts/')) {
      return ['/contracts'];
    }
    if (path.startsWith('/projects/')) {
      return ['/projects'];
    }
    if (path.startsWith('/employees/')) {
      if (path === '/employees/attendance' || path === '/employees/performance' || path === '/employees/level-rates') {
        return [path];
      }
      return ['/employees'];
    }
    if (path.startsWith('/hr/')) {
      return [path];
    }
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/employees/')) {
      return ['employees'];
    }
    if (path.startsWith('/hr/')) {
      return ['hr'];
    }
    if (path === '/contracts' || path.startsWith('/contracts/')) {
      return ['contracts'];
    }
    if (path.startsWith('/leads/')) {
      return ['leads'];
    }
    if (path.startsWith('/lead-cost/')) {
      return ['lead-cost'];
    }
    if (path.startsWith('/dailyreport/')) {
      return ['dailyreport'];
    }
    if (path.startsWith('/system/')) {
      return ['system'];
    }
    if (path === '/approvals' || path.startsWith('/approvals/')) {
      return ['approvals'];
    }
    if (
      path.startsWith('/finance/') ||
      path === '/businesstrip' ||
      path === '/reimbursement' ||
      path === '/paymentinvoice'
    ) {
      return ['finance'];
    }
    return [];
  };

  const handleUserMenuClick = (key: string) => {
    if (key === 'feedback') {
      setFeedbackVisible(true);
      return;
    }
    if (key === 'logout') {
      return;
    }
    setCurrentRole(key as QuoteRole);
  };

  const dropList = (
    <Menu onClickMenuItem={handleUserMenuClick} selectedKeys={[currentRole]}>
      {QUOTE_ROLES.map((r) => (
        <MenuItem key={r.key}>{r.name}</MenuItem>
      ))}
      <MenuItem key="feedback">
        <IconMessage style={{ marginRight: 8 }} />
        意见反馈
      </MenuItem>
      <MenuItem key="logout">
        <IconPoweroff style={{ marginRight: 8 }} />
        退出登录
      </MenuItem>
    </Menu>
  );

  return (
    <Layout className="h-screen">
      {/* ---- Light Sidebar ---- */}
      <Sider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        collapsible
        breakpoint="lg"
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          background: '#ffffff',
          borderRight: '1px solid var(--grey-200)',
        }}
      >
        {/* Branding */}
        <div
          className="flex items-center gap-3 overflow-hidden"
          style={{
            height: 56,
            paddingLeft: collapsed ? 16 : 20,
            paddingRight: collapsed ? 16 : 20,
          }}
        >
          <img
            src={logo}
            alt="ZK HubX"
            style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', flexShrink: 0 }}
          />
          {!collapsed && (
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--brand-500)', whiteSpace: 'nowrap' }}>
              ZK HubX
            </span>
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          onClickMenuItem={handleMenuClick}
          style={{ marginTop: 8 }}
        >
          {menuItems.map((item) =>
            item.children ? (
              <SubMenu
                key={item.key}
                title={
                  <>
                    {item.icon}
                    {item.label}
                  </>
                }
              >
                {item.children.map((child) => (
                  <MenuItem key={child.key}>{child.label}</MenuItem>
                ))}
              </SubMenu>
            ) : (
              <MenuItem key={item.key}>
                {item.icon}
                {item.label}
              </MenuItem>
            )
          )}
        </Menu>
      </Sider>

      {/* ---- Main Area ---- */}
      <Layout style={{ marginLeft: collapsed ? 48 : 200, transition: 'margin 0.2s' }}>
        {/* Header — clean, light */}
        <Header
          style={{
            height: 56,
            background: '#ffffff',
            borderBottom: '1px solid var(--grey-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          <div className="flex items-center gap-3">
            {/* Daily Report */}
            <Badge
              count={
                showUnsubmittedBadge ? (
                  <IconQuestionCircle style={{ color: 'var(--destructive-500)', fontSize: 14 }} />
                ) : (
                  0
                )
              }
              style={{ display: 'flex' }}
            >
              <IconCalendar
                style={{ fontSize: 18, cursor: 'pointer', color: 'var(--grey-500)' }}
                onClick={handleDailyReportOpen}
              />
            </Badge>

            {/* Unified Todo & Message Bell */}
            <ReminderBell onOpenDailyReport={handleDailyReportOpen} />

            {/* User Dropdown — 当前身份（模拟登录） */}
            <Dropdown droplist={dropList} position="br">
              <div className="flex items-center gap-2 cursor-pointer">
                <Avatar size={28} style={{ backgroundColor: 'var(--brand-500)' }}>
                  {currentActor.slice(0, 1)}
                </Avatar>
                <span style={{ fontSize: 14, color: 'var(--grey-700)' }}>{currentActor}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content
          style={{
            height: 'calc(100vh - 56px)',
            overflow: 'auto',
            background: 'var(--background)',
          }}
        >
          <div style={{ padding: 24 }}>
            <Outlet context={{ openDailyReport: handleDailyReportOpen }} />
          </div>
        </Content>
      </Layout>

      <DailyReportModal
        visible={dailyReportVisible}
        onCancel={() => setDailyReportVisible(false)}
        onSubmit={handleDailyReportSubmit}
        currentUserId={currentUserId}
        defaultRole={selectedRole}
        recentReports={dailyReports}
      />

      <RoleSelectModal
        visible={roleSelectVisible}
        onCancel={() => setRoleSelectVisible(false)}
        onSelect={handleRoleSelect}
      />

      <FeedbackModal
        visible={feedbackVisible}
        onCancel={() => setFeedbackVisible(false)}
      />
    </Layout>
  );
}
