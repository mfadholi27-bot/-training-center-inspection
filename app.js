(()=>{"use strict";
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const state={page:"home",history:["home"],busy:false};
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
  renderRooms(rooms);renderItems(items,rooms);renderHistory(inspections,rooms);renderRecent(inspections,rooms);fillRoomSelects(rooms);
 }catch(e){console.error(e);toast("Database belum siap. Muat ulang halaman.");}
}
function renderRooms(rooms){
 const q=($("#roomSearch")?.value||"").toLowerCase();
 const list=rooms.filter(r=>(r.name+" "+(r.building||"")+" "+(r.floor||"")).toLowerCase().includes(q));
 $("#roomList").innerHTML=list.length?list.map(r=>`<article class="record-card glass"><div class="record-icon">▦</div><div class="record-main"><h3>${esc(r.name)}</h3><p>${esc([r.building,r.floor].filter(Boolean).join(" · ")||"Lokasi belum diisi")}</p><div class="record-meta">Dibuat ${dateLabel(r.createdAt)}</div><div class="record-actions"><button class="mini-button danger" data-delete-room="${esc(r.id)}">Hapus</button></div></div></article>`).join(""):`<div class="empty-state">Belum ada ruangan. Tekan <b>Tambah</b> untuk mencatat ruangan pertama.</div>`;
}
function renderItems(items,rooms){
 const q=($("#itemSearch")?.value||"").toLowerCase(), conditionFilter=$("#itemConditionFilter")?.value||"", roomMap=new Map(rooms.map(r=>[r.id,r.name]));
 const list=items.filter(i=>(i.name+" "+(i.code||"")+" "+(i.category||"")+" "+(roomMap.get(i.roomId)||"")).toLowerCase().includes(q)&&(!conditionFilter||i.condition===conditionFilter));
 $("#itemList").innerHTML=list.length?list.map(i=>`<article class="record-card glass"><div class="record-icon">▣</div><div class="record-main"><h3>${esc(i.name)}</h3><p>${esc(i.code||"Tanpa kode")} · ${esc(i.category||"Lainnya")}</p><p>${esc(roomMap.get(i.roomId)||"Ruangan belum ditentukan")}</p><span class="status ${statusClass(i.condition)}">${esc(i.condition)}</span>${i.note?`<p style="margin-top:8px">${esc(i.note)}</p>`:""}${Array.isArray(i.conditionHistory)&&i.conditionHistory.length?`<details class="condition-history"><summary>Riwayat kondisi (${i.conditionHistory.length})</summary>${i.conditionHistory.slice().reverse().map(h=>`<p class="record-meta">${esc(h.from)} → ${esc(h.to)} · ${dateLabel(h.at)}</p>`).join("")}</details>`:""}<div class="record-actions"><button class="mini-button" data-edit-item="${esc(i.id)}">Ubah kondisi</button><button class="mini-button danger" data-delete-item="${esc(i.id)}">Hapus</button></div></div></article>`).join(""):`<div class="empty-state">Tidak ada barang yang cocok dengan pencarian atau filter.</div>`;
}
function renderHistory(inspections,rooms){
 const map=new Map(rooms.map(r=>[r.id,r.name]));inspections.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
 $("#historyList").innerHTML=inspections.length?inspections.map(x=>`<article class="record-card glass"><div class="record-icon">✓</div><div class="record-main"><h3>${esc(x.type)} · ${esc(map.get(x.roomId)||"Tanpa ruangan")}</h3><p>Pemeriksa: ${esc(x.inspector)}</p><span class="status ${statusClass(x.result)}">${esc(x.result)}</span>${x.note?`<p style="margin-top:8px">${esc(x.note)}</p>`:""}${x.photo?`<img alt="Foto pemeriksaan" src="${x.photo}" style="display:block;width:100%;max-height:220px;object-fit:contain;border-radius:12px;margin-top:10px;background:#050816">`:""}<div class="record-meta">${dateLabel(x.createdAt)}</div><div class="record-actions"><button class="mini-button danger" data-delete-inspection="${esc(x.id)}">Hapus catatan</button></div></div></article>`).join(""):`<div class="empty-state">Belum ada riwayat pemeriksaan yang tersimpan.</div>`;
}
function renderRecent(inspections,rooms){
 const map=new Map(rooms.map(r=>[r.id,r.name]));const recent=[...inspections].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,3);
 $("#recentActivity").innerHTML=recent.length?recent.map(x=>`<article class="activity-card glass"><div class="activity-mark">✓</div><div class="activity-body"><strong>${esc(x.type)} · ${esc(map.get(x.roomId)||"Tanpa ruangan")}</strong><p>${esc(x.result)} — ${esc(x.inspector)}</p></div><span class="activity-time">${dateLabel(x.createdAt)}</span></article>`).join(""):`<div class="empty-state">Belum ada aktivitas. Hasil pemeriksaan yang disimpan akan muncul di sini.</div>`;
}
async function fillRoomSelects(rooms){
 rooms=rooms||await TCDB.all("rooms");const opts=rooms.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join("");
 $("#itemRoom").innerHTML='<option value="">Belum ditentukan</option>'+opts;
 $("#inspectionRoom").innerHTML='<option value="">Pilih ruangan (opsional)</option>'+opts;
}
$("#addRoomBtn").addEventListener("click",()=>{$("#roomForm").classList.toggle("hidden");if(!$("#roomForm").classList.contains("hidden"))$("#roomName").focus()});
$("#addItemBtn").addEventListener("click",async()=>{await fillRoomSelects();$("#itemForm").classList.toggle("hidden");if(!$("#itemForm").classList.contains("hidden"))$("#itemName").focus()});
$$("[data-cancel]").forEach(b=>b.addEventListener("click",()=>$("#"+b.dataset.cancel).classList.add("hidden")));
$("#roomForm").addEventListener("submit",async e=>{e.preventDefault();const row={id:id(),name:$("#roomName").value.trim(),building:$("#roomBuilding").value.trim(),floor:$("#roomFloor").value.trim(),createdAt:new Date().toISOString()};if(!row.name)return;await TCDB.put("rooms",row);e.target.reset();e.target.classList.add("hidden");await refresh();toast("Ruangan berhasil disimpan.")});
$("#itemForm").addEventListener("submit",async e=>{e.preventDefault();const name=$("#itemName").value.trim();if(!name)return;const items=await TCDB.all("items"),manualCode=$("#itemCode").value.trim();let code=manualCode;if(!code){do{code="TC-"+String(Date.now()).slice(-6)+String(Math.floor(Math.random()*90+10))}while(items.some(i=>(i.code||"").toLowerCase()===code.toLowerCase()))}if(items.some(i=>(i.code||"").toLowerCase()===code.toLowerCase())){toast("Kode barang sudah digunakan. Periksa kembali.");return}const now=new Date().toISOString(),row={id:id(),name,code,category:$("#itemCategory").value,roomId:$("#itemRoom").value,condition:$("#itemCondition").value,note:$("#itemNote").value.trim(),conditionHistory:[],createdAt:now,updatedAt:now};await TCDB.put("items",row);e.target.reset();e.target.classList.add("hidden");await refresh();toast("Inventaris tersimpan dengan kode "+code)});
$("#inspectionForm").addEventListener("submit",async e=>{e.preventDefault();if(state.busy)return;state.busy=true;const btn=e.submitter;btn.disabled=true;btn.textContent="Menyimpan…";try{const file=$("#inspectionPhoto").files[0];let photo="";if(file)photo=await compressImage(file);const row={id:id(),inspector:$("#inspectorName").value.trim(),roomId:$("#inspectionRoom").value,type:$("#inspectionType").value,result:$("#inspectionResult").value,note:$("#inspectionNote").value.trim(),photo,createdAt:new Date().toISOString()};await TCDB.put("inspections",row);$("#inspectionNote").value="";$("#inspectionPhoto").value="";await refresh();toast("Pemeriksaan tersimpan di perangkat.");showPage("history")}catch(err){console.error(err);toast("Gagal menyimpan. Periksa ruang penyimpanan perangkat.")}finally{state.busy=false;btn.disabled=false;btn.innerHTML='Simpan Pemeriksaan <span>→</span>'}});
async function compressImage(file){if(!file.type.startsWith("image/"))throw new Error("Berkas bukan gambar");if(file.size>15*1024*1024)throw new Error("Foto terlalu besar; pilih foto di bawah 15 MB");const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});return new Promise(resolve=>{const img=new Image();img.onload=()=>{const max=1000,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.72))};img.onerror=()=>resolve(data);img.src=data})}
document.addEventListener("click",async e=>{
 const room=e.target.closest("[data-delete-room]");if(room){if(!confirm("Hapus ruangan ini? Barang yang terhubung tidak ikut dihapus."))return;await TCDB.remove("rooms",room.dataset.deleteRoom);await refresh();toast("Ruangan dihapus.");return}
 const del=e.target.closest("[data-delete-item]");if(del){if(!confirm("Hapus barang ini?"))return;await TCDB.remove("items",del.dataset.deleteItem);await refresh();toast("Barang dihapus.");return}
 const edit=e.target.closest("[data-edit-item]");if(edit){const item=await TCDB.get("items",edit.dataset.editItem);if(!item)return;const options=["Baik","Perlu Perbaikan","Rusak Ringan","Rusak Berat","Hilang","Tidak Ditemukan"];const value=prompt("Masukkan kondisi baru:\n"+options.join("\n"),item.condition);if(value===null)return;if(!options.includes(value)){toast("Kondisi tidak cocok dengan pilihan.");return}if(value!==item.condition){item.conditionHistory=Array.isArray(item.conditionHistory)?item.conditionHistory:[];item.conditionHistory.push({from:item.condition,to:value,at:new Date().toISOString()});item.condition=value;item.updatedAt=new Date().toISOString();await TCDB.put("items",item);await refresh();toast("Kondisi diperbarui dan riwayat dicatat.")}return}
 const ins=e.target.closest("[data-delete-inspection]");if(ins){if(!confirm("Hapus catatan pemeriksaan ini?"))return;await TCDB.remove("inspections",ins.dataset.deleteInspection);await refresh();toast("Catatan dihapus.")}
});
$("#roomSearch").addEventListener("input",async()=>renderRooms(await TCDB.all("rooms")));
$("#itemSearch").addEventListener("input",async()=>renderItems(await TCDB.all("items"),await TCDB.all("rooms")));
$("#itemConditionFilter").addEventListener("change",async()=>renderItems(await TCDB.all("items"),await TCDB.all("rooms")));
$("#profileName").value=localStorage.getItem("tc-inspector-name")||"";
$("#inspectorName").value=$("#profileName").value;
function applyName(name){localStorage.setItem("tc-inspector-name",name);$("#helloName").textContent=name||"Pemeriksa";$("#inspectorName").value=name;$("#profileName").value=name}
applyName(localStorage.getItem("tc-inspector-name")||"Pemeriksa");
$("#profileForm").addEventListener("submit",e=>{e.preventDefault();applyName($("#profileName").value.trim());toast("Nama pemeriksa disimpan.")});
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
$("#exportBackup").addEventListener("click",async()=>{try{const data=await TCDB.snapshot();download("backup-training-center-"+new Date().toISOString().slice(0,10)+".json",JSON.stringify(data,null,2),"application/json");toast("Backup berhasil dibuat.")}catch(e){toast("Backup gagal dibuat.")}});
$("#importBackup").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data||!Array.isArray(data.rooms)||!Array.isArray(data.items)||!Array.isArray(data.inspections))throw new Error("Format backup tidak cocok");if(!confirm("Impor data backup? Data dengan ID sama akan diperbarui."))return;await TCDB.mergeBackup(data);if(data.settings?.name)applyName(data.settings.name);await refresh();toast("Backup berhasil dipulihkan.")}catch(err){toast("Backup tidak valid atau gagal dibaca.")}finally{e.target.value=""}});
function safeFilePart(value) {
  return String(value || "Pemeriksa")
    .normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0,60) || "Pemeriksa";
}
function exportInspectorName() {
  return ($("#profileName")?.value || localStorage.getItem("tc-inspector-name") || $("#inspectorName")?.value || "Pemeriksa").trim() || "Pemeriksa";
}
function exportDateStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function safeFilePart(value) {
  return String(value || "Pemeriksa")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0,60) || "Pemeriksa";
}
function exportInspectorName() {
  return ($("#profileName")?.value || localStorage.getItem("tc-inspector-name") || $("#inspectorName")?.value || "Pemeriksa").trim() || "Pemeriksa";
}
function exportDateStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function xlsxEscape(value) {
  return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function xlsxCol(n) {
  let s="";
  while(n>0){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26);}
  return s;
}
function makeWorksheetXml(headers, rows, widths, rowHeights={}) {
  const all = [headers, ...rows];
  const cols = widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("");
  const sheetRows = all.map((row,ri)=>{
    const cells = row.map((v,ci)=>{
      const ref = `${xlsxCol(ci+1)}${ri+1}`;
      const style = ri===0 ? 1 : 2;
      const val = xlsxEscape(v);
      return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${val}</t></is></c>`;
    }).join("");
    const height = rowHeights[ri+1] ? ` ht="${rowHeights[ri+1]}" customHeight="1"` : "";
    return `<row r="${ri+1}"${height}>${cells}</row>`;
  }).join("");
  const lastCol=xlsxCol(headers.length), lastRow=all.length;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${lastCol}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${lastCol}${lastRow}"/></worksheet>`;
}
function crc32(bytes) {
  let c=-1;
  for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xEDB88320:0);}
  return (c^-1)>>>0;
}
function zipStore(files) {
  const enc=new TextEncoder(), locals=[], centrals=[];
  let offset=0;
  const u16=n=>[n&255,(n>>>8)&255], u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
  for(const file of files){
    const name=enc.encode(file.name), data=typeof file.data==="string"?enc.encode(file.data):file.data;
    const crc=crc32(data);
    const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name,...data]);
    locals.push(local);
    const central=new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]);
    centrals.push(central);
    offset+=local.length;
  }
  const centralSize=centrals.reduce((n,a)=>n+a.length,0);
  const end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(centralSize),...u32(offset),...u16(0)]);
  const total=offset+centralSize+end.length, out=new Uint8Array(total);
  let p=0; for(const a of locals){out.set(a,p);p+=a.length;} for(const a of centrals){out.set(a,p);p+=a.length;} out.set(end,p);
  return out;
}
function dataUrlToBytes(dataUrl) {
  const b64=dataUrl.split(",")[1]||"";
  const bin=atob(b64), out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
  return out;
}
function imageExt(dataUrl) {
  return dataUrl.startsWith("data:image/png") ? "png" : dataUrl.startsWith("data:image/webp") ? "webp" : "jpg";
}
function worksheetPhotoXml(headers, rows, imageRefs) {
  // Photo sheet includes a photo filename/reference and metadata. Actual image drawing parts are added below.
  const enc=new TextEncoder();
  const sheetDataRows=[headers,...rows].map((row,ri)=>{
    const cells=row.map((v,ci)=>{
      const ref=`${xlsxCol(ci+1)}${ri+1}`;
      return `<c r="${ref}" s="${ri===0?1:2}" t="inlineStr"><is><t xml:space="preserve">${xlsxEscape(v)}</t></is></c>`;
    }).join("");
    return `<row r="${ri+1}"${ri>0&&imageRefs[ri-1]?' ht="105" customHeight="1"':""}>${cells}</row>`;
  }).join("");
  const drawingRel=imageRefs.length?'<drawing r:id="rId1"/>':"";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${sheetDataRows}</sheetData><autoFilter ref="A1:${xlsxCol(headers.length)}${headers.length+rows.length}"/>${drawingRel}</worksheet>`;
}
async function exportXlsxWithPhotos() {
  const [items,rooms,inspections]=await Promise.all([TCDB.all("items"),TCDB.all("rooms"),TCDB.all("inspections")]);
  const roomMap=new Map(rooms.map(r=>[r.id,r]));
  const roomName=id=>roomMap.get(id)?.name||"";
  const dateText=v=>v?new Date(v).toLocaleString("id-ID"):"";
  const itemRows=items.map((i,n)=>[n+1,i.code||"",i.name||"",i.category||"Lainnya",roomName(i.roomId),i.condition||"",i.note||"",dateText(i.updatedAt||i.createdAt)]);
  const roomRows=rooms.map((r,n)=>[n+1,r.name||"",r.building||"",r.floor||"",r.note||"",dateText(r.createdAt)]);
  const inspectionRows=inspections.map((x,n)=>[n+1,dateText(x.createdAt),x.inspector||"",roomName(x.roomId),x.type||"",x.result||"",x.note||"",x.photo?"Tertanam di lembar Dokumentasi Foto":"Tidak ada"]);
  const photoInspections=inspections.filter(x=>x.photo);
  const photoRows=photoInspections.map((x,n)=>[n+1,dateText(x.createdAt),x.inspector||"",roomName(x.roomId),x.type||"",x.result||"",x.note||"",`Foto ${n+1}`]);
  const files=[];
  const add=(name,data)=>files.push({name,data});
  add("[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/><Default Extension="webp" ContentType="image/webp"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
  add("_rels/.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  add("xl/workbook.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Inventaris" sheetId="1" r:id="rId1"/><sheet name="Ruangan" sheetId="2" r:id="rId2"/><sheet name="Riwayat Pemeriksaan" sheetId="3" r:id="rId3"/><sheet name="Dokumentasi Foto" sheetId="4" r:id="rId4"/></sheets></workbook>`);
  add("xl/_rels/workbook.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  add("xl/styles.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF244A78"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><bottom style="thin"><color rgb="FFD9E2F3"/></bottom></border></borders><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs></styleSheet>`);
  const photoSheetXml=worksheetPhotoXml(["No","Tanggal","Pemeriksa","Ruangan","Jenis Pemeriksaan","Hasil","Catatan","Foto"],photoRows,photoInspections);
  add("xl/worksheets/sheet1.xml",makeWorksheetXml(["No","Kode Barang","Nama Barang","Kategori","Ruangan","Kondisi","Catatan","Terakhir Diperbarui"],itemRows,[7,18,28,20,24,18,38,24]));
  add("xl/worksheets/sheet2.xml",makeWorksheetXml(["No","Nama Ruangan","Gedung / Lokasi","Lantai","Catatan","Tanggal Dibuat"],roomRows,[7,28,26,14,38,24]));
  add("xl/worksheets/sheet3.xml",makeWorksheetXml(["No","Tanggal & Waktu","Pemeriksa","Ruangan","Jenis Pemeriksaan","Hasil","Catatan Temuan","Dokumentasi Foto"],inspectionRows,[7,24,22,24,24,18,40,28]));
  add("xl/worksheets/sheet4.xml",photoSheetXml);
  const drawingParts=[], drawingRels=[];
  if(photoInspections.length){
    const imageAnchors=[];
    for(let i=0;i<photoInspections.length;i++){
      const photo=photoInspections[i].photo;
      const ext=imageExt(photo), imageName=`image${i+1}.${ext}`;
      add(`xl/media/${imageName}`,dataUrlToBytes(photo));
      const col=7,row=i+1;
      imageAnchors.push(`<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${col+1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row+1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i+1}" name="Foto ${i+1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${i+1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`);
      drawingRels.push(`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imageName}"/>`);
    }
    add("xl/worksheets/_rels/sheet4.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`);
    add("xl/drawings/drawing1.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${imageAnchors.join("")}</xdr:wsDr>`);
    add("xl/drawings/_rels/drawing1.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drawingRels.join("")}</Relationships>`);
    // Make the drawing relationship valid in worksheet XML.
    const s4=files.find(f=>f.name==="xl/worksheets/sheet4.xml");
    s4.data=s4.data.replace("</worksheet>",'<drawing xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></worksheet>');
    const ct=files.find(f=>f.name==="[Content_Types].xml");
    ct.data=ct.data.replace("</Types>",'<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>');
  }
  const zip=zipStore(files);
  const blob=new Blob([zip],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`Training-Center_${safeFilePart(exportInspectorName())}_${exportDateStamp()}.xlsx`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  toast(`Excel berhasil diekspor dengan ${photoInspections.length} foto tertanam.`);
}
$("#exportExcel").addEventListener("click",async()=>{
  try { await exportXlsxWithPhotos(); }
  catch(err) { console.error(err); toast("Gagal mengekspor Excel. Periksa ukuran dan format foto pemeriksaan."); }
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