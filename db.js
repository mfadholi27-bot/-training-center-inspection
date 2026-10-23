/* Penyimpanan lokal IndexedDB; tidak mengirim data ke server. */
(function(){
  const DB_NAME="tc-inspection-local", DB_VERSION=1;
  let dbPromise;
  function openDB(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!("indexedDB" in window)){reject(new Error("Browser tidak mendukung IndexedDB."));return;}
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        for(const store of ["rooms","items","inspections"]){
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
  window.TCDB={
    all:store=>request(store,"readonly",s=>s.getAll()),
    get:(store,id)=>request(store,"readonly",s=>s.get(id)),
    put:(store,value)=>request(store,"readwrite",s=>s.put(value)),
    remove:(store,id)=>request(store,"readwrite",s=>s.delete(id)),
    clear:store=>request(store,"readwrite",s=>s.clear()),
    async mergeBackup(data){
      for(const store of ["rooms","items","inspections"]){
        if(Array.isArray(data[store])) for(const row of data[store]) if(row&&row.id) await this.put(store,row);
      }
    },
    async snapshot(){
      const [rooms,items,inspections]=await Promise.all([this.all("rooms"),this.all("items"),this.all("inspections")]);
      return {app:"Training Center Inspection",version:1,exportedAt:new Date().toISOString(),rooms,items,inspections,settings:{name:localStorage.getItem("tc-inspector-name")||""}};
    }
  };
})();