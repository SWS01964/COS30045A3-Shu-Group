"""Render a KNIME workflow folder as an SVG (and optionally PNG) diagram for slides.

The KNIME GUI cannot be screenshotted from a script, so this redraws the canvas from the
files KNIME itself reads:
  * workflow.knime          -> node ids, bounds (x, y, w, h), connections, annotations
  * <Node (#id)>/settings.xml -> node name, factory (for the colour) and node label

Usage (project root, project venv):
    python processing/knime/render_workflow.py BeyondTheRoadToll_DataPrep_v2 \
        report/figures/knime/knime_v2_workflow.svg --png

--png rasterises the SVG with local headless Google Chrome at 2x scale (same name, .png).
Standard library only.
"""
import argparse
import html
import re
import subprocess
import sys
import textwrap
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"k": "http://www.knime.org/2008/09/XMLConfig"}
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# KNIME node-category colours (approximation of the KNIME 5 palette)
CATEGORY = {
    "source": ("#F0A04B", "Source (reader)"),
    "manipulator": ("#FFE47A", "Manipulator"),
    "sink": ("#E2564B", "Sink (writer)"),
}


# ---------------------------------------------------------------- XML helpers
def cfg(el, key):
    return el.find(f"k:config[@key='{key}']", NS)


def val(el, key, default=None):
    e = el.find(f"k:entry[@key='{key}']", NS)
    if e is None or e.get("isnull") == "true":
        return default
    return e.get("value")


def int_rgb(v):
    v = int(v)
    return f"#{(v >> 16) & 255:02X}{(v >> 8) & 255:02X}{v & 255:02X}"


def html_text(s):
    """Annotation text is HTML (<p><strong>..</strong></p>) or plain text."""
    s = re.sub(r"<br\s*/?>|</p>\s*<p>", "\n", s or "")
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def category(factory):
    f = factory.lower()
    if "writer" in f:
        return "sink"
    if "reader" in f:
        return "source"
    return "manipulator"


# ---------------------------------------------------------------- read workflow
def read_workflow(wf_dir):
    root = ET.parse(wf_dir / "workflow.knime").getroot()
    nodes = {}
    for n in cfg(root, "nodes").findall("k:config", NS):
        nid = int(val(n, "id"))
        b = cfg(cfg(n, "ui_settings"), "extrainfo.node.bounds")
        x, y, w, h = (int(val(b, str(i))) for i in range(4))
        sfile = wf_dir / val(n, "node_settings_file")
        s = ET.parse(sfile).getroot()
        ann = cfg(s, "nodeAnnotation")
        nodes[nid] = dict(id=nid, x=x, y=y, w=w, h=h, name=val(s, "node-name") or val(s, "name"),
                          factory=val(s, "factory", ""),
                          label=html_text(val(ann, "text", "")) if ann is not None else "",
                          n_out=max(1, len(cfg(s, "ports").findall("k:config", NS)))
                          if cfg(s, "ports") is not None else 1)
    conns = []
    for c in cfg(root, "connections").findall("k:config", NS):
        conns.append(tuple(int(val(c, k)) for k in ("sourceID", "sourcePort", "destID", "destPort")))
    anns = []
    a_root = cfg(root, "annotations")
    if a_root is not None:
        for a in a_root.findall("k:config", NS):
            anns.append(dict(text=html_text(val(a, "text", "")),
                             x=int(val(a, "x-coordinate")), y=int(val(a, "y-coordinate")),
                             w=int(val(a, "width")), h=int(val(a, "height")),
                             bg=int_rgb(val(a, "bgcolor", 16777215)),
                             border=int_rgb(val(a, "borderColor", 0)),
                             bsize=int(val(a, "borderSize", 0))))
    # number of input ports actually used, for port placement
    n_in = {}
    for s, sp, d, dp in conns:
        n_in[d] = max(n_in.get(d, 1), dp)
        nodes[s]["n_out"] = max(nodes[s]["n_out"], sp)
    for nid, n in nodes.items():
        n["n_in"] = n_in.get(nid, 1)
    return nodes, conns, anns


# ---------------------------------------------------------------- draw
def port_y(n, idx, count):
    """KNIME spreads data ports evenly down the side of the node box."""
    return n["y"] + n["h"] * idx / (count + 1)


def esc(s):
    return html.escape(str(s), quote=True)


def render_svg(nodes, conns, anns, title):
    pad, head = 30, 56
    xs = [n["x"] for n in nodes.values()] + [a["x"] for a in anns]
    ys = [n["y"] - 20 for n in nodes.values()] + [a["y"] for a in anns]
    xe = [n["x"] + n["w"] + 60 for n in nodes.values()] + [a["x"] + a["w"] for a in anns]
    ye = [n["y"] + n["h"] + 52 for n in nodes.values()] + [a["y"] + a["h"] for a in anns]
    x0, y0 = min(xs) - pad, min(ys) - pad - head
    W, H = max(xe) - x0 + pad, max(ye) - y0 + pad + 26
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
           f'viewBox="{x0} {y0} {W} {H}" font-family="Helvetica, Arial, sans-serif">',
           '<defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" '
           'markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#555"/></marker></defs>',
           f'<rect x="{x0}" y="{y0}" width="{W}" height="{H}" fill="#FFFFFF"/>',
           f'<text x="{x0 + pad}" y="{y0 + 30}" font-size="18" font-weight="700" fill="#222">'
           f'{esc(title)}</text>',
           f'<text x="{x0 + pad}" y="{y0 + 48}" font-size="11.5" fill="#555">'
           f'{len(nodes)} nodes, {len(conns)} connections. Redrawn from workflow.knime and each '
           f'node\'s settings.xml (positions as on the KNIME canvas).</text>']
    # annotations (behind everything)
    for a in anns:
        out.append(f'<rect x="{a["x"]}" y="{a["y"]}" width="{a["w"]}" height="{a["h"]}" '
                   f'fill="{a["bg"]}" stroke="{a["border"]}" stroke-width="{a["bsize"]}"/>')
        for i, line in enumerate(a["text"].split("\n")):
            out.append(f'<text x="{a["x"] + 9}" y="{a["y"] + 19 + 15 * i}" font-size="12.5" '
                       f'font-weight="700" fill="#222">{esc(line)}</text>')
    # connections
    for s, sp, d, dp in conns:
        a, b = nodes[s], nodes[d]
        x1, y1 = a["x"] + a["w"] + 4, port_y(a, sp, a["n_out"])
        x2, y2 = b["x"] - 4, port_y(b, dp, b["n_in"])
        if abs(y1 - y2) < 1:
            path = f"M{x1},{y1} L{x2},{y2}"
        else:  # elbow through the gap between the two nodes (keeps lines out of node rows)
            xm = (x1 + x2) / 2
            path = f"M{x1},{y1} L{xm},{y1} L{xm},{y2} L{x2},{y2}"
        out.append(f'<path d="{path}" fill="none" stroke="#555" stroke-width="1.3" '
                   f'marker-end="url(#arr)"/>')
    # nodes
    for n in nodes.values():
        col = CATEGORY[category(n["factory"])][0]
        cx = n["x"] + n["w"] / 2
        out.append(f'<rect x="{n["x"]}" y="{n["y"]}" width="{n["w"]}" height="{n["h"]}" rx="5" '
                   f'fill="{col}" stroke="#333" stroke-width="1.2"/>')
        out.append(f'<text x="{cx}" y="{n["y"] + n["h"] / 2 + 4}" font-size="10" font-weight="700" '
                   f'text-anchor="middle" fill="#222">#{n["id"]}</text>')
        for side, cnt in (("in", n["n_in"] if n["factory"] and "reader" not in n["factory"].lower()
                           else 0), ("out", n["n_out"] if "writer" not in n["factory"].lower() else 0)):
            for i in range(1, cnt + 1):
                px = n["x"] - 4 if side == "in" else n["x"] + n["w"]
                out.append(f'<rect x="{px}" y="{port_y(n, i, cnt) - 2.5}" width="4" height="5" '
                           f'fill="#333"/>')
        out.append(f'<text x="{cx}" y="{n["y"] - 7}" font-size="10.5" font-weight="700" '
                   f'text-anchor="middle" fill="#222">{esc(n["name"])}</text>')
        for i, line in enumerate(textwrap.wrap(n["label"], 21)[:3]):
            out.append(f'<text x="{cx}" y="{n["y"] + n["h"] + 13 + 12 * i}" font-size="10" '
                       f'text-anchor="middle" fill="#333">{esc(line)}</text>')
    # legend
    lx, ly = x0 + pad, y0 + H - 18
    for key in ("source", "manipulator", "sink"):
        colr, name = CATEGORY[key]
        out.append(f'<rect x="{lx}" y="{ly - 10}" width="12" height="12" rx="2" fill="{colr}" '
                   f'stroke="#333"/>')
        out.append(f'<text x="{lx + 17}" y="{ly}" font-size="11" fill="#333">{name}</text>')
        lx += 30 + 7 * len(name)
    out.append(f'<text x="{lx + 10}" y="{ly}" font-size="11" fill="#555">Node label under each '
               'box = rule ID. Arrows = data-table connections (Pivot port 3 = pivot totals).</text>')
    out.append("</svg>")
    return "\n".join(out), W, H


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("workflow_dir", type=Path)
    ap.add_argument("out_svg", type=Path)
    ap.add_argument("--png", action="store_true", help="also rasterise with headless Chrome")
    ap.add_argument("--title", default=None)
    a = ap.parse_args()
    nodes, conns, anns = read_workflow(a.workflow_dir)
    title = a.title or f"KNIME workflow: {a.workflow_dir.resolve().name}"
    svg, W, H = render_svg(nodes, conns, anns, title)
    a.out_svg.parent.mkdir(parents=True, exist_ok=True)
    a.out_svg.write_text(svg, encoding="utf-8")
    print(f"wrote {a.out_svg} ({W}x{H}, {len(nodes)} nodes, {len(conns)} connections)")
    if a.png:
        png = a.out_svg.with_suffix(".png")
        page = a.out_svg.with_suffix(".render.html")
        page.write_text(f'<!doctype html><html><head><meta charset="utf-8"><style>html,body{{margin:0;'
                        f'background:#fff}}</style></head><body>{svg}</body></html>', encoding="utf-8")
        try:
            subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                            f"--window-size={int(W)},{int(H)}", "--force-device-scale-factor=2",
                            f"--screenshot={png.resolve()}", page.resolve().as_uri()],
                           check=True, capture_output=True, timeout=120)
        finally:
            page.unlink(missing_ok=True)
        print(f"wrote {png}")


if __name__ == "__main__":
    sys.exit(main())
