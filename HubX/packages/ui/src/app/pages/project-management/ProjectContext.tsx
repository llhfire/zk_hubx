// 项目模块全局状态（B4 数据接缝）。数据层抽到 services/projectService（mock/http 双实现），
// 这里只是 React 绑定：镜像 service 返回的数据 + 委托操作后 refresh。
// α 缺省 mock（SSR 测试用 initialProjects 作首帧）；β 注入 http（apps/web/src/main.tsx）。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { initialProjects, type Project, type ProjectStatus } from './mockData';
import { createMockProjectService, type ProjectService } from '@/services/projectService';

interface ProjectContextValue {
  projects: Project[];
  loading: boolean;
  getProjectById: (id: string | undefined) => Project | undefined;
  /** 按线索 ID 别名集（原样 ID / lead-* 形式）找关联项目 */
  getProjectByLeadId: (leadId: string | undefined) => Project | null;
  refresh: () => Promise<void>;
  updateProject: (next: Project) => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
  confirmAssign: (id: string, productManager: string) => Promise<void>;
  reassignPm: (id: string, productManager: string) => Promise<void>;
  advanceStatus: (id: string, status: ProjectStatus) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectProviderProps extends PropsWithChildren {
  service?: ProjectService;
}

export function ProjectProvider({ children, service }: ProjectProviderProps) {
  const svc = useMemo(() => service ?? createMockProjectService(), [service]);
  // α / 单测 SSR：首帧用种子，避免 renderToStaticMarkup 看不到项目
  const [projects, setProjects] = useState<Project[]>(() => (service ? [] : initialProjects));
  const [loading, setLoading] = useState(() => Boolean(service));

  useEffect(() => {
    let cancelled = false;
    svc.list().then((ps) => {
      if (cancelled) return;
      setProjects(ps);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [svc]);

  const refresh = useCallback(async () => {
    setProjects(await svc.list());
  }, [svc]);

  const getProjectById = useCallback(
    (id: string | undefined) => (id ? projects.find((project) => project.id === id) : undefined),
    [projects],
  );

  const getProjectByLeadId = useCallback(
    (leadId: string | undefined) => {
      if (!leadId) return null;
      const aliases = [
        leadId,
        leadId.startsWith('lead-') ? leadId : `lead-${leadId}`,
      ];
      return projects.find((project) => project.leadId && aliases.includes(project.leadId)) ?? null;
    },
    [projects],
  );

  const updateProject = useCallback(async (next: Project) => {
    await svc.updateProject(next.id, () => next);
    await refresh();
  }, [svc, refresh]);

  const addProject = useCallback(async (project: Project) => {
    await svc.create(project);
    await refresh();
  }, [svc, refresh]);

  const removeProject = useCallback(async (projectId: string) => {
    await svc.remove(projectId);
    await refresh();
  }, [svc, refresh]);

  const confirmAssign = useCallback(async (id: string, productManager: string) => {
    await svc.confirmAssign(id, productManager);
    await refresh();
  }, [svc, refresh]);

  const reassignPm = useCallback(async (id: string, productManager: string) => {
    await svc.reassignPm(id, productManager);
    await refresh();
  }, [svc, refresh]);

  const advanceStatus = useCallback(async (id: string, status: ProjectStatus) => {
    await svc.advanceStatus(id, status);
    await refresh();
  }, [svc, refresh]);

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      loading,
      getProjectById,
      getProjectByLeadId,
      refresh,
      updateProject,
      addProject,
      removeProject,
      confirmAssign,
      reassignPm,
      advanceStatus,
    }),
    [
      projects,
      loading,
      getProjectById,
      getProjectByLeadId,
      refresh,
      updateProject,
      addProject,
      removeProject,
      confirmAssign,
      reassignPm,
      advanceStatus,
    ],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjects(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects must be used within ProjectProvider');
  return ctx;
}
