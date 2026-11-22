import pandas as pd, sys
pd.set_option('display.width',220); pd.set_option('display.max_columns',30)
df = pd.read_pickle(sys.argv[1]).fillna(0)
# raw blocks for First Nations and states (side-by-side tables with blank cols)
def blocks(f, nb):
    raw = pd.read_excel(f, sheet_name='raw', header=None)
    hdr = raw.iloc[1].tolist(); out=[]; cur=[]
    for i,h in enumerate(hdr):
        if pd.isna(h):
            if cur: out.append(cur); cur=[]
        else: cur.append(i)
    if cur: out.append(cur)
    res=[]
    for cols in out:
        b = raw.iloc[2:, cols].copy(); b.columns=[str(hdr[c]).strip() for c in cols]; b=b.dropna(how='all'); res.append(b)
    return res
fn = blocks(sys.argv[2], 5)
for b in fn: print(b.columns.tolist(), len(b))
ru = fn[1]; ru['Hospitalisations']=pd.to_numeric(ru['Hospitalisations'], errors='coerce'); ru['Bed days excluding died in hospitals within 30 days']=pd.to_numeric(ru['Bed days excluding died in hospitals within 30 days'], errors='coerce')
print('\nFirst Nations status values', ru['First Nations status'].unique())
g = ru.groupby(['First Nations status','Road user'])['Hospitalisations'].sum().unstack(0); print((100*g/g.sum()).round(1))
rem = fn[3]; rem['Hospitalisations']=pd.to_numeric(rem['Hospitalisations'], errors='coerce'); rem['bd']=pd.to_numeric(rem.iloc[:,6], errors='coerce')
g = rem.groupby(['First Nations status','ABS remoteness area'])[['Hospitalisations','bd']].sum()
g['ALOS']=(g['bd']/g['Hospitalisations']).round(2); print(g)
yr = rem.groupby(['Calendar year','First Nations status'])['Hospitalisations'].sum().unstack(); print(yr)
cp = fn[4]; cp['Hospitalisations']=pd.to_numeric(cp['Hospitalisations'], errors='coerce')
g = cp.groupby(['First Nations status','Counterparty'])['Hospitalisations'].sum().unstack(0); print((100*g/g.sum()).round(1))
st = blocks(sys.argv[3], 5)
for b in st: print(b.columns.tolist(), len(b))
a = st[0]; a['c']=pd.to_numeric(a.iloc[:,3], errors='coerce'); a['bd']=pd.to_numeric(a.iloc[:,4], errors='coerce')
g=a.groupby('state or territory')[['c','bd']].sum(); g['ALOS']=(g['bd']/g['c']).round(2); print(g)
r = st[1]; r['c']=pd.to_numeric(r.iloc[:,4], errors='coerce')
g = r.groupby(['state or territory','road user'])['c'].sum().unstack(0); print((100*g/g.sum()).round(1))
ag = st[3]; ag['c']=pd.to_numeric(ag.iloc[:,4], errors='coerce')
g = ag.groupby(['state or territory','age group'])['c'].sum().unstack(0); print((100*g/g.sum()).round(1))
