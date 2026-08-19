import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import Dashboard from './dashboard/Dashboard';
import CaseList from './cases/CaseList';
import CaseDetail from './cases/CaseDetail';

interface FinancialDeliveryProps {}

const FinancialDelivery: React.FC<FinancialDeliveryProps> = () => {
  return (
    <Routes>
      {/* 默认重定向到仪表盘 */}
      <Route path="/" element={<Navigate to="/financial-delivery/dashboard" replace />} />

      {/* 仪表盘 */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* 业务单管理 */}
      <Route path="/cases" element={<CaseList />} />
      <Route path="/cases/:id" element={<CaseDetail />} />
      <Route path="/cases/:id/edit" element={<CaseDetail />} />
      <Route path="/cases/create" element={<CaseDetail />} />

      {/* 功能清单管理 */}
      <Route path="/feature-lists" element={<div>功能清单列表</div>} />
      <Route path="/feature-lists/:id" element={<div>功能清单详情</div>} />

      {/* 报价单管理 */}
      <Route path="/quotations" element={<div>报价单列表</div>} />
      <Route path="/quotations/:id" element={<div>报价单详情</div>} />

      {/* 项目决算 */}
      <Route path="/post-mortems" element={<div>项目决算列表</div>} />
      <Route path="/post-mortems/:id" element={<div>项目决算详情</div>} />
    </Routes>
  );
};

export default FinancialDelivery;