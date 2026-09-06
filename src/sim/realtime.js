// Browser focus is not a game control. Advance fixed simulation steps from elapsed
// monotonic time; retain backlog after browser throttling, with bounded work per call.
export function stepRealtime(app,now){
 const elapsed=Math.max(0,(now-(app.simNow??now))/1000);app.simNow=now;
 if(!app.running||app.paused||['won','lost'].includes(app.game.phase)){app.simAccumulator=0;return;}
 app.simAccumulator+=elapsed*app.speed*.75;
 let steps=0;
 while(app.simAccumulator+1e-9>=1/30&&steps++<240){app.game.tick(1/30);app.simAccumulator=Math.max(0,app.simAccumulator-1/30);if(['won','lost'].includes(app.game.phase)){app.simAccumulator=0;break;}}
}
