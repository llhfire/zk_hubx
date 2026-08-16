import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  DEFAULT_DEPARTMENT_ROUTINES,
  DEFAULT_WORK_NATURES,
  DAILY_PROJECT_CATEGORIES,
  JOB_DEPARTMENTS,
  type DepartmentRoutineConfig,
  createDefaultDepartmentRoutineConfigs,
  createDefaultWorkNatureMap,
  findJobPosition,
  isLegacyOperationsRoutine,
} from './jobWorkConfigData';

const WORK_NATURE_STORAGE_KEY = 'hubx-job-work-config-v1';
const DEPARTMENT_ROUTINE_STORAGE_KEY = 'hubx-daily-project-config-v4';

interface JobWorkConfigContextValue {
  workNatureMap: Record<string, string[]>;
  departmentRoutineConfigs: DepartmentRoutineConfig[];
  getWorkNatures: (positionIdOrName: string) => string[];
  updateWorkNatures: (positionId: string, values: string[]) => void;
  resetPosition: (positionId: string) => void;
  addDepartmentRoutine: (config: DepartmentRoutineConfig) => void;
  updateDepartmentRoutine: (config: DepartmentRoutineConfig) => void;
  deleteDepartmentRoutine: (routineId: string) => void;
  resetDepartmentRoutine: (routineId: string) => void;
}

const defaultWorkNatureMap = createDefaultWorkNatureMap();
const defaultDepartmentRoutineConfigs = createDefaultDepartmentRoutineConfigs();
const defaultContextValue: JobWorkConfigContextValue = {
  workNatureMap: defaultWorkNatureMap,
  departmentRoutineConfigs: defaultDepartmentRoutineConfigs,
  getWorkNatures: (positionIdOrName: string) => {
    const target = findJobPosition(positionIdOrName);
    return target ? defaultWorkNatureMap[target.position.id] || [] : [];
  },
  updateWorkNatures: () => {},
  resetPosition: () => {},
  addDepartmentRoutine: () => {},
  updateDepartmentRoutine: () => {},
  deleteDepartmentRoutine: () => {},
  resetDepartmentRoutine: () => {},
};

const JobWorkConfigContext = createContext<JobWorkConfigContextValue>(defaultContextValue);

function normalizeWorkNatures(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean)));
}

function loadWorkNatureMap() {
  const defaults = createDefaultWorkNatureMap();

  try {
    const saved = window.localStorage.getItem(WORK_NATURE_STORAGE_KEY);
    if (!saved) return defaults;

    const parsed = JSON.parse(saved) as Record<string, unknown>;
    Object.keys(defaults).forEach(positionId => {
      if (Array.isArray(parsed[positionId])) {
        defaults[positionId] = normalizeWorkNatures(parsed[positionId]);
      }
    });
  } catch {
    return defaults;
  }

  return defaults;
}

function loadDepartmentRoutineConfigs() {
  const defaults = createDefaultDepartmentRoutineConfigs();
  const categoryIds = new Set(DAILY_PROJECT_CATEGORIES.map(category => category.id));

  try {
    const saved = window.localStorage.getItem(DEPARTMENT_ROUTINE_STORAGE_KEY);
    if (!saved) return defaults;

    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return defaults;

    const savedConfigs = parsed.map(item => {
      if (!item || typeof item !== 'object') return null;
      const value = item as Partial<DepartmentRoutineConfig>;
      if (typeof value.id !== 'string' || typeof value.departmentId !== 'string') return null;
      if (typeof value.name !== 'string' || !value.name.trim()) return null;

      const department = value.departmentId === 'company'
        ? undefined
        : JOB_DEPARTMENTS.find(current => current.id === value.departmentId);
      if (value.departmentId !== 'company' && !department) return null;

      return {
        id: value.id,
        category: categoryIds.has(value.category as any) ? value.category : 'operations',
        departmentId: value.departmentId,
        name: value.name.trim(),
        enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
        sortOrder: typeof value.sortOrder === 'number' && Number.isFinite(value.sortOrder)
          ? Math.max(1, Math.trunc(value.sortOrder))
          : 1,
        remark: typeof value.remark === 'string' ? value.remark.trim() : '',
      } as DepartmentRoutineConfig;
    }).filter((item): item is DepartmentRoutineConfig => item !== null);

    const activeSavedConfigs = savedConfigs.filter(config => !isLegacyOperationsRoutine(config));
    const defaultIds = new Set(defaults.map(config => config.id));
    const mergedDefaults = defaults.map(defaultConfig => {
      const savedConfig = activeSavedConfigs.find(config => config.id === defaultConfig.id);
      return savedConfig
        ? {
            ...savedConfig,
            id: defaultConfig.id,
            category: defaultConfig.category,
            departmentId: defaultConfig.departmentId,
          }
        : defaultConfig;
    });
    return [
      ...mergedDefaults,
      ...activeSavedConfigs.filter(config => !defaultIds.has(config.id)),
    ];
  } catch {
    return defaults;
  }
}

export function JobWorkConfigProvider({ children }: PropsWithChildren) {
  const [workNatureMap, setWorkNatureMap] = useState<Record<string, string[]>>(loadWorkNatureMap);
  const [departmentRoutineConfigs, setDepartmentRoutineConfigs] = useState<DepartmentRoutineConfig[]>(loadDepartmentRoutineConfigs);

  useEffect(() => {
    window.localStorage.setItem(WORK_NATURE_STORAGE_KEY, JSON.stringify(workNatureMap));
  }, [workNatureMap]);

  useEffect(() => {
    window.localStorage.setItem(DEPARTMENT_ROUTINE_STORAGE_KEY, JSON.stringify(departmentRoutineConfigs));
  }, [departmentRoutineConfigs]);

  const getWorkNatures = useCallback((positionIdOrName: string) => {
    const target = findJobPosition(positionIdOrName);
    return target ? workNatureMap[target.position.id] || [] : [];
  }, [workNatureMap]);

  const updateWorkNatures = useCallback((positionId: string, values: string[]) => {
    setWorkNatureMap(previous => ({
      ...previous,
      [positionId]: normalizeWorkNatures(values),
    }));
  }, []);

  const resetPosition = useCallback((positionId: string) => {
    setWorkNatureMap(previous => ({
      ...previous,
      [positionId]: [...(DEFAULT_WORK_NATURES[positionId] || [])],
    }));
  }, []);

  const addDepartmentRoutine = useCallback((config: DepartmentRoutineConfig) => {
    setDepartmentRoutineConfigs(previous => [
      ...previous,
      { ...config, name: config.name.trim() },
    ]);
  }, []);

  const updateDepartmentRoutine = useCallback((config: DepartmentRoutineConfig) => {
    setDepartmentRoutineConfigs(previous => previous.map(item => (
      item.id === config.id
        ? { ...config, name: config.name.trim() }
        : item
    )));
  }, []);

  const deleteDepartmentRoutine = useCallback((routineId: string) => {
    if (DEFAULT_DEPARTMENT_ROUTINES.some(config => config.id === routineId)) return;
    setDepartmentRoutineConfigs(previous => previous.filter(config => config.id !== routineId));
  }, []);

  const resetDepartmentRoutine = useCallback((routineId: string) => {
    const defaultConfig = DEFAULT_DEPARTMENT_ROUTINES.find(item => item.id === routineId);
    if (!defaultConfig) return;
    setDepartmentRoutineConfigs(previous => previous.map(item => (
      item.id === routineId
        ? { ...defaultConfig }
        : item
    )));
  }, []);

  return (
    <JobWorkConfigContext.Provider
      value={{
        workNatureMap,
        departmentRoutineConfigs,
        getWorkNatures,
        updateWorkNatures,
        resetPosition,
        addDepartmentRoutine,
        updateDepartmentRoutine,
        deleteDepartmentRoutine,
        resetDepartmentRoutine,
      }}
    >
      {children}
    </JobWorkConfigContext.Provider>
  );
}

export function useJobWorkConfig() {
  return useContext(JobWorkConfigContext);
}
