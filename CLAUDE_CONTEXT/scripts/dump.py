import openpyxl, sys
f=sys.argv[1]; sheets=sys.argv[2].split(','); n=int(sys.argv[3]) if len(sys.argv)>3 else 40
wb = openpyxl.load_workbook(f, read_only=True, data_only=True)
for s in sheets:
    ws=wb[s]; print('---', s)
    for i,row in enumerate(ws.iter_rows(values_only=True)):
        if i>=n: break
        vals=[str(v) for v in row if v is not None]
        if vals: print(' | '.join(vals))
