# Security Policy

## Supported Scope

Security maintenance focuses on the current mainline desktop application and its supported installer output.

## Data Protection

Do not commit real project data, image archives, logs, backups, tokens, credentials, private keys, or local environment files.

## Desktop Boundary

The application should keep context isolation enabled, expose only required preload APIs, and validate file paths before reading or writing local project data.

## Reporting

Report security issues directly to the maintainer with a clear description, reproduction steps, affected files or features, and any relevant logs with sensitive content removed.

---

# 安全策略

## 支持范围

安全维护聚焦当前主线桌面应用及其受支持的安装包输出。

## 数据保护

不要提交真实项目数据、图片归档、日志、备份、令牌、凭据、私钥或本地环境文件。

## 桌面安全边界

应用应保持上下文隔离，只暴露必要的 preload API，并在读写本地项目数据前验证文件路径。

## 报告方式

请直接向维护者报告安全问题，并提供清晰描述、复现步骤、受影响文件或功能，以及移除敏感内容后的相关日志。
