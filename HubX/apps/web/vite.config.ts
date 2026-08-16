// 前后端版前端的构建配置：复用 packages/ui 的同一份 UI 源码。
// 与 apps/prototype 的区别在于后续这里会注入 http service（通过环境变量配置 API 地址）。
import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '');
        return path.resolve(__dirname, '../../packages/ui/src/assets', filename);
      }
    },
  };
}

export default defineConfig({
  plugins: [figmaAssetResolver(), react(), tailwindcss()],
  resolve: {
    alias: {
      // 指向共享 UI 源码，与 prototype 同一份
      '@': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  optimizeDeps: {
    include: ['@arco-design/web-react', '@arco-design/web-react/icon'],
  },
});
