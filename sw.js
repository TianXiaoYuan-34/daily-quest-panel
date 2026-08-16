const CACHE='daily-quest-v2';
const ASSETS=['./index.html','./manifest.webmanifest','./icon.svg','./sync.js'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

async function appHtml(){
  let response;
  try{response=await fetch('./index.html',{cache:'no-store'});}catch(_){response=await caches.match('./index.html');}
  if(!response)return new Response('Offline',{status:503});
  let html=await response.text();
  if(!html.includes('src="./sync.js"')&&!html.includes("src='./sync.js'"))html=html.replace('</body>','<script src="./sync.js"></script></body>');
  return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  if(event.request.mode==='navigate'){
    event.respondWith(appHtml());
    return;
  }
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(resp=>{
    const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return resp;
  })));
});