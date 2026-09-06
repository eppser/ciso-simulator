"""Non-destructive v21 Blender material/mesh workshop, invoked through Blender MCP.
Existing v9 scenes/files remain untouched. Local preview geometry is not a game entity.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
BASE=Path('/Users/se/shared/ZeroDayClock/ZDC2/game')
OUT=BASE/'public/models/v21'
OUT.mkdir(parents=True,exist_ok=True)
ART=BASE/'artifacts/storm-v21'
ART.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('CISO_Storm_Workshop_v21')
bpy.context.window.scene=scene
scene.render.engine='BLENDER_EEVEE'
scene.unit_settings.system='METRIC'
names=['office','tower','datacenter','warehouse','telecom','soc','engineer','car','ndr','ips','waf','wall','honeytoken','edr','virus','beetle','worm','boss','platform','aithreat']
roots={}
stats=[]
for name in names:
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.import_scene.gltf(filepath=str(BASE/'public/models/v9'/f'{name}.glb'))
    imported=list(bpy.context.selected_objects)
    root=next(o for o in imported if o.type=='EMPTY' and o.name.startswith('CISO_'+name))
    roots[name]=root
    # The copied meshes retain articulation and bounds. Shading changes are local.
    used={}
    for ob in imported:
        if ob.type!='MESH':continue
        for slot in ob.material_slots:
            old=slot.material
            if old.name not in used:used[old.name]=old.copy()
            slot.material=used[old.name]
            m=slot.material;p=m.node_tree.nodes.get('Principled BSDF')
            if not p:continue
            n=m.name.lower()
            if any(s in n for s in ['steel','titanium','ceramic','graphite','clearcoat','chitin','organic','viral']):
                p.inputs['Coat Weight'].default_value=.55 if 'organic' in n else .8
                p.inputs['Coat Roughness'].default_value=.16
            if 'steel' in n or 'titanium' in n:
                p.inputs['Roughness'].default_value=.24
            if 'ceramic' in n:
                p.inputs['Base Color'].default_value=(.34,.39,.43,1)
                p.inputs['Roughness'].default_value=.29
            if 'concrete' in n:p.inputs['Roughness'].default_value=.53
            if 'organic' in n:
                p.inputs['Metallic'].default_value=0
                p.inputs['Roughness'].default_value=.29
            if 'obsidian_chitin' in n:
                p.inputs['Base Color'].default_value=(.045,.065,.048,1)
                p.inputs['Roughness'].default_value=.24
            if 'curtain_glass' in n:
                p.inputs['Roughness'].default_value=.08
        # Recalculate corner-weighted normals without inflating the silhouette.
        if any(s in ob.name for s in ['steel','ceramic','titanium','concrete']):
            mod=ob.modifiers.new('Storm precise corner normals','WEIGHTED_NORMAL')
            mod.keep_sharp=True;mod.weight=40
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{name}.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True)
    stats.append({'asset':name,'meshes':sum(o.type=='MESH' for o in imported),'polygons':sum(len(o.data.polygons) for o in imported if o.type=='MESH')})
    for o in imported:o.hide_render=True;o.hide_set(True)

# A separate look-development diorama with the actual exported mesh family.
preview=bpy.data.scenes.new('CISO_Storm_Lookdev_v21')
bpy.context.window.scene=preview
preview.render.engine='BLENDER_EEVEE'
preview.render.resolution_x=720;preview.render.resolution_y=540;preview.render.resolution_percentage=100
preview.render.image_settings.file_format='PNG'
preview.view_settings.view_transform='AgX'
preview.world=bpy.data.worlds.new('Storm slate sky v21');preview.world.use_nodes=True
preview.world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.19,.25,1)
preview.world.node_tree.nodes['Background'].inputs[1].default_value=.3

def showcase(name,loc,scale=1,yaw=0):
    src=roots[name]
    root=src.copy();preview.collection.objects.link(root)
    root.hide_render=False;root.hide_set(False);root.location=loc;root.scale*=scale;root.rotation_euler.z=yaw
    for child in src.children_recursive:
        ob=child.copy();preview.collection.objects.link(ob);ob.parent=root;ob.hide_render=False;ob.hide_set(False)
    return root

# Imported GLB root rotates from Y-up back to Blender Z-up; translate in Blender space.
for name,loc,scale in [('office',(-2.9,2.8,0),1.2),('tower',(0,3.7,0),1.15),('datacenter',(3,3.3,0),1.2),('ips',(-2,-1.9,0),1.7),('waf',(2,-.8,0),1.6),('virus',(.5,-2.5,.25),1.65),('beetle',(-.7,.2,0),1.7),('worm',(2.8,-2.9,0),1.7),('ndr',(-3.5,.2,0),1.5),('car',(3.6,1,0),1.2)]:showcase(name,loc,scale)

def material(name,color,metal=0,rough=.5):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    return m
ground=material('Storm asphalt lookdev',(.038,.051,.063),.22,.25)
nt=ground.node_tree;n=nt.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=32;n.inputs['Detail'].default_value=3
bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.27;bump.inputs['Distance'].default_value=.035
nt.links.new(n.outputs['Fac'],bump.inputs['Height']);nt.links.new(bump.outputs[0],nt.nodes['Principled BSDF'].inputs['Normal'])
noise=nt.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=4;noise.inputs['Detail'].default_value=2
ramp=nt.nodes.new('ShaderNodeValToRGB');ramp.name='Puddle coverage';ramp.color_ramp.elements[0].position=.28;ramp.color_ramp.elements[0].color=(.09,.09,.09,1);ramp.color_ramp.elements[1].position=.65;ramp.color_ramp.elements[1].color=(.4,.4,.4,1)
nt.links.new(noise.outputs['Fac'],ramp.inputs[0]);nt.links.new(ramp.outputs[0],nt.nodes['Principled BSDF'].inputs['Roughness'])
nt.nodes['Principled BSDF'].inputs['Coat Weight'].default_value=1
nt.nodes['Principled BSDF'].inputs['Coat Roughness'].default_value=.09
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.15));floor=bpy.context.object;floor.name='Wet platform lookdev';floor.scale=(11,11,.27);floor.data.materials.append(ground)

lights={}
for name,loc,power,color,size in [('key',(-5,-1,9),1800,(.66,.8,1),7),('rim',(2,6,7),2400,(.34,.64,1),5),('warm',(-4,-3,4),380,(1,.57,.27),3)]:
    data=bpy.data.lights.new('Storm '+name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new('Storm '+name,data);preview.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(-ob.location).to_track_quat('-Z','Y').to_euler();lights[name]=ob

cloud=bpy.data.materials.new('Storm volume lookdev');cloud.use_nodes=True;nt=cloud.node_tree;nt.nodes.clear()
out=nt.nodes.new('ShaderNodeOutputMaterial');vol=nt.nodes.new('ShaderNodeVolumePrincipled');vol.inputs['Color'].default_value=(.22,.29,.37,1);vol.inputs['Anisotropy'].default_value=.25
tex=nt.nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=3.5;tex.inputs['Detail'].default_value=3.2;tex.inputs['Roughness'].default_value=.72
mul=nt.nodes.new('ShaderNodeMath');mul.operation='MULTIPLY';mul.name='Cloud density';mul.inputs[1].default_value=1.3
nt.links.new(tex.outputs['Fac'],mul.inputs[0]);nt.links.new(mul.outputs[0],vol.inputs['Density']);nt.links.new(vol.outputs[0],out.inputs['Volume'])
for i in range(9):
    a=i/9*math.tau;bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=(math.sin(a)*8,math.cos(a)*8,1))
    ob=bpy.context.object;ob.name='Perimeter cloud lookdev';ob.scale=(4,2.5,2.2);ob.data.materials.append(cloud)
camdata=bpy.data.cameras.new('Storm review camera');cam=bpy.data.objects.new('Storm review camera',camdata);preview.collection.objects.link(cam);cam.location=(11,-17,12);target=Vector((0,.8,.4));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='PERSP';camdata.lens=47;preview.camera=cam
if hasattr(preview,'eevee'):
    preview.eevee.taa_render_samples=32
    preview.eevee.use_raytracing=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'storm-workshop.blend'))
(ART/'assets.json').write_text(json.dumps(stats,indent=2))
result={'scene':preview.name,'assets':stats,'preserved_v9':True}
