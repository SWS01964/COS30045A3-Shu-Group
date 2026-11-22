import pandas as pd, sys
pd.set_option('display.width',200)
df = pd.read_pickle(sys.argv[1]).fillna(0); t = df[df['Cause of injury']=='Traffic']
a = t[t['Calendar year']>=2016].groupby('Age group')[['Hospitalisations','Bed days']].sum()
a['ALOS16_21']=(a['Bed days']/a['Hospitalisations']).round(1)
d = t[t['Calendar year']<=2019].groupby('Age group')[['Count of cases','Died_cases']].sum()
a['died_per_1000_11_19']=(1000*d['Died_cases']/d['Count of cases']).round(1); print(a)
d = t[t['Calendar year']<=2019].groupby('Road user')[['Count of cases','Died_cases']].sum()
print((1000*d['Died_cases']/d['Count of cases']).round(1).sort_values())
main=['Car driver','Car passenger','Motorcyclist','Pedal cyclist','Pedestrian']
h = t[t['Road user'].isin(main)].groupby(['Road user','Age group','Calendar year'])['Hospitalisations'].sum().unstack()
print(((h[2021]/h[2011]-1)*100).round(0).unstack()[['0-7','8-16','17-25','26-39','40-64','65-74','75+']])
