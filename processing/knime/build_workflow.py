"""Build the KNIME workflow knime/BeyondTheRoadToll/ (run from anywhere):

    python processing/knime/build_workflow.py [--out DIR] [--only ch2,ch3] [--knwf]

Layout of the top-level canvas (grid cells, see knimelib.GRID_X/Y):
  row 0  clean-up chain, columns 0-4          (blue note "1 Clean-up")
  row 2  supplementary metanode, column 4     (yellow note "2 Supplementary data")
  col 7  one metanode per chapter section, row = its position in SECTIONS   (green note "3 Chapter sections")
Add a chapter by writing processing/knime/sections/<name>.py and listing <name> in SECTIONS below.
"""
import importlib, shutil, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
from knimelib import *

OUT = ROOT / "knime" / "BeyondTheRoadToll"
SECTIONS = ["ch1", "ch2", "ch3", "ch4", "ch5"]    # modules in processing/knime/sections/; a missing module is skipped
INPUTS = {NATIONAL_XLSX: ROOT / "Datas" / NATIONAL_XLSX, STATE_XLSX: ROOT / "Datas" / STATE_XLSX,
          FIRST_NATIONS_XLSX: ROOT / "Datas" / FIRST_NATIONS_XLSX,
          ERP_CSV: ROOT / "data/supplementary/raw" / ERP_CSV, ARDD_CSV: ROOT / "data/supplementary/raw" / ARDD_CSV,
          FN_POP_CSV: ROOT / "data/supplementary/raw" / FN_POP_CSV}


def cleanup(W):
    """Plan 3.0: five nodes. Returns the id of the last node (the clean base table)."""
    n1 = W.node("Excel Reader", "National raw", (0, 0), text=excel_reader(NATIONAL_XLSX, sheet="raw"))
    n2 = W.node("Row Filter", "Traffic only", (1, 0), [n1], m_rowfilter([("Cause of injury", "EQ", "str", "Traffic")]))
    n3 = W.node("Missing Value", "Blank counts → 0", (2, 0), [n2], m_missing_zero(["Count of cases", "Died_cases", "Died_bed_days"]))
    n4 = W.node("Column Renamer", "Short names", (3, 0), [n3], m_renamer([
        ("Calendar year", "year"), ("Month", "month"), ("ABS remoteness area", "remoteness"), ("Age group", "age_group"),
        ("Sex", "sex"), ("Road user", "road_user"), ("Counterparty", "counterparty"), ("Count of cases", "cases"),
        ("Bed days", "bed_days"), ("Died_cases", "died"), ("Died_bed_days", "died_bed_days"), ("Hospitalisations", "hosp")]))
    n5 = W.node("Math Formula", "Survivor bed days", (4, 0), [n4], m_math("bed_days_surv", "$bed_days$ - $died_bed_days$"))
    W.note("1  Clean-up (done once)", "Traffic rows only; blanks → 0; short column names; bed days of survivors", (0, 0, 4, 0), "blue")
    return n5


def supplementary():
    """Plan 3.1: metanode with 0 inputs and 2 outputs: port 0 population (year, age_group, population), port 1 deaths (year, road_deaths)."""
    m = Workflow("Population and road deaths", n_out=2)
    # ABS population
    erp = m.node("CSV Reader", "ABS population", (0, 0), text=csv_reader(ERP_CSV))
    band = m.node("Rule Engine", "Age → band", (1, 0), [erp], m_rule([
        '$AGE$ MATCHES "[0-7]" => "0-7"', '$AGE$ MATCHES "(8|9|1[0-6])" => "8-16"', '$AGE$ MATCHES "(1[7-9]|2[0-5])" => "17-25"',
        '$AGE$ MATCHES "(2[6-9]|3[0-9])" => "26-39"', '$AGE$ MATCHES "(4[0-9]|5[0-9]|6[0-4])" => "40-64"',
        '$AGE$ MATCHES "(6[5-9]|7[0-4])" => "65-74"', '$AGE$ MATCHES "(7[5-9]|[89][0-9]|100)" => "75+"',
        '$AGE$ = "TOT" => "All ages"', 'TRUE => "drop"'], "age_group"))
    q2 = m.node("Row Filter", "30 June, banded", (2, 0), [band], m_rowfilter([("TIME_PERIOD", "WILDCARD", "str", "*-Q2"), ("age_group", "NEQ", "str", "drop")]))
    yr = m.node("String Manipulation", "Year", (3, 0), [q2], m_strman("year", "toInt(substr($TIME_PERIOD$, 0, 4))", return_type="java.lang.Integer"))
    gp = m.node("GroupBy", "Sum by year, band", (4, 0), [yr], m_groupby(["year", "age_group"], [("OBS_VALUE", LONG, "Sum")]))
    pop = m.node("Column Renamer", "→ population", (5, 0), [gp], m_renamer([("OBS_VALUE", "population")]))
    # ARDD road deaths
    ardd = m.node("CSV Reader", "ARDD deaths", (0, 1), text=csv_reader(ARDD_CSV))
    yrs = m.node("Row Filter", "2011-2021", (2, 1), [ardd], m_rowfilter([("Year", "GTE", "int", 2011), ("Year", "LTE", "int", 2021)]))
    cnt = m.node("GroupBy", "Count by year", (4, 1), [yrs], m_groupby(["Year"], [("Crash ID", INT, "Count")]))
    dth = m.node("Column Renamer", "→ road_deaths", (5, 1), [cnt], m_renamer([("Year", "year"), ("Crash ID", "road_deaths")]))
    m.output(pop, 0)
    m.output(dth, 1)
    m.note("ABS population", "Estimated resident population at 30 June, by age band (and all ages)", (0, 0, 5, 0), "yellow")
    m.note("ARDD road deaths", "One row per person killed; counted per year", (0, 1, 5, 1), "orange")
    return m


def build(out=OUT, only=None, knwf=False):
    out = Path(out).resolve()
    if out.exists():
        shutil.rmtree(out)
    W = Workflow()
    base = cleanup(W)
    supp = W.metanode(supplementary(), (4, 2))
    W.note("2  Supplementary data", "ABS population and ARDD road deaths, per year", (4, 2, 4, 2), "yellow")
    shared = {0: base, 1: (supp, 0), 2: (supp, 1)}
    chapters = []
    for i, name in enumerate(SECTIONS):
        if only is not None and name not in only:
            continue
        try:
            mod = importlib.import_module(f"sections.{name}")
        except ModuleNotFoundError as e:
            if e.name != f"sections.{name}":
                raise
            print(f"skipping {name}: not written yet")
            continue
        chapters.append(i)
        W.metanode(mod.build(), (7, len(chapters) - 1), [shared[k] for k in mod.IN])
    if chapters:
        W.note("3  Chapter sections", "One metanode per chapter; each writes its CSV(s) to data/", (7, 0, 7, len(chapters) - 1), "green")
    W.save(out)
    write_metadata(out, "Beyond the Road Toll: BITRE hospitalised road-crash injuries 2011-2021. Clean-up, supplementary data, one metanode per chapter.")
    (out / "data").mkdir(exist_ok=True)
    for name, src in INPUTS.items():
        shutil.copy(src, out / "data" / name)
    print(f"built {out}  (native nodes, metanodes) = {W.count()}")
    if knwf:
        export_knwf(out, out.parent / f"{out.name}.knwf")
    return W


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(OUT), help="workflow folder to build (default knime/BeyondTheRoadToll)")
    ap.add_argument("--only", help="comma list of sections to build, e.g. ch2,ch3 (default: all that exist)")
    ap.add_argument("--knwf", action="store_true")
    a = ap.parse_args()
    build(a.out, a.only.split(",") if a.only else None, a.knwf)
