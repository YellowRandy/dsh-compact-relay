# 本地 fork 说明（dsh-compact-relay-local）

> 上游：https://github.com/cfanzx/dsh-compact-relay ，基线 commit `ad0c3c0`（v0.5.8，2026-11-05），MIT。
> 本目录由上游源码派生，按 MIT 保留原 `LICENSE` 与版权声明；改动见下。

## 为什么 fork

上游 0.5.8 的浮层（菜单 / 悬停卡 / 压缩确认卡 / 交接预览 / 接力菜单）用 `position: fixed`，
但渲染在 DSH composer 容器内部；DSH 0.2.2+ 的该容器建立了 containing block，
导致浮层坐标整体偏移到窗口底部并被裁切。上游 issue：

- https://github.com/cfanzx/dsh-compact-relay/issues/1
- https://github.com/cfanzx/dsh-compact-relay/issues/2

## 本 fork 的改动（相对 0.5.8）

1. `lib/client/05-float.js`（新增）：`popupContainingBox(el)` —— 找出会建立 containing block 的最近祖先，返回其视口矩形。
2. `lib/client/30-indicator.js`：锚点记下容器矩形；`floatPos()` 在视口坐标上减去容器偏移；悬停卡改为渲染后**实测宽高**再定位（原来写死估 140px，内容多时判错上下方位、滚动来回跳）。
3. `lib/client/35-relay-bar.js`：同上（接力菜单的 `top` / `bottom` 两条分支都换算）。
4. 包名与客户端模块 id 改为 `dsh-compact-relay-local`（行 id 仍是 `compact-relay`，设置沿用）。
5. 设置页视觉打磨（2026-11-25）：`**粗体**` 渲染成真正的加粗（不再露出字面星号）；去掉「推荐收藏」标题与行标题重复；底部保存条改成圆角上沿 + 内容区留 92px 缓冲，滚动时不再压住最后一行；行距/提示文案行高统一；复选框加指针样式。

没有新依赖，也不需要 `react-dom`/`createPortal`：只把坐标系换算对齐。

## 构建与测试

```sh
node scripts/build-client.mjs      # 改完 lib/client/*.js 必须重建 lib/client.js
node test/smoke.mjs               # 53/53
node test/relay-bar.mjs           # 71/71
node test/contract.mjs            # 17/17
```

本机 Node 用 DSH 自带运行时：`%DSH_HOME%\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe`。

## 安装

1. 插件页把官方 `dsh-compact-relay` **disable 或卸载**（两者共用行 id，不能同时启用）
2. 插件 → 添加插件 → 选择本目录（本地目录安装）
3. **完全退出 DSH** 再打开；验证指示环 / 菜单 / `/handoff`
4. 通过后拍 `good-` 快照

## 跟上游同步

```sh
git remote add upstream https://github.com/cfanzx/dsh-compact-relay.git   # 首次
git fetch upstream --tags
git rebase upstream/main   # 冲突点在 lib/client/30-indicator.js 与 35-relay-bar.js 的定位代码
node scripts/build-client.mjs && node test/smoke.mjs
```

上游修好 #1/#2 之后，可以丢掉这个 fork：卸本地包、装回官方包即可（行 id 相同，设置不变）。

## 已知：Windows 换行

仓库未设 `.gitattributes`，clone 时 `core.autocrlf=true` 会把源码换成 CRLF，
`scripts/build-client.mjs --check` 因此误报「产物不是最新」。本目录已加 `.gitattributes` 固定 LF。

## 回滚与恢复（2026-11-25 实测）

`~/.dsh/plugin-baseline/rollback.ps1 -Snapshot <名> -DryRun` 只恢复 **8 个配置文件**
（`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`cordis.yml`、`cordis.patch.yml`、
`.dsh-market/*`），**不处理 `node_modules` 里的 junction**。所以：

- 回退到 fork 之前的快照（如 `20261125-192448-good-compaction-default`）：插件行消失、插件不再加载，
  但链接残留，需要时按下面步骤重装即可；
- 回到 fork 版本：**插件 → 添加插件 → 选本目录** → 完全退出 DSH 再打开 → `doctor.ps1` 全 PASS → 拍 `good-`；
- 想彻底放弃 fork：卸载本包 → 装官方 `dsh-compact-relay`（行 id 相同，设置沿用）。

远端备份：本分支已推到 fork 的 `local-fork` 分支（`YellowRandy/dsh-compact-relay`），
工作区目录若丢失可从这里 clone 回来。

## 2026-11-26 追加：与宿主上下文环合并

- 隐藏宿主 `ContextMeter`（aria-label 选择器），把插件环覆盖到它的位置，右侧显示百分比；
- 菜单新增「上下文构成」（估算：系统提示词 / 工具定义 / 对话消息）；
- 所有浮层改用 `createPortal` 挂到 `body`（宿主暴露 `react-dom`），彻底摆脱 composer 的 containing block 与滚动条；
- 跟随侧边栏布局动画：`ResizeObserver` + rAF 逐帧采样 320ms，**不要加 CSS transition**（宿主布局本身就是过渡，叠加会显得延迟）。