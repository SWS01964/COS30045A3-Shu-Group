"""knimelib: write small, tidy KNIME 5.5 workflows from Python.

Each node's settings.xml starts from a template copied from KNIME itself (processing/knime/templates/<Type>.xml).
We only swap in the node's model (its configured settings), label and file path. Workflows can contain metanodes
(one per story chapter) and coloured section annotations, so the result reads like a hand-built workflow.

Port numbering (KNIME's own rules):
  native node   data ports are 1..n (port 0 is the hidden flow-variable port)
  metanode      ports are 0..n-1 from the outside
  inside a metanode the input bar is node -1 (sourcePort = input index) and the output bar is node -1 (destPort).
"""
import re
import shutil
import zipfile
from pathlib import Path
from xml.sax.saxutils import quoteattr

TEMPLATES = Path(__file__).resolve().parent / "templates"
KNIME_VERSION = "5.5.1.v202507241444"
AUTHOR = "Team Shu"

# Input files. build_workflow.py copies them into <workflow>/data/ ; readers use these bare names (relative path).
NATIONAL_XLSX = "hospitalisation_injury_publication_sep2023.xlsx"
STATE_XLSX = "state-and-territory-hospitalisation-injury-publication-2023.xlsx"
FIRST_NATIONS_XLSX = "First-Nations-hospitalised-injuries-2023.xlsx"
ERP_CSV = "ABS_ERP_Q_AUS_persons_2011Q2-2021Q2.csv"
ARDD_CSV = "ardd_fatalities.csv"
FN_POP_CSV = "abs_first_nations_population.csv"
STAMP = "2026-11-27 12:00:00 +1100"


# ----------------------------------------------------------------------------- XML config rendering
def esc(v):
    return quoteattr(str(v))


def render(key, node, depth):
    ind = "    " * depth
    if isinstance(node, tuple):
        typ, value = node
        if value is None:
            return f'{ind}<entry key={esc(key)} type="{typ}" isnull="true" value=""/>'
        if typ == "xboolean":
            value = "true" if value else "false"
        return f'{ind}<entry key={esc(key)} type="{typ}" value={esc(value)}/>'
    if not node:
        return f'{ind}<config key={esc(key)}/>'
    out = [f'{ind}<config key={esc(key)}>']
    out += [render(k, v, depth + 1) for k, v in node.items()]
    out.append(f'{ind}</config>')
    return "\n".join(out)


S = lambda v: ("xstring", v)
I = lambda v: ("xint", v)
B = lambda v: ("xboolean", v)
D = lambda v: ("xdouble", v)


def arr(typ, values):
    d = {"array-size": I(len(values))}
    for i, v in enumerate(values):
        d[str(i)] = (typ, v)
    return d


def internals(model_id):
    return {"SettingsModelID": S(model_id), "EnabledStatus": B(True)}


def col_filter(incl, excl=()):
    return {"filter-type": S("STANDARD"), "included_names": arr("xstring", list(incl)),
            "excluded_names": arr("xstring", list(excl)), "enforce_option": S("EnforceInclusion"),
            "name_pattern": {"pattern": S(""), "type": S("Wildcard"), "caseSensitive": B(True),
                             "excludeMatching": B(False)},
            "datatype": {"typelist": {}}}


DBL, INT, STR, LONG = "DoubleCell", "IntCell", "StringCell", "LongCell"


# ----------------------------------------------------------------------------- node models
def m_rowfilter(preds, match="AND"):
    """preds: list of (column, operator, kind, value). kind: 'str' | 'int'. operators: EQ NEQ LT LTE GT GTE WILDCARD REGEX."""
    p = {}
    for i, (col, op, kind, val) in enumerate(preds):
        if kind == "str":
            compat = ["org.knime.core.data.StringValue"]
            v = {"typeIdentifier": {"cell_class": S("org.knime.core.data.def.StringCell"), "is_null": B(False)},
                 "stringCaseMatching": {"caseMatching": S("CASESENSITIVE")}, "value": S(val)}
        else:
            compat = ["org.knime.core.data.IntValue"]
            v = {"typeIdentifier": {"cell_class": S("org.knime.core.data.def.IntCell"), "is_null": B(False)},
                 "value": I(val)}
        p[str(i)] = {"column": {"selected": S(col), "compatibleTypes_Internals": arr("xstring", compat)},
                     "operator": S(op), "predicateValues": {"values": {"0": v}, "inputKind": S("SINGLE")}}
    return {"outputMode": S("MATCHING"), "matchCriteria": S(match), "predicates": p, "domains": S("RETAIN")}


def m_any_of(col, values):
    """Row Filter: keep rows whose string column equals any of the values."""
    return m_rowfilter([(col, "EQ", "str", v) for v in values], match="OR")


def _groupby(groups, aggs):
    ct = {"array-size": I(len(aggs))}
    for i, (_, cell, _) in enumerate(aggs):
        ct[str(i)] = {"cell_class": S(f"org.knime.core.data.def.{cell}"), "is_null": B(False)}
    return {
        "grouByColumns_Internals": internals("SMID_filterString"),
        "grouByColumns": {"InclList": arr("xstring", list(groups)), "ExclList": arr("xstring", []),
                          "keep_all_columns_selected": B(False)},
        "maxNoneNumericalVals_Internals": internals("SMID_integer"), "maxNoneNumericalVals": I(10000),
        "enableHilite_Internals": internals("SMID_boolean"), "enableHilite": B(False),
        "valueDelimiter_Internals": internals("SMID_string"), "valueDelimiter": S(", "),
        "sortInMemory_Internals": internals("SMID_boolean"), "sortInMemory": B(False),
        "columnNamePolicy_Internals": internals("SMID_string"), "columnNamePolicy": S("Keep original name(s)"),
        "aggregationColumn": {"columnNames": arr("xstring", [a[0] for a in aggs]), "columnTypes": ct,
                              "aggregationMethod": arr("xstring", [a[2] for a in aggs]),
                              "inclMissingVals": arr("xboolean", [False] * len(aggs))},
        "aggregationOperatorSettings": {}, "patternAggregators": {}, "dataTypeAggregators": {},
        "retainOrder_Internals": internals("SMID_boolean"), "retainOrder": B(False),
        "inMemory_Internals": internals("SMID_boolean"), "inMemory": B(False),
        "nodeVersion_Internals": internals("SMID_integer"), "nodeVersion": I(1),
        "typeMatch": ("xbyte", 0)}


def m_groupby(groups, aggs):
    """aggs: list of (column, cell type of the input column, method) e.g. ('hosp', INT, 'Sum')."""
    return _groupby(groups, aggs)


def m_pivot(groups, pivots, aggs):
    """Pivot: one row per group, one column per pivot value, named by the pivot value only (e.g. '2011')."""
    m = _groupby(groups, aggs)
    m.update({"pivotColumns_Internals": internals("SMID_filterString"),
              "pivotColumns": {"InclList": arr("xstring", list(pivots)), "ExclList": arr("xstring", []),
                               "keep_all_columns_selected": B(False)},
              "missing_values_Internals": internals("SMID_boolean"), "missing_values": B(True),
              "total_aggregation_Internals": internals("SMID_boolean"), "total_aggregation": B(False),
              "ignore_domain_Internals": internals("SMID_boolean"), "ignore_domain": B(True),
              "sort_lexicographical_Internals": internals("SMID_boolean"), "sort_lexicographical": B(True),
              "column_name_option_Internals": internals("SMID_string"), "column_name_option": S("Pivot name")})
    return m


def m_math(col, expr, replace=False, to_int=False):
    # KNIME stores "replace existing column" under the key append_column (the name is inverted).
    return {"append_column": B(replace), "replaced_column": S(col), "expression": S(expr), "convert_to_int": B(to_int)}


def m_rule(rules, col, replace=False):
    return {"rules": arr("xstring", list(rules)), "new-column-name": S(col), "replace-column-name": S(col),
            "append-column": B(not replace), "disallowLongOutputForCompatibility": B(True)}


def m_strman(col, expr, replace=False, return_type="java.lang.String"):
    # same inverted key as Math Formula: append_column=True means "replace"
    return {"expression": S(expr), "replaced_column": S(col), "append_column": B(replace),
            "test_compilation_on_dialog_close": B(True), "insert_missing_as_null": B(False),
            "return_type": S(return_type)}


def m_constant(col, value, replace=False):
    return {"replaced-column": S(col) if replace else ("xstring", None), "column-value": S(value),
            "new-column-name": S(col), "column-type": S("STRING"), "date-format": S("dd.MM.yyyy")}


def m_renamer(pairs):
    return {"renamings": {str(i): {"oldName": S(o), "newName": S(n)} for i, (o, n) in enumerate(pairs)}}


def m_colfilter(incl):
    return {"column-filter": col_filter(incl)}


def m_str2num(cols, cell=INT):
    return {"include_Internals": internals("SMID_columnfilter"), "include": col_filter(cols),
            "decimal_separator": S("."), "thousands_separator": S(""),
            "parse_type": {"cell_class": S(f"org.knime.core.data.def.{cell}"), "is_null": B(False)},
            "generic_parse": B(False), "fail_on_error": B(False)}


def m_concat():
    return {"fail_on_duplicates": B(False), "append_suffix": B(True), "suffix": S("_dup"),
            "intersection_of_columns": B(False), "create_new_rowids": B(True), "enable_hiliting": B(False)}


def m_missing_zero(cols):
    """Missing Value: replace blanks with 0 in the given Integer columns (other types are left alone)."""
    do_nothing = "org.knime.base.node.preproc.pmml.missingval.handlers.DoNothingMissingCellHandlerFactory"
    return {"columnSettings": {"0": {"colNames": arr("xstring", list(cols)),
                                      "settings": {"factoryID": S("org.knime.base.node.preproc.pmml.missingval.handlers."
                                                                  "FixedIntegerValueMissingCellHandlerFactory"),
                                                   "settings": {"fixIntegerValue": I(0)}}}},
            "dataTypeSettings": {f"org.knime.core.data.def.{c}": {"factoryID": S(do_nothing), "settings": {}}
                                 for c in ("IntCell", "StringCell", "DoubleCell")}}


def m_joiner(lkeys, rkeys, lcols, rcols, mode="inner"):
    left_un, right_un = mode in ("left", "outer"), mode in ("right", "outer")

    def b(k, v):
        return {f"{k}_Internals": internals("SMID_boolean"), k: B(v)}

    def s(k, v):
        return {f"{k}_Internals": internals("SMID_string"), k: S(v)}

    m = {}
    m.update(b("includeMatchesInOutput", True)); m.update(b("includeLeftUnmatchedInOutput", left_un))
    m.update(b("includeRightUnmatchedInOutput", right_un))
    m["leftTableJoinPredicate_Internals"] = internals("SMID_stringarray")
    m["leftTableJoinPredicate"] = arr("xstring", lkeys)
    m["rightTableJoinPredicate_Internals"] = internals("SMID_stringarray")
    m["rightTableJoinPredicate"] = arr("xstring", rkeys)
    m.update(s("compositionMode", "MATCH_ALL")); m.update(b("mergeJoinColumns", True))
    m.update(s("dataCellComparisonMode", "STRICT")); m.update(b("outputUnmatchedRowsToSeparatePorts", False))
    m.update(s("rowKeyFactory", "CONCATENATE")); m.update(s("rowKeySeparator", "_"))
    m.update(s("duplicateHandling", "APPEND_SUFFIX")); m.update(s("suffix", " (right)"))
    m.update(s("outputRowOrder", "ARBITRARY"))
    m["maxOpenFiles_Internals"] = internals("SMID_integer"); m["maxOpenFiles"] = I(200)
    m.update(b("enableHiliting", False))
    m["leftColumnSelectionConfig"] = col_filter(lcols)
    m["rightColumnSelectionConfig"] = col_filter(rcols)
    return m


# ----------------------------------------------------------------------------- settings.xml text handling
N_OUT = {"Excel Reader": 1, "CSV Reader": 1, "Row Filter": 1, "Missing Value": 2, "GroupBy": 1, "Math Formula": 1,
         "CSV Writer": 0, "Pivot": 3, "Concatenate": 1, "Column Filter": 1, "Column Renamer": 1, "Rule Engine": 1,
         "String Manipulation": 1, "String to Number": 1, "Constant Value Column": 1, "Joiner": 1}
MODEL_RE = re.compile(r'    <config key="model">.*?\n    </config>\n(?=    <config key="nodeAnnotation">)', re.S)
PORTS_RE = re.compile(r'    <config key="ports"(/>|>.*?\n    </config>)\n', re.S)
_cache = {}


def template(typ):
    if typ not in _cache:
        _cache[typ] = (TEMPLATES / f"{typ}.xml").read_text(encoding="utf-8")
    return _cache[typ]


def set_entry(txt, key, typ, value):
    pat = re.compile(r'(\n\s+<entry key="%s" type="%s") (isnull="true" )?value="[^"]*"/>' % (re.escape(key), typ))
    assert pat.search(txt), key
    return pat.sub(lambda m: f'{m.group(1)} value={esc(value)}/>', txt, count=1)


def _ports(n_out):
    if n_out == 0:
        return '    <config key="ports"/>\n'
    out = ['    <config key="ports">']
    for i in range(1, n_out + 1):
        out += [f'        <config key="port_{i}">', f'            <entry key="index" type="xint" value="{i}"/>',
                '            <entry key="port_dir_location" type="xstring" isnull="true" value=""/>', '        </config>']
    out.append('    </config>')
    return "\n".join(out) + "\n"


def _reset(txt, n_out):
    for st in ("EXECUTED", "CONFIGURED"):
        txt = txt.replace(f'<entry key="state" type="xstring" value="{st}"/>', '<entry key="state" type="xstring" value="IDLE"/>')
    txt = txt.replace('<entry key="hasContent" type="xboolean" value="true"/>', '<entry key="hasContent" type="xboolean" value="false"/>')
    txt = PORTS_RE.sub(lambda m: _ports(n_out), txt, count=1)
    return re.sub(r'<entry key="file_store_id" type="xstring" value="[^"]*"/>',
                  '<entry key="file_store_id" type="xstring" isnull="true" value=""/>', txt)


def _label(txt, label):
    pat = re.compile(r'(<config key="nodeAnnotation">\s*<entry key="text" type="xstring" value=)"[^"]*"')
    assert pat.search(txt)
    return pat.sub(lambda m: m.group(1) + esc(label.replace("\n", "%%00010")), txt, count=1)


def _model(txt, model):
    assert MODEL_RE.search(txt)
    return MODEL_RE.sub(lambda m: render("model", model, 1) + "\n", txt, count=1)


def _path(txt, filename):
    """Point a reader/writer at a file in the workflow's own data folder (portable)."""
    pat = re.compile(r'(<config key="path">\s*<entry key="location_present" type="xboolean" value="true"/>\s*)'
                     r'<entry key="file_system_type" type="xstring" value="[A-Z]+"/>\s*'
                     r'(?:<entry key="file_system_specifier" type="xstring" value="[^"]*"/>\s*)?'
                     r'<entry key="path" type="xstring" value="[^"]*"/>')
    assert pat.search(txt)
    rep = (r'\1<entry key="file_system_type" type="xstring" value="RELATIVE"/>\n'
           '                    <entry key="file_system_specifier" type="xstring" value="knime.workflow.data"/>\n'
           f'                    <entry key="path" type="xstring" value={esc(filename)}/>')
    return pat.sub(lambda m: m.expand(rep), txt, count=1)


def excel_reader(filename, sheet="raw", c0="A", c1="", header_row=1, skip_empty=False):
    t = _path(template("Excel Reader"), filename)
    for k, typ, v in [("sheet_name", "xstring", sheet), ("column_names_row_number", "xlong", str(header_row)),
                      ("read_from_column", "xstring", c0), ("read_to_column", "xstring", c1),
                      ("read_from_row", "xstring", str(header_row))]:
        t = set_entry(t, k, typ, v)
    area = "ENTIRE" if c0 == "A" and not c1 and header_row == 1 else "PARTIAL"
    t = t.replace('<entry key="sheet_area" type="xstring" value="ENTIRE"/>', f'<entry key="sheet_area" type="xstring" value="{area}"/>')
    return t.replace('<entry key="skip_empty_rows" type="xboolean" value="false"/>',
                     f'<entry key="skip_empty_rows" type="xboolean" value="{"true" if skip_empty else "false"}"/>')


def csv_reader(filename):
    t = template("CSV Reader")
    # drop the saved column spec so KNIME detects the columns of *our* file
    t = re.sub(r'        <config key="table_spec_config_Internals">.*?\n        </config>\n(?=        <config key="advanced_settings">)', '', t, flags=re.S)
    for a, b in [('save_table_spec_config_Internals" type="xboolean" value="true"', 'save_table_spec_config_Internals" type="xboolean" value="false"'),
                 ('check_table_spec" type="xboolean" value="true"', 'check_table_spec" type="xboolean" value="false"'),
                 ('limit_data_rows_scanned" type="xboolean" value="true"', 'limit_data_rows_scanned" type="xboolean" value="false"')]:
        t = t.replace(a, b)
    return _path(t, filename)


# ----------------------------------------------------------------------------- workflow graph
GRID_X, GRID_Y, X0, Y0 = 150, 150, 80, 120
PALETTE = {"blue": (0xDDEBF7, 0x2E75B6), "yellow": (0xFFF2CC, 0xBF9000), "green": (0xE2F0D9, 0x548235),
           "purple": (0xE4DFEC, 0x7030A0), "orange": (0xFCE4D6, 0xC55A11), "grey": (0xEDEDED, 0x7F7F7F),
           "teal": (0xDDF3F2, 0x2A8C87)}


class Workflow:
    """A workflow (or the inside of a metanode). Nodes are placed on a grid: at=(column, row)."""

    def __init__(self, name="", n_in=0, n_out=0, description=""):
        self.name, self.n_in, self.n_out, self.description = name, n_in, n_out, description
        self.nodes = {}        # id -> dict(kind, typ, label, text, at, meta)
        self.conns = []        # (src, src_port, dst, dst_port)
        self.notes = []        # (title, body, (c0, r0, c1, r1), colour)
        self.next_id = 1

    # --- nodes
    def _new(self, **kw):
        nid = self.next_id; self.next_id += 1
        self.nodes[nid] = kw
        return nid

    def node(self, typ, label, at, inputs=(), model=None, text=None, out_file=None):
        """inputs: list of ids or (id, port). For a native source node the data port is 1; for a metanode use (id, k)."""
        if text is None:
            text = template(typ)
            if model is not None:
                text = _model(text, model)
            if out_file:
                text = _path(text, out_file)
        text = _label(_reset(text, N_OUT[typ]), label)
        nid = self._new(kind="native", typ=typ, label=label, text=text, at=at)
        for k, src in enumerate(inputs, start=1):
            self.connect(src, nid, k)
        return nid

    def metanode(self, wf, at, inputs=()):
        """Add a nested Workflow as a metanode. Its inputs connect to metanode ports 0..n-1."""
        nid = self._new(kind="meta", typ="Metanode", label=wf.name, wf=wf, at=at)
        for k, src in enumerate(inputs):
            self.connect(src, nid, k)
        return nid

    def connect(self, src, dst, dst_port):
        if isinstance(src, tuple):
            s, sp = src
        else:
            s, sp = src, (0 if s_is_meta(self, src) else 1)
        self.conns.append((s, sp, dst, dst_port))

    # inside a metanode: the input bar is node -1 with ports 0..n-1
    def inport(self, k=0):
        return (-1, k)

    def output(self, src, k=0):
        s, sp = src if isinstance(src, tuple) else (src, 0 if s_is_meta(self, src) else 1)
        self.conns.append((s, sp, -1, k))

    def note(self, title, body, box, colour="blue"):
        """Coloured section annotation around grid cells box=(c0, r0, c1, r1)."""
        self.notes.append((title, body, box, colour))

    # --- serialisation
    def _xy(self, at):
        return X0 + GRID_X * at[0], Y0 + GRID_Y * at[1]

    def _annotations(self):
        out = []
        for i, (title, body, (c0, r0, c1, r1), colour) in enumerate(self.notes):
            bg, bd = PALETTE[colour]
            x0, y0 = self._xy((c0, r0)); x1, y1 = self._xy((c1, r1))
            x0, y0, x1, y1 = x0 - 55, y0 - 75, x1 + 85, y1 + 85
            html = f"<p><strong>{title}</strong></p>" + (f"<p>{body}</p>" if body else "")
            out.append(render(f"annotation_{i}", {
                "text": S(html), "contentType": S("text/html"), "bgcolor": I(bg),
                "x-coordinate": I(x0), "y-coordinate": I(y0), "width": I(x1 - x0), "height": I(y1 - y0),
                "alignment": S("LEFT"), "borderSize": I(4), "borderColor": I(bd), "defFontSize": I(-1),
                "annotation-version": I(20230412), "styles": {}}, 2))
        return out

    def _bar(self, key, n, x):
        ports = {}
        for k in range(n):
            pk = ("inport_" if key == "meta_in_ports" else "outport_") + str(k)
            ports[pk] = {"index": I(k), "name": S(f"Port {k}"),
                         "type": {"object_class": S("org.knime.core.node.BufferedDataTable")}}
        return render(key, {"ui_classname": S("org.knime.core.node.workflow.NodeUIInformation"),
                            "ui_settings": {"extrainfo.node.bounds": {"array-size": I(4), "0": I(x), "1": I(80),
                                                                     "2": I(50), "3": I(400)}},
                            "port_enum": ports}, 1)

    def save(self, folder):
        folder = Path(folder)
        folder.mkdir(parents=True, exist_ok=True)
        node_xml = []
        for nid, n in self.nodes.items():
            x, y = self._xy(n["at"])
            if n["kind"] == "meta":
                sub = f"{safe(n['label'])} (#{nid})"
                n["wf"].save(folder / sub)
                entry = {"id": I(nid), "node_settings_file": S(f"{sub}/workflow.knime"), "node_is_meta": B(True),
                         "node_type": S("MetaNode")}
            else:
                sub = f"{n['typ']} (#{nid})"
                (folder / sub).mkdir(exist_ok=True)
                (folder / sub / "settings.xml").write_text(n["text"], encoding="utf-8")
                entry = {"id": I(nid), "node_settings_file": S(f"{sub}/settings.xml"), "node_is_meta": B(False),
                         "node_type": S("NativeNode")}
            entry["ui_classname"] = S("org.knime.core.node.workflow.NodeUIInformation")
            entry["ui_settings"] = {"extrainfo.node.bounds": {"array-size": I(4), "0": I(x), "1": I(y),
                                                             "2": I(32), "3": I(32)}}
            node_xml.append(render(f"node_{nid}", entry, 2))
        conn_xml = [render(f"connection_{k}", {"sourceID": I(s), "destID": I(d), "sourcePort": I(sp), "destPort": I(dp)}, 2)
                    for k, (s, sp, d, dp) in enumerate(self.conns)]
        maxc = max([n["at"][0] for n in self.nodes.values()] + [0])
        bars = []
        if self.n_in:
            bars.append(self._bar("meta_in_ports", self.n_in, 0))
        if self.n_out:
            bars.append(self._bar("meta_out_ports", self.n_out, X0 + GRID_X * (maxc + 1)))
        name = f'<entry key="name" type="xstring" value={esc(self.name)}/>' if self.name else \
            '<entry key="name" type="xstring" isnull="true" value=""/>'
        xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<config xmlns="http://www.knime.org/2008/09/XMLConfig" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.knime.org/2008/09/XMLConfig http://www.knime.org/XMLConfig_2008_09.xsd" key="workflow.knime">
    <entry key="created_by" type="xstring" value="{KNIME_VERSION}"/>
    <entry key="created_by_nightly" type="xboolean" value="false"/>
    <entry key="version" type="xstring" value="5.1.0"/>
    {name}
    <config key="authorInformation">
        <entry key="authored-by" type="xstring" value="{AUTHOR}"/>
        <entry key="authored-when" type="xstring" value="{STAMP}"/>
        <entry key="lastEdited-by" type="xstring" value="{AUTHOR}"/>
        <entry key="lastEdited-when" type="xstring" value="{STAMP}"/>
    </config>
    <entry key="customDescription" type="xstring" isnull="true" value=""/>
    <entry key="state" type="xstring" value="IDLE"/>
    <config key="workflow_credentials"/>
    <config key="annotations">
{chr(10).join(self._annotations())}
    </config>
    <config key="nodes">
{chr(10).join(node_xml)}
    </config>
    <config key="connections">
{chr(10).join(conn_xml)}
    </config>
{chr(10).join(bars)}
    <config key="workflow_editor_settings">
        <entry key="workflow.editor.snapToGrid" type="xboolean" value="false"/>
        <entry key="workflow.editor.ShowGrid" type="xboolean" value="false"/>
        <entry key="workflow.editor.gridX" type="xint" value="-1"/>
        <entry key="workflow.editor.gridY" type="xint" value="-1"/>
        <entry key="workflow.editor.zoomLevel" type="xdouble" value="1.0"/>
        <entry key="workflow.editor.curvedConnections" type="xboolean" value="false"/>
        <entry key="workflow.editor.connectionWidth" type="xint" value="1"/>
    </config>
</config>
'''
        (folder / "workflow.knime").write_text(xml, encoding="utf-8")

    def count(self):
        """(native nodes, metanodes) including everything nested."""
        nat = meta = 0
        for n in self.nodes.values():
            if n["kind"] == "meta":
                a, b = n["wf"].count(); nat += a; meta += b + 1
            else:
                nat += 1
        return nat, meta


def s_is_meta(wf, nid):
    return nid in wf.nodes and wf.nodes[nid]["kind"] == "meta"


def safe(name):
    return re.sub(r"[^A-Za-z0-9 _-]", "", name)[:40].strip()


def write_metadata(folder, description):
    folder = Path(folder)
    (folder / "workflowset.meta").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<KNIMEMetaInfo nrOfElements="2" xmlns="http://www.knime.org/2.9/metainfo">\n'
        '    <element form="date" name="Creation Date" read-only="false">27/11/2026/12:00:00 +11:00</element>\n'
        f'    <element form="multiline" name="Comments" read-only="false">{description}</element>\n</KNIMEMetaInfo>\n',
        encoding="utf-8")


def export_knwf(folder, knwf):
    """Zip a workflow folder as .knwf (KNIME's export format): the folder itself is the top entry."""
    folder, knwf = Path(folder), Path(knwf)
    if knwf.exists():
        knwf.unlink()
    skip = {".knimeLock"}
    with zipfile.ZipFile(knwf, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(folder.rglob("*")):
            rel = p.relative_to(folder.parent)
            if p.name in skip or "internal" in rel.parts or p.name in ("data.xml", "port_1", "port_2", "port_3"):
                continue
            if p.is_file() and any(part.startswith("port_") for part in rel.parts):
                continue
            z.write(p, rel)
