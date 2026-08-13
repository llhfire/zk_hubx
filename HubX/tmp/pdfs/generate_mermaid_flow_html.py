import html
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs/线索管理业务流程图.md"
OUTPUT = ROOT / "output/html/线索管理业务流程图.html"
MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"


def read_diagrams():
    content = SOURCE.read_text(encoding="utf-8")
    pattern = re.compile(r"^## \d+\. (.+?)\n\n```mermaid\n(.*?)\n```", re.MULTILINE | re.DOTALL)
    diagrams = pattern.findall(content)
    if len(diagrams) != 5:
        raise RuntimeError(f"Expected 5 Mermaid diagrams, found {len(diagrams)}")
    return diagrams


def build_html(diagrams):
    nav = "\n".join(
        f'<a href="#flow-{index}">{index}. {html.escape(title)}</a>'
        for index, (title, _) in enumerate(diagrams, start=1)
    )
    sections = []
    for index, (title, diagram) in enumerate(diagrams, start=1):
        sections.append(
            f'''<section class="flow-card" id="flow-{index}">
  <div class="flow-heading">
    <span class="flow-index">{index:02d}</span>
    <div><h2>{html.escape(title)}</h2><p>与 Markdown 原图一致，可横向滚动查看完整分支。</p></div>
  </div>
  <div class="diagram-scroll">
    <pre class="mermaid">{html.escape(diagram)}</pre>
  </div>
</section>'''
        )

    return f'''<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="HubX 线索管理业务流程图" />
  <title>HubX - 线索管理业务流程图</title>
  <style>
    :root {{
      --navy: #172b4d;
      --blue: #1769e0;
      --blue-soft: #edf4ff;
      --text: #172b4d;
      --muted: #5e6c84;
      --line: #d7dfea;
      --surface: #ffffff;
      --canvas: #f5f7fb;
    }}
    * {{ box-sizing: border-box; }}
    html {{ scroll-behavior: smooth; }}
    body {{ margin: 0; color: var(--text); background: var(--canvas); font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; }}
    .hero {{ padding: 42px max(28px, calc((100vw - 1280px) / 2)); color: #fff; background: var(--navy); }}
    .hero-inner {{ max-width: 1280px; margin: 0 auto; }}
    .brand {{ color: #b9d6ff; font-size: 18px; font-weight: 700; }}
    h1 {{ margin: 12px 0 8px; font-size: 31px; letter-spacing: 0; }}
    .hero p {{ margin: 0; color: #d8e7ff; font-size: 14px; }}
    .nav {{ position: sticky; top: 0; z-index: 3; display: flex; gap: 6px; padding: 10px max(28px, calc((100vw - 1280px) / 2)); overflow-x: auto; background: rgba(255,255,255,.96); border-bottom: 1px solid var(--line); backdrop-filter: blur(8px); }}
    .nav a {{ flex: 0 0 auto; padding: 8px 10px; color: var(--muted); font-size: 13px; text-decoration: none; border-radius: 4px; }}
    .nav a:hover {{ color: var(--blue); background: var(--blue-soft); }}
    main {{ max-width: 1280px; margin: 0 auto; padding: 26px 28px 48px; }}
    .intro {{ margin: 0 0 22px; color: var(--muted); font-size: 14px; line-height: 1.75; }}
    .status {{ display: inline-flex; align-items: center; gap: 8px; padding: 7px 10px; color: var(--muted); font-size: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 4px; }}
    .status::before {{ width: 7px; height: 7px; content: ""; background: var(--blue); border-radius: 50%; }}
    .status.is-ready {{ color: #0d7544; border-color: #bde7cd; background: #f1fbf5; }}
    .status.is-ready::before {{ background: #0d9d5a; }}
    .status.is-error {{ color: #bd3030; border-color: #f0c4c4; background: #fff5f5; }}
    .status.is-error::before {{ background: #d53f3f; }}
    .flow-card {{ margin-top: 24px; padding: 22px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 5px 18px rgba(23,43,77,.05); scroll-margin-top: 70px; }}
    .flow-heading {{ display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }}
    .flow-index {{ display: grid; place-items: center; width: 36px; height: 36px; color: #fff; font-size: 13px; font-weight: 700; background: var(--blue); border-radius: 50%; }}
    h2 {{ margin: 0 0 4px; font-size: 20px; letter-spacing: 0; }}
    .flow-heading p {{ margin: 0; color: var(--muted); font-size: 13px; }}
    .diagram-scroll {{ min-height: 260px; padding: 26px; overflow: auto; background: #fbfcfe; border: 1px solid var(--line); border-radius: 6px; }}
    .mermaid {{ display: flex; justify-content: center; min-width: 860px; margin: 0; color: var(--text); background: transparent; }}
    .mermaid svg {{ max-width: none; height: auto; }}
    .diagram-scroll .nodeLabel, .diagram-scroll .edgeLabel {{ font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif !important; }}
    footer {{ padding: 18px 28px 32px; color: var(--muted); font-size: 12px; text-align: center; }}
    @media (max-width: 640px) {{
      .hero {{ padding: 32px 20px; }}
      h1 {{ font-size: 26px; }}
      main {{ padding: 18px 14px 32px; }}
      .flow-card {{ padding: 14px; }}
      h2 {{ font-size: 17px; }}
      .nav {{ padding: 10px 14px; }}
      .diagram-scroll {{ padding: 16px; }}
      .mermaid {{ min-width: 720px; }}
    }}
  </style>
</head>
<body>
  <header class="hero"><div class="hero-inner"><div class="brand">HubX</div><h1>线索管理业务流程图</h1><p>基于原 Markdown 的 Mermaid 流程图直接渲染</p></div></header>
  <nav class="nav" aria-label="流程图导航">{nav}</nav>
  <main>
    <p class="intro">本页直接使用原 Markdown 中的 Mermaid 流程定义渲染。流程分支、节点顺序和方向与 Markdown 保持一致；较宽的流程可在图内横向滚动查看。</p>
    <div class="status" id="status" role="status">正在渲染流程图</div>
    {''.join(sections)}
  </main>
  <footer>HubX - 线索管理业务流程图 - V1.0 - 2026-07-24</footer>
  <script src="{MERMAID_CDN}"></script>
  <script>
    window.addEventListener('DOMContentLoaded', async () => {{
      const status = document.getElementById('status');
      try {{
        window.mermaid.initialize({{
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          fontFamily: '-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif',
          flowchart: {{ htmlLabels: true, curve: 'basis', useMaxWidth: false }},
          themeVariables: {{
            primaryColor: '#edf4ff',
            primaryBorderColor: '#1769e0',
            primaryTextColor: '#172b4d',
            lineColor: '#5e6c84',
            secondaryColor: '#eaf8ef',
            tertiaryColor: '#fff3e0',
            edgeLabelBackground: '#ffffff',
            fontSize: '15px'
          }}
        }});
        await window.mermaid.run({{ querySelector: '.mermaid' }});
        status.textContent = '流程图已渲染';
        status.classList.add('is-ready');
      }} catch (error) {{
        status.textContent = '流程图渲染失败，请确认网络连接后刷新页面';
        status.classList.add('is-error');
        console.error(error);
      }}
    }});
  </script>
</body>
</html>'''


def main():
    diagrams = read_diagrams()
    OUTPUT.write_text(build_html(diagrams), encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
