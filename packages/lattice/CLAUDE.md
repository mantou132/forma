# Forma Lattice (`packages/lattice`)

形·铺：六边形的菱形铺砖 = a × b × c 墙角里的立方体堆（plane partition）。2D 下翻转小六边形难以预测，3D 下就是加减一个立方体。

## 代码导航

- 模型（`src/model/`，纯函数）：
  - `geometry.ts`：等距投影 `project(x, y, z)`，菱形三种朝向 `t / r / l` 即立方体的顶面、+x 面、+y 面。
  - `partition.ts`：`surface` 生成堆的可见面（恰好 ab + bc + ca 块菱形）、`flips` / `applyFlip`（加减一个立方体，受重力与墙角约束）、`distance`（最少翻转数 = 高度差之和）、`walkPath`（点只能走相邻且高差 ≤ 1 的柱顶）。
  - `region.ts`：三角格（▷ / ◁）、菱形 = 相邻两三角、`isTileable`（二分匹配）。
  - `levels.ts`：五章关卡。Proof 章的区域由隐藏铺法生成：挖整块菱形仍可铺，切掉一个 ▷ 则计数不等、必然不可能；终章 形 为每像素一块竖菱形。
- 元素（`src/elements/`）：`board.ts`（堆的 SVG：`lit` 切换平面配色与立体光照，翻转时旧菱形旋转淡出）、`region.ts`（自由区域：拖过两个三角放一块，点已放的块拿掉）、`level.ts`（关卡控制：match / path / region 三种玩法、撤销、重置、倾斜）。
- `game.ts`：章节、定理卡挂载点、标题图与卡片插图。

## 章节

I Flat（只有 2D）→ II Rise（开放倾斜，首次倾斜解锁"一次翻转一个立方体"）→ III Steps（给点搭路）→ IV Proof（铺满或宣布不可能，计数在立体视图中显示）→ V Paint（大型堆与终章 形）。

## 测试

`test/model.test.ts` 校验铺砖、翻转与三角格；`test/levels.test.ts` 用 BFS 校验 Steps 关卡的 `par`，并校验区域"不可能 ⇔ 计数不等"。
