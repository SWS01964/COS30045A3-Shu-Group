# KNIME Manual: BeyondTheRoadToll_DataPrep (v1 and v2)

Who this is for: a student or another AI model (for example DeepSeek) who has to open, run, change or re-package the project's KNIME workflow without any other context. Every path below is relative to the project root `COS30045A3-Shu-Group/`, which is also the KNIME workspace (it contains `.metadata/` and `Example Workflows/`).

Status (2026-11-23): **v2 is the current workflow.** It ran headless with "Workflow executed sucessfully" and matched the Python outputs on 59 of 59 checks (`processing/knime/v2_validation.csv`).

---

## 1. Files at a glance

| What | Path | Notes |
|---|---|---|
| v2 workflow folder (current) | `BeyondTheRoadToll_DataPrep_v2/` | Portable, saved **unexecuted**. The xlsx is bundled in `data/`. |
| v2 package | `processing/knime/BeyondTheRoadToll_DataPrep_v2.knwf` | Zip of the folder above, xlsx included (about 5.5 MB). |
| v1 workflow folder (old, do not edit) | `BeyondTheRoadToll_DataPrep/` | 9 nodes with absolute local paths. The user has it open in the GUI and saved it executed. |
| v1 package | `processing/knime/BeyondTheRoadToll_DataPrep.knwf` | v1 with absolute paths (works only on the original Mac). |
| Validation script | `processing/knime/validate_v2.py` | Compares KNIME outputs with `data/clean/`. |
| Validation result | `processing/knime/v2_validation.csv` | One PASS/FAIL row per figure. |
| Diagram script | `processing/knime/render_workflow.py` | Redraws the canvas from the workflow files. |
| Diagram | `report/figures/knime/knime_v2_workflow.png` / `.svg` | For slides and the report. |
| Long rebuild guide | `processing/KNIME_WORKFLOW_GUIDE.md` | Full manual rebuild (rules R1 to R7) in the GUI. |

---

## 2. A .knwf file versus a workflow folder

- **Workflow folder.** This is what KNIME actually runs. It is a directory holding `workflow.knime` (the node list, positions, connections and annotations), one sub-folder per node named `Node Name (#id)` holding that node's `settings.xml`, and optionally `data/` (the "workflow data area") plus files that store execution results (`port_*/`, `internal/`, `.savedWithData`). A folder inside the workspace shows up in the KNIME Explorer under LOCAL.
- **.knwf file.** This is a plain **zip archive of one workflow folder**, used for sharing. The zip must contain the folder itself as its single top-level entry (`BeyondTheRoadToll_DataPrep_v2/workflow.knime`, and so on), not the files loose. KNIME unpacks it when you import it. Renaming `.knwf` to `.zip` lets you look inside.
- **Portable** means that no node points at an absolute path on one computer. In v2 every reader and writer uses a path relative to the workflow data area (see section 7.4), and the input xlsx travels inside `data/`, so the workflow runs on any machine as soon as it is imported.

---

## 3. Why this project uses KNIME

1. **The brief lists KNIME** under Software (`requirement.md`) and asks the team to "document your data processing". A visual workflow is easy to show in the report and in stand-ups.
2. **Independent check of the Python pipeline.** The real cleaning and analysis run in Python (`processing/clean_data.py` and `processing/phase2_ideas.py`, writing to `data/clean/`). The KNIME workflow starts again from the **raw** BITRE workbook and recomputes the headline numbers with different software. When both give the same figure, the figure is not a pandas bug. KNIME does not feed the website; it only checks.

---

## 4. Where the data lives

| Layer | Location | Who writes it |
|---|---|---|
| Original downloads (never edit) | `Datas/hospitalisation_injury_publication_sep2023.xlsx` (national, sheet `raw`, 117,919 rows x 13 columns) plus the state, First Nations and data-dictionary files | BITRE |
| Copy bundled with the workflow | `BeyondTheRoadToll_DataPrep_v2/data/hospitalisation_injury_publication_sep2023.xlsx` | Byte-identical copy of the national file. The Excel Reader reads this copy. |
| KNIME outputs | `<workflow folder>/data/knime_*.csv`, the workflow data area. In the GUI that is `BeyondTheRoadToll_DataPrep_v2/data/`; for an imported copy it is the imported folder's `data/`. | The CSV Writer nodes |
| Python outputs (the reference) | `data/clean/*.csv` (for example `idea3_severity_roaduser.csv`, `idea3_burden_share.csv`, `idea4_roaduser_change_2020.csv`, `idea4_cyclist_trend.csv`, `idea1_national_annual.csv`, `idea2_roaduser_age_annual.csv`) | Python scripts. **KNIME v2 does not write here.** |

Note: the old v1 wrote `data/clean/knime_idea1_check.csv` and `data/clean/knime_idea2_cyclist_65_74_check.csv` through absolute paths. Those two files are v1 leftovers. v2 writes its own copies into its data area.

The saved v2 folder must contain **only the xlsx** in `data/`. After a GUI run the output CSVs appear there too. Delete them before you package or commit (see section 8).

---

## 5. Node map: v1 versus v2

v2 = all 9 v1 nodes (same settings, but with relative paths) + 19 new nodes in two branches (F and G). Every branch starts at the output of **Missing Value #3**. The picture is `report/figures/knime/knime_v2_workflow.png`.

```
#1 Excel Reader -> #2 Row Filter -> #3 Missing Value -+-> D  #4 GroupBy -> #5 Math Formula -> #6 CSV Writer          (v1)
                                                      +-> E  #7 GroupBy -> #8 Row Filter -> #9 CSV Writer             (v1)
                                                      +-> F1 #10 Row Filter -> #11 GroupBy -> #12 Math Formula -> #13 CSV Writer
                                                      +-> F2 #14 Row Filter -> #15 GroupBy -> #16 Math F. -> #17 Math F. -> #18 CSV Writer
                                                      +-> G1 #19 Row Filter -> #20 GroupBy -> #21 Pivot =(port 1 + port 3)=> #22 Concatenate
                                                      |        -> #23 Missing Value -> #24 Math Formula -> #25 CSV Writer
                                                      +-> G2 #26 Row Filter -> #27 GroupBy -> #28 CSV Writer
```

Colour annotations (as on the canvas): A Load + filter (blue), B Clean (orange), D Idea 1 (green), E Idea 2 (purple), **F Idea 3: severity (peach, new)**, **G Idea 4: lockdown test (light blue, new)**.

### 5.1 Every node, its settings and its checkpoint

Column names are exactly as they appear in the raw sheet. "Sum(X)" is the GroupBy naming policy "Aggregation method (column name)".

| # | Node (label) | Key settings | Checkpoint (verified headless) |
|---|---|---|---|
| 1 | Excel Reader (A1 Read BITRE raw tab (R1)) | File: workflow data area, `hospitalisation_injury_publication_sep2023.xlsx`; sheet by name `raw`; first row = column names | 117,919 rows x 13 cols; every numeric column is Integer |
| 2 | Row Filter (A2 Traffic only (R2)) | `Cause of injury` EQ `Traffic` (case-sensitive) | 86,140 rows |
| 3 | Missing Value (B1 Missing → 0 (R5)) | Column settings: `Count of cases`, `Died_cases`, `Died_bed_days` -> fixed integer 0. Every other type: do nothing. (`Bed days` and `Hospitalisations` have no missing cells.) | 86,140 rows, no missing values in those 3 columns |
| 4 | GroupBy (D1 Hospitalisations per year (R3)) | Group: `Calendar year`; Sum(`Hospitalisations`) | 11 rows |
| 5 | Math Formula (D2 Index 2011 = 100) | `index_2011 = 100 * $Sum(Hospitalisations)$ / 34033` | 2011 = 100 |
| 6 | CSV Writer (D3 Write Idea 1 check) | `knime_idea1_check.csv` (data area) | 2011 = **34,033**; 2021 = **39,505** |
| 7 | GroupBy (E1 By road user × age × year) | Group: `Road user`, `Age group`, `Calendar year`; Sum(`Hospitalisations`) | 875 rows |
| 8 | Row Filter (E2 Pedal cyclist 65–74) | `Road user` EQ `Pedal cyclist` AND `Age group` EQ `65-74` | 11 rows |
| 9 | CSV Writer (E3 Write Idea 2 check) | `knime_idea2_cyclist_65_74_check.csv` | 2011 = **240**; 2021 = **749** |
| 10 | Row Filter (F1a Years 2011–2019) | `Calendar year` GTE 2011 AND `Calendar year` LTE 2019 | Only 2011–2019. Deaths in care for 2020–21 are incomplete (88 and 0), so they are excluded. |
| 11 | GroupBy (F1b Cases + deaths by road user) | Group: `Road user`; Sum(`Count of cases`), Sum(`Died_cases`) | 12 road users; column totals 335,454 cases, 2,041 deaths |
| 12 | Math Formula (F1c Died per 1,000 cases) | `died_per_1000 = 1000 * $Sum(Died_cases)$ / $Sum(Count of cases)$` (appended) | see #13 |
| 13 | CSV Writer (F1d Write severity check) | `knime_idea3_severity_check.csv` | Pedestrian **21.8** (538 deaths), car passenger **7.3**, car driver **5.8**, motorcyclist **4.1**, pedal cyclist **1.9**; all road users 6.1 (computed from the column totals) |
| 14 | Row Filter (F2a Years 2016–2021) | `Calendar year` GTE 2016 AND LTE 2021 (the bed-day method changed on 1 July 2015) | |
| 15 | GroupBy (F2b Cases + bed days by road user) | Group: `Road user`; Sum(`Count of cases`), Sum(`Bed days`) | Column totals 236,178 cases, 1,236,107 bed days |
| 16 | Math Formula (F2c Share of cases %) | `share_cases_pct = 100 * $Sum(Count of cases)$ / COL_SUM($Sum(Count of cases)$)` | Column sums to 100 |
| 17 | Math Formula (F2d Share of bed days %) | `share_bed_days_pct = 100 * $Sum(Bed days)$ / COL_SUM($Sum(Bed days)$)` | |
| 18 | CSV Writer (F2e Write burden check) | `knime_idea3_burden_check.csv` | Pedestrian **6.6% / 13.1%**, pedal cyclist **19.0 / 11.1**, motorcyclist **22.2 / 25.0**, car driver **33.6 / 30.4**, car passenger 12.4 / 12.0 |
| 19 | Row Filter (G1a April, 2019–2020) | `Month` EQ `April` AND `Calendar year` GTE 2019 AND LTE 2020 | |
| 20 | GroupBy (G1b Hospitalisations by road user × year) | Group: `Road user`, `Calendar year`; Sum(`Hospitalisations`) | 24 rows |
| 21 | Pivot (G1c Years side by side) | Group: `Road user`; Pivot: `Calendar year`; aggregation Sum(`Sum(Hospitalisations)`); column name option "Pivot name" (columns `2019`, `2020`); aggregation names kept; ignore missing pivot values; ignore domain; sort lexicographically; overall totals off | Port 1: 12 rows. **Port 3 (pivot totals)**: 1 row, 2019 = 3,488 and 2020 = 2,357 |
| 22 | Concatenate (G1d Append total row) | In 1 = Pivot port 1, in 2 = Pivot port 3; union of columns; duplicate row IDs get the suffix `_dup` | 13 rows; the total row has `Road user` missing |
| 23 | Missing Value (G1e Label total row) | Column `Road user` -> fixed string `All road users`; every other type: do nothing | |
| 24 | Math Formula (G1f % change 2019→2020) | `pct_change = 100 * ($2020$ - $2019$) / $2019$` | |
| 25 | CSV Writer (G1g Write April check) | `knime_idea4_april_check.csv` | All road users **3,488 → 2,357 (−32.4%)**; pedal cyclist **+15.9%**, pedestrian **−59.8%**, car passenger **−52.7%**, car driver **−42.9%**, motorcyclist **−37.5%** |
| 26 | Row Filter (G2a Pedal cyclists only) | `Road user` EQ `Pedal cyclist` | |
| 27 | GroupBy (G2b Hospitalisations per year) | Group: `Calendar year`; Sum(`Hospitalisations`) | 11 rows |
| 28 | CSV Writer (G2c Write cyclist annual check) | `knime_idea4_cyclists_annual_check.csv` | 2019 = **7,302**; 2020 = **8,332** (all 11 years equal Python) |

All CSV Writers: comma-separated, header row, no row IDs, UTF-8, overwrite if the file exists, quote strings only.

Measures used (these must match the Python method): severity and shares use **`Count of cases`** (cases including deaths), because that is what `phase2_ideas.py` uses (`cases_incl_died`). Ideas 1, 2 and 4 use **`Hospitalisations`** (cases minus deaths), the column BITRE's own summary tables use. `Bed days` is used as published, so it includes died bed days.

---

## 6. Open, import and run in the KNIME GUI (KNIME 5.5.1)

**Option A: the folder is already in the workspace** (this project).
1. Start KNIME and choose `COS30045A3-Shu-Group` as the workspace (or keep it if it is already selected).
2. In the Space Explorer (left), open **LOCAL** and double-click **BeyondTheRoadToll_DataPrep_v2**. If KNIME was already open when the folder appeared, use File > Refresh, or right-click > Refresh, first.
3. The workflow opens unexecuted (grey or amber traffic lights). Click **Execute all** (the double-arrow button in the toolbar, or Shift+F7).
4. Every light should turn green. Right-click a node and choose its output table (or hover over the output port) to inspect the rows against section 5.1.
5. The output CSVs are in `BeyondTheRoadToll_DataPrep_v2/data/`.

**Option B: import the .knwf** (another computer).
1. In KNIME: File > Import KNIME Workflow… (in the Modern UI: the "…" menu of the Space Explorer > Import workflow). You can also drag the `.knwf` file onto LOCAL in the Space Explorer.
2. Choose `BeyondTheRoadToll_DataPrep_v2.knwf` and a destination such as LOCAL. KNIME creates the folder with the xlsx inside.
3. Open it and Execute all, as above. No paths need changing.

Do **not** open v1 and v2 and then edit their files on disk while they are open in the GUI. KNIME keeps its own in-memory copy and overwrites the files when you save.

---

## 7. Editing at file level (no GUI)

Use this when you cannot use the GUI, for example as an AI model. The GUI is still the safer way to change settings when it is available.

### 7.1 Folder and node naming
- Each node lives in `<workflow>/<Node Name> (#<id>)/settings.xml`, for example `Row Filter (#10)/settings.xml`. The id must be unique in the workflow and must match the entry in `workflow.knime`.
- `<Node Name>` is conventionally the node's type name. KNIME uses only the path written in `workflow.knime`, but keep the convention.

### 7.2 settings.xml
Structure (KNIME XMLConfig): `<config key="model">` holds the node's own settings. `<config key="nodeAnnotation">` holds the label shown under the node (`text` entry). Then come the `state`, `factory` (Java class, for example `org.knime.base.node.preproc.filter.row3.RowFilterNodeFactory`), `node-name`, bundle and feature entries, `ports` and `filestores`.

**Safest way to add a node:** copy the `settings.xml` of an existing node of the same type, then change only the `model` block and the label. Factories used here:

| Node | factory |
|---|---|
| Excel Reader | `org.knime.ext.poi3.node.io.filehandling.excel.reader.ExcelTableReaderNodeFactory` (copy from #1) |
| Row Filter | `org.knime.base.node.preproc.filter.row3.RowFilterNodeFactory` |
| Missing Value | `org.knime.base.node.preproc.pmml.missingval.compute.MissingValueHandlerNodeFactory` |
| GroupBy | `org.knime.base.node.preproc.groupby.GroupByNodeFactory` |
| Math Formula | `org.knime.ext.jep.JEPNodeFactory` |
| CSV Writer | `org.knime.base.node.io.filehandling.csv.writer.CSVWriter2NodeFactory` (copy from #6) |
| Pivot | `org.knime.base.node.preproc.pivot.Pivot2NodeFactory` |
| Concatenate | `org.knime.base.node.preproc.append.row.AppendedRowsNodeFactory` |

Copying an existing node's settings.xml keeps the factory and bundle entries right automatically.

Model snippets that work in 5.5.1 (copy them from the v2 files):
- **Row Filter, string equals**: see #2 or #26 (`operator` EQ, `cell_class` StringCell, `value` xstring).
- **Row Filter, integer range**: there is no BETWEEN operator. Use two predicates combined with `matchCriteria` = AND: `operator` GTE and LTE, with `typeIdentifier/cell_class` = `org.knime.core.data.def.IntCell` and `<entry key="value" type="xint" .../>`. See #10.
- **GroupBy**: `grouByColumns/InclList` (KNIME's own spelling, "grouBy"), and `aggregationColumn` with parallel arrays `columnNames`, `columnTypes`, `aggregationMethod` (`Sum`) and `inclMissingVals`. See #11.
- **Math Formula**: `expression`, `replaced_column` = the new column name, `append_column` = false. That is the v1 pattern, and it **appends** a new column when no column of that name exists. Columns are referenced as `$Column name$`. `COL_SUM($col$)` gives a column total.
- **Pivot**: the GroupBy keys plus `pivotColumns`, `missing_values`, `total_aggregation`, `ignore_domain`, `sort_lexicographical` and `column_name_option` (`Pivot name` | `Pivot name+Aggregation name` | `Aggregation name+Pivot name`). See #21.
- **Missing Value, fixed text**: `factoryID` = `...handlers.FixedStringValueMissingCellHandlerFactory` with `settings/fixStringValue`. See #23.

### 7.3 workflow.knime entries
For every node add, under `<config key="nodes">`:
```xml
<config key="node_10">
    <entry key="id" type="xint" value="10"/>
    <entry key="node_settings_file" type="xstring" value="Row Filter (#10)/settings.xml"/>
    <entry key="node_is_meta" type="xboolean" value="false"/>
    <entry key="node_type" type="xstring" value="NativeNode"/>
    <entry key="ui_classname" type="xstring" value="org.knime.core.node.workflow.NodeUIInformation"/>
    <config key="ui_settings">
        <config key="extrainfo.node.bounds">
            <entry key="array-size" type="xint" value="4"/>
            <entry key="0" type="xint" value="560"/>  <!-- x -->
            <entry key="1" type="xint" value="470"/>  <!-- y -->
            <entry key="2" type="xint" value="32"/>
            <entry key="3" type="xint" value="32"/>
        </config>
    </config>
</config>
```
For every connection add, under `<config key="connections">`, a `connection_<n>` entry (n is the next free number) with `sourceID`, `destID`, `sourcePort` and `destPort`. **Port numbering: 0 is the hidden flow-variable port, so the first data port is 1.** Example: Pivot port 3 (pivot totals) into Concatenate input 2 is `sourcePort=3, destPort=2`.
Annotations are `annotation_<n>` entries under `<config key="annotations">` (HTML `text`, `bgcolor`/`borderColor` as decimal RGB integers, x, y, width, height, `borderSize` 4). Copy an existing one.

### 7.4 Relative path configuration (portable readers and writers)
In the reader or writer `settings.xml`, inside `file_chooser_settings` (or `settings`) > `path`:
```xml
<entry key="location_present" type="xboolean" value="true"/>
<entry key="file_system_type" type="xstring" value="RELATIVE"/>
<entry key="file_system_specifier" type="xstring" value="knime.workflow.data"/>
<entry key="path" type="xstring" value="knime_idea3_severity_check.csv"/>
```
`knime.workflow.data` = the workflow's own `data/` folder. In the GUI this is "Relative to > Current workflow data area". v1 instead used `file_system_type` = `LOCAL` with an absolute path.

### 7.5 Saving unexecuted (stripping execution state)
A workflow saved after a run carries results. Before committing or packaging, either use the GUI (right-click the first node > Reset, then save) or edit the files:
1. Delete every `port_*/` and `internal/` folder inside the node folders, plus `.savedWithData` and `.artifacts/` in the workflow folder (KNIME regenerates them). `workflow.svg` is only a thumbnail; it can be deleted.
2. In each `settings.xml`: `state` -> `IDLE`, `hasContent` -> `false`, `file_store_id` -> `isnull="true" value=""`, and give each output port only `index` plus `port_dir_location isnull="true"`. Writers have `<config key="ports"/>`.
3. In `workflow.knime`: `state` -> `IDLE`.
4. Delete the output CSVs from `data/`, keeping the xlsx.

Check: `grep -rl 'value="EXECUTED"' BeyondTheRoadToll_DataPrep_v2` must print nothing.

---

## 8. Packaging a .knwf

From the project root (macOS or Linux):
```bash
find BeyondTheRoadToll_DataPrep_v2 -name .DS_Store -delete
ls BeyondTheRoadToll_DataPrep_v2/data           # must list only the xlsx
rm -f processing/knime/BeyondTheRoadToll_DataPrep_v2.knwf
zip -r -X processing/knime/BeyondTheRoadToll_DataPrep_v2.knwf BeyondTheRoadToll_DataPrep_v2 -x '*.DS_Store'
unzip -l processing/knime/BeyondTheRoadToll_DataPrep_v2.knwf | head   # entries start with BeyondTheRoadToll_DataPrep_v2/
```
In the GUI the equivalent is right-click the workflow > Export (or File > Export KNIME Workflow), with "Reset workflow before export" ticked. Make sure `data/` (the bundled xlsx) is included.

---

## 9. Running headless (no GUI)

Always run on a **copy**, never on the project folder, so that results are not saved into it:
```bash
SCR=/tmp/knime_test            # any scratch folder
rm -rf "$SCR" && mkdir -p "$SCR" && cd "$SCR"
unzip -q /path/to/COS30045A3-Shu-Group/processing/knime/BeyondTheRoadToll_DataPrep_v2.knwf
"/Applications/KNIME 5.5.1.app/Contents/MacOS/knime" -nosplash -consoleLog \
  -application org.knime.product.KNIME_BATCH_APPLICATION \
  -workflowDir="$SCR/BeyondTheRoadToll_DataPrep_v2" -reset -nosave -data "$SCR/kn_ws" \
  > "$SCR/log.txt" 2>&1
grep -E "sucessfully|ERROR" "$SCR/log.txt"
ls "$SCR/BeyondTheRoadToll_DataPrep_v2/data"   # xlsx + 6 knime_*.csv
```
- Success line (KNIME's own spelling): `============= Workflow executed sucessfully ===============`.
- `-data` must be a separate, throwaway workspace. Pointing it at the project workspace while the GUI is open fails because the workspace is locked.
- On Windows the executable is `knime.exe` in the KNIME install folder, with the same arguments.

---

## 10. Validating against Python

```bash
# project root; any Python 3 with pandas (the project venv works)
python processing/knime/validate_v2.py "$SCR/BeyondTheRoadToll_DataPrep_v2/data"
```
The script reads the six `knime_*.csv` files, compares each figure with the matching Python CSV in `data/clean/` **and** with the briefed number (after rounding to 1 decimal place for rates and shares), writes `processing/knime/v2_validation.csv` (columns: section, figure, knime, python, expected, result) and exits 1 if anything fails. G1 total check: the `All road users` row is produced inside KNIME (Pivot totals, port 3), and the script also checks that it equals the sum of the road-user rows. F1 and F2 totals are checked by summing the KNIME columns.

Last result: **59 PASS / 0 FAIL** (v1 checks 5/5, F1 18/18, F2 13/13, G1 20/20, G2 3/3).

Re-draw the diagram after any layout change:
```bash
python processing/knime/render_workflow.py BeyondTheRoadToll_DataPrep_v2 report/figures/knime/knime_v2_workflow.svg --png
```
(`--png` needs Google Chrome at the standard macOS path. Without it you get the SVG only.)

---

## 11. Known pitfalls

1. **Denominator for severity and shares = `Count of cases`**, not `Hospitalisations`. On Hospitalisations, pedestrians' case share comes out at 6.5% instead of 6.6%. Ideas 1, 2 and 4 use `Hospitalisations` (April 2019 = 3,488, not the 3,507 you get from Count of cases).
2. **Missing cells.** `Count of cases`, `Died_cases` and `Died_bed_days` contain missing cells, which Missing Value #3 sets to 0 (Python rule R5 does the same). With it, the sums equal Python exactly (2011–19 cases = 335,454; deaths 2,041). Keep #3 upstream of any new branch that sums these columns.
3. **Year windows**: deaths 2011–2019 only (2020 = 88 deaths and 2021 = 0, incomplete); bed days 2016–2021 only (method change from July 2015). Do not pool 2011–2021. The old pooled figures (pedestrian 19.3 per 1,000) are superseded.
4. **GroupBy Sum returns Double** even for integer input. The CSV Writer prints `34033` rather than `34033.0` because "keep trailing zero" is off. Downstream nodes that expect Integer need a Double to Int node.
5. **Row Filter (row3) has no BETWEEN.** Combine GTE and LTE with AND. Integer predicates use `IntCell` and `xint` (copy #10).
6. **Pivot**: `ignore_domain` = true is set (pivot on the values actually present; integer columns carry no list of possible values, so this is the safe choice). Port 1 = pivot table, port 2 = group totals, port 3 = pivot totals (a single row without the group column). "Pivot name" naming gives the columns `2019` and `2020`, which Math Formula references as `$2020$`.
7. **Concatenate duplicate row IDs.** The Pivot totals row can share a row ID with the main table. `append_suffix` = true (suffix `_dup`) avoids a failure.
8. **Math Formula `append_column`.** In the saved settings v1 uses `append_column=false` with a new name in `replaced_column`, and this appends the column. Keep the pattern rather than "fixing" it.
9. **v1 was re-saved executed by the GUI** (it holds `port_*/` data and `state=EXECUTED`). When copying v1 nodes, copy only `settings.xml`.
10. **Headless runs must use `-reset -nosave` on a copy**, otherwise outputs and execution state end up in the project folder and the .knwf grows.
11. **macOS `.DS_Store`** files creep into folders opened in Finder. Exclude them from the zip.
12. **The GUI cannot be screenshotted by a script**, so the slide diagram is redrawn by `render_workflow.py` from the workflow files. It shows positions, names, labels, ports and annotations, not KNIME's real icons or traffic lights.
13. **Road-user naming**: the raw sheet has 12 road users (no "N/A" among Traffic rows). Python groups 7 of them as "Other road users". KNIME keeps all 12 rows, and validation compares the 5 main road users plus the totals.

---

# Part 2: v3 (KNIME replaces the three Python data scripts)

Status (2026-11-23): `BeyondTheRoadToll_DataPrep_v3/` (575 nodes, 34 CSV Writers, standard nodes only, **no scripting nodes**) reproduces **every CSV** written to `data/clean/` by `processing/clean_data.py` (16 files), `processing/supplementary_data.py` (6) and `processing/phase2_ideas.py` (12). Headless run: "Workflow executed sucessfully". `validate_v3.py`: **34 of 34 files PASS, 136 of 136 checks PASS** (columns, row count and values per file); all 16 website CSVs (those in `processing/sync_website_data.sh`) PASS. v1 and v2 are untouched.

## v3 files

| What | Path |
|---|---|
| Workflow folder (portable, saved unexecuted) | `BeyondTheRoadToll_DataPrep_v3/` (raw inputs in `data/`: the 3 BITRE workbooks, ABS ERP csv, ARDD csv) |
| Package | `processing/knime/BeyondTheRoadToll_DataPrep_v3.knwf` (about 9 MB) |
| Generator | `processing/knime/build_v3.py` + `build_v3_part2.py` (supplementary), `build_v3_part3.py` (Idea 3), `build_v3_part4.py` (Idea 4), library `v3lib.py` |
| Headless runner | `processing/knime/run_v3.sh <scratch dir>` (builds into the scratch dir, runs, then kills the lingering JVM) |
| Validator / result | `processing/knime/validate_v3.py` / `processing/knime/v3_validation.csv` (file, check, result, detail, website, source) |
| Diagram | `report/figures/knime/knime_v3_workflow.{svg,png}` |

## Branches (node groups on the canvas)

- **A. Load + clean national (R1 to R6)**: Excel Reader (`raw`) > Row Filter `Cause of injury = Traffic` (R2) > Missing Value (R5: Count of cases, Died_cases, Died_bed_days -> 0) > Column Renamer (R3: Count of cases -> `cases_incl_died`, Hospitalisations = `hospitalisations`) > 6 String Manipulation (R4: `strip`, plus a `regexReplace` to `Unknown` for remoteness, age_group, sex) > Rule Engine `month_num` (R4) > Math Formula `bed_days_excl_died = bed_days - died_bed_days` (R7) > Rule Engine `series_break` (R6) > Column Filter + Column Resorter > Sorter > CSV Writer `traffic_national_monthly_clean`. The Resorter output is the table **T** every later branch uses.
- **B. National tables**: `idea1_national_annual` (GroupBy + index via `COL_SUM` of the 2011 value), `idea1_national_monthly` (GroupBy + date built with Number to String and String Manipulation), `idea2_roaduser_age_annual` (filters, GroupBy, complete grid = three distinct-value GroupBys + two Cross Joiners + left Joiner + Missing Value 0), `idea2_heatmap_change` (Pivot over years, Column Renamer, Math Formula, Rule Engine for blank percent when base = 0 and `low_count` < 30 (R9)), `idea2_age_severity` (2016-21 bed days (R7) and 2011-19 deaths (R8), Joiner, Math Formula).
- **C. Block parsing (R11)**: 10 Excel Readers, each reads one column range of the side-by-side sheet (header in row 2, `skip empty rows`), Column Filter drops `cause of injury`, Column Renamer to the short names, String Manipulation (trim + Unknown) where a column is age, sex or remoteness; blocks with `n.p.` cells get a Rule Engine `suppressed` flag then String to Number (`n.p.` -> missing, fail_on_error off); blocks without `n.p.` get a Constant Value `suppressed = False`; CSV Writer. Five `state_by_*` + five `first_nations_by_*` files.
- **D. Supplementary**: CSV Reader (ABS ERP) > Row Filter (MEASURE 1, SEX 3, REGION AUS, quarter Q2) > year text to integer; `supp_population_annual` (AGE = TOT), `supp_population_age` (single years 0 to 100 into 7 bands with a Rule Engine, GroupBy), `supp_road_deaths_annual` (CSV Reader on ARDD, years 2011-21, GroupBy Count), `idea1_rates` (two Joiners onto the KNIME `idea1_national_annual`, Math Formula), `idea1_index_long` (three series, Concatenate), `idea2_age_population_change` (Pivot, Math Formula).
- **E. Idea 3 and Idea 4**: a data cube (GroupBy by road-user group x road user x age x counterparty x year) feeds everything. **Idea 3**: `idea3_burden_share`; one *severity engine* (all severity tables are stacked with `scope`, `k1`, `k2` keys, then a single chain of Row Filter 2011-19 / 2016-21, GroupBy, outer Joiner, Missing Value 0, Math Formula for died per 1,000, Wilson 95% interval (z = 1.96), average stay, Rule Engine flags (P4)) and four outputs split from it: `idea3_severity_roaduser`, `_roaduser_age`, `_counterparty`, `idea3_older_pedestrians`; `idea3_older_pedestrians_annual` joins pedestrian counts to the KNIME ERP table. **Idea 4**: monthly cube, `idea4_monthly_2019_2021`, closed-form OLS in Math Formula (GroupBy of sums, then slope, intercept, residual SD; fits 2011-19, 2012-19, 2015-19) for `idea4_cyclist_trend` (95% prediction interval with t = 2.365 / 3.182) and the 2020 trend forecast, `idea4_baseline_band`, `idea4_roaduser_change_2020` (six comparisons stacked), `idea4_cyclist_age_2020`, and `idea4_state_cyclists_2020` (from the KNIME `state_by_road_user` table).

Chaining mirrors the Python: B uses T; D uses B's annual table; E uses T, D's population-by-age table and C's `state_by_road_user` table. No branch reads a Python CSV.

Node counts: Math Formula 132, Constant Value Column 68, Row Filter 58, GroupBy 47, Column Renamer 43, Column Filter 43, CSV Writer 34, Rule Engine 33, Concatenate 28, Column Resorter 20, Joiner 17, String Manipulation 15, Excel Reader 11, Pivot 8, String to Number 7, Missing Value 3, Cross Joiner 3, Number to String 2, CSV Reader 2, Sorter 1.

## How to run and validate

```bash
SCR=/tmp/knime_v3_test                                  # any scratch folder, never the project folder
processing/knime/run_v3.sh "$SCR"                       # prints "Workflow executed sucessfully"
python processing/knime/validate_v3.py "$SCR/BeyondTheRoadToll_DataPrep_v3/data"   # needs pandas; exit code 1 on any FAIL
```
Or run the packaged workflow as in sections 6 and 9 (GUI import / `-workflowDir`). Regenerate the folder with `python processing/knime/build_v3.py BeyondTheRoadToll_DataPrep_v3`, then package as in section 8 (use the v3 names) and redraw with `render_workflow.py` (section 10).

## v3 settings notes and pitfalls (new)

1. **Math Formula "append_column" is inverted**: `append_column=true` means *replace* an existing column; `false` means append a new column named in `replaced_column`. Rule Engine and String Manipulation behave differently: Rule Engine `append-column=true` appends; String Manipulation `append_column=true` replaces (same inversion as Math Formula).
2. **Column Resorter** (webui node) stores its list under the key `ColumnOrder` (string array). Column Filter keeps the input order, so use Column Filter then Column Resorter to pick and order columns.
3. **GroupBy cannot hold two aggregators on the same column** (the second is silently dropped); copy the column with Math Formula first (see `hmin`/`hmax` in the baseline band). There is no `Count(x)` surprise in this workflow because counts use `Sum` of a constant column `one`.
4. **String Manipulation `join` needs strings**: integers must go through Number to String first (use Math Formula with `convert_to_int` to make a clean integer copy, otherwise you get `2011.0`). The length function is `length(...)`, not `strLen`. `max(a, b)` does not exist in Math Formula; use `if(a > b, a, b)`.
5. **Header trailing spaces** (`state or territory `) are trimmed by the Excel Reader, so the renamer must use the trimmed name.
6. **Excel Reader range**: `sheet_area=PARTIAL`, `read_from_column/read_to_column` letters, `read_from_row=2` with `column_names_row_number=2` (the title row 1 would otherwise appear as a data row).
7. **Headless JVM lingers** after "Workflow executed sucessfully"; `run_v3.sh` kills only the batch process for its scratch folder.

## Caveats (what v3 does not do)

- Row order of the KNIME CSVs is not the Python order (only `traffic_national_monthly_clean` is sorted); the validator sorts both sides. Numbers are doubles written without trailing `.0`, so integer columns look the same but the type is not preserved. Booleans are the strings `True` / `False`.
- R4 trimming is applied to the national text columns and to the categorical column that the Unknown mapping touches in each block; other block text columns are not trimmed (the data contain no leading or trailing spaces). For blocks without any `n.p.` cell the `suppressed` column is a constant `False`.
- Rounding uses `round(x*10)/10`-style formulas (half up); Python rounds half to even. All 34 files agree to within 1e-6 on the current data, but an exact tie would differ.
- Constants copied from the Python: z = 1.96 (Wilson), t = 2.365 / 3.182 (prediction intervals), forecast point x = 2020, year windows. Not reproduced: R10 validation tables (`validation_results.csv`), `phase2_validation.csv`, `phase2_key_numbers.csv`, `processing/EDA_REPORT.md`, and all PNG figures (`fsave`, `eda_figures.py`).
