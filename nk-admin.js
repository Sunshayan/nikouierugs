/* Nikouie staff area: login, Farsi mode, spec editing, publish through the GitHub API.
   Loaded after the main inline script, so it can see C, byId, IDX, app, esc, img, route. */
(function(){
"use strict";
const REPO="Sunshayan/nikouierugs",BR="main",SKEY="nk_staff",TKEY="nk_ghkey",DKEY="nk_draft";
const $=(s,r)=>(r||document).querySelector(s);
let ADM=null,OVR={v:1,edit:{},add:[],remove:[]},KEY=null,USER="",DIRTY=false,TAB="all",MSG="",Q="";
const GONE={};
const LS={get(k){try{return localStorage.getItem(k)}catch(_){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(_){}},del(k){try{localStorage.removeItem(k)}catch(_){}}};

/* ---------- bytes ---------- */
const b64=u=>{let s="";for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
const unb64=s=>Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0));
const utf8=s=>new TextEncoder().encode(s);
async function deriveKey(u,p){
  const base=await crypto.subtle.importKey("raw",utf8(p),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:utf8("nikouie:"+u.toLowerCase()),iterations:150000},base,256);
  return new Uint8Array(bits)}
const aes=raw=>crypto.subtle.importKey("raw",raw,"AES-GCM",false,["encrypt","decrypt"]);
async function decrypt(raw,txt){const d=unb64(txt);const k=await aes(raw);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:d.subarray(0,12)},k,d.subarray(12))))}
async function encrypt(raw,obj){const iv=crypto.getRandomValues(new Uint8Array(12));const k=await aes(raw);
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},k,utf8(JSON.stringify(obj))));
  const out=new Uint8Array(12+ct.length);out.set(iv);out.set(ct,12);return b64(out)}

/* ---------- spec helpers (same rules as the build script) ---------- */
const ftin=m=>{const i=Math.round(m*39.3701);return Math.floor(i/12)+"′"+(i%12)+"″"};
function normSize(t){t=String(t||"").trim();const n=(t.match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>parseFloat(x.replace(",",".")));
  if(n.length!==2||!n[0]||!n[1])return{size:t,ft:"",area:null};
  const m=n.map(x=>x>10?x/100:x);
  return{size:Math.round(m[0]*100)+" × "+Math.round(m[1]*100)+" cm",ft:ftin(m[0])+" × "+ftin(m[1]),area:Math.round(m[0]*m[1]*100)/100}}
function normKnots(t){t=String(t||"").trim();const n=(t.match(/\d+/g)||[]).map(Number);
  if(n.length<2||!n[0]||!n[1])return{knots:t,kd:null};const d=n[0]*n[1];
  return{knots:n[0]+" × "+n[1]+" knots per cm² · about "+d+" per cm², "+Math.round(d*6.4516).toLocaleString("en-US")+" per in²",kd:d}}
const knShort=k=>{const m=String(k||"").match(/^(\d+)\s*×\s*(\d+)/);return m?m[1]+" × "+m[2]:String(k||"")};
const FIELDS=[["type","نوع","Type"],["size","اندازه","Size"],["knots","رج‌شمار (گره در سانتی‌متر)","Knots"],["colors","رنگ‌ها","Colours"],["design","نقشه","Design"],["designer","طراح (نقاش)","Designer"],["weaver","بافنده","Weaver"],["material","جنس","Material"],["age","قدمت","Age"],["notes","یادداشت","Notes"]];
function applySpec(c,f){const o={};FIELDS.forEach(([k])=>{if(k in f)o[k]=String(f[k]).trim()});
  if("size" in o)Object.assign(o,normSize(o.size));
  if("knots" in o)Object.assign(o,normKnots(o.knots));
  Object.assign(c,o);return o}

/* ---------- public overrides: edits and newly approved carpets ---------- */
function idxAdd(c){try{IDX.push({g:"Premium carpets",t:c.en,nq:c.nq,s:[c.mean,c.desc,c.size].filter(Boolean).join(" · "),h:"#carpet-"+c.id,th:img(c,"list"),
  txt:norm([c.en,c.nq,c.mean,c.desc,c.type,c.colors,c.design,c.designer,c.weaver,c.shop,c.ref,c.size].join(" ")),name:norm(c.en+" "+c.nq+" "+c.mean)})}catch(_){}}
function idxAddN(n){try{IDX.push({g:n.kind==="Kilim"?"Kilims":"Rugs",t:n.en,nq:n.nq,s:[n.mean,n.desc].join(" · "),h:"#item-"+n.id,th:img(n,"list"),
  txt:norm([n.en,n.nq,n.mean,n.desc,n.kind,n.ref].join(" ")),name:norm(n.en+" "+n.nq+" "+n.mean)})}catch(_){}}
/* take a piece off the public site; the object is kept in GONE so it can be put back */
function dropId(id){let o=null,i=C.findIndex(x=>x.id===id);
  if(i>-1){o=C.splice(i,1)[0];delete byId[id]}
  else{i=N.findIndex(x=>x.id===id);if(i>-1){o=N.splice(i,1)[0];delete nById[id]}}
  if(!o)return null;GONE[id]=o;
  const h=(o.kind?"#item-":"#carpet-")+id;for(let k=IDX.length-1;k>=0;k--)if(IDX[k].h===h)IDX.splice(k,1);
  try{const key=(o.kind?"n":"c")+":"+id,j=SEL.indexOf(key);if(j>-1){SEL.splice(j,1);saveSel()}}catch(_){}
  return o}
function undropId(id){const o=GONE[id];if(!o)return;delete GONE[id];
  if(o.kind){N.push(o);nById[id]=o;idxAddN(o)}else{C.push(o);byId[id]=o;idxAdd(o)}}
function applyOverrides(o){let n=0;
  Object.keys(o.edit||{}).forEach(id=>{const t=byId[id]||nById[id]||GONE[id];if(t){Object.assign(t,o.edit[id]);if(t.size)t.size=cmSize(t.size);n++}});
  (o.add||[]).forEach(c=>{if(!c||!c.id)return;c.size=cmSize(c.size);if(GONE[c.id]){GONE[c.id]=c;return}const i=C.findIndex(x=>x.id===c.id);if(i>-1){C[i]=c}else{C.push(c);idxAdd(c)}byId[c.id]=c;n++});
  (o.remove||[]).forEach(id=>{if(dropId(id))n++});
  return n}
const curHash=()=>(location.hash||"#home").slice(1);
async function loadOverrides(){
  try{const r=await fetch("data/overrides.json?t="+Date.now(),{cache:"no-store"});if(!r.ok)return;
    const o=await r.json();OVR={v:1,edit:o.edit||{},add:o.add||[],remove:o.remove||[]};
    const h=curHash(),was=app.innerHTML;
    if(applyOverrides(OVR)&&(h==="carpets"||h.startsWith("carpet-")||OVR.remove.some(id=>h==="item-"+id||was.includes("carpet-"+id+'"')||was.includes("item-"+id+'"'))))route()}catch(_){}}

/* ---------- session ---------- */
function setAdm(a){ADM=a;(ADM.check||[]).forEach(e=>{if(e.c){e.c.size=cmSize(e.c.size);if(!C.some(x=>x.id===e.id))byId[e.id]=e.c}})}
async function login(u,p){const raw=await deriveKey(u,p);
  const r=await fetch("data/admin.enc?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw new Error("net");
  const a=await decrypt(raw,await r.text());KEY=raw;USER=u;setAdm(a);LS.set(SKEY,JSON.stringify({u,k:b64(raw)}));onIn()}
async function resume(){const s=LS.get(SKEY);if(!s)return;
  try{const o=JSON.parse(s);const raw=unb64(o.k);
    const r=await fetch("data/admin.enc?t="+Date.now(),{cache:"no-store"});const a=await decrypt(raw,await r.text());
    KEY=raw;USER=o.u;setAdm(a);
    const d=LS.get(DKEY);if(d){try{const j=JSON.parse(d);if(j.adm&&j.ovr){setAdm(j.adm);OVR=j.ovr;OVR.remove=OVR.remove||[];Object.keys(GONE).forEach(id=>{if(!OVR.remove.includes(id))undropId(id)});applyOverrides(OVR);DIRTY=true}}catch(_){}}
    onIn()}catch(_){LS.del(SKEY)}}
function logout(){LS.del(SKEY);location.hash="home";location.reload()}
function onIn(){farsiOn();
  const nav=$("#nav");if(nav&&!$("#nkPanel")){nav.insertAdjacentHTML("beforeend",'<a href="#admin" data-r="admin" id="nkPanel">پنل مدیریت</a><a href="#home" id="nkOut">خروج</a>');$("#nkOut").onclick=e=>{e.preventDefault();logout()}}
  const hr=$("#hdr .hright");if(hr&&!$("#nkOutH")){hr.insertAdjacentHTML("afterbegin",'<a href="#home" id="nkOutH" class="nk-out">خروج</a>');$("#nkOutH").onclick=e=>{e.preventDefault();logout()}}
  const sl=$("#nkStaff");if(sl)sl.textContent="پنل مدیریت",sl.href="#admin";
  const h=curHash();if(h==="login")location.hash="admin";else route()}

/* ---------- publish ---------- */
async function gh(path,token,body){
  const u="https://api.github.com/repos/"+REPO+"/contents/"+path;
  const H={Authorization:"Bearer "+token,Accept:"application/vnd.github+json"};
  let sha;const g=await fetch(u+"?ref="+BR+"&t="+Date.now(),{headers:H,cache:"no-store"});
  if(g.status===401||g.status===403)throw new Error("auth");
  if(g.ok)sha=(await g.json()).sha;
  const p=await fetch(u,{method:"PUT",headers:H,body:JSON.stringify({message:"Staff area: update "+path,content:body,branch:BR,sha})});
  if(p.status===401||p.status===403||p.status===404)throw new Error("auth");
  if(!p.ok)throw new Error("save "+p.status)}
async function publish(){
  LS.set(DKEY,JSON.stringify({adm:ADM,ovr:OVR}));DIRTY=true;
  const t=LS.get(TKEY);
  if(!t){MSG="روی همین دستگاه ذخیره شد. برای انتشار روی سایت، کلید GitHub را در بالای همین صفحه وارد کنید.";return false}
  try{MSG="در حال انتشار…";paintMsg();
    await gh("data/overrides.json",t,b64(utf8(JSON.stringify(OVR))));
    await gh("data/admin.enc",t,b64(utf8(await encrypt(KEY,ADM))));
    LS.del(DKEY);DIRTY=false;MSG="منتشر شد. تا حدود یک دقیقهٔ دیگر روی سایت دیده می‌شود.";return true}
  catch(e){MSG=e.message==="auth"?"کلید GitHub پذیرفته نشد. کلید را دوباره وارد کنید. تغییرات روی این دستگاه نگه داشته شده است.":"انتشار انجام نشد ("+e.message+"). تغییرات روی این دستگاه نگه داشته شده؛ دوباره «انتشار» را بزنید.";return false}}
function paintMsg(){const m=$("#nkMsg");if(m){m.textContent=MSG;m.hidden=!MSG}}

/* ---------- pages ---------- */
const CSS=`
.nka{padding:clamp(28px,5vw,64px) 0}.nka h1{margin:0 0 6px}.nka .sub{color:var(--muted,#766);margin:0 0 22px}
.nka-tabs{display:flex;flex-wrap:wrap;gap:8px;border-bottom:1px solid rgba(0,0,0,.14);margin-bottom:22px}
.nka-tabs button{font:inherit;background:none;border:0;border-bottom:2px solid transparent;padding:10px 14px;cursor:pointer;color:inherit;opacity:.65}
.nka-tabs button[aria-selected=true]{opacity:1;border-bottom-color:currentColor;font-weight:600}
.nka-tabs b{font-weight:600;margin-inline-start:6px;opacity:.7}.nka-tabs small{display:block;font-size:.72rem;opacity:.7;letter-spacing:.04em}
.nka-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:rgba(0,0,0,.04);padding:12px 14px;border-radius:6px;margin-bottom:18px;font-size:.92rem}
.nka-bar input{font:inherit;padding:7px 10px;border:1px solid rgba(0,0,0,.25);border-radius:4px;min-width:0;flex:1 1 220px;background:#fff;direction:ltr}
.nka-btn{font:inherit;font-weight:600;padding:8px 16px;border:1px solid #1a1714;background:#1a1714;color:#fff;border-radius:4px;cursor:pointer}
.nka-btn.g{background:none;color:inherit}.nka-btn.ok{background:#2e6b45;border-color:#2e6b45}.nka-btn:disabled{opacity:.5}
#nkMsg{background:#fbefd4;padding:10px 14px;border-radius:6px;margin-bottom:18px}
.nka-one{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:18px}
.nka-one a{display:grid;gap:6px;text-decoration:none;color:inherit;font-size:.9rem}.nka-one img{width:100%;height:210px;object-fit:contain;background:#fff}
.nka-badge{display:inline-block;font-size:.72rem;font-weight:600;background:#fbefd4;color:#8a5a00;padding:2px 8px;border-radius:3px}
.nka-badge.ok{background:#e3efe6;color:#2e6b45}.nka-badge.pub{background:#e6e9f1;color:#2f3a63}
.nka-row{display:grid;grid-template-columns:150px minmax(0,1fr);gap:18px;border:1px solid rgba(0,0,0,.14);border-inline-start:4px solid #c8962d;border-radius:6px;padding:14px;margin-bottom:14px;background:rgba(255,255,255,.5)}
.nka-row.done{border-inline-start-color:#2e6b45}.nka-row>img{width:150px;height:auto;max-height:230px;object-fit:contain;background:#fff}
.nka-top{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:baseline;margin-bottom:8px}.nka-top h3{margin:0;font-size:1.15rem}.nka-top code{font-size:.82rem;opacity:.7;direction:ltr}
.nka-flags{background:#fbefd4;border-radius:4px;padding:8px 12px;margin:0 0 10px;list-style:none;display:grid;gap:4px;font-size:.9rem;direction:ltr;text-align:left}
.nka-fa{background:rgba(0,0,0,.04);border-radius:4px;padding:8px 12px;margin:0 0 10px;line-height:1.9;font-size:.92rem}
.nka-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px 12px}
.nka-form label{display:grid;gap:3px;font-size:.8rem;opacity:.85}.nka-form input{font:16px inherit;padding:7px 9px;border:1px solid rgba(0,0,0,.25);border-radius:4px;background:#fff;min-width:0;width:100%;direction:ltr;text-align:left}
.nka-act{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:4px}
.nk-out{font-size:.8rem;font-weight:600;padding:5px 12px;border:1px solid currentColor;border-radius:4px;text-decoration:none;color:inherit;white-space:nowrap}
.nka-srch{display:flex;gap:10px;align-items:center;margin:0 0 16px}.nka-srch input{font:16px inherit;flex:1 1 auto;min-width:0;padding:10px 12px;border:1px solid rgba(0,0,0,.3);border-radius:4px;background:#fff}
.nka-srch span{font-size:.85rem;opacity:.7;white-space:nowrap}
.nka-item{display:grid;grid-template-columns:64px minmax(0,1fr);gap:14px;align-items:start;border:1px solid rgba(0,0,0,.14);border-radius:6px;padding:10px 12px;margin-bottom:8px;background:rgba(255,255,255,.5)}
.nka-item>img{width:64px;height:86px;object-fit:contain;background:#fff}.nka-item .nka-top{margin:0;align-items:center}.nka-item .nka-top h3{font-size:1.02rem}
.nka-item .sp{flex:1 1 auto}.nka-item .nka-edit{margin-top:10px}.nka-item.gone{opacity:.75;border-style:dashed}
.nka-btn.sm{padding:5px 12px;font-size:.85rem}.nka-btn.rm{background:none;color:#9a2f22;border-color:#9a2f22}.nka-btn.rm.sure{background:#9a2f22;color:#fff}
.nka-h2{margin:28px 0 10px;font-size:1.1rem}
.nkl{max-width:420px;margin:0 auto;padding:clamp(40px,8vw,96px) 0;display:grid;gap:14px}.nkl label{display:grid;gap:4px;font-size:.85rem}
.nkl input{font:16px inherit;padding:10px 12px;border:1px solid rgba(0,0,0,.3);border-radius:4px;background:#fff}.nkl .err{color:#9a2f22;margin:0}
@media(max-width:560px){.nka-row{grid-template-columns:96px minmax(0,1fr);gap:12px}.nka-row>img{width:96px}}
html.fa body,html.fa button,html.fa input,html.fa select,html.fa textarea,html.fa h1,html.fa h2,html.fa h3,html.fa h4,html.fa .cap,html.fa .btn,html.fa nav.main a{font-family:"Vazirmatn",Tahoma,sans-serif!important;letter-spacing:0!important;font-style:normal!important}
html.fa .cap,html.fa nav.main a,html.fa .btn{text-transform:none!important}
html.fa .name:has(+ .nq){display:none}html.fa .nq{text-align:start!important;font-size:1.25em!important;margin-top:0!important}
html.fa .frieze,html.fa .hunt,html.fa .anat,html.fa .stage,html.fa .vhead video,html.fa .hero{direction:ltr}
html.fa .frieze .cap-line{direction:rtl}
html.fa p,html.fa dd,html.fa li,html.fa .ref,html.fa .sz,html.fa .count,html.fa .crumb{unicode-bidi:plaintext}
html.fa .specs dd,html.fa .ref,html.fa .sz{text-align:right}
html.fa .story .text p,html.fa .prose p{direction:ltr;unicode-bidi:isolate;text-align:left}
html.fa .ref span,html.fa .sz span,html.fa .contact-line b{unicode-bidi:isolate;direction:ltr;display:inline-block}
`;
function loginPage(){return `<div class="in"><form class="nkl" id="nkLogin"><div><span class="cap muted">Staff</span><h1 style="margin:6px 0 0">Sign in</h1><p class="muted" style="margin:6px 0 0">ورود همکاران</p></div>
  <label>Username<input name="u" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
  <label>Password<input name="p" type="password" autocomplete="current-password" required></label>
  <p class="err" id="nkErr" hidden>Wrong username or password.</p>
  <button class="nka-btn" type="submit">Sign in</button></form></div>`}
const NAMEF=[["en","نام (انگلیسی)","Name"],["nq","نام (فارسی)","Farsi name"]],DESCF=[["desc","توضیح کوتاه","Short description"]];
function formHTML(vals,id,fl){return `<form class="nka-form" data-id="${esc(id)}">${(fl||FIELDS).map(([k,fa,en])=>`<label>${fa} · ${en}<input name="${k}" value="${esc(k==="knots"?knShort(vals[k]):vals[k]||"")}"${k==="size"?' placeholder="150 × 230"':k==="knots"?' placeholder="10 × 10"':""}></label>`).join("")}<div class="nka-act"></div></form>`}
function rowCheck(e,pub){const c=pub?byId[e.id]:e.c;if(!c)return"";
  return `<div class="nka-row" data-row="${esc(e.id)}"><img src="img/${esc(e.id)}-list.webp" alt="" loading="lazy">
  <div><div class="nka-top"><h3>${esc(c.nq||"")} · ${esc(c.en)}</h3><code>${esc(e.file)}</code><span class="nka-badge ${pub?"pub":""}">${pub?"روی سایت هست":"هنوز روی سایت نیست"}</span><a class="link" href="#carpet-${esc(e.id)}">${pub?"صفحهٔ فرش":"پیش‌نمایش"}</a></div>
  ${e.flags&&e.flags.length?`<ul class="nka-flags">${e.flags.map(f=>`<li>? ${esc(f)}</li>`).join("")}</ul>`:""}
  ${e.fa?`<div class="nka-fa" lang="fa"><b>صحبت بابا:</b> ${esc(e.fa)}</div>`:""}
  ${formHTML(c,e.id).replace('<div class="nka-act"></div>',`<div class="nka-act"><button class="nka-btn g" type="submit" data-a="save">ذخیره</button><button class="nka-btn ok" type="submit" data-a="${pub?"resolve":"approve"}">${pub?"ذخیره و بستن پرونده":"تأیید و انتشار روی سایت"}</button></div>`)}</div></div>`}
function rowSpec(e){const filled=Object.values(e.spec||{}).some(Boolean);
  return `<div class="nka-row${filled?" done":""}" data-row="${esc(e.id)}"><img src="img/${esc(e.id)}-list.webp" alt="" loading="lazy">
  <div><div class="nka-top"><code>${esc(e.file)}</code><span class="nka-badge">${esc(e.src||"")}</span>${filled?'<span class="nka-badge ok">مشخصات وارد شده</span>':""}</div>
  ${formHTML(e.spec||{},e.id).replace('<div class="nka-act"></div>','<div class="nka-act"><button class="nka-btn" type="submit" data-a="spec">ذخیره</button></div>')}</div></div>`}
const kindFa=o=>o.kind?(o.kind==="Kilim"?"گلیم":"قالیچه"):"فرش نفیس";
const allTxt=o=>norm([o.en,o.nq,o.mean,o.desc,o.ref,o.id,o.kind,o.type,o.cat,o.colour,o.colors,o.design,o.designer,o.weaver,o.shop,o.material,o.size,kindFa(o)].join(" "));
function rowAll(o,gone){const id=o.id;
  return `<div class="nka-item${gone?" gone":""}" data-row="${esc(id)}" data-txt="${esc(allTxt(o))}"><img src="${o.gal&&o.gal.length?o.gal[0].l:img(o,"list")}" alt="" loading="lazy">
  <div><div class="nka-top"><h3>${esc(o.nq||"")} · ${esc(o.en)}</h3><code>${esc(o.ref||id)}</code><span class="nka-badge ${gone?"":"pub"}">${gone?"از سایت حذف شده":kindFa(o)}</span>${o.size?`<code>${esc(o.size)}</code>`:""}<span class="sp"></span>
  ${gone?`<button class="nka-btn ok sm" type="button" data-back="${esc(id)}">برگرداندن به سایت</button>`
    :`<a class="link" href="${o.kind?"#item-":"#carpet-"}${esc(id)}">صفحهٔ فرش</a><button class="nka-btn g sm" type="button" data-edit="${esc(id)}">ویرایش</button><button class="nka-btn rm sm" type="button" data-rm="${esc(id)}">حذف از سایت</button>`}</div>
  <div class="nka-edit" hidden></div></div></div>`}
function adminPage(){if(!ADM)return loginPage();
  const all=C.concat(N),gone=Object.values(GONE);
  const one=C.filter(c=>!(c.gal&&c.gal.length));const nc=(ADM.check||[]).length+(ADM.pubcheck||[]).filter(e=>byId[e.id]).length;const ns=(ADM.nospec||[]);
  const tab=(k,fa,en,n)=>`<button type="button" role="tab" data-tab="${k}" aria-selected="${TAB===k}"><span>${fa}<b>${n}</b></span><small>${en}</small></button>`;
  let body="";
  if(TAB==="all")body=`<p class="sub">همهٔ فرش‌های روی سایت. جست‌وجو کنید، «ویرایش» را بزنید تا مشخصات عوض شود، یا فرش را از سایت بردارید. فرش حذف‌شده پایین همین صفحه می‌ماند و می‌شود آن را برگرداند.</p>
  <div class="nka-srch"><input id="nkQ" type="search" placeholder="جست‌وجو: نام، کد، بافنده، نقشه، رنگ…" value="${esc(Q)}" autocomplete="off"><span id="nkQn"></span></div>
  <div id="nkAll">${all.map(o=>rowAll(o,false)).join("")}</div>
  ${gone.length?`<h3 class="nka-h2">حذف‌شده از سایت (${gone.length})</h3><div id="nkGone">${gone.map(o=>rowAll(o,true)).join("")}</div>`:""}`;
  if(TAB==="one")body=`<p class="sub">این فرش‌ها روی سایت فقط یک عکس دارند و هنوز عکس‌های استودیویی و جزئیات برایشان ساخته نشده است.</p><div class="nka-one">${one.map(c=>`<a href="#carpet-${c.id}"><img src="${img(c,"list")}" alt="" loading="lazy"><span><b>${esc(c.nq)}</b> · ${esc(c.en)}</span><span><code>${esc(c.ref)}</code> <span class="nka-badge">نیاز به توجه</span></span></a>`).join("")}</div>`;
  if(TAB==="check")body=`<p class="sub">مشخصات این فرش‌ها باید با بابا چک شود. فرش‌هایی که هنوز روی سایت نیستند تا وقتی «تأیید و انتشار» نخورند فقط همین‌جا دیده می‌شوند.</p>${(ADM.check||[]).map(e=>rowCheck(e,false)).join("")}${(ADM.pubcheck||[]).map(e=>rowCheck(e,true)).join("")}`;
  if(TAB==="spec")body=`<p class="sub">برای این عکس‌ها هنوز مشخصاتی ثبت نشده است. هر چه می‌دانید در خانه‌ها بنویسید و ذخیره کنید.</p>${ns.map(rowSpec).join("")}`;
  return `<div class="in nka"><span class="cap muted">${esc(USER)}</span><h1>پنل مدیریت</h1>
  <div class="nka-bar"><span>${LS.get(TKEY)?"کلید GitHub روی این دستگاه ذخیره است.":"کلید GitHub (برای انتشار تغییرات):"}</span>${LS.get(TKEY)?'<button class="nka-btn g" type="button" id="nkTokDel">حذف کلید</button>':'<input id="nkTok" type="password" placeholder="github_pat_…" autocomplete="off"><button class="nka-btn" type="button" id="nkTokSet">ذخیرهٔ کلید</button>'}${DIRTY?'<button class="nka-btn ok" type="button" id="nkPub">انتشار تغییرات منتشرنشده</button>':""}<button class="nka-btn g" type="button" id="nkOut2">خروج</button></div>
  <p id="nkMsg"${MSG?"":" hidden"}>${esc(MSG)}</p>
  <div class="nka-tabs" role="tablist">${tab("all","همهٔ فرش‌ها","All carpets",all.length)}${tab("one","تک‌عکس","One picture",one.length)}${tab("check","نیاز به بررسی","Needs check",nc)}${tab("spec","نیاز به مشخصات","Needs spec",ns.length)}</div>${body}</div>`}
function rerender(){const y=scrollY;app.innerHTML=adminPage();bind();translate(app);scrollTo(0,y)}
function bind(){
  const lf=$("#nkLogin");if(lf)lf.onsubmit=async e=>{e.preventDefault();const d=new FormData(lf),b=$("button",lf);b.disabled=true;$("#nkErr").hidden=true;
    try{await login(String(d.get("u")).trim(),String(d.get("p")))}catch(_){$("#nkErr").hidden=false;b.disabled=false}};
  app.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{TAB=b.dataset.tab;MSG="";rerender();scrollTo(0,0)});
  const ts=$("#nkTokSet");if(ts)ts.onclick=()=>{const v=$("#nkTok").value.trim();if(v){LS.set(TKEY,v);MSG="کلید ذخیره شد.";rerender()}};
  const td=$("#nkTokDel");if(td)td.onclick=()=>{LS.del(TKEY);rerender()};
  const o2=$("#nkOut2");if(o2)o2.onclick=logout;
  const pb=$("#nkPub");if(pb)pb.onclick=async()=>{pb.disabled=true;await publish();rerender()};
  const qi=$("#nkQ");if(qi){const flt=()=>{Q=qi.value;const ts=norm(Q).split(/\s+/).filter(Boolean);let n=0,t=0;
      app.querySelectorAll("#nkAll .nka-item").forEach(r=>{t++;const ok=ts.every(x=>r.dataset.txt.includes(x));r.hidden=!ok;if(ok)n++});
      $("#nkQn").textContent=n+" / "+t};qi.oninput=flt;flt()}
  app.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{const id=b.dataset.edit,o=byId[id]||nById[id],box=b.closest(".nka-item").querySelector(".nka-edit");if(!o)return;
    if(!box.firstChild){box.innerHTML=formHTML(o,id,o.kind?NAMEF.concat(DESCF):NAMEF.concat(FIELDS)).replace('<div class="nka-act"></div>','<div class="nka-act"><button class="nka-btn" type="submit" data-a="all">ذخیره و انتشار</button></div>');bindForms(box)}
    box.hidden=!box.hidden});
  app.querySelectorAll("[data-rm]").forEach(b=>b.onclick=async()=>{
    if(!b.classList.contains("sure")){b.classList.add("sure");b.textContent="مطمئنید؟ دوباره بزنید";setTimeout(()=>{if(b.isConnected){b.classList.remove("sure");b.textContent="حذف از سایت"}},4000);return}
    const id=b.dataset.rm;b.disabled=true;if(!dropId(id))return;OVR.remove=(OVR.remove||[]).filter(x=>x!==id);OVR.remove.push(id);await publish();rerender()});
  app.querySelectorAll("[data-back]").forEach(b=>b.onclick=async()=>{const id=b.dataset.back;b.disabled=true;OVR.remove=(OVR.remove||[]).filter(x=>x!==id);undropId(id);await publish();rerender()});
  bindForms(app)}
function bindForms(root){
  root.querySelectorAll("form.nka-form").forEach(f=>f.onsubmit=async ev=>{ev.preventDefault();
    const a=(ev.submitter&&ev.submitter.dataset.a)||"save",id=f.dataset.id,vals=Object.fromEntries(new FormData(f));
    f.querySelectorAll("button").forEach(b=>b.disabled=true);
    if(a==="all"){const t=byId[id]||nById[id];if(t){const o=t.kind?{}:applySpec(t,vals);
        ["en","nq","desc"].forEach(k=>{if(k in vals){const v=String(vals[k]).trim();if(v||k==="desc"){o[k]=v;t[k]=v}}});
        OVR.edit[id]=Object.assign(OVR.edit[id]||{},o);
        const h=(t.kind?"#item-":"#carpet-")+id,ix=IDX.find(x=>x.h===h);if(ix){ix.t=t.en;ix.nq=t.nq;ix.name=norm(t.en+" "+t.nq+" "+(t.mean||""));ix.txt=allTxt(t)}}}
    else if(a==="spec"){const e=ADM.nospec.find(x=>x.id===id);e.spec={};FIELDS.forEach(([k])=>{if(String(vals[k]||"").trim())e.spec[k]=String(vals[k]).trim()})}
    else{const pe=(ADM.pubcheck||[]).find(x=>x.id===id),he=(ADM.check||[]).find(x=>x.id===id);
      if(pe){OVR.edit[id]=Object.assign(OVR.edit[id]||{},applySpec(byId[id],vals));if(a==="resolve")ADM.pubcheck=ADM.pubcheck.filter(x=>x!==pe)}
      else if(he){applySpec(he.c,vals);
        if(a==="approve"){he.c.notes=he.c.notes||"";OVR.add=(OVR.add||[]).filter(x=>x.id!==id);OVR.add.push(he.c);ADM.check=ADM.check.filter(x=>x!==he);applyOverrides({add:[he.c]})}}}
    await publish();rerender()})}

/* ---------- Farsi mode (only when signed in) ---------- */
const D={"Premium Carpets":"فرش‌های نفیس","Persian Kilims & Rugs":"گلیم و قالیچه","The Rug":"شناخت فرش","Heritage":"پیشینه","Trade":"همکاران","Contact":"تماس","Home":"خانه","Back":"بازگشت","Collection":"مجموعه","House":"خانهٔ نیکویی","Reach us":"راه‌های تماس","Phone":"تلفن","Email":"ایمیل","WhatsApp":"واتس‌اپ","Instagram":"اینستاگرام",
"Size":"اندازه","Type":"نوع","Colours":"رنگ‌ها","Colour":"رنگ","Design":"نقشه","Designer":"طراح","Weaver":"بافنده","Knots":"رج‌شمار","Materials":"جنس","Age":"قدمت","Condition":"توضیحات","Reference":"کد","Workshop":"کارگاه","Sort":"ترتیب","Clear":"پاک کردن","Clear filters":"پاک کردن فیلترها",
"Featured":"منتخب","Finest knot count":"ریزبافت‌ترین","Largest first":"بزرگ‌ترین","Smallest first":"کوچک‌ترین","Price on request":"قیمت با استعلام","Size on request":"اندازه با استعلام","On request":"با استعلام","Details and price on request":"جزئیات و قیمت با استعلام",
"Enquire on WhatsApp":"پرسش در واتس‌اپ","Add to selection":"افزودن به انتخاب‌ها","Remove from selection":"حذف از انتخاب‌ها","In your selection":"در انتخاب‌های شما","The collection":"مجموعه","ALL":"همه","All":"همه","Inspect full resolution":"دیدن با کیفیت کامل","Loading full resolution…":"در حال بارگذاری…","The story":"داستان فرش","About this piece":"دربارهٔ این فرش","Up close":"از نزدیک","Details":"جزئیات","Back to the collection":"بازگشت به مجموعه","More pieces":"فرش‌های دیگر","You may also like":"شاید بپسندید","Same workshop":"از همین کارگاه",
"View the collection":"دیدن مجموعه","See the premium carpets":"دیدن فرش‌های نفیس","Explore the premium carpets":"دیدن فرش‌های نفیس","Browse the premium carpets":"دیدن فرش‌های نفیس","Your selection":"انتخاب‌های شما","Your selection is empty.":"هنوز فرشی انتخاب نکرده‌اید.","Add more pieces":"افزودن فرش دیگر","Continue browsing":"ادامهٔ گشت‌وگذار",
"Isfahan carpets, from the source":"فرش اصفهان، از سرچشمه","Stocking Persian carpets?":"فروشندهٔ فرش ایرانی هستید؟","For retailers and designers":"برای فروشندگان و طراحان","Trade enquiry":"درخواست همکاری","Trade enquiry form":"فرم درخواست همکاری","Three generations in the Isfahan carpet trade":"سه نسل در تجارت فرش اصفهان","The anatomy of a Persian rug":"کالبدشناسی فرش ایرانی","The workshops behind the collection":"کارگاه‌های این مجموعه",
"Name":"نام","Name *":"نام *","First name *":"نام *","Last name *":"نام خانوادگی *","Email *":"ایمیل *","Phone or WhatsApp *":"تلفن یا واتس‌اپ *","WhatsApp or phone":"واتس‌اپ یا تلفن","Store or company *":"فروشگاه یا شرکت *","City *":"شهر *","City and country *":"شهر و کشور *","Country *":"کشور *","Postal code *":"کد پستی *","Province / State":"استان","Street address *":"نشانی *","Delivery address":"نشانی تحویل","Message":"پیام","Note":"یادداشت","Interested in":"علاقه‌مند به","About you":"دربارهٔ شما","Deliver to":"تحویل به",
"Send on WhatsApp":"ارسال در واتس‌اپ","Send by email":"ارسال با ایمیل","Open WhatsApp":"باز کردن واتس‌اپ","Copy text":"کپی متن","Copy request":"کپی درخواست","Prepare my enquiry":"آماده‌سازی درخواست","WhatsApp us":"پیام در واتس‌اپ","Our WhatsApp:":"واتس‌اپ ما:","Close":"بستن","Kilims":"گلیم‌ها","Pieces":"فرش‌ها","Selected pieces":"فرش‌های منتخب","Modern":"امروزی","Oldest":"کهن‌ترین","Finest":"ریزبافت‌ترین",
"Every piece hand-knotted. Photographs show the actual carpet.":"همهٔ فرش‌ها دستباف‌اند. عکس‌ها خودِ فرش را نشان می‌دهند.","© Nikouie Fine Rugs · Isfahan, Iran · Toronto, Canada":"© فرش نیکویی · اصفهان، ایران · تورنتو، کانادا","No payment is taken on the site.":"روی سایت هیچ پرداختی انجام نمی‌شود.","Knots per cm²":"گره در سانتی‌متر مربع","The signature":"امضای فرش","Direct from Isfahan":"مستقیم از اصفهان","Signed in Isfahan":"امضاشده در اصفهان",
"Carpet":"قالی","Carpets":"قالی","Rug":"قالیچه","Rugs":"قالیچه","Square":"مربع","Square carpet":"قالی مربع","Pictorial":"تابلو فرش","Pictorials":"تابلو فرش","Carpet (Ghali)":"قالی","Rug (Ghalicheh)":"قالیچه","Isfahan carpet":"قالی اصفهان","Pictorial (Tableau)":"تابلو فرش","Zar-o-nim":"ذرع‌ونیم","Zar-o-nim, one of a pair":"ذرع‌ونیم، جفت","Rug (Ghalicheh), pair":"قالیچه، جفت","Antique rug (Ghalicheh)":"قالیچهٔ آنتیک","Pardeh-i (curtain format)":"پرده‌ای","Isfahan":"اصفهان",
"Seirafian":"صیرفیان","Dardashti":"دردشتی","Haghighi":"حقیقی","Shahabpour":"شهاب‌پور","Hekmatnejad":"حکمت‌نژاد","Khajeh":"خواجه","Habib":"حبیب","Mirzaei":"میرزایی","Sarraf":"صراف","Mahdiee":"مهدیی","Mohaghegh":"محقق","Daei":"دایی","Zojaji":"زجاجی","Tavakoli":"توکلی",
"Ivory":"کرم","Navy":"سرمه‌ای","Green":"سبز","Red":"لاکی","Blue":"آبی","Gold":"طلایی","Black":"مشکی","Other":"سایر","All type":"همهٔ انواع","All colour":"همهٔ رنگ‌ها","All workshop":"همهٔ کارگاه‌ها","All size":"همهٔ اندازه‌ها","All types":"همهٔ انواع","All colours":"همهٔ رنگ‌ها","All workshops":"همهٔ کارگاه‌ها","All sizes":"همهٔ اندازه‌ها","Up to 2 m²":"تا ۲ متر مربع","2–5 m²":"۲ تا ۵ متر مربع","5–9 m²":"۵ تا ۹ متر مربع","9 m² and over":"۹ متر مربع و بیشتر"};
const RX=[[/^(\d+) of (\d+) pieces$/,(m,a,b)=>a+" از "+b+" فرش"],
  [/^(\d+) × (\d+) knots per cm²$/,(m,a,b)=>a+" × "+b+" گره در سانتی‌متر مربع"],
  [/^about ([\d,]+) per cm², ([\d,]+) per in²$/,(m,a,b)=>"حدود "+a+" گره در سانتی‌متر مربع"],
  [/^More from (.+)$/,(m,a)=>"بیشتر از کارگاه "+(D[a]||a)],
  [/^(.+) \((\d+)\)$/,(m,a,b)=>D[a]?D[a]+" ("+b+")":m],
  [/^(.+) · (Carpet|Rug|Square carpet|Pictorial)$/,(m,a,b)=>(D[a]||a)+" · "+D[b]],
  [/^About (\d+) years$/,(m,a)=>"حدود "+a+" سال"]];
function tr(t){const k=t.trim();if(!k||k.length>90)return null;let r=D[k];
  if(!r)for(const [re,fn] of RX){const m=k.match(re);if(m){r=fn.apply(null,m);if(r===k)r=null;break}}
  return r?t.replace(k,r):null}
function translate(root){if(!FA||!root)return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;return !p||/^(SCRIPT|STYLE|TEXTAREA|CODE)$/.test(p.tagName)||p.closest(".nka-flags,:not(html)[lang=fa]")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}});
  const L=[];while(w.nextNode())L.push(w.currentNode);
  L.forEach(n=>{const r=tr(n.nodeValue);if(r)n.nodeValue=r})}
let FA=false,mo=null;
function farsiOn(){if(FA)return;FA=true;const de=document.documentElement;de.lang="fa";de.dir="rtl";de.classList.add("fa");
  const l=document.createElement("link");l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600&display=swap";document.head.appendChild(l);
  translate(document.body);
  let q=false;mo=new MutationObserver(()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;translate(document.body)})});
  mo.observe(document.body,{childList:true,subtree:true})}

/* ---------- hooks used by route() ---------- */
window.NKA={
  is:h=>h==="login"||h==="admin",
  page:h=>ADM?adminPage():loginPage(),
  after:(h,key)=>{if(h==="login"||h==="admin")bind();if(FA)translate(document.body)}
};
const st=document.createElement("style");st.textContent=CSS;document.head.appendChild(st);
(async()=>{await loadOverrides();await resume();if(!ADM&&NKA.is(curHash()))route()})();
})();
