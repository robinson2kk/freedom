import {json,secureHeaders} from "../../_lib.js";
const MAX=5*1024*1024;
export async function onRequestPost({request,env,params}){
 if(!secureHeaders(request))return json({error:"Request origin could not be verified."},403);
 if(!env.PROFESSIONAL_DOCS)return json({error:"Secure document storage is not configured yet."},503);
 const id=String(params.id||"");
 const app=await env.DB.prepare("SELECT id FROM professional_applications WHERE id=?").bind(id).first();
 if(!app)return json({error:"Application not found."},404);
 let form;try{form=await request.formData()}catch{return json({error:"Please select valid files."},400)}
 const files=form.getAll("documents").filter(x=>x&&typeof x.arrayBuffer==="function");
 if(!files.length||files.length>3)return json({error:"Upload between 1 and 3 documents."},400);
 const saved=[];
 for(const file of files){
  const name=String(file.name||"document").replace(/[^a-zA-Z0-9._-]/g,"_").slice(-100);
  const type=String(file.type||"").toLowerCase();
  const ext=name.toLowerCase().split(".").pop();
  const allowed=(type==="application/pdf"&&ext==="pdf")||(type==="image/jpeg"&&["jpg","jpeg"].includes(ext))||(type==="image/png"&&ext==="png");
  if(!allowed||file.size<=0||file.size>MAX)return json({error:"Only PDF, JPG or PNG files up to 5 MB each are accepted."},400);
  const bytes=await file.arrayBuffer();
  const header=new Uint8Array(bytes.slice(0,8));
  const valid=type==="application/pdf"?new TextDecoder().decode(header.slice(0,5))==="%PDF-":type==="image/png"?header[0]===137&&header[1]===80&&header[2]===78&&header[3]===71:header[0]===255&&header[1]===216&&header[2]===255;
  if(!valid)return json({error:"A file's contents do not match its file type."},400);
  const key="applications/"+id+"/"+crypto.randomUUID()+"-"+name;
  await env.PROFESSIONAL_DOCS.put(key,bytes,{httpMetadata:{contentType:type},customMetadata:{applicationId:id,originalName:name}});
  saved.push(key);
 }
 return json({ok:true,count:saved.length},201);
}