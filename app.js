(()=>{"use strict";
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const state={page:"home",history:["home"],busy:false,editingRoom:null,editingItem:null,editingInspection:null};
const labels={home:"Beranda",rooms:"Data Ruangan",inventory:"Inventaris",inspection:"Pemeriksaan",history:"Riwayat",settings:"Pengaturan & Backup"};
let toastTimer;
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600)}
function esc(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function id(){return crypto.randomUUID?crypto.randomUUID():"id-"+Date.now()+"-"+Math.random().toString(16).slice(2)}
function dateLabel(value){try{return new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}catch{return value||""}}
function statusClass(v){return v==="Baik"?"good":/Rusak Berat|Hilang/.test(v)?"bad":/Perbaikan|Ringan|Ditemukan/.test(v)?"warn":""}
function showPage(name,fromPop=false){
  if(!labels[name])return;
  const old=state.page, oldIndex=Object.keys(labels).indexOf(old), newIndex=Object.keys(labels).indexOf(name);
  if(old!==name&&!fromPop){state.history.push(name);if(state.history.length>30)state.history.shift()}
  $$(".page").forEach(p=>{p.classList.remove("active");p.style.setProperty("--enter",newIndex>=oldIndex?"24px":"-24px")});
  const page=$("#page-"+name);if(page){page.classList.add("active");page.scrollTop=0}
  state.page=name;
  $$("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
  closeMenu();window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  if(name==="rooms"||name==="inventory"||name==="history")refresh();
  if(name==="inspection")fillRoomSelects();
}
function openMenu(){const m=$("#sideMenu");m.classList.add("open");m.setAttribute("aria-hidden","false");$("#menuOverlay").classList.add("show");$("#menuToggle").setAttribute("aria-expanded","true")}
function closeMenu(){const m=$("#sideMenu");if(!m)return;m.classList.remove("open");m.setAttribute("aria-hidden","true");$("#menuOverlay").classList.remove("show");$("#menuToggle").setAttribute("aria-expanded","false")}
$$("[data-page]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
$("#menuToggle").addEventListener("click",openMenu);$("#menuClose").addEventListener("click",closeMenu);$("#menuOverlay").addEventListener("click",closeMenu);
$("#profileButton").addEventListener("click",()=>{showPage("settings");$("#profileName").focus()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});
let touchStart=null;
document.addEventListener("touchstart",e=>{if(e.touches.length===1)touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
document.addEventListener("touchend",e=>{if(!touchStart)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;const start=touchStart.x;touchStart=null;if(Math.abs(dx)<85||Math.abs(dx)<Math.abs(dy)*1.25)return;if($("#sideMenu").classList.contains("open")){if(dx<0)closeMenu();return}if(start<24&&dx>90){openMenu();return}const order=["home","rooms","inventory","inspection","history","settings"],i=order.indexOf(state.page);if(dx<0&&i<order.length-1)showPage(order[i+1]);else if(dx>0&&i>0)showPage(order[i-1]);},{passive:true});
window.addEventListener("popstate",()=>{const previous=state.history.pop()||"home";showPage(previous,true)});

async function refresh(){
 try{
  const [rooms,items,inspections]=await Promise.all([TCDB.all("rooms"),TCDB.all("items"),TCDB.all("inspections")]);
  $("#roomCount").textContent=rooms.length;$("#itemCount").textContent=items.length;
  $("#repairCount").textContent=items.filter(x=>x.condition!=="Baik").length+inspections.filter(x=>x.result!=="Baik").length;
  $("#inspectionCount").textContent=inspections.length;
  renderRooms(rooms);renderItems(items,rooms);renderHistory(inspections,rooms);renderRecent(inspections.filter(x=>!x.archivedAt),rooms);fillRoomSelects(rooms);renderAudit();
 }catch(e){console.error(e);toast("Database belum siap. Muat ulang halaman.");}
}
function renderRooms(rooms){
 const q=($("#roomSearch")?.value||"").toLowerCase();
 const showArchived=$("#showArchivedRooms")?.checked||false;
 const list=rooms.filter(r=>showArchived?!!r.archivedAt:!r.archivedAt).filter(r=>(r.name+" "+(r.building||"")+" "+(r.floor||"")).toLowerCase().includes(q));
 $("#roomList").innerHTML=list.length?list.map(r=>`<article class="record-card glass"><div class="record-icon">▦</div><div class="record-main"><h3>${esc(r.name)}</h3><p>${esc([r.building,r.floor].filter(Boolean).join(" · ")||"Lokasi belum diisi")}</p><div class="record-meta">Dibuat ${dateLabel(r.createdAt)}</div><div class="record-actions"><button class="mini-button" data-edit-room="${esc(r.id)}">✏️ Edit</button>${r.archivedAt?`<button class="mini-button" data-restore-room="${esc(r.id)}">Pulihkan</button>`:`<button class="mini-button danger" data-archive-room="${esc(r.id)}">Arsipkan</button>`}<button class="mini-button danger" data-delete-room="${esc(r.id)}">Hapus</button></div></div></article>`).join(""):`<div class="empty-state">Belum ada ruangan. Tekan <b>Tambah</b> untuk mencatat ruangan pertama.</div>`;
}
function inventoryGroup(item){
 const raw=String(item.category||"Lainnya").trim(),name=String(item.name||"").toLowerCase();
 if(/^(furniture|peralatan kelas|perlengkapan kelas)$/i.test(raw)||/\b(meja|kursi|papan tulis|whiteboard|podium|lemari kelas|meja guru|bangku)\b/.test(name))return "Perlengkapan Kelas";
 return raw||"Lainnya";
}
function renderItems(items,rooms){
 const q=($("#itemSearch")?.value||"").toLowerCase(),cf=$("#itemConditionFilter")?.value||"",roomMap=new Map(rooms.map(r=>[r.id,r.name]));
 const showArchived=$("#showArchivedItems")?.checked||false;
 const list=items.filter(i=>showArchived?!!i.archivedAt:!i.archivedAt).filter(i=>(i.name+" "+(i.code||"")+" "+inventoryGroup(i)+" "+(i.category||"")+" "+(roomMap.get(i.roomId)||"")).toLowerCase().includes(q)&&(!cf||i.condition===cf));
 const groups=new Map();list.forEach(i=>{const c=inventoryGroup(i);if(!groups.has(c))groups.set(c,[]);groups.get(c).push(i)});
 const preferred=["Perlengkapan Kelas","Elektronik","Jaringan & IT","Kebersihan","Keselamatan","Utilitas","Lainnya"];
 const keys=[...groups.keys()].sort((a,b)=>{const x=preferred.indexOf(a),y=preferred.indexOf(b);return(x<0?99:x)-(y<0?99:y)||a.localeCompare(b,"id")});
 $("#itemList").innerHTML=list.length?keys.map(category=>{
 const rows=groups.get(category);
 const cards=rows.map(i=>`<article class="record-card glass"><div class="record-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M8 4v16M16 4v16M3.5 9.3h17M3.5 14.7h17"/></svg></div><div class="record-main"><h3>${esc(i.name)}</h3><p>${esc(i.code||"Tanpa kode")} · ${esc(i.category||"Lainnya")}</p><p>${esc(roomMap.get(i.roomId)||"Ruangan belum ditentukan")}</p><span class="status ${statusClass(i.condition)}">${esc(i.condition)}</span>${i.note?`<p style="margin-top:8px">${esc(i.note)}</p>`:""}${Array.isArray(i.conditionHistory)&&i.conditionHistory.length?`<details class="condition-history"><summary>Riwayat kondisi (${i.conditionHistory.length})</summary>${i.conditionHistory.slice().reverse().map(h=>`<p class="record-meta">${esc(h.from)} → ${esc(h.to)} · ${dateLabel(h.at)}</p>`).join("")}</details>`:""}<div class="record-actions"><button class="mini-button" data-edit-item="${esc(i.id)}">✏️ Edit data</button>${i.archivedAt?`<button class="mini-button" data-restore-item="${esc(i.id)}">Pulihkan</button>`:`<button class="mini-button danger" data-archive-item="${esc(i.id)}">Arsipkan</button>`}<button class="mini-button danger" data-delete-item="${esc(i.id)}">Hapus</button></div></div></article>`).join("");
 return `<section class="inventory-group"><details class="inventory-category" ${q?"open":""}><summary><span class="category-title"><span class="category-symbol"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M8 4v16M16 4v16M3.5 9.3h17M3.5 14.7h17"/></svg></span><span><strong>${esc(category)}</strong><small>${rows.length} barang</small></span></span><span class="category-chevron">⌄</span></summary><div class="inventory-group-items">${cards}</div></details></section>`;
 }).join(""):`<div class="empty-state">Tidak ada barang yang cocok dengan pencarian atau filter.</div>`;
}
function renderHistory(inspections,rooms){
 const map=new Map(rooms.map(r=>[r.id,r.name]));inspections.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
 const showArchived=$("#showArchivedInspections")?.checked||false;inspections=inspections.filter(x=>showArchived?!!x.archivedAt:!x.archivedAt);
 $("#historyList").innerHTML=inspections.length?inspections.map(x=>`<article class="record-card glass"><div class="record-icon">✓</div><div class="record-main"><h3>${esc(x.type)} · ${esc(x.roomNameSnapshot||map.get(x.roomId)||"Tanpa ruangan")}</h3><p>Pemeriksa: ${esc(x.inspector)}</p>${x.itemName?`<p>Barang: ${esc(x.itemName)}${x.itemCode?` · ${esc(x.itemCode)}`:""}${x.itemCategory?` · Kategori: ${esc(x.itemCategory)}`:""}</p>`:""}<span class="status ${statusClass(x.result)}">${esc(x.result)}</span>${x.note?`<p style="margin-top:8px">${esc(x.note)}</p>`:""}${x.photo?`<details class="history-photo"><summary><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5 17 5-5 3 3 2-2 4 4"/></svg><span>Lihat foto dokumentasi</span></summary><img alt="Foto pemeriksaan" loading="lazy" src="${x.photo}"></details>`:`<p class="record-meta">Tidak ada foto dokumentasi</p>`}<div class="record-meta">${dateLabel(x.createdAt)}</div><div class="record-actions"><button class="mini-button" data-edit-inspection="${esc(x.id)}">✏️ Edit</button>${x.archivedAt?`<button class="mini-button" data-restore-inspection="${esc(x.id)}">Pulihkan</button>`:`<button class="mini-button danger" data-archive-inspection="${esc(x.id)}">Arsipkan</button>`}<button class="mini-button danger" data-delete-inspection="${esc(x.id)}">Hapus</button></div></div></article>`).join(""):`<div class="empty-state">Belum ada riwayat pemeriksaan yang tersimpan.</div>`;
}
function renderRecent(inspections,rooms){
 const map=new Map(rooms.map(r=>[r.id,r.name]));const recent=[...inspections.filter(x=>!x.archivedAt)].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,3);
 $("#recentActivity").innerHTML=recent.length?recent.map(x=>`<article class="activity-card glass"><div class="activity-mark">✓</div><div class="activity-body"><strong>${esc(x.type)} · ${esc(x.roomNameSnapshot||map.get(x.roomId)||"Tanpa ruangan")}</strong><p>${esc(x.result)} — ${esc(x.inspector)}</p></div><span class="activity-time">${dateLabel(x.createdAt)}</span></article>`).join(""):`<div class="empty-state">Belum ada aktivitas. Hasil pemeriksaan yang disimpan akan muncul di sini.</div>`;
}
async function fillRoomSelects(rooms){
 rooms=(rooms||await TCDB.all("rooms")).filter(r=>!r.archivedAt);const opts=rooms.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join("");
 const currentItemRoom=$("#itemRoom").value,currentInspectionRoom=$("#inspectionRoom").value;
 $("#itemRoom").innerHTML='<option value="">Belum ditentukan</option>'+opts;$("#itemRoom").value=currentItemRoom;
 $("#inspectionRoom").innerHTML='<option value="">Pilih ruangan (opsional)</option>'+opts;$("#inspectionRoom").value=currentInspectionRoom;
 await refreshInspectionItemSelect();
}
async function refreshInspectionItemSelect(selectedId){
 const select=$("#inspectionItem");if(!select)return;
 const type=$("#inspectionType").value,roomId=$("#inspectionRoom").value;
 const visible=type==="Inventaris barang";$("#inspectionItemWrap").classList.toggle("hidden",!visible);$("#inspectionCategoryWrap").classList.toggle("hidden",!visible);$("#inspectionItemHelp").classList.toggle("hidden",!visible);select.required=visible;
 if(!visible){select.innerHTML='<option value="">Tidak terkait barang tertentu</option>';return}
 const [items,rooms]=await Promise.all([TCDB.all("items"),TCDB.all("rooms")]);
 const roomMap=new Map(rooms.map(r=>[r.id,r.name]));
 const roomItems=items.filter(i=>!i.archivedAt&&(!roomId||i.roomId===roomId));
 const categorySelect=$("#inspectionCategory"),previousCategory=categorySelect.value;
 const categories=[...new Set(roomItems.map(i=>(i.category||"Lainnya").trim()||"Lainnya"))].sort((a,b)=>a.localeCompare(b,"id"));
 categorySelect.innerHTML='<option value="">Semua kategori</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
 if(categories.includes(previousCategory))categorySelect.value=previousCategory;
 const category=categorySelect.value;
 const list=roomItems.filter(i=>!category||(i.category||"Lainnya").trim()===category).sort((a,b)=>(a.name||"").localeCompare(b.name||"","id",{numeric:true}));
 select.innerHTML='<option value="">Pilih barang yang diperiksa</option>'+list.map(i=>`<option value="${esc(i.id)}">${esc(i.name)}${i.code?` · ${esc(i.code)}`:""} — ${esc(roomMap.get(i.roomId)||"Tanpa ruangan")}</option>`).join("");
 if(selectedId)select.value=selectedId;
 $("#inspectionItemHelp").textContent=list.length?`${list.length} barang ditampilkan${category?` dalam kategori ${category}`:" dari semua kategori"}${roomId?" di ruangan terpilih":""}.`:(roomItems.length?"Tidak ada barang pada kategori ini.":(roomId?"Belum ada inventaris aktif di ruangan ini. Tambahkan barang terlebih dahulu.":"Belum ada inventaris aktif. Tambahkan barang terlebih dahulu."));
}
function resetRoomForm(){state.editingRoom=null;$("#roomForm").reset();$("#roomFormTitle").textContent="Ruangan baru";$("#roomForm").classList.add("hidden");$("#roomForm").querySelector('button[type="submit"]').textContent="Simpan Ruangan"}
function resetItemForm(){state.editingItem=null;$("#itemForm").reset();$("#itemFormTitle").textContent="Barang inventaris";$("#bulkRangeFields").classList.toggle("hidden",!$("#bulkItemMode").checked);$("#singleItemCodeField").classList.toggle("hidden",$("#bulkItemMode").checked);$("#itemForm").classList.add("hidden");$("#itemForm").querySelector('button[type="submit"]').textContent="Simpan Barang"}
function resetInspectionEdit(){state.editingInspection=null;$("#inspectionForm").reset();$("#inspectionFormTitle").textContent="Catat pemeriksaan";$("#inspectionSubmit").innerHTML='Simpan Pemeriksaan <span>→</span>';$("#cancelInspectionEdit").classList.add("hidden");$("#inspectorName").value=localStorage.getItem("tc-inspector-name")||""}
$("#addRoomBtn").addEventListener("click",()=>{if(!$("#roomForm").classList.contains("hidden")){resetRoomForm();return}resetRoomForm();$("#roomForm").classList.remove("hidden");$("#roomName").focus()});
$("#addItemBtn").addEventListener("click",async()=>{await fillRoomSelects();if(!$("#itemForm").classList.contains("hidden")){resetItemForm();return}resetItemForm();$("#itemForm").classList.remove("hidden");$("#itemName").focus()});
$$("[data-cancel]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.cancel==="roomForm")resetRoomForm();else if(b.dataset.cancel==="itemForm")resetItemForm();else $("#"+b.dataset.cancel).classList.add("hidden")}));
$("#cancelInspectionEdit").addEventListener("click",resetInspectionEdit);
$("#roomForm").addEventListener("submit",async e=>{e.preventDefault();if(state.busy)return;const btn=$("#roomForm").querySelector('button[type="submit"]');state.busy=true;btn.disabled=true;const original=state.editingRoom?"Simpan Perubahan":"Simpan Ruangan";btn.textContent="Menyimpan…";try{const now=new Date().toISOString(),old=state.editingRoom?await TCDB.get("rooms",state.editingRoom):null,row={...(old||{}),id:old?.id||id(),name:$("#roomName").value.trim(),building:$("#roomBuilding").value.trim(),floor:$("#roomFloor").value.trim(),createdAt:old?.createdAt||now,updatedAt:now};if(!row.name){toast("Nama ruangan wajib diisi.");return}const rooms=await TCDB.all("rooms");if(rooms.some(r=>r.id!==row.id&&!r.archivedAt&&r.name.trim().toLowerCase()===row.name.toLowerCase())){toast("Nama ruangan sudah digunakan.");return}await TCDB.put("rooms",row);await TCDB.log(old?"EDIT":"TAMBAH","Ruangan",row.id,{name:row.name});resetRoomForm();await refresh();toast(old?"Perubahan ruangan disimpan.":"Ruangan berhasil disimpan.")}catch(err){console.error(err);toast("Gagal menyimpan ruangan. Data tetap di formulir; coba lagi.")}finally{state.busy=false;btn.disabled=false;if(!$("#roomForm").classList.contains("hidden"))btn.textContent=state.editingRoom?"Simpan Perubahan":"Simpan Ruangan"}});
$("#itemName").addEventListener("input",e=>{const n=e.target.value.toLowerCase();if(/\b(meja|kursi|papan tulis|whiteboard|podium|lemari kelas|meja guru|bangku)\b/.test(n))$("#itemCategory").value="Perlengkapan Kelas";});
$("#bulkItemMode").addEventListener("change",()=>{const bulk=$("#bulkItemMode").checked;$("#bulkRangeFields").classList.toggle("hidden",!bulk);$("#singleItemCodeField").classList.toggle("hidden",bulk);$("#itemCode").required=false;});
$("#inspectionRoom").addEventListener("change",()=>refreshInspectionItemSelect());
$("#inspectionType").addEventListener("change",()=>refreshInspectionItemSelect());
$("#inspectionCategory").addEventListener("change",()=>refreshInspectionItemSelect());
$("#itemForm").addEventListener("submit",async e=>{
 e.preventDefault();if(state.busy)return;
 const btn=$("#itemForm").querySelector('button[type="submit"]');state.busy=true;btn.disabled=true;btn.textContent="Menyimpan…";
 try{
  const name=$("#itemName").value.trim();if(!name){toast("Nama barang wajib diisi.");return}
  const items=await TCDB.all("items"),old=state.editingItem?await TCDB.get("items",state.editingItem):null,now=new Date().toISOString();
  const bulk=$("#bulkItemMode").checked&&!old;
  if(bulk){
   const start=Number($("#itemNumberStart").value),end=Number($("#itemNumberEnd").value);
   if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start){toast("Periksa nomor awal dan nomor akhir.");return}
   if(end-start+1>200){toast("Maksimal 200 barang dalam satu kali simpan.");return}
   const existingNames=new Set(items.filter(i=>!i.archivedAt).map(i=>(i.name||"").trim().toLowerCase()));
   const existingCodes=new Set(items.map(i=>(i.code||"").toLowerCase()));let created=0,skipped=0;
   for(let n=start;n<=end;n++){
    const numberedName=`${name} ${String(n).padStart(2,"0")}`;
    if(existingNames.has(numberedName.toLowerCase())){skipped++;continue}
    let code;do{code="TC-"+String(Date.now()).slice(-6)+String(Math.floor(Math.random()*90+10))}while(existingCodes.has(code.toLowerCase()));existingCodes.add(code.toLowerCase());
    const row={id:id(),name:numberedName,code,category:$("#itemCategory").value,roomId:$("#itemRoom").value,condition:$("#itemCondition").value,note:$("#itemNote").value.trim(),conditionHistory:[],createdAt:now,updatedAt:now};
    await TCDB.put("items",row);created++;existingNames.add(numberedName.toLowerCase());
   }
   resetItemForm();await refresh();toast(`${created} barang berhasil ditambahkan${skipped?`; ${skipped} nama sudah ada dilewati`:""}.`);return;
  }
  const manualCode=$("#itemCode").value.trim();let code=manualCode||old?.code||"";
  if(!code){do{code="TC-"+String(Date.now()).slice(-6)+String(Math.floor(Math.random()*90+10))}while(items.some(i=>(i.code||"").toLowerCase()===code.toLowerCase()))}
  if(items.some(i=>i.id!==(old?.id||"")&&!i.archivedAt&&(i.code||"").toLowerCase()===code.toLowerCase())){toast("Kode barang sudah digunakan. Periksa kembali.");return}
  const condition=$("#itemCondition").value,history=Array.isArray(old?.conditionHistory)?old.conditionHistory:[];
  if(old&&old.condition!==condition)history.push({from:old.condition,to:condition,at:now,by:localStorage.getItem("tc-inspector-name")||"Pemeriksa"});
  const row={...(old||{}),id:old?.id||id(),name,code,category:$("#itemCategory").value,roomId:$("#itemRoom").value,condition,note:$("#itemNote").value.trim(),conditionHistory:history,createdAt:old?.createdAt||now,updatedAt:now};
  await TCDB.put("items",row);try{await TCDB.log(old?"EDIT":"TAMBAH","Inventaris",row.id,{name,code,condition})}catch(logErr){console.warn("Riwayat perubahan tidak tersimpan",logErr)}
  resetItemForm();await refresh();toast(old?"Data inventaris diperbarui.":"Inventaris tersimpan dengan kode "+code);
 }catch(err){console.error(err);toast("Gagal menyimpan barang. Data tetap di formulir; coba lagi.")}
 finally{state.busy=false;btn.disabled=false;if(!$("#itemForm").classList.contains("hidden"))btn.textContent=state.editingItem?"Simpan Perubahan":"Simpan Barang"}
});
$("#inspectionForm").addEventListener("submit",async e=>{
 e.preventDefault();if(state.busy)return;state.busy=true;const btn=$("#inspectionSubmit");btn.disabled=true;btn.textContent="Menyimpan…";
 try{
  const type=$("#inspectionType").value,selectedItemId=type==="Inventaris barang"?$("#inspectionItem").value:"";
  if(type==="Inventaris barang"&&!selectedItemId){toast("Pilih barang yang diperiksa terlebih dahulu.");return}
  const file=$("#inspectionPhoto").files[0];let photo=state.editingInspection?(await TCDB.get("inspections",state.editingInspection))?.photo||"":"";if(file)photo=await compressImage(file);
  const old=state.editingInspection?await TCDB.get("inspections",state.editingInspection):null,now=new Date().toISOString();
  const selectedItem=selectedItemId?await TCDB.get("items",selectedItemId):null;
  const roomId=selectedItem?.roomId||$("#inspectionRoom").value||"";
  const roomsNow=await TCDB.all("rooms");
  const roomNameSnapshot=roomsNow.find(r=>r.id===roomId)?.name||"Tanpa ruangan";
  const row={...(old||{}),id:old?.id||id(),inspector:$("#inspectorName").value.trim(),roomId,roomNameSnapshot,type,itemId:selectedItem?.id||"",itemName:selectedItem?.name||"",itemCode:selectedItem?.code||"",itemCategory:selectedItem?.category||"",result:$("#inspectionResult").value,note:$("#inspectionNote").value.trim(),photo,createdAt:old?.createdAt||now,updatedAt:now};
  if(!row.inspector){toast("Nama pemeriksa wajib diisi.");return}
  await TCDB.put("inspections",row);try{await TCDB.log(old?"EDIT":"TAMBAH","Pemeriksaan",row.id,{type:row.type,result:row.result,itemName:row.itemName})}catch(logErr){console.warn("Riwayat perubahan tidak tersimpan",logErr)}
  resetInspectionEdit();await refresh();toast(old?"Pemeriksaan diperbarui.":"Pemeriksaan tersimpan di perangkat.");showPage("history");
 }catch(err){console.error(err);toast("Gagal menyimpan. Periksa ruang penyimpanan perangkat.")}
 finally{state.busy=false;btn.disabled=false;if(!state.editingInspection)btn.innerHTML='Simpan Pemeriksaan <span>→</span>';else btn.textContent="Simpan Perubahan"}
});
async function compressImage(file){if(!file.type.startsWith("image/"))throw new Error("Berkas bukan gambar");if(file.size>15*1024*1024)throw new Error("Foto terlalu besar; pilih foto di bawah 15 MB");const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});return new Promise(resolve=>{const img=new Image();img.onload=()=>{const max=1000,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.72))};img.onerror=()=>resolve(data);img.src=data})}
async function openEditRoom(idValue){const r=await TCDB.get("rooms",idValue);if(!r)return;state.editingRoom=r.id;$("#roomName").value=r.name||"";$("#roomBuilding").value=r.building||"";$("#roomFloor").value=r.floor||"";$("#roomFormTitle").textContent="Edit data ruangan";$("#roomForm").querySelector('button[type="submit"]').textContent="Simpan Perubahan";$("#roomForm").classList.remove("hidden");$("#roomName").focus();window.scrollTo({top:0,behavior:"smooth"})}
async function openEditItem(idValue){const i=await TCDB.get("items",idValue);if(!i)return;await fillRoomSelects();state.editingItem=i.id;$("#itemName").value=i.name||"";$("#itemCode").value=i.code||"";$("#itemCategory").value=i.category||"Lainnya";$("#itemRoom").value=i.roomId||"";$("#itemCondition").value=i.condition||"Baik";$("#itemNote").value=i.note||"";$("#itemFormTitle").textContent="Edit data inventaris";$("#itemForm").querySelector('button[type="submit"]').textContent="Simpan Perubahan";$("#itemForm").classList.remove("hidden");$("#itemName").focus();window.scrollTo({top:0,behavior:"smooth"})}
async function openEditInspection(idValue){const x=await TCDB.get("inspections",idValue);if(!x)return;showPage("inspection");await fillRoomSelects();state.editingInspection=x.id;$("#inspectorName").value=x.inspector||"";$("#inspectionRoom").value=x.roomId||"";$("#inspectionType").value=x.type||"Pemeriksaan umum";await refreshInspectionItemSelect(x.itemId||"");$("#inspectionResult").value=x.result||"Baik";$("#inspectionNote").value=x.note||"";$("#inspectionPhoto").value="";$("#inspectionFormTitle").textContent="Edit catatan pemeriksaan";$("#inspectionSubmit").textContent="Simpan Perubahan";$("#cancelInspectionEdit").classList.remove("hidden");$("#inspectionFormTitle").scrollIntoView({behavior:"smooth",block:"start"})}
async function archiveRecord(store,idValue,entity){const row=await TCDB.get(store,idValue);if(!row)return;if(!confirm("Arsipkan "+entity+" ini? Data tidak dihapus dan bisa dipulihkan."))return;row.archivedAt=new Date().toISOString();row.updatedAt=row.archivedAt;await TCDB.put(store,row);await TCDB.log("ARSIPKAN",entity,idValue,{name:row.name||row.type||""});await refresh();toast(entity+" dipindahkan ke arsip.")}
async function restoreRecord(store,idValue,entity){const row=await TCDB.get(store,idValue);if(!row)return;delete row.archivedAt;row.updatedAt=new Date().toISOString();await TCDB.put(store,row);await TCDB.log("PULIHKAN",entity,idValue,{name:row.name||row.type||""});await refresh();toast(entity+" berhasil dipulihkan.")}
async function deleteRecord(store,idValue,entity){
  let row;
  try {
    row=await TCDB.get(store,idValue);
    if(!row){await refresh();toast("Data tidak ditemukan. Daftar diperbarui.");return;}
    const display=row.name||row.type||entity;
    if(store==="rooms"){
      const [items,inspections]=await Promise.all([TCDB.all("items"),TCDB.all("inspections")]);
      const linkedItems=items.filter(x=>x.roomId===idValue),linkedInspections=inspections.filter(x=>x.roomId===idValue);
      if(linkedItems.length||linkedInspections.length){toast("Ruangan masih dipakai oleh "+linkedItems.length+" inventaris dan "+linkedInspections.length+" pemeriksaan. Pindahkan data terkait sebelum menghapus.");return;}
    }
    if(!confirm("HAPUS PERMANEN\n\nYakin menghapus "+display+"? Tindakan ini tidak dapat dibatalkan. Buat backup terlebih dahulu bila diperlukan."))return;
    // Delete the requested record first. Audit logging must never block list refresh.
    await TCDB.remove(store,idValue);
    if(store==="rooms"&&state.editingRoom===idValue)resetRoomForm();
    if(store==="items"&&state.editingItem===idValue)resetItemForm();
    if(store==="inspections"&&state.editingInspection===idValue)resetInspectionEdit();
    await refresh();
    toast(entity+" berhasil dihapus.");
    try { await TCDB.log("HAPUS PERMANEN",entity,idValue,{name:display}); await renderAudit(); }
    catch(auditError) { console.error("Data terhapus, tetapi riwayat perubahan gagal dicatat:",auditError); toast(entity+" dihapus. Riwayat perubahan belum dapat dicatat."); }
  } catch(err) {
    console.error("Penghapusan gagal:",err);
    toast("Penghapusan gagal. Periksa penyimpanan browser, lalu coba lagi.");
  }
}
document.addEventListener("click",async e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.editRoom){await openEditRoom(b.dataset.editRoom);return}
 if(b.dataset.editItem){await openEditItem(b.dataset.editItem);return}
 if(b.dataset.editInspection){await openEditInspection(b.dataset.editInspection);return}
 if(b.dataset.archiveRoom){await archiveRecord("rooms",b.dataset.archiveRoom,"Ruangan");return}
 if(b.dataset.archiveItem){await archiveRecord("items",b.dataset.archiveItem,"Inventaris");return}
 if(b.dataset.archiveInspection){await archiveRecord("inspections",b.dataset.archiveInspection,"Pemeriksaan");return}
 if(b.dataset.restoreRoom){await restoreRecord("rooms",b.dataset.restoreRoom,"Ruangan");return}
 if(b.dataset.restoreItem){await restoreRecord("items",b.dataset.restoreItem,"Inventaris");return}
 if(b.dataset.restoreInspection){await restoreRecord("inspections",b.dataset.restoreInspection,"Pemeriksaan");return}
 if(b.dataset.deleteRoom){await deleteRecord("rooms",b.dataset.deleteRoom,"Ruangan");return}
 if(b.dataset.deleteItem){await deleteRecord("items",b.dataset.deleteItem,"Inventaris");return}
 if(b.dataset.deleteInspection){await deleteRecord("inspections",b.dataset.deleteInspection,"Pemeriksaan");return}
});
async function renderAudit(){const el=$("#auditList");if(!el)return;try{const rows=(await TCDB.all("audit")).sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,30);el.innerHTML=rows.length?rows.map(x=>`<div class="audit-row"><strong>${esc(x.action)} · ${esc(x.entity)}</strong><span>${esc(x.details?.name||x.details?.type||"Data diperbarui")}</span><small>${esc(x.by||"Pemeriksa")} · ${dateLabel(x.at)}</small></div>`).join(""):'<p class="muted">Belum ada perubahan yang tercatat.</p>'}catch(e){el.innerHTML='<p class="muted">Riwayat perubahan belum tersedia.</p>'}}
$("#roomSearch").addEventListener("input",async()=>renderRooms(await TCDB.all("rooms")));
$("#showArchivedRooms").addEventListener("change",async()=>renderRooms(await TCDB.all("rooms")));
$("#itemSearch").addEventListener("input",async()=>renderItems(await TCDB.all("items"),await TCDB.all("rooms")));
$("#itemConditionFilter").addEventListener("change",async()=>renderItems(await TCDB.all("items"),await TCDB.all("rooms")));
$("#showArchivedItems").addEventListener("change",async()=>renderItems(await TCDB.all("items"),await TCDB.all("rooms")));
$("#showArchivedInspections").addEventListener("change",async()=>renderHistory(await TCDB.all("inspections"),await TCDB.all("rooms")));
$("#profileName").value=localStorage.getItem("tc-inspector-name")||"";
$("#inspectorName").value=$("#profileName").value;
function applyName(name){localStorage.setItem("tc-inspector-name",name);$("#helloName").textContent=name||"Pemeriksa";$("#inspectorName").value=name;$("#profileName").value=name}
applyName(localStorage.getItem("tc-inspector-name")||"Pemeriksa");
$("#profileForm").addEventListener("submit",async e=>{e.preventDefault();const name=$("#profileName").value.trim();applyName(name);await TCDB.log("UBAH PENGATURAN","Profil","inspector",{name});await renderAudit();toast("Nama pemeriksa disimpan.")});
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
$("#exportBackup").addEventListener("click",async()=>{try{const data=await TCDB.snapshot();download("backup-training-center-"+new Date().toISOString().slice(0,10)+".json",JSON.stringify(data,null,2),"application/json");toast("Backup berhasil dibuat.")}catch(e){toast("Backup gagal dibuat.")}});
$("#importBackup").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data||!Array.isArray(data.rooms)||!Array.isArray(data.items)||!Array.isArray(data.inspections))throw new Error("Format backup tidak cocok");if(!confirm("Impor data backup? Data dengan ID sama akan diperbarui."))return;await TCDB.mergeBackup(data);await TCDB.log("PULIHKAN BACKUP","Sistem","backup",{name:file.name});if(data.settings?.name)applyName(data.settings.name);await refresh();toast("Backup berhasil dipulihkan.")}catch(err){toast("Backup tidak valid atau gagal dibaca.")}finally{e.target.value=""}});
function safeFilePart(value) {
  return String(value || "Pemeriksa")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0,60) || "Pemeriksa";
}
function exportInspectorName() {
  return (localStorage.getItem("tc-inspector-name") || $("#profileName")?.value || $("#inspectorName")?.value || "Pemeriksa").trim() || "Pemeriksa";
}
function exportDateStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
async function loadXLSXLibrary() {
  if (window.XLSX) return window.XLSX;
  if (!navigator.onLine) throw new Error("Pustaka Excel belum tersedia offline. Buka aplikasi saat online satu kali, lalu coba lagi.");
  const sources = [
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"
  ];
  for (const src of sources) {
    try {
      await new Promise((resolve,reject)=>{
        const script=document.createElement("script");
        script.src=src; script.async=true;
        script.onload=resolve; script.onerror=()=>{script.remove();reject(new Error("Gagal memuat pustaka Excel"));};
        document.head.appendChild(script);
      });
      if (window.XLSX) return window.XLSX;
    } catch(e) { console.warn(e); }
  }
  throw new Error("Pustaka Excel tidak dapat dimuat. Periksa koneksi internet lalu coba lagi.");
}
function dataUrlToBase64(dataUrl) {
  return (String(dataUrl||"").split(",")[1] || "");
}
function photoDataUrlToMime(dataUrl) {
  const m=String(dataUrl||"").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  return m ? m[1] : "image/jpeg";
}
async function exportXlsxWithPhotos() {
  const XLSX = await loadXLSXLibrary();
  const [items,rooms,inspections]=await Promise.all([TCDB.all("items"),TCDB.all("rooms"),TCDB.all("inspections")]);
  const roomMap=new Map(rooms.map(r=>[r.id,r]));
  const roomName=id=>roomMap.get(id)?.name||"";
  const dateText=v=>v?new Date(v).toLocaleString("id-ID"):"";
  const itemRows=items.map((i,n)=>({
    "No":n+1,"Kode Barang":i.code||"","Nama Barang":i.name||"",
    "Kategori":i.category||"Lainnya","Ruangan":roomName(i.roomId),
    "Kondisi":i.condition||"","Catatan":i.note||"",
    "Terakhir Diperbarui":dateText(i.updatedAt||i.createdAt)
  }));
  const roomRows=rooms.map((r,n)=>({
    "No":n+1,"Nama Ruangan":r.name||"","Gedung / Lokasi":r.building||"",
    "Lantai":r.floor||"","Catatan":r.note||"","Tanggal Dibuat":dateText(r.createdAt)
  }));
  const inspectionRows=inspections.map((x,n)=>({
    "No":n+1,"Tanggal & Waktu":dateText(x.createdAt),"Pemeriksa":x.inspector||exportInspectorName(),
    "Ruangan":roomName(x.roomId),"Jenis Pemeriksaan":x.type||"",
    "Hasil":x.result||"","Catatan Temuan":x.note||"",
    "Foto Tersedia":x.photo?"Ya":"Tidak"
  }));
  const photoInspections=inspections.filter(x=>x.photo);
  const photoRows=photoInspections.map((x,n)=>({
    "No":n+1,"Tanggal & Waktu":dateText(x.createdAt),
    "Pemeriksa":x.inspector||exportInspectorName(),"Ruangan":roomName(x.roomId),
    "Jenis Pemeriksaan":x.type||"","Hasil":x.result||"",
    "Catatan":x.note||"","Foto":"Foto tertanam di lembar ini"
  }));
  const wb=XLSX.utils.book_new();
  const specs=[
    ["Inventaris",itemRows,[7,18,28,20,24,18,38,24]],
    ["Ruangan",roomRows,[7,28,26,14,38,24]],
    ["Riwayat Pemeriksaan",inspectionRows,[7,24,22,24,24,18,40,18]],
    ["Dokumentasi Foto",photoRows,[7,24,22,24,24,18,40,26]]
  ];
  for(const [name,rows,widths] of specs){
    const ws=XLSX.utils.json_to_sheet(rows);
    ws["!cols"]=widths.map(w=>({wch:w}));
    ws["!freeze"]={xSplit:0,ySplit:1,topLeftCell:"A2",activePane:"bottomLeft",state:"frozen"};
    if(ws["!ref"]) ws["!autofilter"]={ref:ws["!ref"]};
    XLSX.utils.book_append_sheet(wb,ws,name);
  }

  // Add actual images to the Documentation sheet using XLSX's supported image extension API if available.
  // SheetJS Community Edition does not support embedding images directly; if unsupported, use ExcelJS fallback below.
  if (photoInspections.length) {
    // Prefer ExcelJS, which reliably supports image embedding into .xlsx.
    const ExcelJS = await loadExcelJSLibrary();
    const ew = new ExcelJS.Workbook();
    ew.creator = "Training Center Inspection";
    ew.created = new Date();
    const addSheet=(name,rows,widths)=>{
      const s=ew.addWorksheet(name,{views:[{state:"frozen",ySplit:1}]});
      if(!rows.length){
        const keys=specs.find(x=>x[0]===name)?.[1]?.[0] ? Object.keys(specs.find(x=>x[0]===name)[1][0]) : [];
        s.addRow(keys);
      } else {
        s.columns=Object.keys(rows[0]).map((header,i)=>({header,key:header,width:widths[i]||18,style:{alignment:{vertical:"top",wrapText:true}}}));
        rows.forEach(r=>s.addRow(r));
      }
      s.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};
      s.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF244A78"}};
      s.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,rows.length+1),column:Math.max(1,Object.keys(rows[0]||{}).length)}};
      return s;
    };
    // Start with a fresh workbook and add all worksheets through ExcelJS.
    // Do not remove a worksheet here: a new workbook has no "Inventaris" sheet yet.
    addSheet("Inventaris",itemRows,[7,18,28,20,24,18,38,24]);
    addSheet("Ruangan",roomRows,[7,28,26,14,38,24]);
    addSheet("Riwayat Pemeriksaan",inspectionRows,[7,24,22,24,24,18,40,18]);
    const ps=addSheet("Dokumentasi Foto",photoRows,[7,24,22,24,24,18,40,26]);
    ps.getColumn(8).width=22;
    photoInspections.forEach((x,i)=>{
      const dataUrl=String(x.photo||"");
      const mime=photoDataUrlToMime(dataUrl);
      let extension=mime==="image/png"?"png":mime==="image/jpeg"?"jpeg":mime==="image/gif"?"gif":null;
      if(!extension) return; // ExcelJS supports common raster formats; skip unsupported WebP to avoid corrupting workbook.
      const imageId=ew.addImage({base64:dataUrl,extension});
      const row=i+2;
      ps.getRow(row).height=85;
      ps.addImage(imageId,{tl:{col:7,row:row-1},br:{col:8,row:row},editAs:"oneCell"});
    });
    const buffer=await ew.xlsx.writeBuffer();
    const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download=`Training-Center_${safeFilePart(exportInspectorName())}_${exportDateStamp()}.xlsx`;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    toast(`Excel berhasil diekspor. ${photoInspections.length} catatan memiliki foto; foto JPG/PNG/GIF disisipkan ke lembar Dokumentasi Foto.`);
    return;
  }
  // No photos: export a valid XLSX using SheetJS.
  XLSX.writeFile(wb,`Training-Center_${safeFilePart(exportInspectorName())}_${exportDateStamp()}.xlsx`);
  toast("Excel berhasil diekspor. Belum ada foto tersimpan pada catatan pemeriksaan.");
}
async function loadExcelJSLibrary() {
  if (window.ExcelJS) return window.ExcelJS;
  if (!navigator.onLine) throw new Error("Penyisipan foto membutuhkan pustaka Excel. Buka aplikasi saat online lalu coba ekspor kembali.");
  const sources=[
    "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js",
    "https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js"
  ];
  for(const src of sources){
    try{
      await new Promise((resolve,reject)=>{
        const script=document.createElement("script");script.src=src;script.async=true;
        script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error("Gagal memuat ExcelJS"));};
        document.head.appendChild(script);
      });
      if(window.ExcelJS) return window.ExcelJS;
    }catch(e){console.warn(e);}
  }
  throw new Error("Pustaka penyisipan foto tidak dapat dimuat.");
}
$("#exportExcel").addEventListener("click",async()=>{
  try { await exportXlsxWithPhotos(); }
  catch(err) { console.error(err); toast("Ekspor gagal: "+(err?.message||"periksa koneksi atau format foto.")); }
});
$("#exportPhotos").addEventListener("click",async()=>{
  try {
    const [inspections,rooms]=await Promise.all([TCDB.all("inspections"),TCDB.all("rooms")]);
    const roomMap=new Map(rooms.map(r=>[r.id,r.name]));
    const photos=inspections.filter(x=>x.photo).map((x,n)=>({
      namaFile:`foto-${String(x.id||n+1).replace(/[^a-zA-Z0-9_-]/g,"")}.jpg`,
      tanggal:x.createdAt||"",
      pemeriksa:x.inspector||"",
      ruangan:roomMap.get(x.roomId)||"",
      jenisPemeriksaan:x.type||"",
      hasil:x.result||"",
      catatan:x.note||"",
      formatDataFoto:x.photo.startsWith("data:image/png")?"image/png":"image/jpeg",
      dataFotoBase64:x.photo
    }));
    const archive={namaArsip:"Arsip Foto Training Center",versi:1,dibuatPada:new Date().toISOString(),jumlahFoto:photos.length,petunjuk:"Foto disimpan sebagai data URL/base64 agar dapat dicadangkan offline. Simpan file JSON ini bersama file Excel master.",foto:photos};
    const pemeriksa = safeFilePart(exportInspectorName());
    download(`Arsip-Foto_${pemeriksa}_${exportDateStamp()}.json`,JSON.stringify(archive,null,2),"application/json;charset=utf-8");
    toast(photos.length?`Arsip ${photos.length} foto berhasil diekspor.`:"Belum ada foto pemeriksaan yang tersimpan.");
  } catch(err) { console.error(err); toast("Gagal mengekspor arsip foto."); }
});
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").then(()=>$("#offlineStatus").textContent="Service Worker terpasang; buka aplikasi sekali saat online agar aset tercache.").catch(()=>$("#offlineStatus").textContent="Mode offline belum aktif di browser ini.");
else $("#offlineStatus").textContent="Mode offline perlu HTTPS dan dukungan Service Worker. Data lokal dapat bekerja bila browser mendukung IndexedDB.";
refresh().catch(console.error);
})();