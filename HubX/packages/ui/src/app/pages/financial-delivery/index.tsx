import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router';
import Dashboard from './dashboard/Dashboard';
import CaseList from './cases/CaseList';
import CaseDetail from './cases/CaseDetail';

function LegacyPostMortemRedirect() {
  const { id } = useParams();
  return <Navigate to={`/financial-delivery/cases/${id}?tab=post-mortem`} replace />;
}

const FinancialDelivery: React.FC = () => {
  return (
    <Routes>
      {/* 默认重定向到仪表盘 */}
      <Route path="/" element={<Navigate to="/financial-delivery/dashboard" replace />} />

      {/* 仪表盘 */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* 业务单管理 */}
      <Route path="/cases" element={<CaseList />} />
      <Route path="/cases/:id" element={<CaseDetail />} />

      {/* 项目决算 */}
      <Route path="/post-mortems" element={<Navigate to="/financial-delivery/cases" replace />} />
      <Route path="/post-mortems/:id" element={<LegacyPostMortemRedirect />} />
    </Routes>
  );
};

export default FinancialDelivery;
