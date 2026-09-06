"""Blender MCP: set FIRST/LAST before exec to render a short batch, preserving feedback checkpoints."""
import bpy,json
from pathlib import Path
base=Path('/Users/se/shared/ZeroDayClock/ZDC2/game/artifacts/storm-v21')
s=bpy.data.scenes['CISO_Storm_Lookdev_v21'];bpy.context.window.scene=s
rounds=json.loads((base/'iterations.json').read_text())
ground=bpy.data.materials['Storm asphalt lookdev'];ramp=ground.node_tree.nodes['Puddle coverage'].color_ramp
cloud=bpy.data.materials['Storm volume lookdev']
rendered=[]
for v in rounds:
    if not FIRST<=v['round']<=LAST:continue
    s.world.node_tree.nodes['Background'].inputs[1].default_value=v['fill']*.10
    s.view_settings.exposure=(v['exposure']-1.13)*2-1.0
    s.objects['Storm key'].data.energy=v['key']*420
    s.objects['Storm rim'].data.energy=v['rim']*1200
    ramp.elements[0].position=1-v['wetCoverage']-.2
    ramp.elements[1].position=min(.98,1-v['wetCoverage']+.25)
    ramp.elements[0].color=(max(.025,.19-v['reflection']*.2),)*3+(1,)
    ground.node_tree.nodes['Principled BSDF'].inputs['Coat Roughness'].default_value=.06+v['distortion']*15
    cloud.node_tree.nodes['Cloud density'].inputs[1].default_value=v['cloudOpacity']*.75
    cloud.node_tree.nodes['Principled Volume'].inputs['Color'].default_value=(v['cloudLight']*.25,v['cloudLight']*.32,v['cloudLight']*.4,1)
    s.render.filepath=str(base/f"blender-{v['round']:02d}.png")
    bpy.ops.render.render(write_still=True)
    rendered.append(v['round'])
result={'rendered':rendered,'paths':[str(base/f'blender-{i:02d}.png') for i in rendered]}
