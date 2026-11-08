import json
W={0:[1,0,0,0,0],1:[1,0,1,1,1],2:[0,1,0,0,1],3:[0,1,1,1,0]}
def bits(i): return [W[(i>>(8-2*r))&3] for r in range(5)]
def rot(s):
    n=len(s); return [[s[n-1-j][i] for j in range(n)] for i in range(n)]
def ham(b): return sum(min(sum(1 for k in range(5) if b[r][k]!=w[k]) for w in W.values()) for r in range(5))
def safety(i):
    b=bits(i); out=[]
    for _ in range(3):
        b=rot(b); out.append(ham(b))
    return min(out)
m=json.load(open('/app/frontend/src/data/markers.json'))
ids=list(m['corners'].values())+[int(k) for k in m['cards']]
bad=[(i,safety(i)) for i in ids if safety(i)<3]
print('bad',bad)
good=[i for i in range(1024) if safety(i)>=3]
print('n good',len(good)); print('first 60 good', good[:60])

for th in (4,5,6):
    print(th, len([i for i in range(1024) if safety(i)>=th]))
