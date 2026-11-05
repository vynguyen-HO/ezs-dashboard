import json,datetime as dt
from ids_2010 import D,TAG,FAILED
ST={"7696548321560628488":[20,1,0,0,0],"7696415267760508181":[753,2,0,0,0],"7696410581183515925":[193,1,0,0,0],"7696403387402734869":[2685,5,0,0,1],"7696392660055018773":[2691,2,0,0,0],"7695995101524397332":[3776,4,0,0,1],"7695994463524523285":[3417,4,0,0,0],"7695993755710622997":[68700,44,0,4,6],"7695635114578939156":[1630,2,0,1,0],"7695634542476021013":[1181,1,0,0,0],"7695633656269884692":[5062,12,0,1,0],"7694614743046278421":[1132,2,0,0,0],"7694613646160301332":[4003,5,0,1,1],"7695258263964667157":[1413,1,0,0,0],"7694613196384013589":[3840,4,0,1,0],"7695284366578322708":[1941,4,0,1,0],"7695278937361943829":[1759,3,0,0,0],"7695265762264485141":[1719,3,0,0,1],"7694612721639181589":[5648,4,0,0,0],"7694612195212070164":[33300,23,0,1,3],"7694611693363662101":[1506,1,0,0,0],"7694921574452972820":[2673,4,0,0,0],"7696418828506418450":[406,1,0,0,0],"7696418268181056786":[243,1,0,0,0],"7696005160333495570":[666,2,0,0,0],"7696003803459357960":[820,5,0,0,1]}
TITLE={"7694889693644655892":"Cushion Ohui đen","7694268304780840212":"Săn iPhone 18 Pro trong live 9–10/10","7695710798458555656":"Serum tươi 3 lõi Lancôme","7694889210011979029":"Bộ dầu gội L'Oréal Paris","7695303833802640660":"Nồi chiên không dầu Gaabor","7696548321560628488":"Serum Lancôme Absolue Longevity MD","7696438514933681415":"Serum Lancôme Génifique Ultimate","7696514255343897877":"Event Paula's Choice tại nhà Na","7696418828506418450":"Nước hoa YSL","7696418268181056786":"BB Cream The Whoo","7696415267760508181":"Nước hoa Lancôme","7696412216182000916":"Toner keo ong CNP","7696410744971218197":"Serum Bichup The Whoo","7696410581183515925":"Combo serum xịt + KCN d'Alba","7696404769279151367":"Son bóng YSL","7696404102061837575":"Nước hoa Lancôme","7696403387402734869":"Xịt mọc tóc L'Oréal Professionnel","7696399599585611029":"Kem mắt AHC Proshot","7696392743601376532":"Sữa rửa mặt CRV Foaming Cleanser","7696392660055018773":"Kem dưỡng Lancôme","7696382939843546386":"Lancôme Rénergie H.C.F Triple Serum","7696382208499584263":"Serum Lancôme Génifique Ultimate","7696356369032563969":"Combo Bioderma Sébium",
"7695993755710622997":"Cushion YSL","7694612195212070164":"Kem chống nắng d'Alba","7694612721639181589":"Toner d'Alba","7695633656269884692":"Serum Lancôme 3 lõi","7694613646160301332":"Xịt dưỡng d'Alba","7694613196384013589":"Toner BHA Paula's Choice","7695995101524397332":"Son bóng YSL","7695994463524523285":"Serum retinol Lancôme","7696005160333495570":"Lancôme Rénergie Triple Serum","7696003803459357960":"Cushion YSL đen"}
for l in list(open('st_more.txt'))+list(open('st_1510.txt'))+list(open('st_1610.txt'))+list(open('st_2010.txt')):
    p=l.strip().split(',')
    if len(p)==6: ST[p[0]]=list(map(int,p[1:]))
tz=dt.timezone(dt.timedelta(hours=7));
POSTT={}
for fn,h in [('studio_chot_2010.txt','hannah.team.chot.don'),('studio_medep_2010.txt','hannahteam.medep')]:
    ids=[]
    for l in open(fn):
        p=l.strip().split(',')
        if len(p)<9 or p[6]=='140': continue
        ST[p[0]]=list(map(int,p[1:6]));mo,rest=p[8].split('-');dd,hm=rest.split('T');POSTT[p[0]]=(int(mo),int(dd),int(hm[:2]),int(hm[3:]));ids.append(p[0])
    D[h]=' '.join(ids)
now=dt.datetime(2026,10,20,14,15,tzinfo=tz)
days=[dt.date(2026,10,d) for d in range(14,21)]
import json as _j
FPROF=_j.load(open('prof_2010.json'))
meta={
 'hannahteam.review':dict(d="hannahteam.review",f=52910,f0=49237),
 'hannah.team.chot.don':dict(d="Hannah Team Chốt Đơn",f=10664,f0=10524,studio=True),
 'hannahteam.dep':dict(d="Đẹp cùng Hannah Team",f=3302,f0=3302),
 'hannahteam.medep':dict(d="hannahteam.medep",f=1494,f0=1494,studio=True),
 'hannahteam.dangmua':dict(d="Hannah Team Đáng Mua",f=FPROF.get('hannahteam.dangmua',1002),f0=1000),
 'hannaholala.mall':dict(d="HannahOlala Mall",f=FPROF.get('hannaholala.mall',653),f0=677),
 'hannaholala':dict(d="Kênh chính · tham chiếu",f=2078227,f0=2077014,main=True),
}
chans=[];v24=[];allv=[]
for h,m in meta.items():
    ids=D[h].split();tg=set(TAG.get(h,'').split())
    ts=[((dt.datetime(2026,POSTT[i][0],POSTT[i][1],POSTT[i][2],POSTT[i][3],tzinfo=tz) if i in POSTT else dt.datetime.fromtimestamp(int(i)>>32,tz)),i) for i in ids]
    oldest=min(t for t,_ in ts).date()
    cnt=[ (sum(1 for t,_ in ts if t.date()==d) if d>=oldest else None) for d in days]
    if len(ids)<20 or m.get('studio'): cnt=[c if c is not None else 0 for c in cnt]
    last=max(t for t,_ in ts)
    w=[i for t,i in ts if t.date()>=days[0]]
    got=[ST[i] for i in w if i in ST]
    s=[sum(x[k] for x in got) for k in range(5)] if got else [None]*5
    p24=sum(1 for t,_ in ts if (now-t).total_seconds()<=86400)
    c=dict(h=h,**m,df=None if m['f0'] is None else m['f']-m['f0'],days=cnt,p24=p24,p7=len(w),hs=round((now-last).total_seconds()/3600,1),
           views=s[0],likes=s[1],cmts=s[2],shares=s[3],saves=s[4],cov=f"{len(got)}/{len(w)}",ncov=len(got),tag7=sum(1 for i in w if i in tg))
    chans.append(c)
    for t,i in ts:
        if (now-t).total_seconds()<=86400: v24.append(dict(h=h,id=i,t=t.strftime('%H:%M'),title=TITLE.get(i,'Video'),tag=i in tg,s=ST.get(i),ts=t.timestamp()))
        if i in ST and not m.get('main'): allv.append(dict(h=h,id=i,title=TITLE.get(i,'Video'),date=t.strftime('%d/%m'),s=ST[i]))
v24.sort(key=lambda x:-x['ts'])
top=sorted(allv,key=lambda x:-x['s'][0])[:8]
rv=next(c for c in chans if c['h']=='hannahteam.review')
build=[c for c in chans if not c.get('main')]
tv=sum(c['views'] for c in build);tl=sum(c['likes'] for c in build);tc=sum(c['cmts'] for c in build)
mall=next(c for c in chans if c['h']=='hannaholala.mall')
def r(x):return f"{x:,}".replace(',','.')
alerts=[
 dict(id="dep_links_failed2",sev="bad",ch="hannahteam.dep",short="6 link SP bị từ chối · ngừng gắn giỏ",title="dep: 6 link sản phẩm vẫn bị từ chối, từ 16/10 không gắn giỏ nữa",detail="Link La Roche-Posay, Vichy, YSL, Lancôme (video 13–15/10) vẫn CHECK_FAILED sau 5 ngày; 10 video mới 16–19/10 không gắn giỏ. GMV dep 13–19/10 chỉ 37,9 tr (live 25,0 tr, video 2,3 tr), ngày 19/10 còn 1,6 tr. Cần kiểm tra quyền bán sản phẩm của kênh rồi gắn lại."),
 dict(id="chako_chotdon2",sev="warn",ch="hannah.team.chot.don",short="video viral không gắn giỏ",title="chốt đơn: video Chako 15/10 đạt 66.486 view nhưng không gắn giỏ",detail="Video viral nhất của kênh tuần này, nhưng link Chako đang bị từ chối ở kênh chính và review nên không gắn được. Ghim comment dẫn sang sản phẩm thay thế hoặc làm lại video với sản phẩm gắn được."),
 dict(id="hannaholala_links",sev="warn",ch="hannaholala",short="2 link SP bị từ chối",title="Kênh chính: 2 link sản phẩm bị từ chối",detail="Bình giữ nhiệt Chako Lab và set phấn nước + son dưỡng The Whoo (độc quyền HO) trạng thái CHECK_FAILED. Gỡ link hoặc thay sản phẩm."),
 dict(id="chako_review",sev="warn",ch="hannahteam.review",short="link Chako bị từ chối",title="review: link Chako Lab vẫn bị từ chối",detail="Video 15/10 (13.500 view lúc 16/10) link CHECK_FAILED. Dừng gắn Chako ở mọi kênh tới khi xử lý xong."),
 dict(id="low_comment",sev="warn",ch="",title=f"6 kênh build chỉ có {tc} comment trong 7 ngày",detail=f"{r(tv)} view, {r(tl)} like, {tc} comment. Thêm câu hỏi kêu gọi comment cuối video và ghim comment hỏi đáp."),
 dict(id="review_growth",sev="info",ch="hannahteam.review",title="review tăng 3.673 followers trong 4 ngày (16→20/10)",detail="Đợt săn sale L'Oréal 19–21/10 và video serum PDRN 37.000 view kéo follower. Nhân rộng format này sang chốt đơn và dep."),
 dict(id="medep_nogmv",sev="info",ch="hannahteam.medep",title="medep đăng đều 2–3 video/ngày nhưng view thấp, GMV vẫn 0",detail="15 video 14–20/10, trung bình ~200 view/video. Thử hook 3 giây đầu mạnh hơn và gắn giỏ sản phẩm đang chạy deal."),
]
GMV={'hannaholala':dict(gmv=24518760927,live=20898636734,video=834894776,gmv7=3223809937,live7=2518534108,video7=132008766),
'hannahteam.review':dict(gmv=2610097219,live=1377207114,video=644808761,gmv7=928199632,live7=490631428,video7=228866056),
'hannah.team.chot.don':dict(gmv=412504758,live=190281766,video=110349705,gmv7=176119254,live7=63677909,video7=55433866),
'hannahteam.dep':dict(gmv=190840764,live=137768998,video=6496435,gmv7=37898553,live7=24975551,video7=2342579),
'hannahteam.medep':dict(gmv=0,live=0,video=0,gmv7=0,live7=0,video7=0)}
TIER={'hannaholala':'L8','hannahteam.review':'L7','hannah.team.chot.don':'L5','hannahteam.dep':'L5','hannahteam.medep':'L0'}
STAGE={'hannaholala':'S3','hannahteam.review':'S3','hannah.team.chot.don':'S2','hannahteam.dep':'S2','hannaholala.mall':'S2','hannahteam.medep':'S2','hannahteam.dangmua':'S1'}
VIOOK={'hannah.team.chot.don':'TikTok Studio 14h 20/10: 17 video đăng 14–19/10 đều công khai bình thường, không video nào đang xét duyệt hay bị hạn chế. Chưa có video đăng 20/10.','hannahteam.medep':'TikTok Studio 14h 20/10: 15 video đăng 14–20/10 đều công khai bình thường, không video nào đang xét duyệt hay bị hạn chế; thêm 1 video hẹn giờ 14:30.'}
VIO={'hannahteam.dep':[dict(label='6 link SP bị từ chối',detail='TikTok for Business 20/10: link sản phẩm của 6 video 13–15/10 (KCN La Roche-Posay, dầu gội Vichy, son YSL, nước hoa Lancôme, cushion YSL, serum Lancôme Longevity) vẫn CHECK_FAILED')],'hannahteam.review':[dict(label='1 link SP bị từ chối',detail='Video bình giữ nhiệt Chako Lab 15/10: link sản phẩm CHECK_FAILED')],'hannaholala':[dict(label='2 link SP bị từ chối',detail='Bình giữ nhiệt Chako Lab và set The Whoo độc quyền HO: CHECK_FAILED')]}

for c in chans:
    g=GMV.get(c['h'],{});[c.__setitem__(k,g.get(k)) for k in ['gmv','live','video','gmv7','live7','video7']]
    c['tier']=TIER.get(c['h']);c['stage']=STAGE.get(c['h']);c['vio']=VIO.get(c['h'],[]);c['vioOk']=VIOOK.get(c['h'])
data=dict(asof="14:15 20/10/2026",kpi=5000,dayLabels=[d.strftime('%d/%m') for d in days],channels=chans,videos24=[{k:v for k,v in x.items() if k!='ts'} for x in v24],top=top,alerts=alerts)
s=open('template_2010.html').read().replace('/*DATA*/null',json.dumps(data,ensure_ascii=False))
open('hannah_monitor_demo.html','w').write(s)
for c in chans: print(c['h'],c['days'],c['p24'],c['p7'],c['cov'],c['views'])
print(len(v24),len(top))
