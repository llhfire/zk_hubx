import type { LoggingFunction, RollupLog } from 'rollup';

function normalizeModuleId(id: string) {
  return id.replace(/\\/g, '/');
}

function handleRollupWarning(warning: RollupLog, warn: LoggingFunction) {
  // gantt-task-react 0.3.9 ships two misplaced PURE annotations. Rollup
  // removes those comments safely; suppress only this known upstream notice.
  if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('/gantt-task-react/')) return;
  warn(warning);
}

export function splitVendorChunk(id: string) {
  const moduleId = normalizeModuleId(id);
  if (!moduleId.includes('/node_modules/')) return undefined;

  if (
    moduleId.includes('/node_modules/react/')
    || moduleId.includes('/node_modules/react-dom/')
    || moduleId.includes('/node_modules/react-router/')
    || moduleId.includes('/node_modules/scheduler/')
  ) {
    return 'vendor-react';
  }

  if (
    moduleId.includes('/node_modules/@arco-design/web-react/icon/')
    || moduleId.includes('/node_modules/@arco-design/web-react/icon.js')
    || moduleId.includes('/node_modules/@arco-design/web-react/es/icon/')
    || moduleId.includes('/node_modules/@arco-design/web-react/lib/icon/')
  ) {
    return 'vendor-arco-icons';
  }

  if (moduleId.includes('/node_modules/@arco-design/web-react/')) {
    return 'vendor-arco';
  }

  if (moduleId.includes('/node_modules/@phosphor-icons/react/')) {
    return 'vendor-icons';
  }

  if (
    moduleId.includes('/node_modules/recharts/')
    || moduleId.includes('/node_modules/d3-')
    || moduleId.includes('/node_modules/victory-vendor/')
  ) {
    return 'vendor-charts';
  }

  if (moduleId.includes('/node_modules/gantt-task-react/')) {
    return 'vendor-gantt';
  }

  if (
    moduleId.includes('/node_modules/quill/')
  ) {
    return 'vendor-editor';
  }

  if (
    moduleId.includes('/node_modules/react-dnd/')
    || moduleId.includes('/node_modules/react-dnd-html5-backend/')
    || moduleId.includes('/node_modules/dnd-core/')
  ) {
    return 'vendor-dnd';
  }

  if (
    moduleId.includes('/node_modules/date-fns/')
    || moduleId.includes('/node_modules/dayjs/')
  ) {
    return 'vendor-date';
  }

  return undefined;
}

export const sharedBuildConfig = {
  cssCodeSplit: true,
  // ExcelJS is already isolated behind dynamic imports and only downloaded for
  // spreadsheet export. Keep the warning focused on unexpectedly large eager chunks.
  chunkSizeWarningLimit: 1000,
  rollupOptions: {
    onwarn: handleRollupWarning,
    output: {
      manualChunks: splitVendorChunk,
    },
  },
};
