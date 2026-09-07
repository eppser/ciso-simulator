// NIST CSF functions organize the interface; simulation IDs remain replay-stable.
export const PROGRAM_TRACKS=['Actions','Govern','Identify','Protect','Detect','Respond','Recover'];
export const TRACK_HELP={Actions:'Live priorities · choose a response or select an affected building.',Govern:'Set policy, brief the board and prepare regulatory evidence.',Identify:'Know your assets and weaknesses. Scanning is not attack detection.',Protect:'Prevent compromise: identity, training and safer changes.',Detect:'Find attacks already happening: SIEM and data-loss monitoring.',Respond:'Contain incidents, preserve evidence and coordinate responders.',Recover:'Restore services with verified backups and recovery capacity.'};
export const canonicalTrack=track=>({Visibility:'Identify',Find:'Identify',Identity:'Protect'}[track]||track);
export const programTrack=p=>['comms','retainer','drill'].includes(p.id)?'Respond':canonicalTrack(p.track);
export const operationTrack=r=>['fbi-evidence','reg-report'].includes(r.id)?'Respond':r.kind==='threat'?(r.track==='Detect'?'Detect':'Respond'):canonicalTrack(r.track||'Actions');
