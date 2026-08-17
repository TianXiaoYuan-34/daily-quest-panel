(() => {
  const SUPABASE_URL = 'https://vzfhhoxvfnkvmkdheode.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_dJGDgDKxhOJE1z2fyMQR2g_famclonT';
  const REDIRECT_TO = 'https://tianxiaoyuan-34.github.io/daily-quest-panel/';
  let client = null;
  let syncTimer = null;
  let lastSession = null;

  function addStyles(){
    const style=document.createElement('style');
    style.textContent=`.sync-panel{border-color:#31536f;background:linear-gradient(145deg,#0e1b2d,#101827)}.sync-line{display:flex;justify-content:space-between;gap:10px;align-items:center}.sync-state{font-size:11px;color:#8fa2ba;line-height:1.45}.sync-ok{color:#46e6a8}.sync-warn{color:#ffb454}.sync-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.sync-actions button{min-height:40px}.sync-user{font:700 11px ui-monospace,SFMono-Regular,Menlo,monospace;color:#61d9ff}.boss-native-link{position:absolute;inset:0;z-index:20;border-radius:14px;text-indent:-9999px;overflow:hidden}.boss-codex-link{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:14px;padding:13px 14px;border:1px solid #705f32;border-radius:12px;background:linear-gradient(145deg,#241f13,#111827);color:#e8bd62;text-decoration:none;font-weight:800;min-height:52px}.boss-codex-link small{display:block;color:#9db1c9;font-size:10px;font-weight:600;margin-top:3px}.boss-codex-link:active{transform:scale(.985)}`;
    document.head.appendChild(style);
  }

  function fixBossLink(){
    const grade=document.getElementById('bossEntry')||document.querySelector('.grade');
    if(!grade || grade.querySelector('.boss-native-link')) return;
    grade.style.position='relative';
    const a=document.createElement('a');
    a.className='boss-native-link';
    a.href='./boss.html';
    a.setAttribute('aria-label','打开 BOSS CODEX');
    a.textContent='BOSS CODEX';
    grade.appendChild(a);
  }

  function addPanel(){
    const main=document.querySelector('main.app');
    if(!main || document.getElementById('syncPanel')) return;
    const first=main.querySelector('section.panel');
    const sec=document.createElement('section');
    sec.className='panel sync-panel'; sec.id='syncPanel';
    sec.innerHTML=`<div class="section-title">// PRIVATE SYNC</div><div class="sync-line"><div><div class="qname">小查云同步</div><div id="syncState" class="sync-state">正在初始化登录…</div><div id="syncUser" class="sync-user"></div></div><div id="syncDot" class="tag">LOCAL</div></div><div class="sync-actions"><button id="loginBtn">使用 GitHub 登录</button><button id="syncBtn" style="display:none">立即同步</button><button id="logoutBtn" style="display:none">退出登录</button></div><a class="boss-codex-link" href="./boss.html"><span>😈 BOSS CODEX<small>七宗罪图鉴</small></span><span aria-hidden="true">→</span></a>`;
    first.insertAdjacentElement('afterend',sec);
    document.getElementById('loginBtn').onclick=login;
    document.getElementById('logoutBtn').onclick=logout;
    document.getElementById('syncBtn').onclick=()=>syncNow(true);
  }

  function setState(text, kind=''){
    const el=document.getElementById('syncState'); if(!el)return;
    el.textContent=text; el.className='sync-state '+(kind==='ok'?'sync-ok':kind==='warn'?'sync-warn':'');
  }

  function setSessionUI(session){
    lastSession=session||null;
    const login=document.getElementById('loginBtn'), logout=document.getElementById('logoutBtn'), sync=document.getElementById('syncBtn'), dot=document.getElementById('syncDot'), user=document.getElementById('syncUser');
    if(!login)return;
    if(session){
      const meta=session.user?.user_metadata||{};
      const name=meta.user_name||meta.preferred_username||meta.login||session.user?.email||'已登录';
      login.style.display='none'; logout.style.display='inline-block'; sync.style.display='inline-block';
      dot.textContent='CLOUD'; dot.style.color='#46e6a8'; user.textContent=name;
      setState('已登录，打卡会自动同步。','ok');
    }else{
      login.style.display='inline-block'; logout.style.display='none'; sync.style.display='none';
      dot.textContent='LOCAL'; dot.style.color=''; user.textContent='';
      setState('未登录：打卡只保存在这台 iPhone。','warn');
    }
  }

  async function loadSupabase(){
    if(window.supabase?.createClient) return window.supabase;
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
    });
    return window.supabase;
  }

  async function login(){
    if(!client)return;
    setState('正在跳转到 GitHub 登录…');
    const {error}=await client.auth.signInWithOAuth({provider:'github',options:{redirectTo:REDIRECT_TO}});
    if(error)setState('登录启动失败：'+error.message,'warn');
  }

  async function logout(){
    if(!client)return;
    await client.auth.signOut();
    setSessionUI(null);
  }

  function payload(){
    if(typeof getToday!=='function' || typeof dayKey!=='function') return null;
    const rec=getToday();
    return {day_key:dayKey(),done:Array.isArray(rec.done)?rec.done:[],xp:Number(rec.xp||0),completed:!!rec.completed,timer_left:Number.isFinite(rec.timerLeft)?rec.timerLeft:1200};
  }

  async function syncNow(showMessage=false){
    if(!client || !lastSession) return;
    const body=payload(); if(!body)return;
    if(showMessage)setState('正在同步…');
    const {data,error}=await client.functions.invoke('daily-quest-sync',{body});
    if(error){setState('同步失败，记录仍安全保存在本机。','warn');return;}
    const t=new Date(data?.synced_at||Date.now()).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    setState(`已同步 · ${t}`,'ok');
  }

  function scheduleSync(){
    clearTimeout(syncTimer);
    syncTimer=setTimeout(()=>syncNow(false),700);
  }

  async function init(){
    addStyles(); fixBossLink(); addPanel();
    try{
      const sdk=await loadSupabase();
      client=sdk.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,detectSessionInUrl:true,autoRefreshToken:true}});
      const {data:{session}}=await client.auth.getSession();
      setSessionUI(session);
      client.auth.onAuthStateChange((_event,s)=>{setSessionUI(s); if(s)setTimeout(()=>syncNow(false),250)});
      if(session)setTimeout(()=>syncNow(false),250);

      if(typeof window.update==='function'){
        const original=window.update;
        window.update=function(){const r=original.apply(this,arguments);scheduleSync();return r;};
      }
    }catch(e){setState('同步模块加载失败，当前仍可正常本地打卡。','warn');}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();