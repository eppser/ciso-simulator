// Original game characters. These incidents are not attributed to observation data.
export const HUMAN_LINES = {
 worker_intro: { speaker:'contractor', text:'[cheerfully] Ben Carter, remote developer. My camera is broken, my references are on holiday, and my timesheet has achieved one hundred and ninety percent availability. Shall we skip onboarding? In the interest of agility.' },
 worker_intro_2: { speaker:'contractor', text:'[confident] Great news: I can work in every time zone. Bad news: payroll keeps calling that physically impossible. Please approve my laptop delivery to the address marked definitely an office.' },
 worker_intro_3: { speaker:'contractor', text:'[deadpan] My résumé says team player. Technically, three of my references are also me. That is a very aligned team. Can somebody approve my access before Human Resources starts doing research?' },
 worker_detected: { speaker:'engineer', text:'[urgent] Contractor identity checks failed. We suspect a North Korea-linked worker fraud operation, not a software bug. Open Active threats. Revoke access and freeze payments, then investigate. A firewall cannot interview a résumé.' },
 worker_contained: { speaker:'contractor', text:'[offended] My account is disabled and my payments are frozen. Is this your offboarding process? I was about to propose a five-year roadmap. Mostly invoices, but the font was excellent.' },
 worker_contained_2: { speaker:'contractor', text:'[nervously] I see you revoked my sessions. Bold leadership. Could you at least endorse me for cloud architecture? My entire identity was hosted in one.' },
 worker_resolved: { speaker:'engineer', text:'[relieved] Access reviewed, evidence preserved, payment trail documented. The fraud case is closed. Next hire: verify identity, references and who actually has the laptop. A green availability dot is not a background check.' },
 worker_resolved_2: { speaker:'board', text:'[incredulous] We hired a résumé with a subscription model. Fine. You stopped the payments and completed the investigation. Please tell Human Resources that cultural fit does not mean the same person fits five identities.' },
 worker_prevented: { speaker:'contractor', text:'[flustered] Live identity verification? Independent references? Company-device checks? Your hiring process has become extremely hostile to my business model. I will withdraw. For personal reasons. Several persons, actually.' },
 worker_prevented_2: { speaker:'contractor', text:'[sighs] Your hiring team called my references independently. Nobody has ever read that far down my résumé. I respect the professionalism. I will now be unavailable in all six of my time zones.' },
 worker_tip: { speaker:'engineer', text:'[guiding] The contractor alert is still open. Active threats, then Revoke access and freeze payments. That costs nothing. An engineer can investigate afterward. Awareness helps prevention; it does not revoke a live account.' },
 worker_tip_2: { speaker:'agency', text:'[dryly] Suspicious contractor? Preserve evidence, revoke access, hold payments, and review credentials. Please do not replace identity checks with a nationality guessing competition. Verify every remote hire. Yes, even the one who likes your posts.' },
 insider_detected: { speaker:'engineer', text:'[urgent] A legitimate account is abusing its access. That is an insider incident, not an incoming bug. Open Active threats and suspend the account. Then investigate. Admin lock limits damage; it does not conduct the interview.' },
 insider_detected_2: { speaker:'business', text:'[alarmed] Somebody interpreted access to the shared drive as ownership of the shared drive. Suspend the account, preserve evidence, and review permissions. We meant bring your whole self to work, not take the whole database home.' },
 insider_contained: { speaker:'business', text:'[relieved] Access suspended. The suspicious activity stopped. Please investigate before restoring anything. I would prefer our exit interview not to include a demonstration of how much data fits on a personal drive.' },
 insider_resolved: { speaker:'engineer', text:'[pleased] Insider investigation complete. Credentials reviewed and evidence retained. Access is not a lifetime achievement award. Keep privileges narrow, monitor misuse, and let actual evidence do the talking.' },
};
export const HUMAN_VARIANTS = {
 worker_intro: ['worker_intro','worker_intro_2','worker_intro_3'],
 worker_contained: ['worker_contained','worker_contained_2'],
 worker_resolved: ['worker_resolved','worker_resolved_2'],
 worker_prevented: ['worker_prevented','worker_prevented_2'],
 worker_tip: ['worker_tip','worker_tip_2'],
 insider_detected: ['insider_detected','insider_detected_2'],
};
