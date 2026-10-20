# Agent Rules

1. 遇到没有明确的事情不要自由发挥，应该询问确定。
2. 始终根据目的站在全局视角下考虑问题，如果有更简洁的方案应该提出来。
3. 结构、入口或构建方式变化时同步更新本文档及对应子目录 CLAUDE.md，仍要保持精简；外层只保留导航、公用约束和全局开发规范，各子项目的实现细节下沉到各自目录。
4. 只处理有实际依据的场景；不为不会发生的情况增加防御逻辑或不必要的复杂度。
5. 测试文件是服务于业务代码的，不要为了测试去明显增加业务代码复杂度。

# 项目导航

《形》(Forma) 系列游戏：每一作包裹一个数学洞见——在当前维度卡住，换一个维度答案就在眼前。monorepo 结构（pnpm workspace + Cargo workspace）：

- `packages/core/`：系列共享层（`@forma/core`）：标题 / 章节 / 关卡列表 / 定理卡页面、过关与顿悟浮层、维度切换手势、音效、触感、进度存储、共享 Rsbuild 配置。详情参见 [`packages/core/CLAUDE.md`](packages/core/CLAUDE.md)。
- `packages/lattice/`：形·铺（Lattice，2D → 3D）：菱形铺砖其实是墙角里的立方体堆。详情参见 [`packages/lattice/CLAUDE.md`](packages/lattice/CLAUDE.md)。
- `packages/shadow/`：形·影（Shadow，3D → 2D）：一个物体同时投出三个影子，正对轴线看时深度消失。详情参见 [`packages/shadow/CLAUDE.md`](packages/shadow/CLAUDE.md)。
- `packages/time/`：形·时（Time，2D+t → 3D）：路线在地图上交叉，在时空里是不是真的相遇要看高度。详情参见 [`packages/time/CLAUDE.md`](packages/time/CLAUDE.md)。
- `crates/lattice/`、`crates/shadow/`、`crates/time/`：各作的 Tauri 2 原生入口（`com.mantou.forma.<game>`）；`icons/icon.svg` 为图标源文件，其余图标由 `pnpm tauri:<game> icon` 生成。
- `biome.json`：代码风格格式化与 Lint 配置。

# 系列约束

- **一作一个洞见**：关卡结构是"卡住 → 换维度 → 顿悟 → 定理卡"。不换维度也能解的关卡不属于《形》。
- **统一手势**：倾斜手机是全系列的"换维度"手势（`core/tilt.ts`），每个界面同时提供按钮。第一章只有一个维度，第二章开放换维度；第一次换维度触发系列统一的顿悟浮层与音效（`discoverShift`）。
- **定理卡**：卡片注册在 `core/cards.ts`（全系列共用，ID 以游戏名为前缀），由关卡配置的 `card` 或 `discoverShift` 解锁；其他作品的卡显示为灰色。
- **关卡可验证**：关卡数据在各作 `src/model/levels.ts`，pars、可解性与不可能性由该作 `test/` 中的求解器校验；改关卡必须跑测试。
- **视觉**：底色 `#0b0c14`，Geist / Geist Mono，形 字标用宋体系；每作一个主色（Lattice 靛蓝、Shadow 琥珀、Time 青绿），由 `FormaGame.accent` 注入。

# 前端开发（Gem 规范）

所有前端包使用 Gem + Tap UI，规范同 agent-deck：

- `unplugin-gem` 自动导入 Gem 成员、`forma-*`（core）与 `<game>-*`（各作 `src/elements`）元素，无需手动导入。不要在用到 `svg` 模板标签的模块里声明名为 `svg` 的局部变量，否则自动导入会跳过它。
- 元素继承 `GemElement`，使用 ES 装饰器；`#` 私有字段；内部状态 `createState`，全局状态 `createStore`；不用生命周期函数。
- 布局用 Tailwind utility（Light DOM），共享样式用 `css` + `@adoptedStyle`；Tailwind 主题在 `core/src/styles/tailwind.css`。
- 模板不要返回 `null`：Gem 会插入隐藏元素的 `@scope` 样式，Chrome 在其移除后仍保持隐藏；需要空内容时返回 ``html`` ``。
- 纯逻辑放在 `src/model/`，模块间以 `.ts` 后缀导入，可直接由 `node --test` 运行，不依赖 DOM。

# 常用命令

- `pnpm -C packages/<game> dev` / `build`：开发服务器（Lattice 1430、Shadow 1431、Time 1432）/ 生产打包。
- `pnpm -r test`：各作模型与关卡测试。
- `pnpm run lint`：Biome + 各包 `tsc --noEmit`。
- `cargo check`：Rust Workspace 检查（需要先 build 前端产物）。
- `pnpm tauri:<game> dev`、`pnpm tauri:<game> ios dev`：原生联调（仓库有多个 Tauri 应用，脚本用 `TAURI_APP_PATH` 指定，并用 `CARGO_TARGET_DIR=target/<game>` 隔离：tauri 的 build script 只在首次构建时生成 Android `TauriActivity.kt`，共享 target 会让其他作缺失该文件；两者都用 `$PWD` 绝对路径，因为 `ios run --open` 打开的 Xcode 会继承这些变量并在 `gen/apple` 中执行 `xcode-script`）；生成图标：`pnpm tauri:<game> icon <1024.png> --ios-color '#0b0c14'`（不要加 `-o`，否则不会写入 `gen/apple`、`gen/android`；`ios init` / `android init` 重建 `gen/` 后需重跑；同时更新启动屏图标 `gen/apple/Assets.xcassets/LaunchIcon.imageset`，即 80pt@3x 圆角版）。启动屏（同 agentdeck）：iOS `gen/apple/LaunchScreen.storyboard`（底色 `#0b0c14` + 居中 80pt `LaunchIcon`）；Android `res/*/launch_*`、基础主题 `windowBackground`、Manifest 中的 `Theme.forma_<game>.Launch`，`MainActivity.kt` 控制系统启动屏延迟 500ms 退出。全屏：移动端用 `tauri-plugin-edge-to-edge`（注入 `--safe-area-inset-*`，core 样式以 `env()` 兜底）；Android 隐藏系统栏写在 `gen/android/.../MainActivity.kt`，iOS 状态栏由 `gen/apple/project.yml` 的 `UIStatusBarHidden` 隐藏；`android init` / `ios init` 后需恢复 `gen/` 中的改动。

# 依赖版本

`swc-plugin-gem` 是绑定宿主 `swc_core` 的 Wasm 插件：`@rsbuild/core`、`unplugin-gem` 固定版本，`@rspack/core`、`@swc/core`、`unplugin` 在 `pnpm-workspace.yaml` overrides 中锁定，升级需整体验证构建。
