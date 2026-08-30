import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { isValidFeatureBoard } from '../../packages/ui/src/app/version/featureBoardModel'
import { isValidWorkLog } from '../../packages/ui/src/app/version/workLogModel'
import { architectureDiagramPlugin } from '../../scripts/architectureDiagramPlugin.js'
import { sharedBuildConfig } from '../viteBuildChunks'

const execFileAsync = promisify(execFile)

// 功能看板（Feature Board）：GET/PUT 读写仓库内配置文档（packages/ui/.../featureBoard.config.json）。
// 该文档是用户与 Claude Code 共享的开发状态唯一事实源，随 git 提交保存进度（约定见 HubX/CLAUDE.md §功能看板）。
// 仅 α版 dev server 提供此端点；静态部署走 localStorage 回退。
function featureBoardStore() {
  const configFile = path.resolve(__dirname, '../../packages/ui/src/app/version/featureBoard.config.json')
  return {
    name: 'feature-board-store',
    configureServer(server: any) {
      server.middlewares.use('/api/feature-board', async (request: any, response: any) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        try {
          if (request.method === 'GET') {
            let board: unknown = null
            try {
              board = JSON.parse(await fs.readFile(configFile, 'utf8'))
            } catch {
              board = null
            }
            response.end(JSON.stringify({ board }))
            return
          }
          if (request.method === 'PUT') {
            const chunks: Buffer[] = []
            for await (const chunk of request) chunks.push(chunk as Buffer)
            const board = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            if (!isValidFeatureBoard(board)) {
              response.statusCode = 400
              response.end(JSON.stringify({ error: '功能看板数据不符合 schema' }))
              return
            }
            await fs.writeFile(configFile, JSON.stringify(board, null, 2) + '\n')
            response.end(JSON.stringify({ board }))
            return
          }
          response.statusCode = 405
          response.end(JSON.stringify({ error: '仅支持 GET/PUT' }))
        } catch (error: any) {
          response.statusCode = 500
          response.end(JSON.stringify({ error: String(error?.message || error) }))
        }
      })
    },
  }
}

// 工作记录：GET/PUT 读写 workLog.config.json。仅 α 版 dev server 提供；静态部署走 localStorage。
function workLogStore() {
  const configFile = path.resolve(__dirname, '../../packages/ui/src/app/version/workLog.config.json')
  return {
    name: 'work-log-store',
    configureServer(server: any) {
      server.middlewares.use('/api/work-log', async (request: any, response: any) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        try {
          if (request.method === 'GET') {
            let log: unknown = null
            try {
              log = JSON.parse(await fs.readFile(configFile, 'utf8'))
            } catch {
              log = null
            }
            response.end(JSON.stringify({ log }))
            return
          }
          if (request.method === 'PUT') {
            const chunks: Buffer[] = []
            for await (const chunk of request) chunks.push(chunk as Buffer)
            const log = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            if (!isValidWorkLog(log)) {
              response.statusCode = 400
              response.end(JSON.stringify({ error: '工作记录数据不符合 schema' }))
              return
            }
            await fs.writeFile(configFile, JSON.stringify(log, null, 2) + '\n')
            response.end(JSON.stringify({ log }))
            return
          }
          response.statusCode = 405
          response.end(JSON.stringify({ error: '仅支持 GET/PUT' }))
        } catch (error: any) {
          response.statusCode = 500
          response.end(JSON.stringify({ error: String(error?.message || error) }))
        }
      })
    },
  }
}

function toMessages(raw: string) {
  const parsed = JSON.parse(raw)
  const records = Array.isArray(parsed) ? parsed : (parsed.messages || parsed.data || [])
  return records.map((item: Record<string, unknown>, index: number) => ({
    id: String(item.id || item.msg_id || index),
    sender: String(item.sender_name || item.sender || item.nickname || item.from_nickname || '未知成员'),
    time: String(item.time || item.timestamp || item.create_time || ''),
    content: String(item.content || item.text || item.msg_content || ''),
    avatar: String(item.avatar || item.avatar_url || item.sender_avatar || ''),
  })).filter((item: { content: string }) => item.content.trim())
}

function cleanSummaryText(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<\?xml[\s\S]*?\?>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(lt|gt|amp|quot|apos);/g, (_: string, entity: string) => ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }[entity] || ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function buildSummary(messages: Array<{ sender: string; time: string; content: string }>) {
  const summaryMessages = messages.map((item) => ({ ...item, content: cleanSummaryText(item.content) })).filter((item) => item.content)
  const text = summaryMessages.map((item) => item.content).join('\n')
  const groupByKeywords = (keywords: RegExp) => summaryMessages.filter((item) => keywords.test(item.content)).slice(-5).map((item) => item.content)
  const requirements = groupByKeywords(/需求|原型|功能|确认/)
  const technical = groupByKeywords(/技术|方案|接口|架构|开发/)
  const risks = groupByKeywords(/问题|异常|风险|延期|bug|Bug/)
  const progress = groupByKeywords(/进度|排期|上线|测试|完成/)
  const collaboration = groupByKeywords(/分工|协作|负责|安排|对接/)
  const actions = summaryMessages.filter((item) => /请|需要|确认|安排|跟进|提交|修改/.test(item.content)).slice(-5).map((item) => ({ title: item.content, description: '', priority: /紧急|尽快|风险|延期/.test(item.content) ? 'high' : 'medium' }))
  const speakers = Array.from(new Set(summaryMessages.map((item) => item.sender))).slice(0, 8)
  return {
    overview: summaryMessages.length ? `已汇总 ${summaryMessages.length} 条有效群消息，请结合以下维度确认需求、风险与后续动作。` : '暂未读取到可总结的群消息。',
    requirements,
    technical,
    risks,
    progress,
    collaboration,
    actions,
    speakers,
    latestTime: messages[messages.length - 1]?.time || '',
  }
}

function readSummaryJson(content: string) {
  const jsonText = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(jsonText)
  return {
    overview: String(parsed.overview || ''),
    requirements: Array.isArray(parsed.requirements) ? parsed.requirements.map(String).slice(0, 8) : [],
    technical: Array.isArray(parsed.technical) ? parsed.technical.map(String).slice(0, 8) : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks.map(String).slice(0, 8) : [],
    progress: Array.isArray(parsed.progress) ? parsed.progress.map(String).slice(0, 8) : [],
    collaboration: Array.isArray(parsed.collaboration) ? parsed.collaboration.map(String).slice(0, 8) : [],
    actions: Array.isArray(parsed.actions) ? parsed.actions.map((item) => ({
      title: String(item?.title || item || ''),
      description: typeof item === 'object' && item ? String(item.description || '') : '',
      priority: item?.priority === 'high' || item?.priority === 'low' ? item.priority : 'medium',
    })).filter((item) => item.title).slice(0, 8) : [],
    speakers: Array.isArray(parsed.speakers) ? parsed.speakers.map(String).slice(0, 8) : [],
  }
}

async function generateSummary(messages: Array<{ sender: string; time: string; content: string }>, config: { apiKey?: string; baseUrl: string; model: string }) {
  const fallback = buildSummary(messages)
  if (!config.apiKey) return { summary: fallback, provider: 'local', warning: '未配置 DeepSeek API Key，当前展示本地规则总结。' }
  const sourceMessages = messages
    .map((item) => ({ ...item, content: cleanSummaryText(item.content) }))
    .filter((item) => item.content)
    .slice(-300)
  if (!sourceMessages.length) return { summary: fallback, provider: 'local' }
  const conversation = sourceMessages.map((item) => `[${item.time}] ${item.sender}: ${item.content}`).join('\n')
  try {
    const result = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: '你是企业售前沟通分析助手。基于群聊生成准确、简洁的中文项目沟通总结。忽略 XML、代码、系统消息和无业务意义内容。只返回 JSON：{"overview":"","requirements":[],"technical":[],"risks":[],"progress":[],"collaboration":[],"actions":[{"title":"","description":"","priority":"high|medium|low"}],"speakers":[]}。requirements 为需求与任务管理，technical 为技术决策与方案，risks 为问题与风险管理，progress 为项目进度与状态，collaboration 为分工与协作。actions 只保留聊天中明确需要跟进的可执行事项。不得编造未出现的信息。' },
          { role: 'user', content: `请总结以下客户沟通记录：\n${conversation}` },
        ],
      }),
    })
    if (!result.ok) {
      const errorPayload = await result.json().catch(() => null) as { error?: { message?: string } } | null
      throw new Error(errorPayload?.error?.message || `DeepSeek 请求失败（${result.status}）`)
    }
    const payload = await result.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = payload.choices?.[0]?.message?.content || ''
    const summary = readSummaryJson(content)
    return { summary: { ...summary, latestTime: messages[messages.length - 1]?.time || '' }, provider: 'deepseek' }
  } catch (error: any) {
    return { summary: fallback, provider: 'local', warning: `${error?.message || 'DeepSeek 总结失败'}，已回退为本地规则总结。` }
  }
}

function wxCliBridge(config: { apiKey?: string; baseUrl: string; model: string }) {
  return {
    name: 'wx-cli-bridge',
    configureServer(server: any) {
      server.middlewares.use('/api/wechat/group-communication', async (request: any, response: any) => {
        const groupName = new URL(request.url || '', 'http://localhost').searchParams.get('groupName')?.trim()
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        if (!groupName) {
          response.statusCode = 400
          response.end(JSON.stringify({ error: '缺少售前群名称' }))
          return
        }
        try {
          const { stdout } = await execFileAsync('wx', ['export', groupName, '--format', 'json', '-n', '10000'], { maxBuffer: 50 * 1024 * 1024 })
          const messages = toMessages(stdout)
          const generated = await generateSummary(messages, config)
          response.end(JSON.stringify({ groupName, exportedAt: new Date().toLocaleString('zh-CN', { hour12: false }), messages, ...generated }))
        } catch (error: any) {
          response.statusCode = 404
          response.end(JSON.stringify({ error: error?.stderr?.trim() || `未找到群聊“${groupName}”或无法读取聊天记录` }))
        }
      })
    },
  }
}


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, '../../packages/ui/src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [
    figmaAssetResolver(),
    architectureDiagramPlugin(),
    featureBoardStore(),
    workLogStore(),
    wxCliBridge({ apiKey: env.DEEPSEEK_API_KEY, baseUrl: env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com', model: env.DEEPSEEK_MODEL || 'deepseek-v4-pro' }),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the shared UI source (packages/ui/src)
      '@': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: sharedBuildConfig,
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['@arco-design/web-react', '@arco-design/web-react/icon'],
  },

  // 测试文件已迁至 packages/ui，vitest 需要跨 workspace 扫描
  test: {
    include: ['../../packages/ui/src/**/*.test.ts', '../../packages/ui/src/**/*.test.tsx'],
  },
}})
