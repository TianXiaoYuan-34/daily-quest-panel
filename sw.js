const CACHE='daily-quest-v3';
const ASSETS=['./index.html','./boss.html','./manifest.webmanifest','./icon.svg','./sync.js'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

async function networkFirst(request,fallback){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(request,copy));
    }
    return response;
  }catch(_){
    return (await caches.match(request)) || (fallback ? await caches.match(fallback) : null) || new Response('Offline',{status:503});
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'){
    event.respondWith(networkFirst(event.request,'./index.html'));
    return;
  }
  if(url.origin===self.location.origin && (url.pathname.endsWith('/sync.js') || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/boss.html'))){
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(resp=>{
    const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return resp;
  })));
});
