import fs from 'node:fs';
import assert from 'node:assert/strict';
// Fail by file + credential class, never print a possible secret into CI logs.
const signatures=[/\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,})\b/,/\bsbp_[a-zA-Z0-9]{25,}\b/,/\bsk_[a-f0-9]{40,}\b/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','artifacts','.wrangler','.temp'].includes(entry.name))continue;const path=dir+'/'+entry.name;if(entry.isDirectory()){scan(path);continue;}if(/^\.env/.test(entry.name)&&entry.name!=='.env.example')throw Error('Private environment file: '+path);const stat=fs.statSync(path);assert.ok(stat.size<100*1024*1024,'File too large for GitHub: '+path);if(/\.(?:js|mjs|json|html|css|md|yml|toml|py|sql|txt)$/.test(path)){const value=fs.readFileSync(path,'utf8');for(const pattern of signatures)if(pattern.test(value))throw Error('Possible credential in '+path);for(const token of value.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g)||[]){try{const payload=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());if(payload.role==='service_role')throw Error('PRIVILEGED_JWT');}catch(e){if(e.message==='PRIVILEGED_JWT')throw Error('Privileged JWT in '+path);}}}}}
scan('.');
assert.ok(fs.existsSync('dist/_worker.js'));assert.ok(fs.existsSync('dist/scoreboard.html'));
assert.ok(!fs.existsSync('dist/.env.local'));
console.log('Public release scan passed: no detected privileged credentials or private environment files.');
