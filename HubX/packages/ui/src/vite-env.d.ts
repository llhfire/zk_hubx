/**
 * Vite 静态资源模块声明。
 *
 * 构建期由 Vite 负责把这些后缀解析成 URL 字符串；TypeScript 本身不认识它们。
 * 没有这份声明时，所有 `import logo from '.../x.png'` 都会报 TS2307，
 * 真正有问题的资源引用会被淹没在噪声里。
 */

declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.jpeg' {
  const src: string;
  export default src;
}
declare module '*.gif' {
  const src: string;
  export default src;
}
declare module '*.webp' {
  const src: string;
  export default src;
}
declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.csv' {
  const src: string;
  export default src;
}
declare module '*.css';
