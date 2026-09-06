"""Run in Blender through Blender MCP; preserves all existing scene objects.
Authoring units correspond to the game's grid. Materials and geometry export to GLB.
"""
import bpy, math, random, os
from mathutils import Vector

OUT = '/Users/se/shared/ZeroDayClock/ZDC2/game/public/models'
os.makedirs(OUT, exist_ok=True)
scene = bpy.data.scenes.new('ZDC_Campus_AssetWorkshop')
bpy.context.window.scene = scene
random.seed(20260902)

def material(name, color, metal=0, rough=.5, emission=0):
    m = bpy.data.materials.new('ZDC_' + name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Roughness'].default_value = rough
    if emission:
        bs.inputs['Emission Color'].default_value = (*color, 1)
        bs.inputs['Emission Strength'].default_value = emission
    return m

concrete = material('architectural_concrete', (.27,.29,.31), .15, .67)
steel = material('brushed_steel', (.36,.39,.42), .8, .27)
dark = material('anodized_charcoal', (.038,.045,.055), .55, .32)
glass = material('reflective_glazing', (.10,.17,.22), .72, .14)
lit = material('warm_occupied_windows', (.9,.7,.43), .12, .35, 1.3)
white = material('architectural_lighting', (.8,.88,.95), .1, .35, 1.8)
red = material('signal_red', (.95,.065,.035), .35, .3, 2.3)
skin = material('skin', (.5,.3,.19), 0, .65)
cloth = material('workwear', (.075,.10,.13), 0, .9)

parts = []
def box(name, dims, loc, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.object; ob.name=name
    ob.dimensions=dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    if bevel:
        mod=ob.modifiers.new('Machined edges','BEVEL');mod.width=bevel;mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    parts.append(ob); return ob

def cylinder(name, radius, depth, loc, mat, vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    ob=bpy.context.object;ob.name=name;ob.data.materials.append(mat);parts.append(ob)
    return ob

def roof(w,d,h,units=2):
    box('Roof deck',(w+.06,d+.06,.08),(0,0,h),concrete,.015)
    for y in [-d/2,d/2]: box('Roof parapet',(w,.045,.14),(0,y,h+.06),steel)
    for x in [-w/2,w/2]: box('Roof parapet',(.045,d,.14),(x,0,h+.06),steel)
    for i in range(units):
        x = (i-(units-1)/2)*.48
        box('Cooling cabinet',(.38,.48,.24),(x,.05,h+.16),steel,.025)
        cylinder('Fan rim',.155,.04,(x,.05,h+.3),dark,24)
        cylinder('Fan motor',.035,.055,(x,.05,h+.33),steel,16)
        for k in range(6):
            blade=box('Fan blade',(.22,.028,.016),(x,.05,h+.325),steel)
            blade.rotation_euler.z=k*math.pi/3
        for k in range(5):box('HVAC louver',(.30,.012,.015),(x,-.195,h+.08+k*.035),dark)
    box('Service hut',(.34,.32,.3),(-w*.31,d*.25,h+.19),concrete,.016)
    cylinder('Roof vent',.05,.25,(w*.34,-d*.27,h+.16),steel)
    for x,y in [(-w/2,-d/2),(w/2,d/2)]:cylinder('Aircraft beacon',.025,.055,(x,y,h+.16),red,10)

def facade(w,d,h,floors):
    for z in range(floors):
        height=.35+(h-.5)*(z+.5)/floors
        for side in [-1,1]:
            for i in range(7):
                x=-w/2+.12+(w-.24)*i/6
                box('Window',(.17,.018,(h-.5)/floors*.7),(x,side*(d/2+.008),height),lit if random.random()<.42 else glass)
            box('Floor spandrel',(w+.04,.04,.045),(0,side*(d/2+.01),height+(h-.5)/floors*.47),steel)
            for i in range(6):
                y=-d/2+.12+(d-.24)*i/5
                box('Side window',(.018,.17,(h-.5)/floors*.7),(side*(w/2+.008),y,height),lit if random.random()<.32 else glass)
    for x in [-w/2,0,w/2]:box('Facade mullion',(.028,.03,h-.2),(x,-d/2-.025,h/2),steel)

def building(kind):
    global parts;parts=[]
    h={'office':1.65,'tower':3.3,'datacenter':2.0,'warehouse':.85,'telecom':.7,'soc':.8}[kind]
    w,d=(1.72,1.58)
    box('Foundation',(2.05,1.95,.12),(0,0,.04),concrete,.025)
    box('Main structure',(w,d,h),(0,0,h/2+.12),dark if kind in ['datacenter','soc'] else concrete,.025)
    if kind=='warehouse':
        for i in range(4):
            box('Loading bay',(.3,.026,.45),(-.56+i*.38,-d/2-.02,.36),steel,.01)
            for k in range(7):box('Shutter rib',(.29,.02,.012),(-.56+i*.38,-d/2-.04,.18+k*.055),dark)
    else:facade(w,d,h+ .12,max(2,round(h/.3)))
    if kind=='datacenter':
        for side in [-1,1]:
            for i in range(10):box('Secure facade fin',(.042,.09,h),(side*w/2,-d/2+.09+i*.15,h/2+.13),steel)
    roof(w,d,h+.16,3 if kind=='datacenter' else 2)
    box('Lobby doors',(.44,.04,.31),(0,-d/2-.035,.29),glass)
    box('Entrance canopy',(.64,.37,.035),(0,-d/2-.13,.53),steel,.008)
    box('Entrance light',(.55,.022,.016),(0,-d/2-.27,.505),white)
    for i in range(3):box('Entrance steps',(.7,.10,.028),(0,-d/2-.1-i*.09,.12-i*.03),concrete)
    if kind=='telecom':
        cylinder('Communications mast',.035,1.8,(.56,.26,1.7),steel,12)
        for z in [1.2,1.7,2.2]:
            for x in [-.11,.11]:box('Antenna',(.045,.11,.38),(.56+x,.26,z),white,.008)
        cylinder('Mast beacon',.045,.06,(.56,.26,2.64),red,10)
    if kind=='soc':
        box('SOC front display',(1.1,.025,.25),(0,-d/2-.035,.61),glass)
        for i in range(5):box('Operations monitor',(.13,.03,.075),(-.42+i*.21,-d/2-.055,.61),white)
    for x in [-.94,.94]:cylinder('Bollard',.025,.18,(x,-.95,.19),steel,10)
    export(kind)

def export(kind):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in parts:ob.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    ob=bpy.context.object;ob.name='ZDC_'+kind
    scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,kind+'.glb'),export_format='GLB',use_selection=True,export_apply=True)
    ob.hide_set(True)

for kind in ['office','tower','datacenter','warehouse','telecom','soc']:building(kind)
# Fully modeled field engineer. Separate limbs remain named for runtime animation.
parts=[]
box('Engineer torso',(.16,.09,.22),(0,0,.36),cloth,.035)
cylinder('Engineer neck',.034,.05,(0,0,.5),skin)
bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=.075,location=(0,0,.59))
bpy.context.object.data.materials.append(skin);parts.append(bpy.context.object)
for side in [-1,1]:
    leg=box('Leg',(.057,.066,.24),(side*.05,0,.15),cloth,.015)
    box('Shoe',(.065,.11,.045),(side*.05,-.025,.025),dark,.015)
    arm=box('Arm',(.05,.06,.22),(side*.12,0,.36),cloth,.02)
    box('Hand',(.045,.05,.055),(side*.12,0,.23),skin,.02)
box('High visibility vest',(.17,.10,.035),(0,0,.40),white)
box('Tablet',(.13,.02,.10),(.1,-.10,.33),dark,.01)
export('engineer')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'campus-assets.blend'))
result={'exports':os.listdir(OUT),'scene':scene.name,'materials':len(scene.objects),'source':'Blender MCP authored campus'}
