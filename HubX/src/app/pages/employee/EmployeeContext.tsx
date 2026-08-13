import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Employee,
  AttendanceRecord,
  PerformanceReview,
  LevelRateConfig,
  initialEmployees,
  initialAttendance,
  initialPerformanceReviews,
  initialLevelRates,
  ALL_POSITIONS,
  AbilityScores,
  calcWeightedScore,
  checkPromotionEligibility,
  calcPromotionProgress,
  skillTreeDefinitions,
  ExperienceSource,
} from './mockData';

interface EmployeeContextValue {
  // state
  employees: Employee[];
  attendance: AttendanceRecord[];
  performanceReviews: PerformanceReview[];
  levelRates: LevelRateConfig[];
  positions: string[];
  // employee CRUD
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  getEmployeeById: (id: string) => Employee | undefined;
  // attendance CRUD
  addAttendance: (record: Omit<AttendanceRecord, 'id'>) => void;
  updateAttendance: (id: string, data: Partial<AttendanceRecord>) => void;
  approveAttendance: (id: string, approvedBy: string) => void;
  rejectAttendance: (id: string, approvedBy: string) => void;
  // performance CRUD
  addPerformance: (review: Omit<PerformanceReview, 'id'>) => void;
  updatePerformance: (id: string, data: Partial<PerformanceReview>) => void;
  getPerformanceByEmployee: (employeeId: string) => PerformanceReview[];
  // level rate
  updateLevelRate: (level: string, position: string, rate: number) => void;
  getLevelRate: (level: string, position: string) => LevelRateConfig | undefined;
  addPosition: (position: string) => void;
  addLevelRate: (levelRate: LevelRateConfig) => void;
  // capability (内嵌 Employee)
  skillTrees: typeof skillTreeDefinitions;
}

const EmployeeContext = createContext<EmployeeContextValue | null>(null);

let nextId = 100;
function genId(prefix: string) {
  return `${prefix}${++nextId}`;
}

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(initialAttendance);
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>(initialPerformanceReviews);
  const [levelRates, setLevelRates] = useState<LevelRateConfig[]>(initialLevelRates);
  const [positions, setPositions] = useState<string[]>(ALL_POSITIONS);

  // ---- Employee ----
  const addEmployee = useCallback((emp: Omit<Employee, 'id'>) => {
    setEmployees(prev => [...prev, { ...emp, id: genId('emp-') }]);
  }, []);

  const updateEmployee = useCallback((id: string, data: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => (e.id === id ? { ...e, ...data } : e)));
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  }, []);

  const getEmployeeById = useCallback(
    (id: string) => employees.find(e => e.id === id),
    [employees],
  );

  // ---- Attendance ----
  const addAttendance = useCallback((record: Omit<AttendanceRecord, 'id'>) => {
    setAttendance(prev => [...prev, { ...record, id: genId('att-') }]);
  }, []);

  const updateAttendance = useCallback((id: string, data: Partial<AttendanceRecord>) => {
    setAttendance(prev => prev.map(r => (r.id === id ? { ...r, ...data } : r)));
  }, []);

  const approveAttendance = useCallback((id: string, approvedBy: string) => {
    setAttendance(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, status: '已批准' as const, approvedBy, approvedAt: new Date().toISOString().slice(0, 10) }
          : r,
      ),
    );
  }, []);

  const rejectAttendance = useCallback((id: string, approvedBy: string) => {
    setAttendance(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, status: '已拒绝' as const, approvedBy, approvedAt: new Date().toISOString().slice(0, 10) }
          : r,
      ),
    );
  }, []);

  // ---- Performance ----
  const addPerformance = useCallback((review: Omit<PerformanceReview, 'id'>) => {
    setPerformanceReviews(prev => [...prev, { ...review, id: genId('perf-') }]);
  }, []);

  const updatePerformance = useCallback((id: string, data: Partial<PerformanceReview>) => {
    setPerformanceReviews(prev => prev.map(r => (r.id === id ? { ...r, ...data } : r)));
  }, []);

  const getPerformanceByEmployee = useCallback(
    (employeeId: string) => performanceReviews.filter(r => r.employeeId === employeeId),
    [performanceReviews],
  );

  // ---- Level Rate ----
  const updateLevelRate = useCallback((level: string, position: string, rate: number) => {
    setLevelRates(prev =>
      prev.map(r => (r.level === level && r.position === position ? { ...r, standardRate: rate } : r)),
    );
    // 同步更新该职级该职位下员工的 standardHourlyRate
    setEmployees(prev =>
      prev.map(e =>
        e.level === level && e.position === position ? { ...e, standardHourlyRate: rate } : e,
      ),
    );
  }, []);

  const getLevelRate = useCallback(
    (level: string, position: string) =>
      levelRates.find(r => r.level === level && r.position === position),
    [levelRates],
  );

  const addPosition = useCallback((position: string) => {
    setPositions(prev => [...prev, position]);
  }, []);

  const addLevelRate = useCallback((levelRate: LevelRateConfig) => {
    setLevelRates(prev => [...prev, levelRate]);
  }, []);

  return (
    <EmployeeContext.Provider
      value={{
        employees,
        attendance,
        performanceReviews,
        levelRates,
        positions,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        getEmployeeById,
        addAttendance,
        updateAttendance,
        approveAttendance,
        rejectAttendance,
        addPerformance,
        updatePerformance,
        getPerformanceByEmployee,
        updateLevelRate,
        getLevelRate,
        addPosition,
        addLevelRate,
        skillTrees: skillTreeDefinitions,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployee() {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error('useEmployee must be used within EmployeeProvider');
  return ctx;
}
