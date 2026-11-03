/* Penyimpanan lokal IndexedDB; tidak mengirim data ke server. */
(function(){
  const DB_NAME="tc-inspection-local", DB_VERSION=5;
  let dbPromise, backupTimer, backupRunning=false;
  function openDB(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!("indexedDB" in window)){reject(new Error("Browser tidak mendukung IndexedDB."));return;}
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        for(const store of ["rooms","items","inspections","audit","movements","backups"]){
          if(!db.objectStoreNames.contains(store)) db.createObjectStore(store,{keyPath:"id"});
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error("Database tidak dapat dibuka."));
    });
    return dbPromise;
  }
  async function request(store,mode,action){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,mode), objectStore=tx.objectStore(store);
      let req;
      try{req=action(objectStore);}catch(e){reject(e);return;}
      if(req){req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);}
      else{tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);}
    });
  }
  function scheduleAutoBackup(){clearTimeout(backupTimer);backupTimer=setTimeout(()=>autoBackupNow().catch(console.warn),1800)}
  async function autoBackupNow(){
    if(backupRunning)return false;
    backupRunning=true;
    try{
      const data=await window.TCDB.snapshot(),at=new Date().toISOString();
      await request("backups","readwrite",s=>s.put({id:"auto-"+at,at,data}));
      const rows=(await request("backups","readonly",s=>s.getAll())).sort((a,b)=>new Date(b.at)-new Date(a.at));
      for(const old of rows.slice(4))await request("backups","readwrite",s=>s.delete(old.id));
      return true;
    }finally{backupRunning=false}
  }
  window.TCDB={
    all:store=>request(store,"readonly",s=>s.getAll()),
    get:(store,id)=>request(store,"readonly",s=>s.get(id)),
    async put(store,value){const v=await request(store,"readwrite",s=>s.put(value));if(store!=="backups")scheduleAutoBackup();return v},
    async remove(store,id){const v=await request(store,"readwrite",s=>s.delete(id));if(store!=="backups")scheduleAutoBackup();return v},
    async log(action,entity,recordId,details={}){
      const row={id:(crypto.randomUUID?crypto.randomUUID():"audit-"+Date.now()+"-"+Math.random().toString(16).slice(2)),action,entity,recordId,details,by:localStorage.getItem("tc-inspector-name")||"Pemeriksa",at:new Date().toISOString()};
      return this.put("audit",row);
    },
    async clear(store){const v=await request(store,"readwrite",s=>s.clear());if(store!=="backups")scheduleAutoBackup();return v},
    autoBackupNow,
    listBackups:()=>request("backups","readonly",s=>s.getAll()),
    async mergeBackup(data){
      for(const store of ["rooms","items","inspections","audit","movements"]){
        if(Array.isArray(data[store])) for(const row of data[store]) if(row&&row.id) await this.put(store,row);
      }
    },
    async snapshot(){
      const [rooms,items,inspections,movements]=await Promise.all([this.all("rooms"),this.all("items"),this.all("inspections"),this.all("movements")]);
      const audit=await this.all("audit");
      return {app:"Training Center Inspection",version:4,exportedAt:new Date().toISOString(),rooms,items,inspections,movements,audit,settings:{name:localStorage.getItem("tc-inspector-name")||""}};
    }
  };
})();