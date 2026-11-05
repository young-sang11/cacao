import fs from 'node:fs';
import {createHash} from 'node:crypto';
const repository=process.env.GITHUB_REPOSITORY,token=process.env.GH_TOKEN,commit=process.env.GITHUB_SHA;
if(!repository||!token||!commit)throw Error('Run in the authorized repository publication job.');
const checks=fs.readFileSync('HTML-SHA256SUMS.txt','utf8').trim().split('\n');
for(const line of checks){const [digest,name]=line.split('  ');if(!['moa-messages.html','moa-messages-html.zip'].includes(name))throw Error('Unexpected artifact name.');if(createHash('sha256').update(fs.readFileSync(name)).digest('hex')!==digest)throw Error('Artifact checksum mismatch.');}
const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
const base=`https://api.github.com/repos/${repository}`,tag='moa-html-v0.3.0';
let response=await fetch(`${base}/releases/tags/${tag}`,{headers}),release;
if(response.status===404){response=await fetch(`${base}/releases`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,target_commitish:commit,name:'모아 메시지 — HTML 파일',prerelease:true,body:'HTML 파일 하나를 내려받아 Edge 또는 Chrome에서 여세요. 설치나 서버 설정이 필요 없습니다. 메시지 가져오기·원문 연결 답장·첨부·백업·암호 잠금을 제공합니다. 자동 알림 수신·자동 동기화·실제 AI 생성은 지원하지 않습니다. 개발 버전으로 실기기 검증 범위는 포함된 안내 문서를 확인하세요.'})});}
if(!response.ok)throw Error(`Release publication failed: HTTP ${response.status}`);release=await response.json();
for(const name of ['moa-messages.html','moa-messages-html.zip','HTML-SHA256SUMS.txt']){
 const old=release.assets?.find(a=>a.name===name);
 if(old){const result=await fetch(`${base}/releases/assets/${old.id}`,{method:'DELETE',headers});if(!result.ok)throw Error(`Cannot replace artifact: HTTP ${result.status}`);}
 const url=release.upload_url.replace(/\{.*\}/,'')+'?name='+encodeURIComponent(name);
 const result=await fetch(url,{method:'POST',headers:{...headers,'Content-Type':'application/octet-stream'},body:fs.readFileSync(name)});
 if(!result.ok)throw Error(`Artifact upload failed: HTTP ${result.status}`);
 const asset=await result.json();console.log('Published:',asset.name,asset.size,'bytes');
}
