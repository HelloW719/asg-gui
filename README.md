# Agent Search Gateway Desktop

独立 Electron-free 桌面控制面，使用 Tauri 2、Vue 3、TypeScript 和 Vite。GUI 不读取 ASG
配置、不操作进程、不接触密钥明文；所有业务动作都通过已安装 ASG 根目录下的
`bin/asg.mjs` 完成。

## 前置条件

- 已有由 Agent Search Gateway 安装器准备的安装根，包含：
  - `gateway.yaml`
  - `bin/asg.mjs`
- 安装根内的 `data/toolchain/node/node.exe` / `data/toolchain/node/bin/node`，
  或 `PATH` 中可用的 `node`
- Node.js 20.18.1+
- Rust stable 与 Tauri 2 的平台依赖
- Linux 需要 WebKitGTK 4.1 和 AppIndicator 相关系统库

GUI 本仓库不安装后端，也不在首版制作安装包。

## 开发

```bash
npm ci
npm run tauri dev
```

首次启动会自动检查已保存路径和安装器默认目录；未找到时再手动选择 ASG 安装目录。
连接完成后，欢迎向导会先引导选择搜索强度与可选返图源，再按需写入密钥并安装 V2
扩展。有效路径会保存到操作系统应用配置目录，ASG 服务仍由原 CLI 和 supervisor
管理。

```bash
npm run build
npm test
npm run test:e2e
```

## 安全边界

- 前端没有通用 Shell 权限，只能调用受控 Tauri command。
- Rust 使用参数数组执行本地 Node 与 `bin/asg.mjs`，不经过 shell。
- 启动、停止、重启始终作用于整栈。
- 密钥通过 stdin 一次性发送，不进入 argv、Pinia、GUI 配置或日志。
- 写操作由 Rust 串行化；GUI 退出不会自动停止 ASG。
- 关闭窗口会隐藏到托盘，托盘菜单可重新打开或退出 GUI。

## 目录

```text
src/                  Vue 界面、状态推导和 CLI 桥接
src-tauri/            窗口、托盘、目录校验和子进程任务
tests/e2e/            Playwright 布局与主题检查
```

