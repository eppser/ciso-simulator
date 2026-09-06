import { INSIDER_TAKES } from './insider-dialogue.js';
import { ALTERNATES } from './dialogue-variants.js';
import { HUMAN_LINES, HUMAN_VARIANTS } from './human-dialogue.js';
// cast. The source dataset does not attribute activity to these characters.
export const CAST = {
  contractor:{name:'Ben “On Mute” Carter',role:'Remote contractor · unverified alias',voice:'N2lVS1w4EtoT3dr4eOWO',portrait:9},
  regulator:{name:'Dr. Helena Ward',role:'Cybersecurity regulator',voice:'EXAVITQu4vr4xnSDxMaL',portrait:8},
  head: { name:'Daniel Reyes', role:'Head of Engineering', voice:'JBFqnCBsd6RMkjVDRZzb', portrait:7 },
  agency: { name:'Special Agent Dana Cole', role:'FBI cyber liaison', voice:'EXAVITQu4vr4xnSDxMaL', portrait:6 },
  engineer: { name: 'Maya Chen', role: 'Security engineering', voice: 'EXAVITQu4vr4xnSDxMaL', portrait: 0 },
  board: { name: 'Richard Voss', role: 'Board chair', voice: 'JBFqnCBsd6RMkjVDRZzb', portrait: 1 },
  criminal: { name: 'NULL COLLECTIVE', role: 'threat actor', voice: 'N2lVS1w4EtoT3dr4eOWO', portrait: 2 },
  business: { name: 'Amara Okafor', role: 'Business operations', voice: 'FGY2WhTYpPnrIDTdsKH5', portrait: 3 },
  peer: { name: 'Alex Mercer', role: 'Your peer CISO', voice: 'N2lVS1w4EtoT3dr4eOWO', portrait: 4 },
  seller: { name: 'Miles Sterling', role: 'Emergency solutions vendor', voice: 'JBFqnCBsd6RMkjVDRZzb', portrait: 5 },
};
export const LOSS_LINES = ['loss1','loss2','loss3','loss4','loss5'];
export const LINES = {
  ai_warning:{speaker:'engineer',text:'[urgent] AI threat inbound. An automated campaign with an adaptive shield, not a magic mind. Put radar on its route to expose it. Then use the matching WAF or upgraded IPS. Apparently the attacker automated its performance review before we did.'},
  grc_inventory:{speaker:'regulator',text:'[dryly] Helena Ward, your regulator. Please submit the asset register. The actual systems, not the ones in the slide with the reassuring padlock. Run your scanner, assign an engineer in Operations, under Tasks, and obtain board sign-off.'},
  grc_recovery:{speaker:'regulator',text:'[firm] Next, recovery evidence. A backup you have never tested is a very expensive belief system. Activate tested backups and assign the evidence task. Your board will review the packet. Yes, they have homework too.'},
  grc_attestation:{speaker:'regulator',text:'[insisting] Final request: the board risk attestation. Close the inventory and recovery evidence first. Then give your directors something specific to sign. A thumbs-up emoji in the incident channel is not a control owner.'},
  grc_board:{speaker:'board',text:'[weary] The evidence packet is here. We are reviewing it now. Apparently being on the board also involves reading. I was led to believe there would be more lunches.'},
  grc_done:{speaker:'regulator',text:'[pleased] Evidence accepted. Clear ownership, a real test, and a board signature. Look at that. Governance without a ninety-slide presentation. Please do not ruin this moment by saying synergy.'},
  grc_late:{speaker:'regulator',text:'[stern] Your evidence deadline passed. The board has been notified. Submit the outstanding packet; ignoring the reminder does not make it a risk treatment. I have a follow-up template, and I am not afraid to use it.'},
  head_intro:{speaker:'head',text:'[dryly] Daniel, Head of Engineering. Welcome. My team ships the features that pay for your firewalls. Yours keeps them from becoming ransom notes. Let us agree on a change window before we agree on a blame window.'},
  head_isolate:{speaker:'head',text:'[frustrated] You just took a service away from my team. I support containment. I would also support a heads-up! If only the public endpoint is exposed, disable that service and keep private operations running. Bring it back after the fix, not after the shouting.'},
  head_patchless:{speaker:'head',text:'[exasperated] There is no patch. I checked twice. Forwarding the advisory in capital letters will not compile one. Restrict the exposed service, contain the host, and layer the right controls. We can replace it if the business can fund the change.'},
  head_newsystem:{speaker:'head',text:'[sheepish] Small update. My team connected a new system. It was temporary, which in engineering means until someone retires. It is not in your inventory yet. Run asset discovery, scan it, and put it under the same controls as everything else.'},
  head_rollout:{speaker:'head',text:'[insisting] Approved does not mean deployed. That rollout still has tests, migrations, and people who click Remind Me Tomorrow. Check the work ledger. The control protects us when it is active, not when the purchase order looks impressive.'},
  head_capacity:{speaker:'head',text:'[tired] Every engineer is working. I cannot assign a patch to a motivational quote. Hire another engineer from the team panel, or contain the systems while the queue clears. And please stop naming every ticket Priority Zero. That is just a list.'},
  hint_detect:{speaker:'engineer',text:'[guiding] The leak is still untraced. Open Programs, Detect, then Data loss monitoring. That identifies the source. Radar sees attackers; it cannot replace data loss monitoring.'},
  hint_contain:{speaker:'engineer',text:'[urgent] We found the leaking building, but data is still leaving. Click the source, then Quarantine egress. The rising packets should stop. After that, remove the collector.'},
  hint_cleanup:{speaker:'engineer',text:'[guiding] Quarantine stopped the transfer. The intruder has not moved out. Select the contained building and assign an engineer to remove the collector and rotate credentials.'},
  hint_supply:{speaker:'engineer',text:'[urgent] That poisoned update is still spawning malware inside the company. Quarantine the source and remove the intruder. Buying another perimeter wall is not going to uninstall it.'},
  social_warning:{speaker:'business',text:'[alarmed] Someone impersonated our chief executive and pressured the help desk into a login reset. Apparently urgent and confidential were the entire authentication process. Staff training and stronger login checks would help.'},
  social_blocked:{speaker:'business',text:'[amused] Fake executive, urgent request, suspicious callback number. We verified it through a trusted channel. Turns out the chief executive does not normally demand passwords from a taxi.'},

  salespitch_v10: { speaker:'seller', text:'[rushed] Miles here! Heard the news, terrible, terrible. We are happy to help. I have your emergency package right here. One click, one signature, let us get you moving. I have already told my team you are a priority. Shall we get this approved?' },
  salesclosed_v10: { speaker:'seller', text:'[excited] Fantastic. Order received. Our team is on it. I will send the invoice to whoever still has a working inbox. We are with you all the way. Through procurement.' },
  agency_intro: { speaker:'agency', text:'[dryly] FBI cyber liaison. First: preserve the logs. Second: contain the spread. Third: stop naming your incident channels, Definitely Not A Breach. We can read those too. Relax. We have seen worse.' },
  agency_leak: { speaker:'agency', text:'[deadpan] Your data appears to have booked an international flight. Trace the source, stop the egress, preserve the evidence. Please do not delete the logs to make the chart look better. That is not incident response. That is interior decorating.' },
  agency_ransom: { speaker:'agency', text:'[wryly] The criminal says they are a trusted recovery partner? Fascinating. Their references include themselves, a burner phone, and your stolen customer database. Restore from verified backups. Keep the evidence. We will bring our own coffee.' },
  bosswarning: { speaker:'engineer', text:'[urgent] BLACKOUT is inbound. That huge armored virus is the campaign lead. Upgrade IPS for armor. Use WAF if radar identifies a web payload. Keep EDR and recovery ready. It is big. It is not invincible.' },
  loss1: { speaker:'board', text:'[angry] The company is offline. Customers cannot work. And you told me we had it under control! No more green dashboards. Preserve the evidence, face the team, and tell me exactly what failed.' },
  loss2: { speaker:'board', text:'[furious] We funded security. We trusted your plan. Now our business is a ransom note with a logo! I want facts, not acronyms. What do we rebuild first, and how do we make sure this never becomes normal?' },
  loss3: { speaker:'board', text:'[upset] There are people behind every one of those systems. Their work. Their customers. Their jobs. This was not a score on a screen to them. Save what we can. Then we owe everyone the truth.' },
  loss4: { speaker:'board', text:'[frustrated] I have six missed calls from investors and one from my mother asking if her data is on the dark web! The strategy deck said resilient. This does not feel resilient. Bring me the recovery plan. No animations.' },
  loss5: { speaker:'board', text:'[angry] Our emergency vendor just sent a congratulatory email. Congratulations on what? The company is down! Stop buying promises. Preserve the evidence, look after the engineers, and show me a recovery plan that actually works.' },
  promotion: { speaker:'board', text:'[warmly] Congratulations. You are our new Chief Information Security Officer. You have our full confidence: five out of five. Keep the company running, spend wisely, and tell me the truth. Nothing is infected yet. Take a breath. Learn the estate. And please, no slides with a padlock on them.' },
  firsttip: { speaker:'engineer', text:'First tip: buy visibility before buying everything. A scanner finds weaknesses. Radar identifies attackers. IPS handles device exploits. WAF slows web attacks. Keep some money for fixing things.' },
  businessplan: { speaker:'business', text:'Security and sales want the same thing: a company that still exists tomorrow. If there is no patch, disable the public service. We can keep private operations running. I can sell slightly inconvenient. I cannot sell encrypted.' },
  hackertaunt: { speaker:'criminal', text:'[chuckles] Nice perimeter. Very architectural. Your forgotten internal server has a somewhat more welcoming personality.' },
  peer: { speaker:'peer', text:'[laughs] Is that your incident dashboard or a Christmas tree? Sorry. Mine looked like that last Tuesday. Backups, identity, one spare engineer. Learn from my very expensive character development.' },
  patchless: { speaker:'engineer', text:'[serious] Sorry. No patch available. We can disable the exposed service, quarantine the system, or replace it. Matching WAF or IPS coverage and EDR buy time. None of those magically fixes the vulnerability.' },
  boardpressure: { speaker:'board', text:'[frustrated] I do not need another maturity framework! I need to know what customers can still use, who is fixing the rest, and when I can stop refreshing my phone!' },
  businesshope: { speaker:'business', text:'The customer portal is still selling. The coffee machine is still judgmental. Keep those critical services alive and I will handle the angry spreadsheets.' },
  hackerlate: { speaker:'criminal', text:'Your security team gets tired. Our scripts do not. On the bright side, our scripts are also terrible at performance reviews.' },
  crownpanic: { speaker:'board', text:'[angry] Our crown jewel is down! That is not a red dot. That is our business! Contain it, restore service, and give me a straight answer. Now!' },
  supplywave: { speaker:'engineer', text:'[urgent] Poisoned update. Malware is spawning inside that building. Ten percent of a wave, every wave, until we clean it. Quarantine stops the spread. Then remove the intruder. A perimeter wall will not fix an inside job.' },
  leakanomaly: { speaker:'business', text:'Our outbound traffic has developed ambitions. Something is sending company data away. We do not know where yet. Please trace it before our customer list becomes somebody else’s customer list.' },
  leakfound: { speaker:'engineer', text:'Data loss monitoring found the source. Follow the rising packets. Quarantine egress now. Then assign an engineer to remove the collector and rotate credentials. Detection is not containment.' },
  leakboard: { speaker:'board', text:'[upset] Our customer data is leaving the building? Stop the transfer, preserve the evidence, and tell the response team. Nobody is calling this a learning opportunity in the press release.' },
  shadowit: { speaker:'business', text:'A department connected another device. Apparently procurement takes too long, but creating an incident is delightfully efficient. Asset discovery will find it.' },
  tipbackup: { speaker:'engineer', text:'Recovery tip: fund tested backups first. Rebuild queues the locked systems by revenue. Keep enough budget and engineers free. A patch does not decrypt the files.' },
  tipcapacity: { speaker:'engineer', text:'Your engineers are busy. Open the Team tab to fund another shift. More tools do not create more hands.' },
  tipidentity: { speaker:'engineer', text:'Fund the identity provider before stolen passwords start crossing the network. Amber wires show its rollout is active. Firewall segments cannot stop a valid stolen login.' },
  tipcontrols: { speaker:'engineer', text:'Watch the targets revealed by radar. Put IPS near device routes, WAF near web routes, and EDR on critical systems. Keep recovery money. An empty bank account is a surprisingly effective attacker.' },
  daywelcome: { speaker: 'engineer', text: 'A day as CISO. Three ways in. One company to keep alive. Start with the exposed system. Coffee is not a security control. Apparently.' },
  ransomware_help: { speaker: 'engineer', text: '[serious] We have a ransomware foothold. The countdown is time until encryption. Remove the intruder now. If files lock, we need tested backups, an engineer, and recovery budget. A patch closes the door. It does not unlock the files.' },
  welcome: { speaker: 'engineer', text: 'Your first shift. Three ways in. One company to keep alive. Start with the exposed system.' },
  patch: { speaker: 'engineer', text: 'On my way. A patch, a reboot, and a very optimistic change ticket.' },
  patched: { speaker: 'engineer', text: 'Patch verified. One less open door. Please do not call it a digital transformation.' },
  isolate: { speaker: 'business', text: 'You unplugged production? Fine. But sales is already composing a strongly worded spreadsheet.' },
  restore: { speaker: 'engineer', text: 'Restoring the system. This is why we test backups, instead of just admiring the backup dashboard.' },
  compromise: { speaker: 'board', text: '[angry] We bought all those boxes! Why is the company on fire? I need a recovery plan. Now.' },
  ransom: { speaker: 'criminal', text: '[chuckles] Good evening. Your files are encrypted. Our customer support is, unfortunately, better than your vendor\'s.' },
  pay: { speaker: 'criminal', text: 'Pleasure doing business. No, there is no satisfaction survey. And do not assume everything comes back.' },
  surge: { speaker: 'engineer', text: '[serious] Scanning surge incoming. Check all three uplinks. Keep an engineer free.' },
  zero: { speaker: 'engineer', text: 'New exploit. No fix yet. Contain the exposure. A purchase order is not a patch.' },
  supply: { speaker: 'engineer', text: 'That signed update came with a surprise. The surprise is malware.' },
  fatigue: { speaker: 'engineer', text: '[tired] I can keep going. But I just tried to reboot my coffee. We need another shift.' },
  review: { speaker: 'board', text: 'Noon review. Tell me what stayed running, what we spent, and what we are fixing next.' },
  goodreview: { speaker: 'board', text: 'Limited damage. Controlled spend. Good. You may continue making security look uneventful.' },
  vendor: { speaker: 'business', text: 'A vendor password is online. They say it is an isolated incident. They also said their password was unique.' },
  won: { speaker: 'engineer', text: '[relieved] Midnight. We made it. The company is still here, and so are we. Handing over.' },
  lost: { speaker: 'board', text: '[disappointed] We are out of runway. Save the evidence. Tell the truth. Then show me what we change tomorrow.' },
  boardbrief: { speaker: 'board', text: 'Thank you. A risk decision I can actually understand. Keep me informed before the newspapers do.' },
};

LINES.succession = { speaker: 'engineer', text: INSIDER_TAKES.succession[0] };
export const VARIANTS={};
for(const [id,text] of Object.entries(ALTERNATES)){if(!LINES[id])throw new Error(`Missing dialogue event: ${id}`);LINES[id+'_alt']={...LINES[id],text};VARIANTS[id]=[id,id+'_alt'];}
Object.assign(LINES,HUMAN_LINES);
Object.assign(VARIANTS,HUMAN_VARIANTS);
for (const [event, takes] of Object.entries(INSIDER_TAKES)) {
  VARIANTS[event] ??= [event];
  takes.forEach((text, i) => {
    if (text === LINES[event].text) return;
    const id = `${event}_insider${i + 1}`;
    LINES[id] = { ...LINES[event], text }; VARIANTS[event].push(id);
  });
}
