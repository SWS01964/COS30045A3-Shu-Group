import pandas as pd, sys
df = pd.read_excel(sys.argv[1], sheet_name='raw')
df.to_pickle(sys.argv[2])
print(df.shape); print(df.dtypes)
for c in ['Calendar year','Month','ABS remoteness area','Cause of injury','Age group','Sex','Road user','Counterparty']:
    print(c, '->', df[c].unique().tolist())
