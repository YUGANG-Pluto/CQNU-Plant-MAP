# Third-Party Notices

This project uses third-party packages through the application package manifest and lock file. Each package remains under its own upstream license and copyright.

## Runtime Dependencies

| Package | Purpose | Upstream License |
| --- | --- | --- |
| adm-zip | ZIP archive creation and reading | MIT |
| better-sqlite3 | Desktop SQLite project storage and conversion | MIT |
| @sqlite.org/sqlite-wasm | Browser SQLite runtime backed by OPFS | Apache-2.0 |
| exifr | Image metadata reading | MIT |
| fflate | Browser backup ZIP creation | MIT |
| preact | Component-based renderer shell | MIT |
| lucide-preact | User-interface icons | ISC |

## Browser Runtime Libraries

| Component | Purpose | Upstream License | Source |
| --- | --- | --- | --- |
| Leaflet | Interactive map rendering | BSD-2-Clause | `https://unpkg.com/leaflet@1.9.4/` |
| Leaflet.draw | Drawing and editing map geometry | MIT | `https://unpkg.com/leaflet-draw@1.0.4/` |
| SQLite Wasm | Browser-local SQL database and OPFS VFS | Apache-2.0 | `https://www.npmjs.com/package/@sqlite.org/sqlite-wasm` |

## Development Dependencies

| Package | Purpose | Upstream License |
| --- | --- | --- |
| electron | Desktop runtime | MIT |
| electron-builder | Windows installer packaging | MIT |
| eslint | JavaScript linting | MIT |
| @types/node | Node.js type declarations for type checking | MIT |
| @babel/core | JavaScript and JSX transformation support | MIT |
| @preact/preset-vite | Preact integration for Vite | MIT |
| prettier | Code formatting | MIT |
| typescript | TypeScript compilation and `checkJs` type checking | Apache-2.0 |
| vite | Renderer and preload bundling | MIT |

## Notes

The software itself is not released under these third-party licenses. These notices only identify third-party components used by the project.

Map data, imagery, and tile services are provided by their respective service providers and remain subject to those providers' terms. Built-in Amap entries are configuration templates and require authorized service use by the deployer.

---

# 第三方组件声明

本项目通过应用包清单和锁文件使用第三方组件。各组件仍受其上游许可证和版权约束。

## 运行时依赖

| 包 | 用途 | 上游许可证 |
| --- | --- | --- |
| adm-zip | ZIP 归档创建与读取 | MIT |
| better-sqlite3 | 桌面端 SQLite 项目存储与数据转换 | MIT |
| @sqlite.org/sqlite-wasm | 基于 OPFS 的浏览器 SQLite 运行时 | Apache-2.0 |
| exifr | 图片元数据读取 | MIT |
| fflate | 浏览器备份 ZIP 创建 | MIT |
| preact | 组件化渲染器外壳 | MIT |
| lucide-preact | 用户界面图标 | ISC |

## 开发依赖

| 包 | 用途 | 上游许可证 |
| --- | --- | --- |
| electron | 桌面运行时 | MIT |
| electron-builder | Windows 安装包构建 | MIT |
| eslint | JavaScript 检查 | MIT |
| @types/node | Node.js 类型声明，用于类型检查 | MIT |
| @babel/core | JavaScript 与 JSX 转换支持 | MIT |
| @preact/preset-vite | Vite 的 Preact 集成 | MIT |
| prettier | 代码格式化 | MIT |
| typescript | TypeScript 编译与 `checkJs` 类型检查 | Apache-2.0 |
| vite | 渲染器与 preload 打包 | MIT |

## 说明

本软件本身不因使用上述组件而转为第三方许可证授权。本文件仅用于标识项目使用的第三方组件。
