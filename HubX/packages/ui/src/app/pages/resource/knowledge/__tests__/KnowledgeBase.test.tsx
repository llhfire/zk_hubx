// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Message } from '@/design-system';
import { KnowledgeBase } from '../KnowledgeBase';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// jsdom 不实现 SVG 测量，附件图标的 ResizeObserver 会读取此接口。
Object.defineProperty(SVGElement.prototype, 'getBBox', {
  configurable: true,
  value: () => ({ x: 0, y: 0, width: 0, height: 0 }),
});

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  vi.spyOn(window, 'focus').mockImplementation(() => undefined);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<MemoryRouter><KnowledgeBase /></MemoryRouter>));
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
    Message.clear();
  });
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function button(label: string, scope: ParentNode = container) {
  const target = Array.from(scope.querySelectorAll<HTMLButtonElement>('button'))
    .find((item) => item.textContent === label || item.getAttribute('aria-label') === label);
  expect(target, `button ${label}`).toBeDefined();
  return target!;
}

async function click(label: string, scope: ParentNode = container) {
  await act(async () => button(label, scope).click());
}

function modal() {
  // Arco 在退场动画期间保留弹窗 DOM，操作只针对当前打开的弹窗。
  const target = Array.from(document.querySelectorAll<HTMLElement>('.arco-modal'))
    .find((item) => {
      const wrapper = item.closest<HTMLElement>('.arco-modal-wrapper');
      return wrapper?.style.display !== 'none' && wrapper?.style.overflow !== 'hidden';
    });
  expect(target).toBeDefined();
  return target!;
}

async function search(value: string) {
  const input = container.querySelector<HTMLInputElement>('input[placeholder="搜索文档名称或文件名"]');
  expect(input).not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input!.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function chooseFile(file: File) {
  const upload = modal().querySelector<HTMLInputElement>('input[type="file"]');
  expect(upload).not.toBeNull();
  await act(async () => {
    Object.defineProperty(upload, 'files', { configurable: true, value: [file] });
    upload!.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('KnowledgeBase 桌面端文档交互', () => {
  it('组织、分类和文件名搜索共同筛选，重置恢复全部文档', async () => {
    const organization = Array.from(container.querySelectorAll<HTMLElement>('.arco-tree-node-title'))
      .find((item) => item.textContent?.startsWith('技术部'));
    expect(organization).toBeDefined();
    await act(async () => organization!.click());
    expect(container.textContent).toContain('技术部共 5 份文档');

    await click('技术方案');
    expect(button('技术方案').getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).toContain('技术部共 2 份文档');
    await search('REACT性能优化最佳实践.PDF');
    expect(container.textContent).toContain('技术部共 1 份文档');
    expect(container.querySelector('.arco-table')?.textContent).toContain('React 性能优化最佳实践');
    expect(container.querySelector('.arco-table')?.textContent).not.toContain('微服务架构设计指南');

    await click('重置');
    expect(container.textContent).toContain('总公司共 8 份文档');
    expect(button('全部文档').getAttribute('aria-pressed')).toBe('true');
    expect(button('技术方案').getAttribute('aria-pressed')).toBe('false');
  });

  it('搜索无结果后可清除筛选，文档入口都使用设计系统按钮', async () => {
    expect(container.querySelector('input[aria-label="搜索文档名称或文件名"]')).not.toBeNull();
    expect(Array.from(container.querySelectorAll('button')).every((item) => item.classList.contains('arco-btn'))).toBe(true);
    await search('不存在的知识文档');
    expect(container.textContent).toContain('当前条件下暂无文档');
    await click('清除筛选');
    expect(container.textContent).toContain('总公司共 8 份文档');
    await click('React 性能优化最佳实践');
    expect(modal().textContent).toContain('46 次');
  });

  it.each([
    'React 性能优化最佳实践',
    'React性能优化最佳实践.pdf · 2.4 MB',
  ])('通过 %s 保留预览入口与阅读次数', async (label) => {
    expect(button(label).classList.contains('arco-btn')).toBe(true);
    await click(label);
    expect(modal().textContent).toContain('React 应用性能优化的常见手段与检查清单。');
    expect(modal().textContent).toContain('46 次');
    expect(button('下载文件', modal())).toBeDefined();
  });

  it('压缩包点击后直接下载，不进入预览', async () => {
    const createObjectURL = vi.fn(() => 'blob:knowledge-download');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }));
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await click('HubX-desktop-v1.2.zip · 86 MB');

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(download).toHaveBeenCalledOnce();
    expect(download.mock.instances[0].download).toBe('HubX-desktop-v1.2.zip');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:knowledge-download');
    expect(document.querySelector('.arco-modal')).toBeNull();
  });

  it('删除附件显示统一提示并拦截保存，替换后保留文档元数据', async () => {
    await click('编辑文档React 性能优化最佳实践');
    expect(modal().querySelector('.hubx-file-list')?.textContent).toContain('React性能优化最佳实践.pdf');
    expect(modal().querySelector('.hubx-file-list')?.textContent).toContain('2.4 MB');

    await click('删除 React性能优化最佳实践.pdf', modal());
    expect(modal().querySelector('.hubx-file-list')).toBeNull();
    expect(modal().querySelector('.hubx-alert-banner--danger[role="status"]')?.textContent)
      .toBe('原附件已移除，请上传新文件后保存。');
    await click('保存', modal());
    expect(modal().textContent).toContain('编辑文档');
    expect(container.querySelector('.arco-table')?.textContent).toContain('React性能优化最佳实践.pdf');

    const replacement = new File(['updated content'], '性能优化修订.pdf', { type: 'application/pdf' });
    await chooseFile(replacement);
    expect(modal().querySelector('.hubx-alert-banner')).toBeNull();
    await click('保存', modal());

    const row = button('性能优化修订.pdf · 1 KB').closest('tr');
    expect(row?.textContent).toContain('React 性能优化最佳实践');
    expect(row?.textContent).toContain('前端组');
    expect(row?.textContent).toContain('内部公开');
    expect(row?.textContent).toContain('黄丽');
  });

  it('取消删除附件不会更改文档，再次编辑恢复原附件', async () => {
    await click('编辑文档React 性能优化最佳实践');
    await click('删除 React性能优化最佳实践.pdf', modal());
    expect(modal().textContent).toContain('原附件已移除，请上传新文件后保存。');
    await click('取消', modal());
    await click('编辑文档React 性能优化最佳实践');
    expect(modal().querySelector('.hubx-file-list')?.textContent).toContain('React性能优化最佳实践.pdf');
    expect(modal().querySelector('.hubx-alert-banner')).toBeNull();
    expect(modal().querySelector('input[type="file"]')).toBeNull();
    await click('保存', modal());
    expect(button('React性能优化最佳实践.pdf · 2.4 MB')).toBeDefined();
  });

  it.each([
    { name: '知识附件.pdf', type: 'application/pdf', selector: 'iframe' },
    { name: '知识附件.png', type: 'image/png', selector: 'img' },
  ])('上传 $name 后保留组织并能预览、下载与释放资源', async ({ name, type, selector }) => {
    // jsdom 不支持 blob iframe 的同源文档，用可解析来源验证 URL 生命周期。
    const sourceUrl = 'http://localhost/knowledge-source';
    const createObjectURL = vi.fn(() => sourceUrl);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }));
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const organization = Array.from(container.querySelectorAll<HTMLElement>('.arco-tree-node-title'))
      .find((item) => item.textContent?.startsWith('技术部'));
    await act(async () => organization!.click());
    await click('上传至技术部');
    const title = modal().querySelector<HTMLInputElement>('input[placeholder="请输入便于检索的文档名称"]');
    expect(title).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(title, '知识附件');
      title!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const source = new File(['knowledge content'], name, { type });
    await chooseFile(source);
    await click('确认上传', modal());

    expect(container.textContent).toContain('技术部共 6 份文档');
    const row = button(`${name} · 1 KB`).closest('tr');
    expect(row?.textContent).toContain('技术部');
    expect(row?.textContent).toContain('内部公开');
    await click(`${name} · 1 KB`);
    expect(modal().querySelector(selector)?.getAttribute('src')).toBe(sourceUrl);
    expect(modal().textContent).toContain('1 次');
    expect(createObjectURL).toHaveBeenCalledWith(source);

    await click('下载文件', modal());
    expect(download.mock.instances[0].download).toBe(name);
    expect(createObjectURL).toHaveBeenLastCalledWith(source);
    revokeObjectURL.mockClear();
    await click('关闭', modal());
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith(sourceUrl);
  });
});
