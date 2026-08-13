from base64 import b64encode
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output/html/线索管理业务流程图.html"
IMAGE_DIR = ROOT / "tmp/pdfs"

FLOWS = [
    ("main", "线索主业务流程", "从线索进入到成交转项目的完整链路", 2),
    ("quotation", "报价记录与审批流程", "报价配置形成快照，附件齐全后提交总经理审批", 3),
    ("contract", "合同版本、归档与回款流程", "合同终稿审批通过后开放合同信息及回款发票", 4),
    ("documents", "文件归集与资料 Tab 流程", "所有线索关联文件统一进入资料 Tab 进行追溯", 5),
    ("navigation", "页面跳转流程", "保证从不同入口进入后均可返回正确的业务页面", 6),
]


def data_url(path: Path) -> str:
    encoded = b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def build_html() -> str:
    nav_items = "\n".join(
        f'<a href="#{item[0]}">{index + 1}. {item[1]}</a>'
        for index, item in enumerate(FLOWS)
    )
    cards = []
    for index, (key, title, subtitle, page) in enumerate(FLOWS, start=1):
        image = data_url(IMAGE_DIR / f"lead-flow-review-v2-{page}.png")
        cards.append(
            f'''<section class="flow-card" id="{key}">
  <div class="flow-heading">
    <span class="flow-index">{index:02d}</span>
    <div><h2>{title}</h2><p>{subtitle}</p></div>
  </div>
  <button class="preview-button" type="button" data-title="{title}" aria-label="放大查看{title}">
    <img src="{image}" alt="{title}" loading="lazy" />
  </button>
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
      color-scheme: light;
      --navy: #172b4d;
      --blue: #1769e0;
      --text: #172b4d;
      --muted: #5e6c84;
      --line: #d7dfea;
      --surface: #ffffff;
      --canvas: #f5f7fb;
    }}
    * {{ box-sizing: border-box; }}
    html {{ scroll-behavior: smooth; }}
    body {{ margin: 0; background: var(--canvas); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; }}
    .hero {{ background: var(--navy); color: #fff; padding: 46px max(28px, calc((100vw - 1200px) / 2)); }}
    .hero-inner {{ max-width: 1200px; margin: 0 auto; }}
    .brand {{ color: #b9d6ff; font-size: 18px; font-weight: 700; letter-spacing: 0; }}
    h1 {{ margin: 14px 0 10px; font-size: 32px; letter-spacing: 0; }}
    .hero p {{ margin: 0; color: #d7e7ff; font-size: 15px; }}
    .nav {{ position: sticky; top: 0; z-index: 2; display: flex; gap: 8px; overflow-x: auto; padding: 12px max(28px, calc((100vw - 1200px) / 2)); background: rgba(255, 255, 255, 0.96); border-bottom: 1px solid var(--line); backdrop-filter: blur(8px); }}
    .nav a {{ flex: 0 0 auto; padding: 8px 10px; color: var(--muted); font-size: 13px; text-decoration: none; border-radius: 4px; }}
    .nav a:hover {{ color: var(--blue); background: #edf4ff; }}
    main {{ max-width: 1200px; margin: 0 auto; padding: 26px 28px 48px; }}
    .intro {{ margin: 0 0 22px; color: var(--muted); font-size: 14px; line-height: 1.75; }}
    .flow-card {{ margin-bottom: 24px; padding: 22px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 5px 18px rgba(23, 43, 77, 0.05); scroll-margin-top: 72px; }}
    .flow-heading {{ display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }}
    .flow-index {{ display: grid; place-items: center; width: 36px; height: 36px; color: #fff; font-size: 13px; font-weight: 700; background: var(--blue); border-radius: 50%; }}
    h2 {{ margin: 0 0 4px; font-size: 20px; letter-spacing: 0; }}
    .flow-heading p {{ margin: 0; color: var(--muted); font-size: 13px; }}
    .preview-button {{ display: block; width: 100%; padding: 0; cursor: zoom-in; background: #fff; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }}
    .preview-button:focus-visible {{ outline: 3px solid #80b6ff; outline-offset: 3px; }}
    .preview-button img {{ display: block; width: 100%; height: auto; }}
    .modal {{ position: fixed; inset: 0; z-index: 10; display: none; align-items: center; justify-content: center; padding: 24px; background: rgba(10, 24, 46, 0.82); }}
    .modal.is-open {{ display: flex; }}
    .modal-panel {{ position: relative; max-width: min(1500px, 96vw); max-height: 94vh; }}
    .modal img {{ display: block; max-width: 96vw; max-height: 88vh; background: #fff; border-radius: 4px; box-shadow: 0 16px 52px rgba(0, 0, 0, 0.35); }}
    .close {{ position: absolute; top: -42px; right: 0; width: 32px; height: 32px; color: #fff; cursor: pointer; font-size: 22px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 4px; }}
    footer {{ padding: 18px 28px 32px; color: var(--muted); font-size: 12px; text-align: center; }}
    @media (max-width: 640px) {{
      .hero {{ padding: 32px 20px; }}
      h1 {{ font-size: 26px; }}
      main {{ padding: 18px 14px 32px; }}
      .flow-card {{ padding: 14px; }}
      h2 {{ font-size: 17px; }}
      .flow-heading p {{ line-height: 1.5; }}
      .nav {{ padding: 10px 14px; }}
    }}
  </style>
</head>
<body>
  <header class="hero"><div class="hero-inner"><div class="brand">HubX</div><h1>线索管理业务流程图</h1><p>线索流转、报价审批、合同归档、回款发票、资料归集与页面跳转</p></div></header>
  <nav class="nav" aria-label="流程图导航">{nav_items}</nav>
  <main>
    <p class="intro">本页为自包含预览文件，无需联网即可打开。点击任意流程图可放大查看，按 <kbd>Esc</kbd> 或点击遮罩可关闭。</p>
    {''.join(cards)}
  </main>
  <footer>HubX - 线索管理业务流程图 - V1.0 - 2026-07-24</footer>
  <div class="modal" id="modal" role="dialog" aria-modal="true" aria-label="流程图大图预览"><div class="modal-panel"><button class="close" type="button" aria-label="关闭预览">×</button><img id="modal-image" alt="" /></div></div>
  <script>
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modal-image');
    const closeModal = () => modal.classList.remove('is-open');
    document.querySelectorAll('.preview-button').forEach((button) => {{
      button.addEventListener('click', () => {{ modalImage.src = button.querySelector('img').src; modalImage.alt = button.dataset.title; modal.classList.add('is-open'); }});
    }});
    modal.addEventListener('click', (event) => {{ if (event.target === modal) closeModal(); }});
    document.querySelector('.close').addEventListener('click', closeModal);
    document.addEventListener('keydown', (event) => {{ if (event.key === 'Escape') closeModal(); }});
  </script>
</body>
</html>'''


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(build_html(), encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
