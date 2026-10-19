import urllib.request, concurrent.futures, os, sys
ids = sorted({int(x) for x in open('ids.txt').read().split() if x.isdigit()})
print(len(ids),"ids",flush=True)
UA={"User-Agent":"MediaTrackerBuild/1.0 (personal hobby project)"}
def path(i):
    s=str(i); return "/".join(list(s[:-1]) or ['0'])+f"/{i}/"
def get(i):
    p=f"books/{i}.txt"
    if os.path.exists(p) and os.path.getsize(p)>20000: return i,True
    base="https://mirror.csclub.uwaterloo.ca/gutenberg/"+path(i)
    for name in (f"{i}-0.txt",f"{i}.txt",f"{i}-8.txt"):
        try:
            d=urllib.request.urlopen(urllib.request.Request(base+name,headers=UA),timeout=40).read()
            if len(d)>20000: open(p,'wb').write(d); return i,True
        except Exception as e: pass
    return i,False
with concurrent.futures.ThreadPoolExecutor(10) as ex:
    r=list(ex.map(get,ids))
print(sum(1 for _,ok in r if ok),"of",len(r),flush=True)
