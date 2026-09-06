"""Imagegen-led v3 context house. Reuse the authored kit's batching and PBR materials.
Run in Blender MCP. Creates a new scene and new files, retaining both v2 workshops.
"""
from pathlib import Path
base=Path('/Users/se/shared/ZeroDayClock/ZDC2/game')
prefix=(base/'tools/build-ciso-kit.py').read_text().split('def hvac')[0]
prefix=prefix.replace("OUT='/Users/se/shared/ZeroDayClock/ZDC2/game/public/models/v2'","OUT='/Users/se/shared/ZeroDayClock/ZDC2/game/public/models/v3'")
prefix=prefix.replace("scenes.new('CISO_ReferenceWorkshop_v2')","scenes.new('CISO_Neighborhood_v3')")
exec(prefix)
os.makedirs(OUT,exist_ok=True)
k=Kit('neighborhood')
k.box((0,0,.06),(1.84,1.64,.12),'concrete')
# Recessed facade openings with separate frames, glazing and interiors.
k.box((0,.72,.96),(1.8,.12,1.8),'dark')
for x in [-.86,.86]:k.box((x,0,.96),(.08,1.55,1.8),'dark')
for z in [.13,.94,1.82]:k.box((0,0,z),(1.8,1.6,.10),'concrete')
for x in [-.85,-.12,.82]:k.box((x,-.75,.98),(.13,.10,1.68),'concrete')
for x in [-.85,.85]:
    for j in range(24):
        z=.17+j*.066
        for q in range(5):
            y=-.67+q*.31+(j%2)*.025;k.box((x,y,z),(.09,.297,.055),'dark')
for z in [.53,1.39]:
    for x in [-.49,.35]:
        k.box((x,-.705,z),(.60,.025,.60),'glass')
        k.box((x,-.45,z),(.58,.022,.54),'window')
        k.box((x,-.52,z-.20),(.49,.29,.07),'wood')
        for sx in [-.31,.31]:k.box((x+sx,-.74,z),(.035,.065,.68),'steel')
        for sz in [-.33,.33]:k.box((x,-.74,z+sz),(.66,.065,.035),'steel')
        k.box((x,-.755,z),(.020,.03,.62),'steel')
k.box((.36,-.77,.47),(.55,.035,.74),'wood')
k.rod((.55,-.801,.37),(.55,-.801,.52),.012,'steel')
for i in range(3):k.box((.36,-.87-i*.12,.12-i*.033),(.72,.35,.08),'concrete')
k.box((.36,-.805,.91),(.21,.025,.027),'warm')
# Standing-seam gable roof, fascia, gutters and real downspout.
roof=[(-.98,-.87,1.86),(.98,-.87,1.86),(-.98,0,2.43),(.98,0,2.43),(-.98,.87,1.86),(.98,.87,1.86)]
k.raw(roof,[(0,1,3,2),(2,3,5,4)],'steel')
k.raw([(-.89,-.8,1.82),(-.89,.8,1.82),(-.89,0,2.39),(.89,-.8,1.82),(.89,.8,1.82),(.89,0,2.39)],[(0,1,2),(3,5,4)],'dark')
for i in range(13):
    x=-.96+i*.16;k.rod((x,-.87,1.87),(x,0,2.44),.009,'dark');k.rod((x,0,2.44),(x,.87,1.87),.009,'dark')
for y in [-.88,.88]:k.rod((-.99,y,1.85),(.99,y,1.85),.026,'steel')
k.rod((.95,-.84,.08),(.95,-.84,1.85),.019,'steel')
k.export()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'neighborhood-workshop.blend'))
result={'scene':scene.name,'glb':os.path.join(OUT,'neighborhood.glb'),'source':os.path.join(OUT,'neighborhood-workshop.blend')}
