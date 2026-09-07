// The game targets 60 rendered frames/s, including on 120/144/240 Hz displays.
// Simulation time is deliberately independent of this presentation gate.
export class RenderCadence{
 constructor(fps=60){this.interval=1000/fps;this.next=null;}
 shouldRender(now,hidden=false){
  if(hidden){this.next=null;return false;}
  if(this.next===null){this.next=now+this.interval;return true;}
  if(now+.5<this.next)return false;
  this.next+=Math.max(1,Math.floor((now-this.next)/this.interval)+1)*this.interval;
  return true;
 }
}
