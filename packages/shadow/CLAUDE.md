# Forma Shadow (`packages/shadow`)

形·影：N × N × N 方块在三面墙上投下三个影子。3D 下只能一块块敲掉；正对一个轴看（深度消失），一次就能把整条视线打穿。

## 代码导航

- 模型（`src/model/`，纯函数）：
  - `voxels.ts`：三个视图（front 沿 -z、side 沿 -x、top 沿 -y）的像素映射 `pixelOf` 与视线 `lineOf`、`shadow`、`carve`（打穿一条线）、`pluck`（敲掉一块）、`hull`（三个影子拉伸体的交集，即最大物体）、`solved`。
  - `levels.ts`：关卡只写两到三个影子，未写的影子取 hull 的投影；写出的影子若不能与其他影子同时成立，加载时直接报错。Sparse 章的 `cubes` 为最少立方体数。
- 元素（`src/elements/`）：
  - `scene.ts`：Three.js 舞台：方块、三面影子墙（CanvasTexture 绘制目标 / 当前影子 / 多余与缺失）、平面视图中挡在方块前的目标轮廓；相机在 3D 环绕与正对某面之间做推拉变焦（视角缩到 1.5°）。按需渲染。
  - `level.ts`：关卡控制：3D 下拖动环绕、点击敲块；平面视图下点击打穿；Front / Side / Top 切换；撤销、重置、倾斜。
  - `model.ts`：标题页上缓慢转动的成品雕塑。
- `game.ts`：章节、定理卡挂载点与图标。

## 章节

I Solid（只有 3D）→ II Cast（开放正视，首次正视解锁 Straight Through）→ III Plug（圆、方、三角同时成立）→ IV Sparse（用最少立方体投出同样的影子，需要打穿与敲块配合）→ V Form（F、O、R、M、A 与终章 形）。

## 测试

`test/levels.test.ts` 校验每关可由打穿得到 hull 并满足目标影子，以及 Sparse 关卡的 `cubes` 等于搜索得到的最小值（约 10 秒）。
