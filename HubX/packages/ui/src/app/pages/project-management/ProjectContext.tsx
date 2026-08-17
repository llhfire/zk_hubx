// 项目模块全局状态：阶段 2 把项目列表从各页面局部 useState 收敛到共享 Context，
// 让「项目列表确认指派」与「线索详情项目条幅 / 项目执行 Tab」读到同一份状态。
// 项目数据仍是 mock（未接 HTTP），先保持内存态，接后端时再抽 services 数据接缝。

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { initialProjects, type Project } from './mockData';

interface ProjectContextValue {
  projects: Project[];
  getProjectById: (id: string | undefined) => Project | undefined;
  /** 按线索 ID 别名集（原样 ID / lead-* 形式）找关联项目 */
  getProjectByLeadId: (leadId: string | undefined) => Project | null;
  updateProject: (next: Project) => void;
  addProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: PropsWithChildren) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);

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

  const updateProject = useCallback((next: Project) => {
    setProjects((current) => current.map((project) => (project.id === next.id ? next : project)));
  }, []);

  const addProject = useCallback((project: Project) => {
    setProjects((current) => [project, ...current]);
  }, []);

  const removeProject = useCallback((projectId: string) => {
    setProjects((current) => current.filter((project) => project.id !== projectId));
  }, []);

  const value = useMemo<ProjectContextValue>(
    () => ({ projects, getProjectById, getProjectByLeadId, updateProject, addProject, removeProject }),
    [projects, getProjectById, getProjectByLeadId, updateProject, addProject, removeProject],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjects(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects must be used within ProjectProvider');
  return ctx;
}
