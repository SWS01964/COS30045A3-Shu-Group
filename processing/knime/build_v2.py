"""Build BeyondTheRoadToll_DataPrep_v2 from v1 (v1 is only read, never written).

Usage: python build_v2.py <v1_dir> <out_dir> <xlsx>
"""
import re
import shutil
import sys
from pathlib import Path
from xml.sax.saxutils import quoteattr

V1, OUT, XLSX = map(Path, sys.argv[1:4])

# ---------------------------------------------------------------- XML helpers
def esc(v):
    return quoteattr(str(v))


def entry(key, typ, value, ind):
    if value is None:
        return f'{ind}<entry key={esc(key)} type="{typ}" isnull="true" value=""/>'
    if typ == "xboolean":
        value = "true" if value else "false"
    return f'{ind}<entry key={esc(key)} type="{typ}" value={esc(value)}/>'


def render(key, node, depth):
    """node = dict (config) | tuple (typ, value) (entry)."""
    ind = "    " * depth
    if isinstance(node, tuple):
        return entry(key, node[0], node[1], ind)
    if not node:
        return f'{ind}<config key={esc(key)}/>'
    lines = [f'{ind}<config key={esc(key)}>']
    for k, v in node.items():
        lines.append(render(k, v, depth + 1))
    lines.append(f'{ind}</config>')
    return "\n".join(lines)


S = lambda v: ("xstring", v)
I = lambda v: ("xint", v)
B = lambda v: ("xboolean", v)


def arr(typ, values):
    d = {"array-size": I(len(values))}
    for i, v in enumerate(values):
        d[str(i)] = (typ, v)
    return d


def internals(model_id):
    return {"SettingsModelID": S(model_id), "EnabledStatus": B(True)}


def filter_string(incl):
    return {"InclList": arr("xstring", incl), "ExclList": arr("xstring", []),
            "keep_all_columns_selected": B(False)}

# ---------------------------------------------------------------- node models
def rowfilter_model(preds):
    """preds: list of (column, operator, kind, value); kind in {'str','int'}."""
    p = {}
    for i, (col, op, kind, val) in enumerate(preds):
        if kind == "str":
            compat = ["org.knime.core.data.StringValue"]
            vcfg = {"typeIdentifier": {"cell_class": S("org.knime.core.data.def.StringCell"),
                                       "is_null": B(False)},
                    "stringCaseMatching": {"caseMatching": S("CASESENSITIVE")},
                    "value": S(val)}
        else:
            compat = ["org.knime.core.data.IntValue"]
            vcfg = {"typeIdentifier": {"cell_class": S("org.knime.core.data.def.IntCell"),
                                       "is_null": B(False)},
                    "value": I(val)}
        p[str(i)] = {"column": {"selected": S(col),
                                "compatibleTypes_Internals": arr("xstring", compat)},
                     "operator": S(op),
                     "predicateValues": {"values": {"0": vcfg}, "inputKind": S("SINGLE")}}
    return {"outputMode": S("MATCHING"), "matchCriteria": S("AND"), "predicates": p,
            "domains": S("RETAIN")}


def groupby_core(groups, aggs, policy="Aggregation method (column name)"):
    """aggs: list of (column, cell_class short name, method)."""
    ct = {"array-size": I(len(aggs))}
    for i, (_, cell, _) in enumerate(aggs):
        ct[str(i)] = {"cell_class": S(f"org.knime.core.data.def.{cell}"), "is_null": B(False)}
    return {
        "grouByColumns_Internals": internals("SMID_filterString"),
        "grouByColumns": filter_string(groups),
        "maxNoneNumericalVals_Internals": internals("SMID_integer"),
        "maxNoneNumericalVals": I(10000),
        "enableHilite_Internals": internals("SMID_boolean"),
        "enableHilite": B(False),
        "valueDelimiter_Internals": internals("SMID_string"),
        "valueDelimiter": S(", "),
        "sortInMemory_Internals": internals("SMID_boolean"),
        "sortInMemory": B(False),
        "columnNamePolicy_Internals": internals("SMID_string"),
        "columnNamePolicy": S(policy),
        "aggregationColumn": {
            "columnNames": arr("xstring", [a[0] for a in aggs]),
            "columnTypes": ct,
            "aggregationMethod": arr("xstring", [a[2] for a in aggs]),
            "inclMissingVals": arr("xboolean", [False] * len(aggs)),
        },
        "aggregationOperatorSettings": {},
        "patternAggregators": {},
        "dataTypeAggregators": {},
        "retainOrder_Internals": internals("SMID_boolean"),
        "retainOrder": B(False),
        "inMemory_Internals": internals("SMID_boolean"),
        "inMemory": B(False),
        "nodeVersion_Internals": internals("SMID_integer"),
        "nodeVersion": I(1),
        "typeMatch": ("xbyte", 0),
    }


def pivot_model(groups, pivots, aggs):
    m = groupby_core(groups, aggs, policy="Keep original name(s)")
    m.update({
        "pivotColumns_Internals": internals("SMID_filterString"),
        "pivotColumns": filter_string(pivots),
        "missing_values_Internals": internals("SMID_boolean"),
        "missing_values": B(True),
        "total_aggregation_Internals": internals("SMID_boolean"),
        "total_aggregation": B(False),
        "ignore_domain_Internals": internals("SMID_boolean"),
        "ignore_domain": B(True),
        "sort_lexicographical_Internals": internals("SMID_boolean"),
        "sort_lexicographical": B(True),
        "column_name_option_Internals": internals("SMID_string"),
        "column_name_option": S("Pivot name"),
    })
    return m


def mathformula_model(new_col, expr):
    # Same pattern as v1 Math Formula (#5): append_column=false + replaced_column=<new name>
    # appends a new column when no column of that name exists.
    return {"append_column": B(False), "replaced_column": S(new_col),
            "expression": S(expr), "convert_to_int": B(False)}


def concatenate_model():
    return {"fail_on_duplicates": B(False), "append_suffix": B(True), "suffix": S("_dup"),
            "intersection_of_columns": B(False), "create_new_rowids": B(False),
            "enable_hiliting": B(False)}


def missingvalue_label_model(col, text):
    dn = {"factoryID": S("org.knime.base.node.preproc.pmml.missingval.handlers."
                         "DoNothingMissingCellHandlerFactory"), "settings": {}}
    return {
        "columnSettings": {"0": {
            "colNames": arr("xstring", [col]),
            "settings": {"factoryID": S("org.knime.base.node.preproc.pmml.missingval.handlers."
                                        "FixedStringValueMissingCellHandlerFactory"),
                         "settings": {"fixStringValue": S(text)}}}},
        "dataTypeSettings": {f"org.knime.core.data.def.{c}": dn
                             for c in ("IntCell", "StringCell", "DoubleCell", "LongCell")},
    }

# ---------------------------------------------------------------- settings.xml text ops
MODEL_RE = re.compile(r'    <config key="model">.*?\n    </config>\n(?=    <config key="nodeAnnotation">)',
                      re.S)
PORTS_RE = re.compile(r'    <config key="ports"(/>|>.*?\n    </config>)\n', re.S)


def ports_block(n_out):
    if n_out == 0:
        return '    <config key="ports"/>\n'
    lines = ['    <config key="ports">']
    for i in range(1, n_out + 1):
        lines += [f'        <config key="port_{i}">',
                  f'            <entry key="index" type="xint" value="{i}"/>',
                  '            <entry key="port_dir_location" type="xstring" isnull="true" value=""/>',
                  '        </config>']
    lines.append('    </config>')
    return "\n".join(lines) + "\n"


def set_entry(txt, key, typ, value):
    pat = re.compile(r'(\n    <entry key="%s" type="%s") (isnull="true" )?value="[^"]*"/>' %
                     (re.escape(key), typ))
    assert pat.search(txt), key
    return pat.sub(lambda m: f'{m.group(1)} value={esc(value)}/>', txt, count=1)


def strip_state(txt, n_out):
    txt = txt.replace('<entry key="state" type="xstring" value="EXECUTED"/>',
                      '<entry key="state" type="xstring" value="IDLE"/>')
    txt = txt.replace('<entry key="state" type="xstring" value="CONFIGURED"/>',
                      '<entry key="state" type="xstring" value="IDLE"/>')
    txt = txt.replace('<entry key="hasContent" type="xboolean" value="true"/>',
                      '<entry key="hasContent" type="xboolean" value="false"/>')
    txt = PORTS_RE.sub(lambda m: ports_block(n_out), txt, count=1)
    txt = re.sub(r'<entry key="file_store_id" type="xstring" value="[^"]*"/>',
                 '<entry key="file_store_id" type="xstring" isnull="true" value=""/>', txt)
    return txt


def make_relative(txt, filename):
    pat = re.compile(r'(<config key="path">\s*<entry key="location_present" type="xboolean" value="true"/>\s*)'
                     r'<entry key="file_system_type" type="xstring" value="LOCAL"/>\s*'
                     r'<entry key="path" type="xstring" value="[^"]*"/>')
    assert pat.search(txt)
    rep = (r'\1<entry key="file_system_type" type="xstring" value="RELATIVE"/>\n'
           '                    <entry key="file_system_specifier" type="xstring" value="knime.workflow.data"/>\n'
           f'                    <entry key="path" type="xstring" value="{filename}"/>')
    return pat.sub(rep, txt, count=1)


def set_label(txt, label):
    pat = re.compile(r'(<config key="nodeAnnotation">\s*<entry key="text" type="xstring" value=)"[^"]*"')
    return pat.sub(lambda m: m.group(1) + esc(label), txt, count=1)


def set_model(txt, model):
    body = render("model", model, 1) + "\n"
    assert MODEL_RE.search(txt)
    return MODEL_RE.sub(lambda m: body, txt, count=1)


# ---------------------------------------------------------------- build
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)

N_OUT = {"Excel Reader": 1, "Row Filter": 1, "Missing Value": 2, "GroupBy": 1, "Math Formula": 1,
         "CSV Writer": 0, "Pivot": 3, "Concatenate": 1}

# v1 nodes: copy settings.xml only (drops port_*/internal/ data), strip state, relative paths
v1_out = {"Excel Reader (#1)": "hospitalisation_injury_publication_sep2023.xlsx",
          "CSV Writer (#6)": "knime_idea1_check.csv",
          "CSV Writer (#9)": "knime_idea2_cyclist_65_74_check.csv"}
templates = {}
for d in sorted(p for p in V1.iterdir() if p.is_dir() and "(#" in p.name):
    txt = (d / "settings.xml").read_text(encoding="utf-8")
    typ = d.name.rsplit(" (#", 1)[0]
    templates.setdefault(typ, txt)
    txt = strip_state(txt, N_OUT[typ])
    if d.name in v1_out:
        txt = make_relative(txt, v1_out[d.name])
    (OUT / d.name).mkdir()
    (OUT / d.name / "settings.xml").write_text(txt, encoding="utf-8")

# Pivot / Concatenate have no v1 template: derive from the GroupBy template and swap identity
def derived_template(base, factory, name):
    t = templates[base]
    t = set_entry(t, "factory", "xstring", factory)
    t = set_entry(t, "node-name", "xstring", name)
    t = set_entry(t, "name", "xstring", name)
    return t


templates["Pivot"] = derived_template("GroupBy", "org.knime.base.node.preproc.pivot.Pivot2NodeFactory", "Pivot")
templates["Concatenate"] = derived_template(
    "GroupBy", "org.knime.base.node.preproc.append.row.AppendedRowsNodeFactory", "Concatenate")

POS = {}  # id -> (x, y)
NEW = []  # (id, type, label, model, out_filename or None)

ROW_F1, ROW_F2, ROW_G1, ROW_G2 = 470, 570, 710, 810
X0, DX = 560, 130


def add(nid, typ, label, model, col, row, out=None):
    NEW.append((nid, typ, label, model, out))
    POS[nid] = (X0 + DX * col, row)


# F1 severity: died in care per 1,000 by road user, 2011-2019
add(10, "Row Filter", "F1a Years 2011–2019",
    rowfilter_model([("Calendar year", "GTE", "int", 2011), ("Calendar year", "LTE", "int", 2019)]), 0, ROW_F1)
add(11, "GroupBy", "F1b Cases + deaths by road user",
    groupby_core(["Road user"], [("Count of cases", "IntCell", "Sum"), ("Died_cases", "IntCell", "Sum")]), 1, ROW_F1)
add(12, "Math Formula", "F1c Died per 1,000 cases",
    mathformula_model("died_per_1000", "1000 * $Sum(Died_cases)$ / $Sum(Count of cases)$"), 2, ROW_F1)
add(13, "CSV Writer", "F1d Write severity check", None, 3, ROW_F1, "knime_idea3_severity_check.csv")
# F2 burden: share of cases vs share of bed days, 2016-2021
add(14, "Row Filter", "F2a Years 2016–2021",
    rowfilter_model([("Calendar year", "GTE", "int", 2016), ("Calendar year", "LTE", "int", 2021)]), 0, ROW_F2)
add(15, "GroupBy", "F2b Cases + bed days by road user",
    groupby_core(["Road user"], [("Count of cases", "IntCell", "Sum"), ("Bed days", "IntCell", "Sum")]), 1, ROW_F2)
add(16, "Math Formula", "F2c Share of cases %",
    mathformula_model("share_cases_pct",
                      "100 * $Sum(Count of cases)$ / COL_SUM($Sum(Count of cases)$)"), 2, ROW_F2)
add(17, "Math Formula", "F2d Share of bed days %",
    mathformula_model("share_bed_days_pct", "100 * $Sum(Bed days)$ / COL_SUM($Sum(Bed days)$)"), 3, ROW_F2)
add(18, "CSV Writer", "F2e Write burden check", None, 4, ROW_F2, "knime_idea3_burden_check.csv")
# G1 lockdown: April 2019 vs April 2020 by road user
add(19, "Row Filter", "G1a April, 2019–2020",
    rowfilter_model([("Month", "EQ", "str", "April"), ("Calendar year", "GTE", "int", 2019),
                     ("Calendar year", "LTE", "int", 2020)]), 0, ROW_G1)
add(20, "GroupBy", "G1b Hospitalisations by road user × year",
    groupby_core(["Road user", "Calendar year"], [("Hospitalisations", "IntCell", "Sum")]), 1, ROW_G1)
add(21, "Pivot", "G1c Years side by side",
    pivot_model(["Road user"], ["Calendar year"], [("Sum(Hospitalisations)", "DoubleCell", "Sum")]), 2, ROW_G1)
add(22, "Concatenate", "G1d Append total row", concatenate_model(), 3, ROW_G1)
add(23, "Missing Value", "G1e Label total row", missingvalue_label_model("Road user", "All road users"),
    4, ROW_G1)
add(24, "Math Formula", "G1f % change 2019→2020",
    mathformula_model("pct_change", "100 * ($2020$ - $2019$) / $2019$"), 5, ROW_G1)
add(25, "CSV Writer", "G1g Write April check", None, 6, ROW_G1, "knime_idea4_april_check.csv")
# G2 lockdown: annual cyclists
add(26, "Row Filter", "G2a Pedal cyclists only",
    rowfilter_model([("Road user", "EQ", "str", "Pedal cyclist")]), 0, ROW_G2)
add(27, "GroupBy", "G2b Hospitalisations per year",
    groupby_core(["Calendar year"], [("Hospitalisations", "IntCell", "Sum")]), 1, ROW_G2)
add(28, "CSV Writer", "G2c Write cyclist annual check", None, 2, ROW_G2,
    "knime_idea4_cyclists_annual_check.csv")

for nid, typ, label, model, out in NEW:
    txt = strip_state(templates[typ], N_OUT[typ])
    if model is not None:
        txt = set_model(txt, model)
    if out:
        # CSV Writer template is the v1 one (absolute path) -> relative + new file name
        txt = make_relative(txt, out)
    txt = set_label(txt, label)
    d = OUT / f"{typ} (#{nid})"
    d.mkdir()
    d.joinpath("settings.xml").write_text(txt, encoding="utf-8")

CONN = [  # (src, src_port, dst, dst_port)
    (3, 1, 10, 1), (10, 1, 11, 1), (11, 1, 12, 1), (12, 1, 13, 1),
    (3, 1, 14, 1), (14, 1, 15, 1), (15, 1, 16, 1), (16, 1, 17, 1), (17, 1, 18, 1),
    (3, 1, 19, 1), (19, 1, 20, 1), (20, 1, 21, 1), (21, 1, 22, 1), (21, 3, 22, 2),
    (22, 1, 23, 1), (23, 1, 24, 1), (24, 1, 25, 1),
    (3, 1, 26, 1), (26, 1, 27, 1), (27, 1, 28, 1),
]

# ---------------------------------------------------------------- workflow.knime
wf = (V1 / "workflow.knime").read_text(encoding="utf-8")
wf = wf.replace('<entry key="state" type="xstring" value="EXECUTED"/>',
                '<entry key="state" type="xstring" value="IDLE"/>')
wf = re.sub(r'(<entry key="lastEdited-by" type="xstring" value=)"[^"]*"', r'\1"Claude"', wf)
wf = re.sub(r'(<entry key="lastEdited-when" type="xstring" value=)"[^"]*"',
            r'\1"2026-11-23 12:00:00 +1100"', wf)

ANN = [  # text, bg, border, x, y, w, h  (v1 style: pale fill + strong border)
    ("F. Idea 3: severity (pedestrians suffer worst)", 0xFCE4D6, 0xC55A11, 520, 400, 690, 245),
    ("G. Idea 4: lockdown test (April 2020, cyclists)", 0xDEEBF7, 0x2E75B6, 520, 660, 950, 230),
]
ann_xml = []
for i, (text, bg, bd, x, y, w, h) in enumerate(ANN, start=4):
    ann_xml.append(render(f"annotation_{i}", {
        "text": S(f"<p><strong>{text}</strong></p>"), "contentType": S("text/html"),
        "bgcolor": I(bg), "x-coordinate": I(x), "y-coordinate": I(y), "width": I(w), "height": I(h),
        "alignment": S("LEFT"), "borderSize": I(4), "borderColor": I(bd), "defFontSize": I(-1),
        "annotation-version": I(20230412), "styles": {}}, 2))
wf = wf.replace("        </config>\n    </config>\n    <config key=\"nodes\">",
                "        </config>\n" + "\n".join(ann_xml) + "\n    </config>\n    <config key=\"nodes\">", 1)

node_xml = []
for nid, typ, *_ in NEW:
    x, y = POS[nid]
    node_xml.append(render(f"node_{nid}", {
        "id": I(nid), "node_settings_file": S(f"{typ} (#{nid})/settings.xml"),
        "node_is_meta": B(False), "node_type": S("NativeNode"),
        "ui_classname": S("org.knime.core.node.workflow.NodeUIInformation"),
        "ui_settings": {"extrainfo.node.bounds": {"array-size": I(4), "0": I(x), "1": I(y),
                                                  "2": I(32), "3": I(32)}}}, 2))
wf = wf.replace("    </config>\n    <config key=\"connections\">",
                "\n".join(node_xml) + "\n    </config>\n    <config key=\"connections\">", 1)

n0 = len(re.findall(r'<config key="connection_\d+">', wf))
conn_xml = [render(f"connection_{n0 + i}", {"sourceID": I(s), "destID": I(d), "sourcePort": I(sp),
                                           "destPort": I(dp)}, 2)
            for i, (s, sp, d, dp) in enumerate(CONN)]
wf = wf.replace("    </config>\n    <config key=\"workflow_editor_settings\">",
                "\n".join(conn_xml) + "\n    </config>\n    <config key=\"workflow_editor_settings\">", 1)
(OUT / "workflow.knime").write_text(wf, encoding="utf-8")

desc = ("Data-prep workflow v2 for Beyond the Road Toll (portable: national xlsx bundled in data/). "
        "R1 read, R2 Traffic, R5 missing to 0; Idea 1 yearly index; Idea 2 pedal cyclists 65-74; "
        "Idea 3 severity (died per 1,000 2011-19, case vs bed-day shares 2016-21); "
        "Idea 4 lockdown (April 2019 vs 2020 by road user, cyclists per year). "
        "Outputs are written to the workflow data area (data/).")
(OUT / "workflow-metadata.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<workflow-metadata content-type="text/plain" xmlns="http://www.knime.org/core/node/workflow/metadata/v1.0">\n'
    '    <created>2026-11-17T10:00:00.000+11:00</created>\n'
    '    <last-modified>2026-11-23T12:00:00.000+11:00</last-modified>\n'
    f'    <description>{desc}</description>\n'
    '</workflow-metadata>', encoding="utf-8")
meta = (V1 / "workflowset.meta").read_text(encoding="utf-8")
meta = re.sub(r'(name="Comments" read-only="false">)[^<]*', lambda m: m.group(1) + desc, meta)
(OUT / "workflowset.meta").write_text(meta, encoding="utf-8")

(OUT / "data").mkdir()
shutil.copy2(XLSX, OUT / "data" / XLSX.name)
print("built", OUT, "nodes:", len(list(OUT.glob("* (#*)"))))
