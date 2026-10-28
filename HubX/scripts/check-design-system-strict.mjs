#!/usr/bin/env node
/**
 * 桌面页面严格门禁；也向迁移期门禁提供同一份 AST 审计。
 *
 * 保留 pages 内直接 Arco import 必须为零的原契约。新增检查覆盖 pages、
 * app/leads、路由导出和它们实际引用的本地 JSX 子组件（含 barrel）。
 * design-system 是实现边界，不继续穿透；模板字符串不当作 JSX 控件。
 * --report/--details 输出全部定位与例外；--self-test 运行隔离的回归测试。
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = 'packages/ui/src/';
const PAGES_PREFIX = `${SOURCE_ROOT}app/pages/`;
const THIRD_PARTY_UI = /^(?:@arco-design\/web-react|@phosphor-icons\/react|phosphor-react|recharts)(?:\/|$)/;
const normalize = (text) => text.replace(/\s+/g, ' ').trim();
const fingerprint = (text) => createHash('sha256').update(normalize(text)).digest('hex').slice(0, 16);

// 2026-10-28 新发现的存量债务，仅匹配文件 + 规则 + 节点内容 + 次数。
// 这不是文件级豁免：改写/新增节点不能借用旧名额；--details 会逐项打印理由。
// 修复后可以删除对应项，禁止通过自动刷新基线掩盖新增违规。
// pages 内原先已管控的 Arco import 不允许登记。
const MIGRATION_ALLOWLIST = [
  ["packages/ui/src/app/leads/LeadTransferPopover.tsx", "visualInlineStyle", "bae25191a8431eee", 2, "新增 leads 扫描范围的既有 token 样式；保留旧 pages 预算并禁止增长"],
  ["packages/ui/src/app/leads/LeadTransferPopover.tsx", "visualInlineStyle", "b3f3210eb61a356b", 1, "新增 leads 扫描范围的既有 token 样式；保留旧 pages 预算并禁止增长"],
  ["packages/ui/src/app/leads/LeadTransferPopover.tsx", "visualInlineStyle", "890bbf9c66508cba", 1, "新增 leads 扫描范围的既有 token 样式；保留旧 pages 预算并禁止增长"],
  ["packages/ui/src/app/leads/LeadTransferPopover.tsx", "visualInlineStyle", "dc336c626fc2aa41", 1, "新增 leads 扫描范围的既有 token 样式；保留旧 pages 预算并禁止增长"],
  ["packages/ui/src/app/pages/acquisition/lead-cost/LeadCostAnalysis.tsx", "directUiImport", "070b084448a48020", 1, "存量图表直接依赖 Recharts；待迁入设计系统图表出口"],
  ["packages/ui/src/app/pages/cross/reports/Reports.tsx", "directUiImport", "777e40636a2b10cf", 1, "存量图表直接依赖 Recharts；待迁入设计系统图表出口"],
  ["packages/ui/src/app/pages/cross/reports/Reports.tsx", "jsxHardcodedColor", "80525546e6f1ee01", 1, "存量图表 JSX 色值；待改为设计系统 token"],
  ["packages/ui/src/app/pages/delivery/project/ProjectCostPanel.tsx", "directUiImport", "16fd2f7431a48991", 1, "存量图表直接依赖 Recharts；待迁入设计系统图表出口"],
  ["packages/ui/src/app/pages/delivery/project/ProjectCostPanel.tsx", "jsxHardcodedColor", "a0da89217fd83495", 1, "存量图表 JSX 色值；待改为设计系统 token"],
  ["packages/ui/src/app/pages/delivery/project/ProjectCostPanel.tsx", "jsxHardcodedColor", "b59d5f4b96e4570f", 1, "存量图表 JSX 色值；待改为设计系统 token"],
  ["packages/ui/src/app/pages/delivery/project/ProjectCostPanel.tsx", "nativeControl", "6f1032169cf2cfd0", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/delivery/project/ProjectCostPanel.tsx", "nativeControl", "38e6688ce26311f2", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/delivery/project/ProjectQuotationConfigurator.tsx", "nativeControl", "a184edc6198efbf6", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/delivery/project/ProjectQuotationConfigurator.tsx", "nativeControl", "a1c15070e1d35496", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/delivery/project/detail/ProjectStagePopover.tsx", "nativeControl", "1bf131df72ac8d0c", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/delivery/project/detail/ProjectStagePopover.tsx", "nativeControl", "630aa353a773694d", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/finance/FinancialDashboard.tsx", "directUiImport", "c049256b345c4caf", 1, "存量图表直接依赖 Recharts；待迁入设计系统图表出口"],
  ["packages/ui/src/app/pages/finance/lean-delivery/cases/CaseDetail.tsx", "directUiImport", "32bbabf377a2b932", 1, "存量图表直接依赖 Recharts；待迁入设计系统图表出口"],
  ["packages/ui/src/app/pages/finance/lean-delivery/cases/CaseDetail.tsx", "jsxHardcodedColor", "cbd57fe32576345c", 1, "存量图表 JSX 色值；待改为设计系统 token"],
  ["packages/ui/src/app/pages/finance/lean-delivery/cases/CaseDetail.tsx", "jsxHardcodedColor", "2ec874c63b30b37c", 1, "存量图表 JSX 色值；待改为设计系统 token"],
  ["packages/ui/src/app/pages/finance/lean-delivery/cases/CaseDetail.tsx", "jsxHardcodedColor", "9e7824720b434604", 1, "存量图表 JSX 色值；待改为设计系统 token"],
  ["packages/ui/src/app/pages/finance/lean-delivery/cases/CaseDetail.tsx", "jsxHardcodedColor", "f908fc82ce49aa66", 1, "存量图表 JSX 色值；待改为设计系统 token"],
  ["packages/ui/src/app/pages/finance/lean-delivery/cases/CaseDetail.tsx", "nativeControl", "b9b20f6d5921b6ea", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/finance/lean-delivery/cases/CaseDetail.tsx", "nativeControl", "e939c7fd5f5624a5", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/finance/operating-expense/ExpenseCategoryManager.tsx", "nativeControl", "538fad0940cfa5af", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/finance/travel/trip/TripDetail/SubsidyTab.tsx", "nativeControl", "ac668f8eefd4df77", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/finance/travel/trip/TripDetail/TripStagePopover.tsx", "nativeControl", "84f3c293630b4a9e", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/resource/knowledge/KnowledgeBase.tsx", "nativeControl", "841917d320bd2826", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/sales/contracts/payment/CashflowForecast.tsx", "directUiImport", "ff048f73aa93d77a", 1, "存量图表直接依赖 Recharts；待迁入设计系统图表出口"],
  ["packages/ui/src/app/pages/sales/customers/CustomerDetail.tsx", "nativeControl", "0004bdefdfc5fff8", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/sales/leads/components/LeadContractHistoryPanel.tsx", "nativeControl", "a260a66ced422847", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/sales/leads/components/LeadContractHistoryPanel.tsx", "nativeControl", "12b78a8d252b092a", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/sales/leads/components/LeadQuotationHistoryPanel.tsx", "nativeControl", "35e56b0b62b417bd", 2, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/sales/leads/components/LeadStagePopover.tsx", "nativeControl", "8e502bc5553dfa66", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/sales/quotation/components/OnlineDocumentPreview.tsx", "nativeControl", "3e624dbff70779d9", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/sales/quotation/components/OnlineDocumentPreview.tsx", "nativeControl", "c49d7b4f3e1971d9", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/sales/quotation/stages/Stage1FeatureList.tsx", "nativeControl", "f9e67fb1b07e9712", 1, "存量页面原生控件；待迁入设计系统受控组件"],
  ["packages/ui/src/app/pages/sales/quotation/stages/Stage2EvalSheet.tsx", "nativeControl", "27b956aff54e1126", 2, "存量页面原生控件；待迁入设计系统受控组件"],
];

const CSS_NAMED_COLOR = new Set(`aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`.split(' '));

export function isHardcodedColor(value) {
  const v = value.trim().toLowerCase();
  return /#[\da-f]{3,8}\b|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*(?:[\d.+-]|(?:srgb|display-p3)\b)/i.test(v)
    || CSS_NAMED_COLOR.has(v);
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => { visit(child, callback); });
}

function unwrap(node) {
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)
    || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node))) node = node.expression;
  return node;
}

function literal(node) {
  node = unwrap(node);
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;
}

function attributeValue(attribute) {
  const value = attribute?.initializer;
  return value && ts.isJsxExpression(value) ? unwrap(value.expression) : value;
}

function isHiddenFileInput(node) {
  const attrs = node.attributes.properties;
  // A spread may override type/hidden/style; only statically proven hidden files qualify.
  if (attrs.some(ts.isJsxSpreadAttribute)) return false;
  const attr = (name) => attrs.find((item) => ts.isJsxAttribute(item) && item.name.getText() === name);
  if (literal(attributeValue(attr('type'))) !== 'file') return false;
  const hidden = attr('hidden');
  if (hidden && (!hidden.initializer || attributeValue(hidden)?.kind === ts.SyntaxKind.TrueKeyword)) return true;
  const style = attributeValue(attr('style'));
  if (!style || !ts.isObjectLiteralExpression(style) || style.properties.some(ts.isSpreadAssignment)) return false;
  const display = [...style.properties].reverse().find((prop) => ts.isPropertyAssignment(prop)
    && (literal(prop.name) ?? prop.name.getText()) === 'display');
  return display && literal(display.initializer) === 'none';
}

function valueImport(node) {
  if (!node.importClause) return true;
  if (node.importClause.isTypeOnly) return false;
  const { name, namedBindings } = node.importClause;
  return !!name || !namedBindings || ts.isNamespaceImport(namedBindings)
    || namedBindings.elements.some((item) => !item.isTypeOnly);
}

function moduleReferences(source) {
  const refs = [];
  visit(source, (node) => {
    if (ts.isImportDeclaration(node) && valueImport(node)) {
      refs.push({ node, specifier: literal(node.moduleSpecifier), imported: node.importClause?.getText(source) ?? '(side effect)' });
    } else if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier
      && (!node.exportClause || !ts.isNamedExports(node.exportClause) || node.exportClause.elements.some((item) => !item.isTypeOnly))) {
      refs.push({ node, specifier: literal(node.moduleSpecifier), imported: node.exportClause?.getText(source) ?? '*' });
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
      || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      refs.push({ node, specifier: literal(node.arguments[0]), imported: node.expression.getText(source) });
    }
  });
  return refs.filter((ref) => ref.specifier);
}

function analyzeSource(source, file) {
  const findings = [];
  const add = (rule, node, message, extra = {}) => {
    const snippet = normalize(node.getText(source));
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
    findings.push({ rule, file, line: line + 1, column: character + 1, message, snippet, fingerprint: fingerprint(snippet), ...extra });
  };
  for (const ref of moduleReferences(source)) {
    if (THIRD_PARTY_UI.test(ref.specifier)) {
      add('directUiImport', ref.node, `直接引用 ${ref.specifier}，请使用设计系统出口`, { source: ref.specifier, imported: normalize(ref.imported) });
    }
  }
  visit(source, (node) => {
    // 新增依赖范围没有旧的视觉样式预算；逐节点登记，不提高 pages 的棘轮上限。
    if (!file.startsWith(PAGES_PREFIX) && ts.isPropertyAssignment(node)
      && /^(color|backgroundColor|background|fontSize|fontFamily|borderRadius|boxShadow|border)$/.test(node.name.getText(source))
      && literal(node.initializer) !== undefined) {
      add('visualInlineStyle', node, '新增扫描范围内的存量内联视觉样式');
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      if (['button', 'input', 'table'].includes(tag) && !(tag === 'input' && isHiddenFileInput(node))) {
        add('nativeControl', node, `原生 <${tag}> 视觉控件需要设计系统组件`);
      }
    }
    if (ts.isJsxAttribute(node) && ['fill', 'stroke'].includes(node.name.getText(source))) {
      const expression = attributeValue(node);
      // Including literals in conditionals catches fill={active ? '#fff' : token}.
      if (expression) visit(expression, (value) => {
        const color = literal(value);
        if (color !== undefined && isHardcodedColor(color)
          && !(ts.isParenthesizedExpression(value) || ts.isAsExpression(value) || ts.isSatisfiesExpression(value))) {
          add('jsxHardcodedColor', node, `${node.name.getText(source)} 使用硬编码颜色 ${color}`);
        }
      });
    }
  });
  return findings;
}

function createProject(root) {
  const sources = new Map();
  const get = (file) => {
    if (!sources.has(file)) sources.set(file, ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
    return sources.get(file);
  };
  const resolveModule = (from, specifier) => {
    const base = specifier.startsWith('@/') ? join(root, SOURCE_ROOT, specifier.slice(2))
      : specifier.startsWith('.') ? resolve(dirname(from), specifier) : null;
    if (!base) return null;
    return [base, `${base}.tsx`, `${base}.ts`, join(base, 'index.tsx'), join(base, 'index.ts')]
      .find((file) => ['.tsx', '.ts'].includes(extname(file)) && existsSync(file) && statSync(file).isFile()) ?? null;
  };
  const binding = (file, name, seen = new Set()) => {
    const key = `${file}:${name}`;
    if (seen.has(key)) return null;
    seen = new Set([...seen, key]);
    const source = get(file);
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement) && statement.importClause) {
        const clause = statement.importClause;
        const named = clause.namedBindings && ts.isNamedImports(clause.namedBindings)
          ? clause.namedBindings.elements.find((item) => item.name.text === name) : null;
        const imported = clause.name?.text === name ? 'default' : named ? (named.propertyName ?? named.name).text : null;
        const target = imported && resolveModule(file, literal(statement.moduleSpecifier));
        if (target) {
          if (relative(root, target).startsWith(`${SOURCE_ROOT}design-system/`)) return null;
          return binding(target, imported, seen);
        }
      }
      if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        const item = statement.exportClause.elements.find((entry) => entry.name.text === name);
        if (item) {
          const target = statement.moduleSpecifier ? resolveModule(file, literal(statement.moduleSpecifier)) : file;
          if (target) return binding(target, (item.propertyName ?? item.name).text, seen);
        }
      }
      if (ts.isExportDeclaration(statement) && !statement.exportClause && statement.moduleSpecifier) {
        const target = resolveModule(file, literal(statement.moduleSpecifier));
        const found = target && binding(target, name, seen);
        if (found) return found;
      }
      if (ts.isFunctionDeclaration(statement) && (statement.name?.text === name
        || (name === 'default' && statement.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.DefaultKeyword)))) {
        return { file, node: statement };
      }
      if (ts.isVariableStatement(statement)) {
        const declaration = statement.declarationList.declarations.find((item) => ts.isIdentifier(item.name) && item.name.text === name);
        if (declaration?.initializer) {
          let value = unwrap(declaration.initializer);
          if (ts.isCallExpression(value) && ts.isIdentifier(value.expression) && ['lazyNamed', 'lazy'].includes(value.expression.text)) {
            let specifier;
            visit(value.arguments[0], (node) => {
              if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) specifier = literal(node.arguments[0]);
            });
            const target = specifier && resolveModule(file, specifier);
            if (target) return binding(target, literal(value.arguments[1]) ?? 'default', seen);
          }
          if (ts.isCallExpression(value) && /^(?:React\.)?(?:memo|forwardRef)$/.test(value.expression.getText(source))) value = unwrap(value.arguments[0]);
          if (ts.isIdentifier(value)) return binding(file, value.text, seen);
          return { file, node: value };
        }
      }
      if (name === 'default' && ts.isExportAssignment(statement)) {
        const value = unwrap(statement.expression);
        return ts.isIdentifier(value) ? binding(file, value.text, seen) : { file, node: value };
      }
    }
    return null;
  };
  return { get, resolveModule, binding };
}

function shellReturns(project, file, node, stack = new Set(), uncovered = []) {
  const key = `${file}:${node.pos}`;
  if (stack.has(key)) return false;
  stack = new Set([...stack, key]);
  const source = project.get(file);
  const shellNames = new Set();
  const overlayNames = new Set();
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && literal(statement.moduleSpecifier) === '@/design-system'
      && statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
      for (const item of statement.importClause.namedBindings.elements) {
        if ((item.propertyName ?? item.name).text === 'PageShell' && !item.isTypeOnly) shellNames.add(item.name.text);
        if (['Modal', 'Drawer'].includes((item.propertyName ?? item.name).text) && !item.isTypeOnly) overlayNames.add(item.name.text);
      }
    }
  }
  const returned = [];
  const collect = (current) => {
    // A helper/callback's return is not the route component's return.
    if (current !== node && ts.isFunctionLike(current)) return;
    if (ts.isReturnStatement(current) && current.expression) returned.push(current.expression);
    else ts.forEachChild(current, collect);
  };
  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) returned.push(node.body);
  else collect(node);
  const visible = (expression) => {
    expression = unwrap(expression);
    return expression && ![ts.SyntaxKind.NullKeyword, ts.SyntaxKind.FalseKeyword].includes(expression.kind);
  };
  const contentChildren = (children) => children.filter((child) => {
    if (ts.isJsxText(child)) return !!child.text.trim();
    const opening = ts.isJsxElement(child) ? child.openingElement : ts.isJsxSelfClosingElement(child) ? child : null;
    return !opening || !overlayNames.has(opening.tagName.getText(source));
  });
  const covered = (expression) => {
    expression = unwrap(expression);
    if (!visible(expression)) return true;
    if (ts.isConditionalExpression(expression)) return covered(expression.whenTrue) && covered(expression.whenFalse);
    if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return covered(expression.right);
    if (ts.isJsxExpression(expression)) return !expression.expression || covered(expression.expression);
    if (ts.isJsxText(expression)) return !expression.text.trim();
    if (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression)) {
      const opening = ts.isJsxElement(expression) ? expression.openingElement : expression;
      const tag = opening.tagName.getText(source);
      if (shellNames.has(tag)) return true;
      // Allow real render delegation (Provider -> WorkbenchInner), never an unused helper.
      if (/^[A-Z]\w*$/.test(tag)) {
        const child = project.binding(file, tag);
        if (child && shellReturns(project, child.file, child.node, stack)) return true;
      }
      const children = ts.isJsxElement(expression) ? contentChildren(expression.children) : [];
      return children.length > 0 && children.every(covered);
    }
    if (ts.isJsxFragment(expression)) {
      const children = contentChildren(expression.children);
      return children.length > 0 && children.every(covered);
    }
    return false;
  };
  uncovered.push(...returned.filter((expression) => !covered(expression)));
  return returned.some(visible) && uncovered.length === 0;
}

function routeAudit(project, root) {
  const file = join(root, SOURCE_ROOT, 'app/routes.tsx');
  const source = project.get(file);
  const routes = new Map();
  const findings = [];
  visit(source, (node) => {
    if (!ts.isObjectLiteralExpression(node)) return;
    const properties = node.properties.filter(ts.isPropertyAssignment);
    const layout = properties.some((item) => item.name.getText(source) === 'children');
    for (const prop of properties) {
      const name = prop.name.getText(source);
      if (!['Component', 'element', 'errorElement'].includes(name) || (layout && name !== 'errorElement')) continue;
      const value = unwrap(prop.initializer);
      const component = ts.isIdentifier(value) ? value.text : ts.isJsxSelfClosingElement(value) ? value.tagName.getText(source)
        : ts.isJsxElement(value) ? value.openingElement.tagName.getText(source) : null;
      const resolved = component && project.binding(file, component);
      if (!resolved) {
        const position = source.getLineAndCharacterOfPosition(prop.getStart(source));
        findings.push({ rule: 'pageWithoutShell', file: relative(root, file), line: position.line + 1, column: position.character + 1,
          message: `无法解析路由组件 ${component ?? prop.initializer.getText(source)}`, snippet: normalize(prop.getText(source)), fingerprint: fingerprint(prop.getText(source)) });
        continue;
      }
      const key = `${resolved.file}:${resolved.node.pos}`;
      if (routes.has(key)) continue;
      routes.set(key, { file: relative(root, resolved.file), component });
      const uncovered = [];
      if (!shellReturns(project, resolved.file, resolved.node, new Set(), uncovered)) {
        const resolvedSource = project.get(resolved.file);
        for (const expression of uncovered.length ? uncovered : [resolved.node]) {
          const position = resolvedSource.getLineAndCharacterOfPosition(expression.getStart(resolvedSource));
          const snippet = normalize(expression.getText(resolvedSource));
          findings.push({ rule: 'pageWithoutShell', file: relative(root, resolved.file), line: position.line + 1, column: position.character + 1,
            message: `路由 ${component} 存在未被 PageShell 包裹的返回分支`, snippet, fingerprint: fingerprint(snippet) });
        }
      }
    }
  });
  return { routes: [...routes.values()], findings };
}

function collectFiles(project, root, routes) {
  const files = new Set();
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '__tests__'].includes(entry.name)) continue;
      const file = join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.tsx?$/.test(file) && !/\.(?:test|spec)\.tsx?$/.test(file)) files.add(file);
    }
  };
  walk(join(root, PAGES_PREFIX));
  walk(join(root, SOURCE_ROOT, 'app/leads'));
  for (const route of routes) files.add(join(root, route.file));
  for (const file of files) {
    const current = project.get(file);
    const rendered = new Set();
    visit(current, (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) rendered.add(node.tagName.getText(current).split('.')[0]);
    });
    for (const ref of moduleReferences(current)) {
      const target = project.resolveModule(file, ref.specifier);
      if (!target || !relative(root, target).startsWith(`${SOURCE_ROOT}app/`) || /\/__tests__\//.test(target)) continue;
      const source = project.get(target);
      const clause = ts.isImportDeclaration(ref.node) ? ref.node.importClause : null;
      const names = clause ? [clause.name?.text, ...(clause.namedBindings
        ? ts.isNamespaceImport(clause.namedBindings) ? [clause.namedBindings.name.text] : clause.namedBindings.elements.map((item) => item.name.text)
        : [])] : [];
      // A rendered child may simply export an alias to a vendor component, with no JSX.
      let isComponent = names.some((name) => rendered.has(name))
        || moduleReferences(source).some((ref) => THIRD_PARTY_UI.test(ref.specifier));
      visit(source, (node) => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node) || ts.isExportDeclaration(node)) isComponent = true;
      });
      if (isComponent) files.add(target);
    }
  }
  return [...files].sort();
}

export function applyAllowlist(findings, allowlist = MIGRATION_ALLOWLIST) {
  const used = new Map();
  return findings.map((finding) => {
    const key = `${finding.file}|${finding.rule}|${finding.fingerprint}`;
    const entry = allowlist.find(([file, rule, hash]) => file === finding.file && rule === finding.rule && hash === finding.fingerprint);
    // Never weaken the old strict Arco contract for files already under pages/.
    const oldArcoRule = finding.file.startsWith(PAGES_PREFIX) && finding.rule === 'directUiImport' && finding.source?.startsWith('@arco-design/web-react');
    const count = (used.get(key) ?? 0) + 1;
    used.set(key, count);
    return { ...finding, allowed: !!entry && !oldArcoRule && count <= entry[3], reason: entry && !oldArcoRule ? entry[4] : undefined };
  });
}

export function auditDesignSystem(root = ROOT) {
  const project = createProject(root);
  const { routes, findings } = routeAudit(project, root);
  const files = collectFiles(project, root, routes);
  for (const file of files) findings.push(...analyzeSource(project.get(file), relative(root, file)));
  const located = applyAllowlist(findings);
  return { files: files.map((file) => relative(root, file)), routes, findings: located,
    violations: located.filter((finding) => !finding.allowed), allowlisted: located.filter((finding) => finding.allowed) };
}

export function printAuditFindings(findings, output = console.error) {
  for (const finding of findings) {
    output(`  ${finding.file}:${finding.line}:${finding.column} [${finding.rule}] ${finding.message}${finding.allowed ? `（存量例外：${finding.reason}）` : ''}`);
  }
}

function selfTest() {
  const parse = (text) => ts.createSourceFile('fixture.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings = (text) => analyzeSource(parse(text), `${PAGES_PREFIX}Fixture.tsx`);
  assert.equal(findings(`import type { X } from 'recharts'; import { type Y } from '@arco-design/web-react';`).length, 0);
  assert.equal(findings(`import { X as Y } from 'recharts/lib'; export { Z } from '@phosphor-icons/react'; const x = import('@arco-design/web-react/icon'); require('phosphor-react');`).length, 4);
  assert.equal(findings('const html = `<button/><input/><table/>`; // <button/>\n').length, 0);
  assert.equal(findings(`<><button/><input/><table/><input type="file"/><input type="text" hidden/><input type="file" hidden={false}/></>`).length, 6);
  assert.equal(findings(`<><input type="file" hidden/><input type={'file'} hidden={true}/><input type="file" style={{display: 'none'}}/></>`).length, 0);
  assert.equal(findings(`<input type="file" hidden {...props}/>`).length, 1);
  assert.equal(findings(`<><path fill="#fff" stroke={'red'}/><path fill={active ? '#000' : 'var(--primary)'}/><path fill="hsl(0 0% 0%)"/></>`).length, 4);
  assert.equal(findings(`<path fill="none" stroke="currentColor"/><path fill={'var(--primary)'} stroke="rgb(var(--primary-6))"/>`).length, 0);
  const sample = findings('<button/>')[0];
  const entry = [sample.file, sample.rule, sample.fingerprint, 1, 'fixture'];
  assert.deepEqual(applyAllowlist([sample, sample], [entry]).map((item) => item.allowed), [true, false]);
  const arco = findings(`import { Button } from '@arco-design/web-react';`)[0];
  assert.equal(applyAllowlist([arco], [[arco.file, arco.rule, arco.fingerprint, 1, 'forbidden']])[0].allowed, false);
  const shell = (text, component = 'Page') => {
    const source = parse(`import { PageShell } from '@/design-system'; ${text}`);
    const functions = source.statements.filter(ts.isFunctionDeclaration);
    const project = { get: () => source, binding: (_file, name) => {
      const node = functions.find((fn) => fn.name?.text === name);
      return node ? { file: 'fixture.tsx', node } : null;
    } };
    return shellReturns(project, 'fixture.tsx', functions.find((fn) => fn.name?.text === component));
  };
  assert.equal(shell('function Page(){ function Helper(){ return <PageShell/>; } return <div/>; }'), false);
  assert.equal(shell('function Helper(){return <PageShell/>} function Page(){return <div/>}'), false);
  assert.equal(shell('function Page(){return <Provider><Inner/></Provider>} function Inner(){return <PageShell/>}'), true);
  assert.equal(shell('function Page(){if(missing) return <div/>; return <PageShell/>}'), false);
  assert.equal(shell('function Page(){return ready ? <PageShell/> : <div/>}'), false);
  assert.equal(shell('function Page(){return <PageShell/>}'), true);
  const fixture = mkdtempSync(join(tmpdir(), 'hubx-ds-gate-'));
  try {
    const write = (name, text) => {
      const file = join(fixture, SOURCE_ROOT, name);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
    };
    write('app/routes.tsx', `import { Eager } from './pages/barrel';
      const Lazy = lazyNamed(() => import('./pages/Lazy'), 'Lazy');
      const ChildPage = lazyNamed(() => import('./pages/ChildPage'), 'ChildPage');
      const router = [{ Component: Layout, children: [{ Component: Eager }, { Component: Lazy }, { element: <ChildPage/> }] }];`);
    write('app/pages/barrel.ts', `export { Eager } from './Eager';`);
    write('app/pages/Eager.tsx', `import { PageShell as Shell } from '@/design-system'; export const Eager = () => <Shell/>;`);
    write('app/pages/Lazy.tsx', `import { PageShell } from '@/design-system'; export function Lazy(){ function Helper(){return <PageShell/>} return <div/>; }`);
    write('app/pages/ChildPage.tsx', `import { PageShell } from '@/design-system'; import { Child } from '../components/barrel'; import { Alias } from '../components/Alias'; export function ChildPage(){return <PageShell><Child/><Alias/></PageShell>;}`);
    write('app/components/barrel.ts', `export { Child } from './Child';`);
    write('app/components/Child.tsx', `import { X } from 'recharts'; export function Child(){return <button/>}`);
    write('app/components/Alias.ts', `import { Button } from '@arco-design/web-react'; export const Alias = Button;`);
    write('app/leads/Lead.tsx', `import { Tag } from '@arco-design/web-react'; export const Lead = () => <table/>;`);
    write('design-system/index.tsx', `export const PageShell = () => <button/>;`);
    write('app/pages/__tests__/Ignored.tsx', `const x = <button/>;`);
    const result = auditDesignSystem(fixture);
    assert.equal(result.routes.length, 3);
    assert.deepEqual(result.findings.filter((item) => item.rule === 'pageWithoutShell').map((item) => item.file), [`${PAGES_PREFIX}Lazy.tsx`]);
    assert.ok(result.findings.some((item) => item.file.endsWith('/components/Child.tsx') && item.rule === 'directUiImport'));
    assert.ok(result.findings.some((item) => item.file.endsWith('/components/Alias.ts') && item.rule === 'directUiImport'));
    assert.ok(result.findings.some((item) => item.file.endsWith('/leads/Lead.tsx') && item.rule === 'nativeControl'));
    assert.ok(!result.files.some((file) => file.includes('design-system/') || file.includes('__tests__/')));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
  console.log('设计系统 AST 门禁回归测试通过（imports / JSX / hidden file / colors / allowlist / PageShell）。');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) selfTest();
  else {
    const audit = auditDesignSystem();
    if (args.includes('--report') || args.includes('--details')) console.log(JSON.stringify(audit, null, 2));
    else {
      if (audit.allowlisted.length) {
        console.log(`已登记存量迁移例外 ${audit.allowlisted.length} 处（node scripts/check-design-system-strict.mjs --details 查看定位/理由）。`);
      }
      if (audit.violations.length) {
        console.error(`严格设计系统门禁未通过：${audit.violations.length} 处违规`);
        printAuditFindings(audit.violations);
      } else console.log(`严格设计系统门禁通过：审计 ${audit.files.length} 个文件 / ${audit.routes.length} 个路由组件，页面无未登记的直接 UI 引用或视觉控件。`);
      process.exitCode = audit.violations.length ? 1 : 0;
    }
  }
}
