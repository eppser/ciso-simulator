"""Reference-led v2 asset workshop. Run through Blender MCP, preserving prior scenes.
17 GLB asset classes, grouped by PBR material and articulated part for real-time use.
"""
import bpy, math, random, os
from mathutils import Vector, Matrix
OUT='/Users/se/shared/ZeroDayClock/ZDC2/game/public/models/v2'
scene=bpy.data.scenes.new('CISO_ReferenceWorkshop_v2')
bpy.context.window.scene=scene
scene.unit_settings.system='METRIC'
random.seed(42)

def mat(name,c,metal=0,rough=.5,emit=0,alpha=1):
    m=bpy.data.materials.new('CISO_'+name);m.diffuse_color=(*c,alpha);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    for key,val in [('Base Color',(*c,alpha)),('Metallic',metal),('Roughness',rough),('Alpha',alpha),('Emission Color',(*c,1)),('Emission Strength',emit)]:p.inputs[key].default_value=val
    if alpha<1:m.surface_render_method='DITHERED'
    return m
M={
 'concrete':mat('cast_concrete',(.18,.19,.20),.04,.78),
 'steel':mat('satin_steel',(.22,.25,.28),.82,.29),
 'dark':mat('graphite_panels',(.025,.032,.041),.62,.34),
 'glass':mat('curtain_glass',(.085,.15,.20),.45,.10,0,.26),
 'window':mat('occupied_interior',(.45,.30,.17),.05,.7,.32),
 'wood':mat('oak_desks',(.22,.13,.066),.05,.58),
 'warm':mat('warm_practical',(.95,.65,.30),.2,.28,2.0),
 'blue':mat('blue_lens',(.03,.37,.8),.7,.14,1.4),
 'red':mat('red_signal',(.75,.035,.016),.35,.25,1.1),
 'green':mat('edr_status',(.035,.6,.32),.4,.2,1.5),
 'copper':mat('copper_windings',(.31,.12,.055),.85,.28),
 'rubber':mat('rubber',(.009,.012,.016),.05,.86),
 'shell':mat('obsidian_chitin',(.025,.036,.045),.42,.19),
 'core':mat('crimson_core',(.19,.007,.004),.48,.17,.15),
 'cloth':mat('technical_fabric',(.035,.043,.05),0,.92),
 'skin':mat('skin',(.48,.28,.17),0,.65),
 'vest':mat('reflective_vest',(.38,.43,.12),.25,.47),
 'paint':mat('automotive_clearcoat',(.105,.13,.16),.72,.16),
}
M['paint'].node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=1
proto={}
def primitive(kind):
    if kind in proto:return proto[kind]
    if kind=='box':bpy.ops.mesh.primitive_cube_add(size=1)
    elif kind=='sphere':bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=1)
    elif kind=='cylinder':bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=1,depth=1)
    else:bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=8,major_radius=1,minor_radius=.07)
    o=bpy.context.object;data=([v.co.copy() for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons]);proto[kind]=data
    bpy.data.objects.remove(o,do_unlink=True)
    return data
class Kit:
    def __init__(self,name):self.name=name;self.buckets={};self.smooth={}
    def add(self,kind,pos,scale,material,part='body',rot=None):
        verts,faces=primitive(kind);matrix=Matrix.Translation(Vector(pos))@(rot or Matrix.Identity(4))@Matrix.Diagonal((*scale,1))
        self.raw([matrix@v for v in verts],faces,material,part,kind!='box')
    def raw(self,verts,faces,material,part='body',smooth=False):
        bucket=(part,material,smooth);v,f=self.buckets.setdefault(bucket,([],[]));n=len(v);v.extend(verts);f.extend(tuple(n+i for i in face) for face in faces)
    def box(self,p,s,m='dark',part='body'):self.add('box',p,s,m,part)
    def sphere(self,p,s,m='steel',part='body'):self.add('sphere',p,s,m,part)
    def cyl(self,p,r,h,m='steel',part='body',rot=None):self.add('cylinder',p,(r,r,h),m,part,rot)
    def torus(self,p,r,m='steel',part='body',rot=None):self.add('torus',p,(r,r,r),m,part,rot)
    def rod(self,a,b,r=.01,m='steel',part='body'):
        a,b=Vector(a),Vector(b);delta=b-a;self.cyl((a+b)/2,r,delta.length,m,part,delta.to_track_quat('Z','Y').to_matrix().to_4x4())
    def export(self):
        root=bpy.data.objects.new('CISO_'+self.name,None);scene.collection.objects.link(root)
        for (part,m,smooth),(verts,faces) in self.buckets.items():
            data=bpy.data.meshes.new(self.name+'_'+part+'_'+m);data.from_pydata(verts,[],faces);data.update()
            ob=bpy.data.objects.new(part+'_'+m,data);scene.collection.objects.link(ob);ob.parent=root;ob.data.materials.append(M[m])
            if smooth:
                for p in data.polygons:p.use_smooth=True
            elif m not in ['glass','window']:
                bevel=ob.modifiers.new('Fine manufactured edge','BEVEL');bevel.width=.006;bevel.segments=3
                bevel.limit_method='ANGLE';bevel.angle_limit=.6
                normal=ob.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
        bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
        for child in root.children:child.select_set(True)
        bpy.context.view_layer.objects.active=root
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,self.name+'.glb'),export_format='GLB',use_selection=True,export_apply=True)
        for o in [root,*root.children]:o.hide_set(True)
        return len(self.buckets)

def hvac(k,h,count=3):
    for i in range(count):
        x=(i-(count-1)/2)*.47
        k.box((x,.10,h+.17),(.39,.61,.26),'steel');k.box((x,.10,h+.31),(.40,.62,.025),'dark')
        for y in [-.05,.26]:
            k.cyl((x,y,h+.33),.145,.025,'dark');k.torus((x,y,h+.35),.14,'steel');k.cyl((x,y,h+.35),.025,.03,'steel')
            for j in range(6):
                angle=j*math.pi/3;k.rod((x,y,h+.354),(x+math.cos(angle)*.12,y+math.sin(angle)*.12,h+.354),.012,'steel')
        for z in range(7):k.box((x,-.212,h+.06+z*.032),(.33,.01,.011),'dark')
        k.rod((x,.42,h+.12),(x,.64,h+.12),.025,'steel')
    k.box((-.55,.50,h+.16),(.4,.28,.3),'dark')
    for y in [-.76,.76]:k.rod((-.85,y,h+.15),(.85,y,h+.15),.012)
    for x in [-.85,.85]:k.rod((x,-.76,h+.15),(x,.76,h+.15),.012)
    for x in [-.85,0,.85]:
        for y in [-.76,.76]:k.rod((x,y,h),(x,y,h+.15),.008)
    for x in [-.55,.55]:k.rod((x,-.6,h+.03),(x,.6,h+.03),.017)

def building(name):
    k=Kit(name);floors={'office':5,'tower':9,'soc':2}.get(name,0);h=(floors*.35+.18) if floors else {'datacenter':1.45,'warehouse':.94,'telecom':.62}[name]
    k.box((0,0,.035),(2,1.96,.07),'concrete')
    if floors:
        # Interior geometry actually sits behind continuous reflective curtain walls.
        k.box((0,0,h/2),(.7,.65,h),'dark')
        for level in range(floors):
            z=.13+level*.35;k.box((0,0,z),(1.76,1.64,.035),'steel')
            for side in [-1,1]:
                k.box((0,side*.54,z+.15),(1.64,.015,.29),'window')
                k.box((side*.59,0,z+.15),(.015,1.4,.29),'window')
                for i in range(5):
                    x=-.64+i*.32
                    k.box((x,side*.68,z+.10),(.22,.15,.022),'wood')
                    k.box((x,side*.64,z+.17),(.10,.015,.072),'blue' if name=='soc' else 'dark')
                    k.box((x,side*.74,z+.055),(.065,.07,.018),'dark')
                    if (i+level)%3==0:k.box((x,side*.77,z+.30),(.19,.01,.014),'warm')
            for side in [-1,1]:
                k.box((0,side*.823,z+.17),(1.76,.009,.32),'glass')
                k.box((side*.883,0,z+.17),(.009,1.64,.32),'glass')
        for x in range(9):
            xx=-.88+x*.22
            for side in [-1,1]:k.box((xx,side*.83,h/2),(.014,.024,h),'dark')
        for y in range(9):
            yy=-.82+y*.205
            for side in [-1,1]:k.box((side*.888,yy,h/2),(.024,.014,h),'dark')
    else:
        k.box((0,0,h/2+.07),(1.76,1.62,h),'dark')
        for i in range(44):
            x=-.86+i*.04
            for side in [-1,1]:k.box((x,side*.82,h/2+.07),(.012,.025,h),'steel')
        for side in [-1,1]:
            for i in range(36):k.box((side*.89,-.79+i*.045,h/2+.07),(.025,.012,h),'steel')
        for i in range(3):
            x=-.57+i*.56;k.box((x,-.84,.35),(.39,.025,.51),'dark')
            for j in range(14):k.box((x,-.86,.12+j*.034),(.37,.012,.012),'steel')
            k.box((x,-.87,.66),(.13,.035,.018),'warm')
            for dx in [-.23,.23]:k.cyl((x+dx,-.93,.15),.014,.26,'warm')
    k.box((0,0,h+.08),(1.82,1.70,.07),'concrete');hvac(k,h+.13,3 if name=='datacenter' else 2)
    k.box((0,-.87,.25),(.40,.012,.35),'glass');k.box((0,-.92,.49),(.57,.30,.026),'steel');k.box((0,-1.01,.47),(.45,.013,.012),'warm')
    for i in range(3):k.box((0,-.84-i*.07,.075-i*.02),(.58,.18,.035),'concrete')
    if name=='telecom':
        for z in range(6):
            lo=.90+z*.28;w=.30-z*.027;wn=w-.027
            for x,y in [(-1,-1),(1,-1),(1,1),(-1,1)]:
                k.rod((x*w,y*w,lo),(x*wn,y*wn,lo+.28),.013)
                k.rod((x*w,y*w,lo),(-x*wn,y*wn,lo+.28),.007)
                k.rod((x*w,y*w,lo),(x*wn,-y*wn,lo+.28),.007)
        for z in [1.7,2.4]:
            for x in [-.26,.26]:k.box((x,0,z),(.065,.12,.36),'concrete')
        for z in [1.25,1.8]:k.cyl((0,-.31,z),.18,.05,'concrete',rot=Matrix.Rotation(math.pi/2,4,'X'))
        k.cyl((0,0,2.72),.018,.12,'red')
    k.export()

for name in ['office','tower','datacenter','warehouse','telecom','soc']:building(name)
R=Matrix.Rotation(math.pi/2,4,'X')
for name in ['ndr','ips','waf','wall','honeytoken','edr']:
    k=Kit(name)
    if name=='wall':
        k.box((0,0,.21),(.95,.35,.42),'concrete');k.box((0,0,.60),(.94,.12,.46),'dark')
        for x in [-.40,.40]:k.box((x,0,.44),(.12,.25,.82),'steel')
        for z in [.42,.50,.65,.78]:k.box((0,-.071,z),(.8,.026,.026),'steel')
        k.box((0,-.09,.38),(.87,.014,.022),'warm')
        for x in [-.4,.4]:
            for z in [.25,.5,.75]:k.cyl((x,-.133,z),.015,.015,'dark',rot=R)
    elif name=='edr':
        k.cyl((0,0,.07),.24,.14,'dark');k.torus((0,0,.14),.23,'green');k.cyl((0,0,.16),.20,.035,'steel')
        k.rod((0,0,.18),(0,0,.36),.04);k.box((0,-.02,.38),(.19,.17,.09),'steel','head')
        for x in [-.05,.05]:k.cyl((x,-.115,.38),.03,.025,'blue','head',R)
    else:
        k.box((0,0,.06),(.86,.84,.12),'dark');k.box((0,0,.22),(.70,.66,.24),'steel')
        for x in [-.37,.37]:
            for y in [-.35,.35]:k.cyl((x,y,.1),.037,.08,'steel');k.box((x,y,.16),(.045,.045,.03),'warm')
        if name=='ndr':
            k.box((0,0,.48),(.52,.5,.46),'dark');k.cyl((0,0,.78),.14,.18,'steel')
            # Concave paraboloid with real radial ribs and feed assembly.
            vs=[];fs=[]
            for j in range(9):
                r=j/8*.46
                for i in range(48):
                    a=i*math.tau/48;vs.append((r*math.cos(a),.10+.35*(r/.46)**2,1.25+r*math.sin(a)))
            for j in range(8):
                for i in range(48):a=j*48+i;b=j*48+(i+1)%48;fs.append((a,b,b+48,a+48))
            k.raw(vs,fs,'steel','head',True)
            for i in range(12):
                a=i*math.tau/12;k.rod((0,.10,1.25),(.46*math.cos(a),.46,1.25+.46*math.sin(a)),.009,'dark','head')
            for x in [-.3,.3]:k.rod((x,.3,1.1),(0,.68,1.25),.014,'steel','head')
            k.sphere((0,.68,1.25),(.06,.09,.06),'copper','head')
        if name=='ips':
            k.cyl((0,0,.40),.30,.13,'dark');k.cyl((0,0,.47),.24,.05,'steel')
            k.box((0,.1,.64),(.48,.4,.25),'dark','head')
            for x in [-.20,.20]:
                k.box((x,-.20,.67),(.17,.77,.18),'steel','head');k.box((x,-.60,.67),(.20,.06,.20),'dark','head');k.cyl((x,-.635,.67),.053,.016,'warm','head',R)
                for y in range(9):k.box((x,-.49+y*.067,.775),(.19,.024,.035),'dark','head')
                k.rod((x,.35,.7),(x,.22,.43),.035,'rubber','head')
        if name=='waf':
            for x in [-.30,.30]:k.box((x,0,.80),(.10,.17,1.05),'dark')
            for z in [.65,1.13]:
                k.torus((0,-.06,z),.24,'steel','head',R);k.torus((0,-.09,z),.19,'copper','head',R);k.cyl((0,-.05,z),.09,.09,'blue','head',R)
                for i in range(8):
                    a=i*math.tau/8;k.cyl((math.cos(a)*.22,-.10,z+math.sin(a)*.22),.024,.08,'steel','head',R)
        if name=='honeytoken':
            k.box((0,0,.8),(.53,.52,1.04),'dark')
            for i in range(12):
                z=.34+i*.075;k.box((0,-.275,z),(.47,.025,.058),'steel')
                for x in [-.16,.10,.16]:k.box((x,-.29,z),(.024,.014,.012),'blue' if i%3 else 'warm')
            k.cyl((0,-.15,.24),.1,.08,'warm')
    if name not in ['wall','edr']:
        # Real enclosure construction: access-panel seams, fasteners, vents,
        # hydraulic supports and service wiring, not a bare box silhouette.
        for side in [-1,1]:
            k.box((side*.357,0,.25),(.012,.51,.19),'dark')
            for y in [-.25,.25]:
                for z in [.18,.32]:k.cyl((side*.368,y,z),.013,.016,'steel',rot=Matrix.Rotation(math.pi/2,4,'Y'))
            for j in range(9):k.box((side*.37,-.19+j*.045,.23),(.012,.014,.10),'steel')
        if name=='ndr':
            for side in [-1,1]:
                k.box((side*.265,-.01,.48),(.014,.38,.35),'steel')
                k.rod((side*.20,.18,.29),(side*.38,.30,.06),.028,'steel')
                k.rod((side*.20,-.18,.29),(side*.38,-.30,.06),.028,'steel')
                k.rod((side*.20,0,.8),(side*.35,.1,1.0),.03,'steel','head')
            k.box((0,-.265,.48),(.43,.018,.34),'dark')
            for x in [-.21,.21]:
                for z in [.34,.62]:k.cyl((x,-.28,z),.012,.014,'steel',rot=R)
            k.rod((.15,-.28,.42),(.15,-.28,.52),.015,'steel')
            for i in range(7):k.box((0,-.281,.35+i*.025),(.20,.014,.012),'steel')
        if name=='ips':
            for x in [-.3,.3]:
                k.cyl((x,.09,.61),.095,.025,'steel','head',Matrix.Rotation(math.pi/2,4,'Y'))
                for j in range(8):
                    a=j*math.tau/8;k.sphere((x*1.04,.09+math.cos(a)*.073,.61+math.sin(a)*.073),(.009,.009,.009),'dark','head')
        if name=='waf':
            for x in [-.32,.32]:
                for z in [.5,.75,1,1.25]:k.box((x,-.11,z),(.12,.04,.025),'copper')
        if name=='honeytoken':
            for x in [-.25,.25]:
                k.rod((x,-.29,.29),(x,-.29,1.31),.012,'steel')
                for z in [.4,.8,1.2]:k.cyl((x,-.3,z),.012,.012,'dark',rot=R)
    k.export()

# Smooth lofted sedan: bonnet, windshield, roof, trunk, separate wheel geometry.
k=Kit('car');vs=[];fs=[]
stations=[(-.48,.13,.15),(-.40,.22,.20),(-.24,.23,.24),(-.12,.20,.36),(.12,.20,.38),(.29,.22,.26),(.43,.20,.22),(.48,.12,.18)]
for y,w,h in stations:
    for x,z in [(-w,.10),(-w,h*.76),(-w*.72,h),(w*.72,h),(w,h*.76),(w,.10)]:vs.append((x,y,z))
for i in range(len(stations)-1):
    for j in range(6):fs.append((i*6+j,i*6+(j+1)%6,(i+1)*6+(j+1)%6,(i+1)*6+j))
k.raw(vs,fs,'paint',smooth=True)
k.raw([(-.16,-.23,.25),(.16,-.23,.25),(.15,-.11,.36),(-.15,-.11,.36),(-.15,.12,.38),(.15,.12,.38),(.17,.28,.27),(-.17,.28,.27)],[(0,1,2,3),(3,2,5,4),(4,5,6,7)],'glass')
for x in [-.228,.228]:
    for y in [-.29,.29]:
        k.cyl((x,y,.115),.093,.055,'rubber',rot=Matrix.Rotation(math.pi/2,4,'Y'));k.cyl((x*1.12,y,.115),.062,.015,'steel',rot=Matrix.Rotation(math.pi/2,4,'Y'))
    k.sphere((x,-.10,.28),(.035,.055,.025),'paint')
for x in [-.14,.14]:k.box((x,-.441,.21),(.105,.024,.024),'warm');k.box((x,.443,.22),(.1,.02,.025),'red')
k.export()

# Authored articulated creatures. Runtime instancing animates each leg and body section.
for name in ['virus','beetle','worm']:
    k=Kit(name)
    if name=='worm':
        for j in range(9):
            y=(j-4)*.14;part='segment'+str(j)
            k.sphere((0,y,.14),(.18,.12,.10),'shell',part);k.torus((0,y,.15),.125,'copper',part,R)
            for side in [-1,1]:
                k.rod((side*.1,y,.13),(side*.22,y-.025,.07),.016,'shell',part)
                k.rod((side*.22,y-.025,.07),(side*.25,y-.08,.008),.011,'copper',part)
        for side in [-1,1]:k.sphere((side*.055,-.66,.19),(.019,.024,.018),'red','segment0')
    else:
        k.sphere((0,.06,.24),(.25,.35,.16),'core' if name=='virus' else 'shell')
        for side in [-1,1]:k.sphere((side*.11,.08,.29),(.125,.29,.10),'shell' if name=='beetle' else 'core')
        k.sphere((0,-.28,.17),(.12,.15,.085),'shell')
        for side in [-1,1]:
            k.rod((side*.065,-.37,.15),(side*.09,-.47,.11),.022,'shell');k.rod((side*.09,-.47,.11),(side*.035,-.51,.10),.012,'copper')
        for side in [-1,1]:
            k.sphere((side*.09,-.38,.22),(.010,.016,.010),'red')
            k.rod((side*.07,-.37,.20),(side*.16,-.60,.19),.009,'copper')
            for j in range(3 if name=='beetle' else 4):
                y=-.23+j*.16;part='leg'+str(j)+('L' if side<0 else 'R')
                k.sphere((side*.19,y,.20),(.043,.047,.043),'copper',part)
                k.rod((side*.19,y,.20),(side*.38,y-.06,.26),.025,'shell',part)
                k.rod((side*.38,y-.06,.26),(side*.48,y-.17,.025),.017,'shell',part)
                k.rod((side*.48,y-.17,.025),(side*.51,y-.23,.006),.010,'copper',part)
        for j in range(7):
            y=-.12+j*.055;k.rod((-.17,y,.39),(0,y+.02,.45),.006,'copper');k.rod((0,y+.02,.45),(.17,y,.39),.006,'copper')
    k.export()
k=Kit('engineer')
k.sphere((0,0,.40),(.085,.050,.13),'cloth');k.box((0,-.045,.42),(.14,.014,.15),'vest')
k.cyl((0,0,.535),.025,.05,'skin');k.sphere((0,-.005,.595),(.054,.049,.067),'skin');k.sphere((0,.01,.62),(.056,.052,.043),'dark')
for side in [-1,1]:
    p='legL' if side<0 else 'legR';k.rod((side*.048,0,.30),(side*.047,0,.15),.03,'cloth',p);k.rod((side*.047,0,.15),(side*.05,-.01,.05),.026,'cloth',p);k.sphere((side*.05,-.028,.027),(.036,.065,.026),'rubber',p)
    p='armL' if side<0 else 'armR';k.rod((side*.085,0,.48),(side*.12,-.015,.37),.028,'cloth',p);k.rod((side*.12,-.015,.37),(side*.07,-.12,.38),.024,'cloth',p);k.sphere((side*.07,-.12,.38),(.025,.027,.025),'skin',p)
k.box((0,-.13,.39),(.18,.025,.11),'dark');k.box((0,-.147,.39),(.15,.004,.085),'blue');k.export()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'ciso-reference-kit.blend'))
result={'scene':scene.name,'glb_count':len([f for f in os.listdir(OUT) if f.endswith('.glb')]),'files':os.listdir(OUT)}
