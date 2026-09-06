"""Reference-led platform and viral capsids. New scene/files; preserve all workshops."""
from pathlib import Path
base=Path('/Users/se/shared/ZeroDayClock/ZDC2/game')
prefix=(base/'tools/build-ciso-kit.py').read_text().split('def hvac')[0]
prefix=prefix.replace("models/v2'","models/v4'").replace("scenes.new('CISO_ReferenceWorkshop_v2')","scenes.new('CISO_Platform_Virus_v4')")
exec(prefix)
os.makedirs(OUT,exist_ok=True)
M['ruby']=mat('viral_ruby_capsid',(.32,.008,.018),.4,.22,.12)
M['amber']=mat('viral_amber_core',(.9,.24,.018),.3,.19,.9)
M['armor']=mat('viral_graphite_armor',(.025,.035,.042),.8,.34)
M['ruby'].node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.7

# Real pentagonal capsid panels: the dual of an icosahedron, not a red beetle.
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1)
ico=bpy.context.object
vertices=[v.co.copy().normalized() for v in ico.data.vertices]
faces=[list(f.vertices) for f in ico.data.polygons]
centers=[sum((vertices[i] for i in face),Vector()).normalized() for face in faces]
bpy.data.objects.remove(ico,do_unlink=True)
for name in ['virus','boss']:
    k=Kit(name);origin=Vector((0,0,.65));radius=.31 if name=='virus' else .37
    k.sphere(origin,(radius*.77,)*3,'amber','nucleus')
    for i,n in enumerate(vertices):
        ids=[j for j,f in enumerate(faces) if i in f]
        tangent=n.cross(Vector((0,0,1)) if abs(n.z)<.9 else Vector((0,1,0))).normalized();bitangent=n.cross(tangent)
        ids.sort(key=lambda j:math.atan2(centers[j].dot(bitangent),centers[j].dot(tangent)))
        panel=[origin+centers[j]*radius for j in ids];center=sum(panel,Vector())/len(panel)
        inner=[center+(p-center)*.84 for p in panel]
        k.raw(inner,[tuple(range(len(inner)))],'ruby')
        for j,p in enumerate(panel):
            q=panel[(j+1)%len(panel)];k.rod(p,q,.013,'armor')
            k.rod(inner[j],inner[(j+1)%len(inner)],.005,'copper')
        # Receptors, ribbed collars, jewel tips. Radial positions keep all silhouettes readable.
        a=origin+n*(radius*.9);b=origin+n*(radius+.13);rot=n.to_track_quat('Z','Y').to_matrix().to_4x4()
        k.rod(a,b,.026,'armor')
        for j in range(3):k.torus(a+n*(.035+j*.035),.036,'steel',rot=rot)
        k.cyl(b,.059,.035,'armor',rot=rot);k.cyl(b+n*.023,.046,.018,'ruby',rot=rot)
    if name=='boss':
        for i in range(2):
            rot=Matrix.Rotation(.6+i*1.2,4,'X')@Matrix.Rotation(.4+i*.9,4,'Y')
            k.torus(origin,.56+i*.055,'armor','orbit'+str(i),rot)
            k.torus(origin,.54+i*.055,'amber','orbit'+str(i),rot)
    k.export()

# A single company platform with a layered, machined edge and exposed service panels.
k=Kit('platform')
k.box((0,0,-.78),(32.6,24.6,1.35),'dark')
k.box((0,0,-1.50),(32.2,24.2,.12),'steel')
k.box((0,0,-.11),(32.8,24.8,.12),'steel')
for side in [-1,1]:
    k.box((0,side*12.34,-.30),(32.4,.065,.055),'warm')
    k.box((side*16.34,0,-.30),(.065,24.4,.055),'warm')
    for i in range(16):
        x=-15.1+i*2
        k.box((x,side*12.32,-.88),(1.75,.055,.82),'steel')
        k.box((x,side*12.36,-.84),(1.53,.035,.61),'dark')
        for j in range(5):k.box((x,side*12.39,-1.06+j*.11),(1.34,.014,.024),'rubber')
        for dx in [-.76,.76]:k.sphere((x+dx,side*12.40,-.57),(.021,.009,.021),'steel')
    for i in range(11):
        y=-10.8+i*2.1;k.box((side*16.32,y,-.88),(.055,1.83,.82),'steel')
        k.box((side*16.36,y,-.86),(.025,1.62,.62),'dark')
for x in [-12,-5,5,12]:
    for y in [-8,8]:k.cyl((x,y,-1.65),.65,.22,'rubber')
k.export()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'platform-virus-workshop.blend'))
result={'scene':scene.name,'assets':['virus.glb','boss.glb','platform.glb'],'out':OUT}
