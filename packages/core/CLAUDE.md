# Forma Core (`packages/core`)

系列共享层，被每一作以 `@forma/core/<module>` 导入（`exports` 直接指向 `src/*.ts`，由各作的 Rsbuild 编译）。

## 代码导航

- 启动：各作 `main.ts` 调用 `app.ts` 的 `startGame(game, { instrument })`：注册游戏（`game.ts` 的 `defineGame`，注入主色 CSS 变量）、读进度、初始化 Tap UI，标题页为 Stack 根页，`forma-overlay` 挂在 body 上。
- 游戏描述：`FormaGame`（`game.ts`）：章节与关卡 ID、标题图、章节图标、定理卡插图、关卡页模板。关卡元素由各作实现，页面外壳 `elements/level-page.ts` 只负责承载。
- 导航：`nav.ts`（Stack push / replace）：标题 → 章节（`chapters-page`，含 `dimension-map`）→ 关卡列表（`levels-page`）→ 关卡；定理卡收藏页 `cards-page`。
- 关卡外壳：`level.ts` 的 `levelHeader`、`counter`；按钮与图标在 `ui.ts`。
- 过关与顿悟：`overlay.ts`：`solveLevel` 记录成绩、解锁关卡卡片并显示过关面板；`discoverShift` 只在本作第一次换维度时显示顿悟浮层并解锁卡片。
- 进度：`progress.ts`，localStorage：`forma:<game>:progress`（成绩、是否已换过维度）、`forma:cards`（全系列卡片）、`forma:settings`（音效）。关卡按顺序解锁，章节在上一章全部完成后解锁。
- 手势与反馈：`tilt.ts`（DeviceOrientation，iOS 首次在标题页点击时请求权限；同时写 `--tilt-x/y` 供视差）、`sound.ts`（WebAudio 合成，每作自定乐器；`insight` 和弦为系列签名）、`haptics.ts`（移动端 Tauri 插件，其余用 `navigator.vibrate`）。
- 构建：`rsbuild.config.mjs` 导出 `defineGameConfig`，各作 `rsbuild.config.ts` 只传 `root` 与端口。

## 约束

- 新增定理卡只在 `cards.ts` 追加，已有 ID 不得改动（存档按 ID 记录）。
- 跨作品共享卡片目前只在同源存储内生效；不同 App 之间需要 App Group / iCloud 容器，尚未实现。
