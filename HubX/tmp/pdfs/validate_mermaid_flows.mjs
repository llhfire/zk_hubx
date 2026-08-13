import fs from 'node:fs';
import mermaid from './mermaid-runtime/node_modules/mermaid/dist/mermaid.core.mjs';

const markdown = fs.readFileSync('docs/线索管理业务流程图.md', 'utf8');
const diagrams = [...markdown.matchAll(/^## \d+\. .+?\n\n```mermaid\n([\s\S]*?)\n```/gm)]
  .map((match) => match[1]);

mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
await Promise.all(diagrams.map((diagram) => mermaid.parse(diagram)));
console.log(`Mermaid syntax passed for ${diagrams.length} diagrams`);
