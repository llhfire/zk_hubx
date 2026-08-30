function normalizeModuleId(id: string) {
  return id.replace(/\\/g, '/');
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
    || moduleId.includes('/node_modules/react-quill/')
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
  rollupOptions: {
    output: {
      manualChunks: splitVendorChunk,
    },
  },
};
