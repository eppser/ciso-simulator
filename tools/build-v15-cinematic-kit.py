"""Run via Blender MCP. New v9 files and scene; earlier workshops stay intact.
Reuses the existing editable manufacturing kit, with a second material/detail pass.
"""
from pathlib import Path
base=Path('/Users/se/shared/ZeroDayClock/ZDC2/game')
source=(base/'tools/build-ciso-kit.py').read_text()
source=source.replace("models/v2'", "models/v9'").replace('CISO_ReferenceWorkshop_v2','CISO_CinematicWorkshop_v15')
source=source.replace("(.22,.25,.28),.82,.29", "(.43,.48,.54),.78,.31")
source=source.replace("(.025,.032,.041),.62,.34", "(.085,.105,.13),.48,.38")
source=source.replace("(.18,.19,.20),.04,.78", "(.29,.31,.32),.02,.8")
source=source.replace("(.025,.036,.045),.42,.19", "(.085,.10,.075),.08,.30")
source=source.replace("bevel.segments=3", "bevel.segments=2")
source=source.replace('use_selection=True,export_apply=True','use_selection=True,use_active_scene=True,export_apply=True')
source=source.replace("if smooth:\n                for p in data.polygons:p.use_smooth=True", """if smooth:
                for p in data.polygons:p.use_smooth=True
                if self.name=='car' and m=='paint':
                    sub=ob.modifiers.new('Coachwork curvature','SUBSURF');sub.levels=1;sub.render_levels=1""")
source=source.replace("proto={}", """M['ceramic']=mat('ceramic_armor',(.30,.35,.39),.2,.42)
M['titanium']=mat('machined_titanium',(.47,.53,.59),.83,.26)
M['window_cool']=mat('occupied_interior_cool',(.16,.24,.30),.05,.65,.25)
M['window_dark']=mat('unoccupied_room',(.018,.024,.035),.05,.7)
proto={}""")
# Individual occupied rooms, not an identical orange wall on every floor.
source=source.replace("k.box((0,side*.54,z+.15),(1.64,.015,.29),'window')", """for bay in range(5):
                    wm=['window','window_dark','window_cool','window_dark','window'][(bay*7+level*3+(0 if side<0 else 2))%5]
                    k.box((-.64+bay*.32,side*.54,z+.15),(.29,.015,.29),wm)""")
source=source.replace("k.box((side*.59,0,z+.15),(.015,1.4,.29),'window')", """for bay in range(4):
                    wm=['window_cool','window','window_dark','window_dark'][(bay+level*3)%4]
                    k.box((side*.59,-.51+bay*.34,z+.15),(.015,.31,.29),wm)""")
# Purpose-built IPS silhouette: ceramic barrel shrouds, collars, heat sinks,
# pistons and sensor optic stay in head_* batches, preserving aiming/recoil.
source=source.replace("if name=='ips':\n            k.cyl", """if name=='ips':
            for side in [-1,1]:
                x=side*.20
                for yy in [-.45,-.25,-.05]:
                    k.box((x,yy,.802),(.142,.17,.024),'ceramic','head')
                    for dx in [-.056,.056]:
                        k.cyl((x+dx,yy-.065,.82),.008,.012,'titanium','head')
                for yy in [-.53,-.27,.03]:
                    k.box((x,yy,.67),(.205,.03,.205),'titanium','head')
                for j in range(10):
                    k.box((x+side*.095,-.45+j*.055,.68),(.014,.018,.13),'dark','head')
                k.rod((side*.27,.23,.48),(side*.27,-.04,.69),.023,'titanium','head')
                k.rod((side*.27,.23,.48),(side*.27,.08,.59),.035,'steel','head')
                k.torus((x,-.64,.67),.074,'titanium','head',R)
                k.torus((x,-.658,.67),.057,'dark','head',R)
                for j in range(5):
                    k.cyl((side*.285,.05+j*.035,.69),.045,.022,'titanium','head',R)
                k.rod((side*.285,.22,.69),(side*.285,-.29,.62),.014,'copper','head')
                k.box((side*.32,.20,.64),(.13,.19,.18),'steel','head')
                for j in range(5):k.box((side*.389,.14+j*.03,.64),(.01,.012,.12),'dark','head')
            for j in range(4):
                k.cyl((0,0,.31+j*.043),.32-j*.013,.032,'titanium' if j%2 else 'dark')
            for j in range(12):
                a=j*math.tau/12
                k.cyl((math.sin(a)*.26,math.cos(a)*.26,.485),.010,.018,'titanium')
            k.box((0,.12,.80),(.18,.22,.10),'ceramic','head')
            k.cyl((0,-.002,.81),.033,.035,'blue','head',R)
            k.cyl""")
source=source.replace("k.box((x,-.20,.67),(.17,.77,.18),'steel','head')", """k.raw([(x+dx,yy,zz) for yy,w,lo,hi in [(-.585,.073,.59,.73),(.185,.104,.57,.78)] for dx,zz in [(-w,lo),(w,lo),(w,hi),(-w,hi)]],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],'steel','head')""")
# Roof service ducts, electrical boxes and cable trays add scale without changing footprints.
source=source.replace("k.box((-.55,.50,h+.16),(.4,.28,.3),'dark')", """k.box((-.55,.50,h+.16),(.4,.28,.3),'dark')
    for x in [-.73,.72]:
        k.box((x,.28,h+.06),(.08,.64,.05),'steel')
        for yy in [-.01,.18,.37,.55]:k.box((x,yy,h+.094),(.10,.025,.02),'titanium')
    k.box((.64,-.46,h+.10),(.19,.28,.17),'ceramic')
    for yy in [-.56,-.50,-.44,-.38]:k.box((.64,yy,h+.19),(.16,.02,.02),'dark')""")
# Don't save until the new biological meshes and imported boss/platform are complete.
source=source.replace("for x in [-.14,.14]:k.box", """for side in [-1,1]:
    # Side glazing, bright beltline, door seams and wheels with actual spoke detail.
    k.raw([(side*.205,-.105,.265),(side*.165,-.085,.345),(side*.165,.105,.36),(side*.215,.245,.27)],[(0,1,2,3)],'glass')
    k.rod((side*.216,-.22,.255),(side*.216,.29,.255),.006,'steel')
    k.rod((side*.218,.065,.12),(side*.218,.065,.26),.004,'dark')
    for yy in [-.29,.29]:
        for j in range(7):
            a=j*math.tau/7
            k.rod((side*.258,yy,.115),(side*.258,yy+math.sin(a)*.052,.115+math.cos(a)*.052),.006,'titanium')
for x in [-.14,.14]:k.box""")
source=source.split("bpy.ops.wm.save_as_mainfile")[0]
exec(source)

M['membrane']=mat('organic_membrane',(.38,.025,.035),0,.48)
M['spore']=mat('organic_spore',(.24,.36,.055),0,.40)
M['tissue']=mat('organic_tissue',(.16,.23,.045),0,.46)
M['lesion']=mat('organic_lesion',(.19,.023,.038),0,.52)
for key in ['membrane','spore','tissue','lesion']:
    M[key].node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.28

# A second, explicitly organic Blender pass replaces the old mechanical worm/virus.
for name in ['virus','aithreat']:
    k=Kit(name);origin=Vector((0,0,.70));body='tissue' if name=='aithreat' else 'membrane'
    k.sphere(origin,(.34,.33,.37),body,'nucleus')
    for i in range(30):
        z=1-2*(i+.5)/30;r=math.sqrt(1-z*z);a=i*2.399963
        direction=Vector((math.cos(a)*r,math.sin(a)*r,z))
        start=origin+direction*.28;mid=origin+direction*(.39+.025*math.sin(i));end=origin+direction*(.49+.045*math.sin(i*3))
        bend=Vector((.024*math.sin(i*2),.02*math.cos(i),0))
        k.rod(start,mid+bend,.023,body,'nucleus');k.rod(mid+bend,end,.018,body,'nucleus')
        k.sphere(end,(.045,.042,.054),'lesion' if name=='aithreat' else 'spore','nucleus')
    for i in range(26):
        z=1-2*(i+.5)/26;r=math.sqrt(1-z*z);a=i*2.399963
        p=origin+Vector((math.cos(a)*r*.33,math.sin(a)*r*.32,z*.36))
        k.sphere(p,(.038,.034,.025),body,'nucleus')
    k.export()
k=Kit('worm')
for i in range(9):
    y=-.60+i*.145;part='segment'+str(i);r=.17*(.84+.16*math.sin(i/8*math.pi))
    k.sphere((0,y,.18),(r,.12,r*.80),'tissue',part)
    for side in [-1,1]:
        k.rod((side*.1,y,.14),(side*.2,y-.04,.035),.017,'lesion',part)
    if i==0:
        for side in [-1,1]:
            k.sphere((side*.057,y-.09,.23),(.020,.02,.018),'lesion',part)
            k.rod((side*.065,y-.06,.2),(side*.11,y-.19,.24),.009,'tissue',part)
k.export()

# Preserve the existing boss/platform mesh design but export single-user revised materials.
for name in ['boss','platform']:
    old=bpy.data.objects.get('CISO_'+name)
    assert old is not None,name
    root=bpy.data.objects.new('CISO_'+name,None);scene.collection.objects.link(root)
    for child in old.children:
        ob=child.copy();ob.data=child.data.copy();ob.parent=root;scene.collection.objects.link(ob)
        for slot in ob.material_slots:
            m=slot.material.copy();slot.material=m
            p=m.node_tree.nodes.get('Principled BSDF')
            if p and 'steel' in m.name:p.inputs['Base Color'].default_value=(.34,.40,.46,1)
        ob.hide_set(False)
    bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
    for ob in root.children:ob.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(base/'public/models/v9'/f'{name}.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True)
    for ob in [root,*root.children]:ob.hide_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(base/'public/models/v9/cinematic-workshop.blend'))
result={'scene':scene.name,'files':sorted(p.name for p in (base/'public/models/v9').glob('*.glb')),'previous_scenes_preserved':True}
