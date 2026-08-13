from pathlib import Path

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output/pdf/线索管理业务流程图.pdf"
PAGE_W, PAGE_H = landscape(A4)
FONT = "STSong-Light"

NAVY = HexColor("#172B4D")
BLUE = HexColor("#1769E0")
BLUE_LIGHT = HexColor("#EAF3FF")
TEAL = HexColor("#008A8A")
TEAL_LIGHT = HexColor("#E6F7F5")
ORANGE = HexColor("#B66500")
ORANGE_LIGHT = HexColor("#FFF3E0")
GREEN = HexColor("#138A4A")
GREEN_LIGHT = HexColor("#EAF8EF")
RED = HexColor("#C63D3D")
RED_LIGHT = HexColor("#FDECEC")
GRAY = HexColor("#5E6C84")
GRAY_LIGHT = HexColor("#F5F7FA")
BORDER = HexColor("#D7DFEA")


def set_font(c, size):
    c.setFont(FONT, size)


def draw_text(c, text, x, y, size=9, color=NAVY, align="center"):
    c.setFillColor(color)
    set_font(c, size)
    if align == "left":
        c.drawString(x, y, text)
    elif align == "right":
        c.drawRightString(x, y, text)
    else:
        c.drawCentredString(x, y, text)


def wrap_text(c, text, width, size):
    set_font(c, size)
    lines, line = [], ""
    for char in text:
        candidate = line + char
        if c.stringWidth(candidate, FONT, size) <= width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = char
    if line:
        lines.append(line)
    return lines or [""]


def draw_label(c, text, x, y, width, height, size=8.5, color=NAVY):
    lines = wrap_text(c, text, width - 12, size)
    gap = size + 3
    start = y + height / 2 + (len(lines) - 1) * gap / 2 - size * 0.3
    for index, line in enumerate(lines):
        draw_text(c, line, x + width / 2, start - index * gap, size=size, color=color)


def node(c, x, y, w, h, text, kind="action"):
    palette = {
        "action": (BLUE_LIGHT, BLUE),
        "decision": (ORANGE_LIGHT, ORANGE),
        "success": (GREEN_LIGHT, GREEN),
        "danger": (RED_LIGHT, RED),
        "neutral": (GRAY_LIGHT, GRAY),
        "data": (TEAL_LIGHT, TEAL),
    }
    fill, stroke = palette[kind]
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(1.1)
    c.roundRect(x, y, w, h, 7, fill=1, stroke=1)
    draw_label(c, text, x, y, w, h)


def diamond(c, x, y, w, h, text):
    c.setFillColor(ORANGE_LIGHT)
    c.setStrokeColor(ORANGE)
    c.setLineWidth(1.1)
    path = c.beginPath()
    path.moveTo(x + w / 2, y + h)
    path.lineTo(x + w, y + h / 2)
    path.lineTo(x + w / 2, y)
    path.lineTo(x, y + h / 2)
    path.close()
    c.drawPath(path, fill=1, stroke=1)
    draw_label(c, text, x + 8, y + 6, w - 16, h - 12, size=8)


def arrow(c, x1, y1, x2, y2, label="", color=GRAY):
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(1.1)
    c.line(x1, y1, x2, y2)
    dx, dy = x2 - x1, y2 - y1
    length = max((dx * dx + dy * dy) ** 0.5, 1)
    ux, uy = dx / length, dy / length
    px, py = -uy, ux
    head = 6
    path = c.beginPath()
    path.moveTo(x2, y2)
    path.lineTo(x2 - ux * head + px * head * 0.55, y2 - uy * head + py * head * 0.55)
    path.lineTo(x2 - ux * head - px * head * 0.55, y2 - uy * head - py * head * 0.55)
    path.close()
    c.drawPath(path, fill=1, stroke=0)
    if label:
        draw_text(c, label, (x1 + x2) / 2, (y1 + y2) / 2 + 5, size=7.5, color=color)


def elbow_arrow(c, x1, y1, x2, y2, label="", color=GRAY, middle=None):
    middle = middle if middle is not None else (x1 + x2) / 2
    c.setStrokeColor(color)
    c.setLineWidth(1.1)
    c.line(x1, y1, middle, y1)
    c.line(middle, y1, middle, y2)
    arrow(c, middle, y2, x2, y2, label, color)


def header(c, page_no, title, subtitle):
    c.setFillColor(white)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - 48, PAGE_W, 48, fill=1, stroke=0)
    draw_text(c, "HubX", 34, PAGE_H - 29, size=17, color=white, align="left")
    draw_text(c, title, 112, PAGE_H - 28, size=15, color=white, align="left")
    draw_text(c, subtitle, 112, PAGE_H - 42, size=8, color=HexColor("#C9DCF8"), align="left")
    c.setStrokeColor(BORDER)
    c.line(30, 48, PAGE_W - 30, 48)
    draw_text(c, "线索管理业务流程图", 34, 29, size=7.5, color=GRAY, align="left")
    draw_text(c, f"第 {page_no} 页", PAGE_W - 34, 29, size=7.5, color=GRAY, align="right")


def legend(c):
    data = [("业务操作", "action"), ("条件判断", "decision"), ("审批通过", "success"), ("驳回/异常", "danger")]
    x = 36
    for label, kind in data:
        palette = {
            "action": BLUE, "decision": ORANGE, "success": GREEN, "danger": RED,
        }
        c.setFillColor(palette[kind])
        c.roundRect(x, 63, 10, 8, 2, fill=1, stroke=0)
        draw_text(c, label, x + 14, 63.5, size=7.5, color=GRAY, align="left")
        x += 87


def rule_block(c, title, rules):
    x, y, w, h = 603, 81, 204, 93
    c.setFillColor(GRAY_LIGHT)
    c.setStrokeColor(BORDER)
    c.roundRect(x, y, w, h, 7, fill=1, stroke=1)
    draw_text(c, title, x + 12, y + h - 17, size=9, color=NAVY, align="left")
    cursor = y + h - 34
    for rule in rules:
        lines = wrap_text(c, rule, w - 25, 7.4)
        for index, line in enumerate(lines):
            prefix = "- " if index == 0 else "  "
            draw_text(c, prefix + line, x + 12, cursor, size=7.4, color=GRAY, align="left")
            cursor -= 10


def cover(c):
    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(BLUE)
    c.circle(PAGE_W - 120, PAGE_H - 80, 170, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.circle(PAGE_W - 210, 105, 100, fill=1, stroke=0)
    c.setFillColor(white)
    draw_text(c, "HubX", 58, 476, size=20, color=HexColor("#BBD8FF"), align="left")
    draw_text(c, "线索管理", 58, 364, size=34, color=white, align="left")
    draw_text(c, "业务流程图", 58, 314, size=34, color=white, align="left")
    draw_text(c, "覆盖线索流转、报价审批、合同归档、回款发票、资料归集与页面跳转", 60, 261, size=12, color=HexColor("#D6E7FF"), align="left")
    c.setStrokeColor(HexColor("#80B8FF"))
    c.setLineWidth(1)
    c.line(60, 231, 392, 231)
    draw_text(c, "版本 V1.0  |  2026-07-24", 60, 202, size=10, color=HexColor("#BBD8FF"), align="left")
    draw_text(c, "用于技术评审、开发实现与联调验收", 60, 92, size=9, color=HexColor("#BBD8FF"), align="left")
    c.showPage()


def page_main_flow(c, page_no):
    header(c, page_no, "一、线索主业务流程", "从线索进入到成交转项目的完整链路")
    legend(c)

    node(c, 42, 405, 92, 42, "线索进入公海", "action")
    diamond(c, 156, 397, 84, 58, "线索是否有效")
    node(c, 262, 405, 94, 42, "认领或分配", "action")
    node(c, 378, 405, 94, 42, "进入我的线索", "action")
    node(c, 494, 405, 105, 42, "补充信息并持续跟进", "action")
    diamond(c, 621, 397, 84, 58, "是否需要报价")
    node(c, 727, 405, 78, 42, "创建合同", "action")
    arrow(c, 134, 426, 156, 426)
    arrow(c, 240, 426, 262, 426, "有效", GREEN)
    arrow(c, 356, 426, 378, 426)
    arrow(c, 472, 426, 494, 426)
    arrow(c, 599, 426, 621, 426)
    arrow(c, 705, 426, 727, 426, "否", ORANGE)
    node(c, 150, 318, 92, 40, "标记垃圾线索", "danger")
    arrow(c, 198, 397, 196, 358, "无效", RED)

    node(c, 277, 296, 88, 42, "新增报价", "action")
    node(c, 390, 296, 96, 42, "报价配置与汇总", "data")
    node(c, 511, 296, 110, 42, "完善资料并保存记录", "action")
    diamond(c, 646, 288, 94, 58, "报价附件是否齐全")
    node(c, 755, 296, 52, 42, "提交审批", "action")
    arrow(c, 663, 397, 322, 338, "是", ORANGE)
    arrow(c, 365, 317, 390, 317)
    arrow(c, 486, 317, 511, 317)
    arrow(c, 621, 317, 646, 317)
    arrow(c, 740, 317, 755, 317, "是", GREEN)
    node(c, 650, 219, 92, 40, "上传缺失文件", "danger")
    arrow(c, 693, 288, 696, 259, "否", RED)
    arrow(c, 742, 239, 743, 288, "补齐", BLUE)

    diamond(c, 743, 188, 66, 52, "审批结果")
    arrow(c, 781, 296, 776, 240)
    node(c, 550, 155, 108, 40, "编辑报价并生成新版本", "danger")
    node(c, 677, 155, 112, 40, "报价已审核，可作为合同创建参考", "success")
    arrow(c, 759, 188, 658, 175, "驳回", RED)
    arrow(c, 789, 214, 789, 195, "通过", GREEN)
    elbow_arrow(c, 733, 195, 766, 405, "创建合同", GREEN, middle=797)

    node(c, 606, 98, 116, 38, "合同审批通过后登记回款和开票", "success")
    node(c, 743, 98, 66, 38, "线索成交转项目", "success")
    elbow_arrow(c, 766, 405, 664, 136, "审批通过", GREEN, middle=797)
    arrow(c, 722, 117, 743, 117)
    c.showPage()


def page_quotation(c, page_no):
    header(c, page_no, "二、报价记录与审批流程", "报价配置形成快照，附件齐全后提交总经理审批")
    legend(c)

    node(c, 36, 413, 98, 42, "新增报价或编辑最新报价", "action")
    node(c, 157, 413, 80, 42, "前端配置", "data")
    node(c, 260, 413, 80, 42, "后端配置", "data")
    node(c, 363, 413, 80, 42, "其他岗位", "data")
    node(c, 466, 413, 80, 42, "出差驻场", "data")
    node(c, 569, 413, 80, 42, "其他成本", "data")
    node(c, 672, 413, 80, 42, "报价汇总", "data")
    arrow(c, 134, 434, 157, 434)
    arrow(c, 237, 434, 260, 434)
    arrow(c, 340, 434, 363, 434)
    arrow(c, 443, 434, 466, 434)
    arrow(c, 546, 434, 569, 434)
    arrow(c, 649, 434, 672, 434)

    node(c, 236, 314, 96, 42, "完善报价资料", "action")
    node(c, 357, 314, 100, 42, "保存报价记录", "action")
    node(c, 482, 314, 108, 42, "生成报价汇总图片", "data")
    diamond(c, 617, 306, 96, 58, "技术评估文件是否存在")
    node(c, 732, 314, 72, 42, "上传技术评估文件", "danger")
    elbow_arrow(c, 712, 413, 284, 356, "配置完成", BLUE, middle=698)
    arrow(c, 332, 335, 357, 335)
    arrow(c, 457, 335, 482, 335)
    arrow(c, 590, 335, 617, 335)
    arrow(c, 713, 335, 732, 335, "否", RED)
    elbow_arrow(c, 768, 314, 665, 364, "上传后", BLUE, middle=774)

    diamond(c, 445, 202, 92, 58, "报价单是否存在")
    node(c, 558, 210, 77, 42, "上传报价单", "danger")
    node(c, 656, 210, 80, 42, "提交审批", "action")
    node(c, 752, 210, 58, 42, "总经理审批中", "action")
    elbow_arrow(c, 665, 306, 491, 260, "是", GREEN, middle=590)
    arrow(c, 537, 231, 558, 231, "否", RED)
    arrow(c, 635, 231, 656, 231, "是", GREEN)
    arrow(c, 736, 231, 752, 231)
    elbow_arrow(c, 597, 210, 491, 260, "上传后", BLUE, middle=628)

    diamond(c, 682, 110, 80, 56, "审批决定")
    node(c, 506, 78, 104, 42, "已驳回并可编辑新版本", "danger")
    node(c, 684, 78, 76, 42, "报价已审核", "success")
    arrow(c, 781, 210, 722, 166)
    arrow(c, 682, 138, 610, 99, "拒绝", RED)
    arrow(c, 722, 110, 722, 120, "同意", GREEN)
    elbow_arrow(c, 558, 78, 197, 413, "基于最新报价编辑", RED, middle=456)
    c.showPage()


def page_contract_payment(c, page_no):
    header(c, page_no, "三、合同版本、归档与回款流程", "合同终稿审批通过后开放合同信息及回款发票")
    legend(c)

    diamond(c, 46, 394, 88, 58, "线索下是否已有合同")
    node(c, 158, 405, 95, 42, "创建合同并带入线索信息", "action")
    node(c, 279, 405, 92, 42, "合同历史记录", "neutral")
    node(c, 397, 405, 80, 42, "最新合同版本", "action")
    diamond(c, 502, 397, 80, 58, "是否修改合同")
    node(c, 607, 405, 78, 42, "提交审批", "action")
    node(c, 710, 405, 82, 42, "总经理审批中", "action")
    arrow(c, 134, 423, 158, 426, "否", ORANGE)
    arrow(c, 253, 426, 279, 426)
    arrow(c, 371, 426, 397, 426)
    arrow(c, 477, 426, 502, 426)
    arrow(c, 582, 426, 607, 426, "否", ORANGE)
    arrow(c, 685, 426, 710, 426)
    arrow(c, 90, 394, 325, 447, "是", GREEN)

    node(c, 402, 290, 86, 42, "编辑合同", "danger")
    node(c, 510, 290, 88, 42, "填写修改说明", "danger")
    node(c, 620, 290, 98, 42, "生成新的合同版本", "action")
    arrow(c, 542, 397, 445, 332, "是", RED)
    arrow(c, 488, 311, 510, 311)
    arrow(c, 598, 311, 620, 311)
    elbow_arrow(c, 669, 290, 437, 405, "成为最新版本", BLUE, middle=700)

    diamond(c, 714, 205, 88, 58, "审批决定")
    node(c, 576, 178, 88, 42, "审批拒绝", "danger")
    node(c, 690, 178, 88, 42, "审批通过形成终稿", "success")
    arrow(c, 751, 405, 758, 263)
    arrow(c, 733, 233, 664, 199, "拒绝", RED)
    arrow(c, 758, 205, 734, 220, "同意", GREEN)
    elbow_arrow(c, 620, 178, 445, 332, "编辑生成新版本", RED, middle=535)

    node(c, 132, 125, 96, 42, "上传合同归档", "success")
    node(c, 252, 125, 100, 42, "合同信息Tab可见", "success")
    node(c, 376, 125, 100, 42, "回款发票Tab可见", "success")
    node(c, 500, 125, 98, 42, "读取回款计划", "data")
    diamond(c, 622, 117, 80, 58, "是否拆分期次")
    node(c, 725, 125, 80, 42, "登记回款和开票", "action")
    elbow_arrow(c, 690, 178, 180, 167, "归档", GREEN, middle=534)
    arrow(c, 228, 146, 252, 146)
    arrow(c, 352, 146, 376, 146)
    arrow(c, 476, 146, 500, 146)
    arrow(c, 598, 146, 622, 146)
    arrow(c, 702, 146, 725, 146, "否", ORANGE)
    node(c, 612, 69, 100, 38, "保留父期并新增子期", "data")
    arrow(c, 662, 117, 662, 107, "是", ORANGE)
    elbow_arrow(c, 712, 88, 765, 125, "维护子期", BLUE, middle=724)
    c.showPage()


def page_documents(c, page_no):
    header(c, page_no, "四、文件归集与资料 Tab 流程", "所有线索关联文件统一进入资料 Tab 进行追溯")
    legend(c)

    sources = [
        (45, 415, "跟进附件"), (45, 350, "报价文件与汇总图片"), (45, 285, "合同版本与归档文件"),
        (45, 220, "回款凭证与发票文件"), (45, 155, "出差与报销附件"), (45, 90, "演示上传文件"),
        (215, 90, "手工上传资料"),
    ]
    for x, y, text in sources:
        node(c, x, y, 124, 38, text, "data")

    node(c, 322, 268, 118, 48, "关联到线索", "action")
    for x, y, _ in sources:
        arrow(c, x + 124, y + 19, 322, 292, color=HexColor("#8BA0BA"))
    node(c, 479, 268, 132, 48, "资料Tab统一文件库", "action")
    diamond(c, 647, 260, 90, 64, "是否为同一文件")
    arrow(c, 440, 292, 479, 292)
    arrow(c, 611, 292, 647, 292)
    node(c, 588, 161, 100, 42, "合并为一条资料记录", "success")
    node(c, 710, 161, 92, 42, "新增资料记录", "action")
    arrow(c, 671, 260, 638, 203, "是", GREEN)
    arrow(c, 712, 260, 756, 203, "否", ORANGE)
    node(c, 646, 78, 118, 42, "显示来源标签、筛选、预览、下载", "neutral")
    elbow_arrow(c, 638, 161, 705, 120, "", GREEN, middle=638)
    elbow_arrow(c, 756, 161, 705, 120, "", BLUE, middle=756)
    c.showPage()


def page_navigation(c, page_no):
    header(c, page_no, "五、页面跳转流程", "保证从不同入口进入后均可返回正确的业务页面")
    legend(c)

    node(c, 45, 396, 132, 42, "公海线索 / 我的线索 / 垃圾线索", "neutral")
    node(c, 205, 396, 92, 42, "线索详情", "action")
    node(c, 325, 396, 82, 42, "创建合同", "action")
    node(c, 435, 396, 90, 42, "新建合同页", "action")
    node(c, 553, 396, 90, 42, "编辑合同页", "action")
    node(c, 671, 396, 100, 42, "合同预览与提交", "action")
    arrow(c, 177, 417, 205, 417)
    arrow(c, 297, 417, 325, 417)
    arrow(c, 407, 417, 435, 417)
    arrow(c, 525, 417, 553, 417)
    arrow(c, 643, 417, 671, 417)

    node(c, 282, 285, 138, 42, "返回线索详情的合同记录Tab", "success")
    elbow_arrow(c, 721, 396, 351, 327, "提交后", GREEN, middle=721)

    node(c, 45, 178, 90, 42, "合同列表", "neutral")
    node(c, 168, 178, 90, 42, "合同详情", "action")
    node(c, 292, 178, 90, 42, "返回合同列表", "success")
    arrow(c, 135, 199, 168, 199)
    arrow(c, 258, 199, 292, 199)

    node(c, 462, 178, 94, 42, "已成交线索", "neutral")
    node(c, 589, 178, 90, 42, "项目详情", "action")
    node(c, 710, 178, 94, 42, "项目业务记录", "data")
    arrow(c, 556, 199, 589, 199)
    arrow(c, 679, 199, 710, 199)
    c.showPage()


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdfmetrics.registerFont(UnicodeCIDFont(FONT))
    c = canvas.Canvas(str(OUTPUT), pagesize=landscape(A4), pageCompression=1)
    c.setTitle("HubX 线索管理业务流程图")
    c.setAuthor("HubX")
    c.setSubject("线索管理业务流程图")
    cover(c)
    page_main_flow(c, 1)
    page_quotation(c, 2)
    page_contract_payment(c, 3)
    page_documents(c, 4)
    page_navigation(c, 5)
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
