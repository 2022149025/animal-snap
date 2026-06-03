import bpy, os, sys

# 사용법: blender --background --python fbx_to_glb.py -- <player_asset_dir>
argv = sys.argv[sys.argv.index('--') + 1:]
base = argv[0]

# 빈 씬으로 초기화
bpy.ops.wm.read_factory_settings(use_empty=True)

# 1) 플레이어 모델(스킨 포함) 임포트
bpy.ops.import_scene.fbx(filepath=os.path.join(base, 'Player.fbx'))
model_objs = list(bpy.context.scene.objects)
model_arm = next(o for o in model_objs if o.type == 'ARMATURE')
# 모델에 딸려온 T-pose 액션 제거
if model_arm.animation_data and model_arm.animation_data.action:
    model_arm.animation_data.action = None

# 2) 애니메이션 FBX(Without Skin)에서 액션을 추출해 모델 아마튜어 NLA에 stash
anims = [('idle', 'Idle.fbx'), ('walk', 'Walking.fbx'), ('run', 'Running.fbx')]
ad = model_arm.animation_data_create()
for kind, fname in anims:
    fp = os.path.join(base, fname)
    if not os.path.exists(fp):
        print('SKIP missing', fname); continue
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=fp)
    new = [o for o in bpy.context.scene.objects if o not in before]
    arm = next((o for o in new if o.type == 'ARMATURE'), None)
    act = arm.animation_data.action if (arm and arm.animation_data) else None
    if act:
        act.name = kind
        act.use_fake_user = True
        # NLA 트랙으로 stash → glTF 익스포터가 애니메이션으로 인식
        track = ad.nla_tracks.new()
        track.name = kind
        strip = track.strips.new(kind, int(act.frame_range[0]), act)
        # 4.4+ 슬롯 액션: 가능한 슬롯을 명시적으로 바인딩
        try:
            slots = getattr(act, 'slots', None)
            if slots and len(slots):
                strip.action_slot = slots[0]
        except Exception as e:
            print('slot bind skip:', e)
        track.mute = False
        print('ACTION', kind, '<-', fname)
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
# stash 후에는 활성 액션 비워 T-pose 베이스 유지
ad.action = None

# 3) 모델만 선택해 glb로 내보내기 (모든 액션 포함)
bpy.ops.object.select_all(action='DESELECT')
for o in model_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = model_arm

out = os.path.join(base, 'Player.glb')
bpy.ops.export_scene.gltf(
    filepath=out,
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_apply=False,
)
print('EXPORTED', out)
