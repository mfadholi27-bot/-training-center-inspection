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