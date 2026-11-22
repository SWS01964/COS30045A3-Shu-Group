import openpyxl, sys
for f in sys.argv[1:]:
    wb = openpyxl.load_workbook(f, read_only=True)
    print('=== ', f.split('/')[-1])
    for ws in wb.worksheets:
        print('  sheet:', repr(ws.title), ws.max_row, 'x', ws.max_column)
