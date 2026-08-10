#!/usr/bin/env python3
"""Diagnose the exact track ordering used by danxhuber/evolstate parsec.py.

Compares TAMS points produced from:
1) the first 50 regular PARSEC track files in tar-member order, and
2) the first 50 filenames in lexical order,
against the immutable tams_parsec.txt reference.
"""
import argparse, math, tarfile, tempfile
from pathlib import Path
import numpy as np
import requests
from astropy.io import ascii

URL='https://people.sissa.it/~sbressan/CAF09_V1.2S_M36_LT/Z0.017Y0.279.tar.gz'

def download(path):
    with requests.get(URL,stream=True,timeout=120) as r:
        r.raise_for_status()
        with open(path,'wb') as f:
            for ch in r.iter_content(1024*1024):
                if ch: f.write(ch)

def point(path):
    try: tab=ascii.read(path)
    except Exception: return None
    if not {'PHASE','AGE','LOG_TE','LOG_L'}.issubset(tab.colnames): return None
    ph=np.asarray(tab['PHASE'],float); age=np.asarray(tab['AGE'],float)
    u=np.where((ph==7.)&(age<20e9))[0]
    if not len(u): return None
    k=int(u[0]); T=10**float(tab['LOG_TE'][k]); L=float(tab['LOG_L'][k])
    R=math.sqrt(10**L*(T/5777.)**(-4))
    return float(T),float(R),float(age[k]/1e9)

def compare(points,ref):
    arr=np.array([[p[1][0],p[1][1]] for p in points if p[1] is not None],float)
    out=[]
    for T,R in ref:
        j=int(np.argmin(abs(arr[:,0]-T)))
        out.append((T,R,arr[j,0],arr[j,1],abs(arr[j,0]-T),abs(arr[j,1]-R)/R))
    return out

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--reference',required=True); ap.add_argument('--out',required=True)
    a=ap.parse_args(); out=Path(a.out); out.mkdir(parents=True,exist_ok=True)
    arc=out/'Z0.017Y0.279.tar.gz'; download(arc)
    root=out/'solar_tracks'; root.mkdir(exist_ok=True)
    with tarfile.open(arc,'r:gz') as tf:
        members=[m for m in tf.getmembers() if m.isfile()]
        tf.extractall(root)
    paths=[root/m.name for m in members]
    parseable=[p for p in paths if point(p) is not None]
    tar50=[(p.name,point(p)) for p in parseable[:50]]
    lex50=[(p.name,point(p)) for p in sorted(parseable,key=lambda p:p.name)[:50]]
    ref=np.loadtxt(a.reference)
    ref=ref[(ref[:,0]>=5200)&(ref[:,0]<=6060.3)]
    for label,pts in [('tar50',tar50),('lex50',lex50)]:
        print('\n###',label)
        for i,(n,p) in enumerate(pts): print(i,n,p)
        cmp=compare(pts,ref)
        print('COMPARE',label)
        for row in cmp: print(row)
        print('MAX',max(x[4] for x in cmp),max(x[5] for x in cmp))
        with (out/f'{label}_points.csv').open('w') as f:
            f.write('index,file,Teff_K,R_Rsun,age_Gyr\n')
            for i,(n,p) in enumerate(pts):
                if p: f.write(f'{i},{n},{p[0]},{p[1]},{p[2]}\n')
    print('TOTAL_MEMBERS',len(members),'PARSEABLE_PHASE7_LT20',len(parseable))
if __name__=='__main__': main()
