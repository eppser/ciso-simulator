export function publicText(value,max,label){
 if(typeof value!=='string')throw Error('Enter your '+label+'.');
 const s=value.normalize('NFKC').trim().replace(/ +/g,' ');
 if(s.length<2||s.length>max||! /^[\p{L}\p{N} ._'!—-]+$/u.test(s)||/https?|www\.|@/i.test(s))throw Error('Use 2–'+max+' letters, numbers or simple punctuation for '+label+'.');
 return s;
}
export function boardQuery(url){
 const org=url.searchParams.get('org')||'all',view=url.searchParams.get('view')||'top',page=Number(url.searchParams.get('page')||0);
 if(!['all','startup','midcap','enterprise'].includes(org)||!['top','history'].includes(view)||!Number.isInteger(page)||page<0||page>2000)throw Error('Invalid scoreboard filter.');
 return{org,view,page};
}
export async function boundedJSON(request,max=300000){
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw Error('JSON required.');
 if(Number(request.headers.get('content-length'))>max)throw Error('Request too large.');
 const reader=request.body?.getReader();if(!reader)throw Error('Body required.');let total=0;const parts=[];
 try{for(;;){const{done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw Error('Request too large.');}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let i=0;for(const p of parts){bytes.set(p,i);i+=p.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
