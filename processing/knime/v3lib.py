"""Helper library for build_v3.py: KNIME settings.xml templates, model builders, flow graph."""
import re
import shutil
from pathlib import Path
from xml.sax.saxutils import quoteattr

ROOT = Path(__file__).resolve().parents[2]
V2 = ROOT / "BeyondTheRoadToll_DataPrep_v2"
EX = ROOT / "Example Workflows"

# ------------------------------------------------------------------ XML rendering
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


def col_filter(incl, excl=(), enforce="EnforceInclusion"):
    return {"filter-type": S("STANDARD"), "included_names": arr("xstring", list(incl)),
            "excluded_names": arr("xstring", list(excl)), "enforce_option": S(enforce),
            "name_pattern": {"pattern": S(""), "type": S("Wildcard"), "caseSensitive": B(True),
                             "excludeMatching": B(False)},
            "datatype": {"typelist": {}}}

# ------------------------------------------------------------------ node models
def rowfilter_model(preds, match="AND"):
    """preds: (column, operator, kind, value); kind str|int."""
    p = {}
    for i, (col, op, kind, val) in enumerate(preds):
        if kind == "str":
            compat = ["org.knime.core.data.StringValue"]
            vcfg = {"typeIdentifier": {"cell_class": S("org.knime.core.data.def.StringCell"), "is_null": B(False)},
                    "stringCaseMatching": {"caseMatching": S("CASESENSITIVE")}, "value": S(val)}
        else:
            compat = ["org.knime.core.data.IntValue"]
            vcfg = {"typeIdentifier": {"cell_class": S("org.knime.core.data.def.IntCell"), "is_null": B(False)},
                    "value": I(val)}
        p[str(i)] = {"column": {"selected": S(col), "compatibleTypes_Internals": arr("xstring", compat)},
                     "operator": S(op),
                     "predicateValues": {"values": {"0": vcfg}, "inputKind": S("SINGLE")}}
    return {"outputMode": S("MATCHING"), "matchCriteria": S(match), "predicates": p, "domains": S("RETAIN")}


def groupby_core(groups, aggs, policy="Keep original name(s)"):
    ct = {"array-size": I(len(aggs))}
    for i, (_, cell, _) in enumerate(aggs):
        ct[str(i)] = {"cell_class": S(f"org.knime.core.data.def.{cell}"), "is_null": B(False)}
    return {
        "grouByColumns_Internals": internals("SMID_filterString"), "grouByColumns": filter_string(groups),
        "maxNoneNumericalVals_Internals": internals("SMID_integer"), "maxNoneNumericalVals": I(10000),
        "enableHilite_Internals": internals("SMID_boolean"), "enableHilite": B(False),
        "valueDelimiter_Internals": internals("SMID_string"), "valueDelimiter": S(", "),
        "sortInMemory_Internals": internals("SMID_boolean"), "sortInMemory": B(False),
        "columnNamePolicy_Internals": internals("SMID_string"), "columnNamePolicy": S(policy),
        "aggregationColumn": {"columnNames": arr("xstring", [a[0] for a in aggs]), "columnTypes": ct,
                              "aggregationMethod": arr("xstring", [a[2] for a in aggs]),
                              "inclMissingVals": arr("xboolean", [False] * len(aggs))},
        "aggregationOperatorSettings": {}, "patternAggregators": {}, "dataTypeAggregators": {},
        "retainOrder_Internals": internals("SMID_boolean"), "retainOrder": B(False),
        "inMemory_Internals": internals("SMID_boolean"), "inMemory": B(False),
        "nodeVersion_Internals": internals("SMID_integer"), "nodeVersion": I(1),
        "typeMatch": ("xbyte", 0)}


def pivot_model(groups, pivots, aggs):
    m = groupby_core(groups, aggs, policy="Keep original name(s)")
    m.update({"pivotColumns_Internals": internals("SMID_filterString"), "pivotColumns": filter_string(pivots),
              "missing_values_Internals": internals("SMID_boolean"), "missing_values": B(True),
              "total_aggregation_Internals": internals("SMID_boolean"), "total_aggregation": B(False),
              "ignore_domain_Internals": internals("SMID_boolean"), "ignore_domain": B(True),
              "sort_lexicographical_Internals": internals("SMID_boolean"), "sort_lexicographical": B(True),
              "column_name_option_Internals": internals("SMID_string"), "column_name_option": S("Pivot name")})
    return m


def math_model(new_col, expr, replace=False, to_int=False):
    # KNIME stores "is replace" under the key append_column (inverted name): True = replace an existing column
    return {"append_column": B(replace), "replaced_column": S(new_col), "expression": S(expr),
            "convert_to_int": B(to_int)}


def concat_model():
    return {"fail_on_duplicates": B(False), "append_suffix": B(True), "suffix": S("_dup"),
            "intersection_of_columns": B(False), "create_new_rowids": B(False), "enable_hiliting": B(False)}


def renamer_model(pairs):
    return {"renamings": {str(i): {"oldName": S(o), "newName": S(n)} for i, (o, n) in enumerate(pairs)}}


def colfilter_model(incl):
    return {"column-filter": col_filter(incl)}


def resorter_model(order):
    return {"ColumnOrder": arr("xstring", list(order))}


def sorter_model(keys, asc=True):
    keys = list(keys)
    return {"incllist": arr("xstring", keys), "sortOrder": arr("xboolean", [asc] * len(keys)),
            "alphaNumStringComp": arr("xboolean", [False] * len(keys)),
            "sortinmemory": B(False), "missingToEnd": B(False)}


def rule_model(rules, col, append=False):
    return {"rules": arr("xstring", rules), "new-column-name": S(col), "replace-column-name": S(col),
            "append-column": B(append), "disallowLongOutputForCompatibility": B(True)}


def strman_model(col, expr, append=False):
    return {"expression": S(expr), "replaced_column": S(col), "append_column": B(not append),
            "test_compilation_on_dialog_close": B(True), "insert_missing_as_null": B(False),
            "return_type": S("java.lang.String")}


def str2num_model(cols, cell="IntCell"):
    return {"include_Internals": internals("SMID_columnfilter"),
            "include": col_filter(cols),
            "decimal_separator": S("."), "thousands_separator": S(""),
            "parse_type": {"cell_class": S(f"org.knime.core.data.def.{cell}"), "is_null": B(False)},
            "generic_parse": B(False), "fail_on_error": B(False)}


def num2str_model(cols):
    return {"include_Internals": internals("SMID_columnfilter"), "include": col_filter(cols)}


def const_model(name, value, typ="STRING"):
    return {"replaced-column": ("xstring", None), "column-value": S(value), "new-column-name": S(name),
            "column-type": S(typ), "date-format": S("dd.MM.yyyy")}


def missing_fixed_int_model(cols, val=0):
    dn = {"factoryID": S("org.knime.base.node.preproc.pmml.missingval.handlers.DoNothingMissingCellHandlerFactory"),
          "settings": {}}
    return {"columnSettings": {"0": {"colNames": arr("xstring", list(cols)),
            "settings": {"factoryID": S("org.knime.base.node.preproc.pmml.missingval.handlers."
                                        "FixedIntegerValueMissingCellHandlerFactory"),
                         "settings": {"fixIntegerValue": I(val)}}}},
            "dataTypeSettings": {f"org.knime.core.data.def.{c}": dn
                                 for c in ("IntCell", "StringCell", "DoubleCell", "LongCell")}}


def missing_fixed_double_model(cols, val=0.0):
    dn = {"factoryID": S("org.knime.base.node.preproc.pmml.missingval.handlers.DoNothingMissingCellHandlerFactory"),
          "settings": {}}
    return {"columnSettings": {"0": {"colNames": arr("xstring", list(cols)),
            "settings": {"factoryID": S("org.knime.base.node.preproc.pmml.missingval.handlers."
                                        "FixedDoubleValueMissingCellHandlerFactory"),
                         "settings": {"fixDoubleValue": ("xdouble", val)}}}},
            "dataTypeSettings": {f"org.knime.core.data.def.{c}": dn
                                 for c in ("IntCell", "StringCell", "DoubleCell", "LongCell")}}


def missing_fixed_string_model(col, text):
    dn = {"factoryID": S("org.knime.base.node.preproc.pmml.missingval.handlers.DoNothingMissingCellHandlerFactory"),
          "settings": {}}
    return {"columnSettings": {"0": {"colNames": arr("xstring", [col]),
            "settings": {"factoryID": S("org.knime.base.node.preproc.pmml.missingval.handlers."
                                        "FixedStringValueMissingCellHandlerFactory"),
                         "settings": {"fixStringValue": S(text)}}}},
            "dataTypeSettings": {f"org.knime.core.data.def.{c}": dn
                                 for c in ("IntCell", "StringCell", "DoubleCell", "LongCell")}}


def joiner_model(lkeys, rkeys, lcols, rcols, mode="inner", suffix=" (right)"):
    left_un = mode in ("left", "outer")
    right_un = mode in ("right", "outer")

    def selcfg(cols):
        return col_filter(cols)

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
    m.update(s("duplicateHandling", "APPEND_SUFFIX")); m.update(s("suffix", suffix))
    m.update(s("outputRowOrder", "ARBITRARY"))
    m["maxOpenFiles_Internals"] = internals("SMID_integer"); m["maxOpenFiles"] = I(200)
    m.update(b("enableHiliting", False))
    m["leftColumnSelectionConfig"] = selcfg(lcols)
    m["rightColumnSelectionConfig"] = selcfg(rcols)
    return m


def crossjoin_model():
    def b(k, v):
        return {f"{k}_Internals": internals("SMID_boolean"), k: B(v)}
    m = {"rigthSuffix_Internals": internals("SMID_string"), "rigthSuffix": S(" (#1)"),
         "CFG_CACHE_Internals": internals("SMID_integer"), "CFG_CACHE": I(1),
         "CFG_SEPARATOR_Internals": internals("SMID_string"), "CFG_SEPARATOR": S("_")}
    m.update(b("CFG_SHOW_FIRST", False)); m.update(b("CFG_SHOW_SECOND", False))
    m["CFG_FIRST_COLUMNNAME_Internals"] = {"SettingsModelID": S("SMID_string"), "EnabledStatus": B(False)}
    m["CFG_FIRST_COLUMNNAME"] = S("FirstRowIDs")
    m["CFG_SECOND_COLUMNNAME_Internals"] = {"SettingsModelID": S("SMID_string"), "EnabledStatus": B(False)}
    m["CFG_SECOND_COLUMNNAME"] = S("SecondRowIDs")
    return m

# ------------------------------------------------------------------ templates (settings.xml text)
MODEL_RE = re.compile(r'    <config key="model">.*?\n    </config>\n(?=    <config key="nodeAnnotation">)', re.S)
PORTS_RE = re.compile(r'    <config key="ports"(/>|>.*?\n    </config>)\n', re.S)


def _read(p):
    return Path(p).read_text(encoding="utf-8")


def _find(pattern_dir, name):
    hits = sorted(EX.rglob(f"{name}"))
    return hits[0] / "settings.xml"


TEMPLATE_SRC = {
    "Excel Reader": V2 / "Excel Reader (#1)/settings.xml",
    "Row Filter": V2 / "Row Filter (#2)/settings.xml",
    "Missing Value": V2 / "Missing Value (#3)/settings.xml",
    "GroupBy": V2 / "GroupBy (#4)/settings.xml",
    "Math Formula": V2 / "Math Formula (#5)/settings.xml",
    "CSV Writer": V2 / "CSV Writer (#6)/settings.xml",
    "Pivot": V2 / "Pivot (#21)/settings.xml",
    "Concatenate": V2 / "Concatenate (#22)/settings.xml",
    "Column Filter": EX / "Basic Examples/Non-standard format Spreadsheets/Column Filter (#13)/settings.xml",
    "Column Renamer": EX / "Basic Examples/Non-standard format Spreadsheets/Column Renamer (#16)/settings.xml",
    "Sorter": EX / "Basic Examples/CountIf and SumIf/Sorter (#29)/settings.xml",
    "Rule Engine": EX / "Retail/Using Association Rules for Market Basket Analysis/Refine (#133)/Rule Engine (#126)/settings.xml",
    "String Manipulation": EX / "Basic Examples/Data Blending/String Manipulation (#240)/settings.xml",
    "String to Number": EX / "Basic Examples/Combine Clean and Summarize Spreadsheet Data/String To Number (#23)/settings.xml",
    "Constant Value Column": EX / "Customer Intelligence/Credit Scoring/Building a Credit Scoring Model/Train and Cr (#42)/Creation of (#36)/Constant Value Column (#292)/settings.xml",
    "Joiner": EX / "Basic Examples/Data Blending/Joiner (#273)/settings.xml",
    "Cross Joiner": EX / "Customer Intelligence/Credit Scoring/Building a Credit Scoring Model/Train and Cr (#42)/Cross Joiner (#38)/settings.xml",
    "Number to String": EX / "Social Media/Topic Detection Based on Movie Reviews/Number To String (#291)/settings.xml",
    "CSV Reader": EX / "Basic Examples/Visual Analysis of Sales Data/CSV Reader (#7)/settings.xml",
}
N_OUT = {"Excel Reader": 1, "Row Filter": 1, "Missing Value": 2, "GroupBy": 1, "Math Formula": 1, "CSV Writer": 0,
         "Pivot": 3, "Concatenate": 1, "Column Filter": 1, "Column Renamer": 1, "Sorter": 1, "Rule Engine": 1,
         "String Manipulation": 1, "String to Number": 1, "Constant Value Column": 1, "Joiner": 1,
         "Cross Joiner": 1, "CSV Reader": 1, "Column Resorter": 1, "Number to String": 1}
DERIVED = {  # type -> (base template, factory, node name)
    "Column Resorter": ("Column Filter", "org.knime.base.node.preproc.columnresorter.ColumnResorterNodeFactory",
                        "Column Resorter"),
}


def set_entry(txt, key, typ, value):
    pat = re.compile(r'(\n\s+<entry key="%s" type="%s") (isnull="true" )?value="[^"]*"/>' % (re.escape(key), typ))
    assert pat.search(txt), key
    return pat.sub(lambda m: f'{m.group(1)} value={esc(value)}/>', txt, count=1)


def ports_block(n_out):
    if n_out == 0:
        return '    <config key="ports"/>\n'
    lines = ['    <config key="ports">']
    for i in range(1, n_out + 1):
        lines += [f'        <config key="port_{i}">', f'            <entry key="index" type="xint" value="{i}"/>',
                  '            <entry key="port_dir_location" type="xstring" isnull="true" value=""/>',
                  '        </config>']
    lines.append('    </config>')
    return "\n".join(lines) + "\n"


def strip_state(txt, n_out):
    for st in ("EXECUTED", "CONFIGURED"):
        txt = txt.replace(f'<entry key="state" type="xstring" value="{st}"/>',
                          '<entry key="state" type="xstring" value="IDLE"/>')
    txt = txt.replace('<entry key="hasContent" type="xboolean" value="true"/>',
                      '<entry key="hasContent" type="xboolean" value="false"/>')
    assert PORTS_RE.search(txt)
    txt = PORTS_RE.sub(lambda m: ports_block(n_out), txt, count=1)
    txt = re.sub(r'<entry key="file_store_id" type="xstring" value="[^"]*"/>',
                 '<entry key="file_store_id" type="xstring" isnull="true" value=""/>', txt)
    return txt


def set_label(txt, label):
    pat = re.compile(r'(<config key="nodeAnnotation">\s*<entry key="text" type="xstring" value=)"[^"]*"')
    assert pat.search(txt)
    return pat.sub(lambda m: m.group(1) + esc(label), txt, count=1)


def set_model(txt, model):
    assert MODEL_RE.search(txt)
    body = render("model", model, 1) + "\n"
    return MODEL_RE.sub(lambda m: body, txt, count=1)


def make_relative_writer(txt, filename):
    pat = re.compile(r'(<config key="path">\s*<entry key="location_present" type="xboolean" value="true"/>\s*)'
                     r'<entry key="file_system_type" type="xstring" value="[A-Z]+"/>\s*'
                     r'(?:<entry key="file_system_specifier" type="xstring" value="[^"]*"/>\s*)?'
                     r'<entry key="path" type="xstring" value="[^"]*"/>')
    assert pat.search(txt)
    rep = (r'\1<entry key="file_system_type" type="xstring" value="RELATIVE"/>\n'
           '                    <entry key="file_system_specifier" type="xstring" value="knime.workflow.data"/>\n'
           f'                    <entry key="path" type="xstring" value="{filename}"/>')
    return pat.sub(rep, txt, count=1)


_cache = {}


def template(typ):
    if typ in _cache:
        return _cache[typ]
    if typ in DERIVED:
        base, fac, name = DERIVED[typ]
        t = template(base)
        t = set_entry(t, "factory", "xstring", fac)
        t = set_entry(t, "node-name", "xstring", name)
        t = set_entry(t, "name", "xstring", name)
    else:
        t = _read(TEMPLATE_SRC[typ])
    _cache[typ] = t
    return t


def excel_reader_text(filename, sheet, c0, c1, r0, header_row, skip_empty_rows=False):
    t = template("Excel Reader")
    for k, typ, v in [("sheet_name", "xstring", sheet), ("column_names_row_number", "xlong", str(header_row)),
                      ("read_from_column", "xstring", c0), ("read_to_column", "xstring", c1),
                      ("read_from_row", "xstring", str(r0))]:
        t = set_entry(t, k, typ, v)
    t = t.replace('<entry key="sheet_area" type="xstring" value="ENTIRE"/>',
                  '<entry key="sheet_area" type="xstring" value="%s"/>' % ("ENTIRE" if c0 == "A" and not c1 and r0 == 1 else "PARTIAL"))
    t = t.replace('<entry key="skip_empty_rows" type="xboolean" value="false"/>',
                  '<entry key="skip_empty_rows" type="xboolean" value="%s"/>' % ("true" if skip_empty_rows else "false"))
    pat = re.compile(r'(<config key="path">\s*<entry key="location_present" type="xboolean" value="true"/>\s*'
                     r'<entry key="file_system_type" type="xstring" value="RELATIVE"/>\s*'
                     r'<entry key="file_system_specifier" type="xstring" value="knime.workflow.data"/>\s*'
                     r'<entry key="path" type="xstring" value=)"[^"]*"')
    assert pat.search(t)
    return pat.sub(lambda m: m.group(1) + esc(filename), t, count=1)


def csv_reader_text(filename):
    t = template("CSV Reader")
    t = re.sub(r'        <config key="table_spec_config_Internals">.*?\n        </config>\n(?=        <config key="advanced_settings">)', '', t, flags=re.S)
    t = t.replace('<entry key="save_table_spec_config_Internals" type="xboolean" value="true"/>',
                  '<entry key="save_table_spec_config_Internals" type="xboolean" value="false"/>')
    t = t.replace('<entry key="check_table_spec" type="xboolean" value="true"/>',
                  '<entry key="check_table_spec" type="xboolean" value="false"/>')
    t = t.replace('<entry key="limit_data_rows_scanned" type="xboolean" value="true"/>',
                  '<entry key="limit_data_rows_scanned" type="xboolean" value="false"/>')
    t = re.sub(r'(<config key="path">.*?<entry key="path" type="xstring" value=)"[^"]*"',
               lambda m: m.group(1) + esc(filename), t, count=1, flags=re.S)
    return t


# ------------------------------------------------------------------ flow graph
class Flow:
    def __init__(self):
        self.nodes = {}   # id -> dict
        self.conns = []   # (src, sp, dst, dp)
        self.next_id = 1
        self.next_row = 0
        self.children = {}

    def add(self, typ, label, inputs=(), model=None, text=None, group="", out=None, row=None):
        nid = self.next_id
        self.next_id += 1
        ins = [(i, 1) if isinstance(i, int) else i for i in inputs]
        if ins:
            col = max(self.nodes[s]["col"] for s, _ in ins) + 1
            p = ins[0][0]
            if row is None:
                if self.children.get(p):
                    row = self.next_row; self.next_row += 1
                else:
                    row = self.nodes[p]["row"]
        else:
            col = 0
            if row is None:
                row = self.next_row; self.next_row += 1
        self.next_row = max(self.next_row, row + 1)
        for s, _ in ins:
            self.children.setdefault(s, []).append(nid)
        if text is None:
            text = template(typ)
            if model is not None:
                text = set_model(text, model)
            if out:
                text = make_relative_writer(text, out)
        text = strip_state(text, N_OUT[typ])
        text = set_label(text, label)
        self.nodes[nid] = dict(typ=typ, label=label, text=text, col=col, row=row, group=group, out=out)
        for k, (s, sp) in enumerate(ins, start=1):
            self.conns.append((s, sp, nid, k))
        return nid

    def writer(self, src, name, label=None, group=""):
        return self.add("CSV Writer", label or f"Write {name}", [src], out=f"{name}.csv", group=group)
