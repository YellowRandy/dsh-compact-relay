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