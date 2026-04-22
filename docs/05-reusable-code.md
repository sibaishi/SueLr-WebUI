# Flow Studio — 可复用代码清单 + 依赖

---

## 一、前端可直接复用

以下文件可以直接从现有项目（ai-assistant）复制到 flow-studio，只需微调：

| 源文件 | 目标位置 | 需要改动 | 说明 |
|--------|---------|---------|------|
| `src/lib/providers/**` | `frontend/src/lib/providers/` | 微调接口 | Provider 体系（核心） |
| `src/lib/types.ts` | `frontend/src/lib/types.ts` | 扩展 | 基础类型定义 |
| `src/lib/constants.ts` | `frontend/src/lib/constants.ts` | 精简 | 常量（保留 DARK/LIGHT 主题色、模型分类等） |
| `src/lib/utils.ts` | `frontend/src/lib/utils.ts` | 不改 | 工具函数（ftime、gid、cleanKey 等） |
| `src/lib/image.ts` | `frontend/src/lib/image.ts` | 不改 | 图片压缩、base64 转换 |
| `src/lib/store.ts` | `frontend/src/lib/store.ts` | 不改 | IndexedDB 存储 |
| `src/lib/serverStorage.ts` | `frontend/src/lib/serverStorage.ts` | 微调 | API 路径适配 |
| `src/lib/icons.tsx` | `frontend/src/lib/icons.tsx` | 不改 | 图标系统 |
| `src/lib/hidden.ts` | `frontend/src/lib/hidden.ts` | 不改 | 隐藏配置 |
| `src/contexts/ThemeContext.tsx` | `frontend/src/contexts/ThemeContext.tsx` | 不改 | 主题上下文 |
| `src/contexts/ToastContext.tsx` | `frontend/src/contexts/ToastContext.tsx` | 不改 | Toast 提示 |
| `src/components/ios/**` | `frontend/src/components/ios/` | 不改 | iOS 风格 UI 组件（25个文件） |
| `src/components/ErrorBoundary.tsx` | `frontend/src/components/ErrorBoundary.tsx` | 不改 | 错误边界 |
| `src/components/Markdown.tsx` | `frontend/src/components/Markdown.tsx` | 不改 | Markdown 渲染 |
| `src/index.css` | `frontend/src/index.css` | 扩展 | 基础样式 + CSS 变量 |

## 二、后端可参考

| 源文件 | 参考内容 |
|--------|---------|
| `server.js` | Express 服务搭建、文件服务、CORS 配置 |
| `src/lib/api.ts` | API 调用模式（SSE 解析、图片提取） |
| `src/lib/videoPoll.ts` | 视频任务轮询模式 |

## 三、不需要复用的文件

| 源文件 | 原因 |
|--------|------|
| `src/App.tsx` | 完全不同的 UI 结构 |
| `src/components/ChatPanel.tsx` | 被 workflow 编辑器替代 |
| `src/components/ImagePanel.tsx` | 同上 |
| `src/components/VideoPanel.tsx` | 同上 |
| `src/components/SettingsPanel.tsx` | 设置页面重新设计 |
| `src/components/Navigation.tsx` | 导航结构不同 |
| `src/hooks/useChat.ts` | 被后端执行引擎替代 |
| `src/hooks/useImageGen.ts` | 同上 |
| `src/hooks/useVideoGen.ts` | 同上 |
| `src/hooks/useMemory.ts` | 暂不需要（后续可加） |

---

## 四、前端依赖清单

```json
{
  "dependencies": {
    "@xyflow/react": "^12.0.0",
    "clsx": "^2.1.1",
    "lucide-react": "^1.8.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^10.1.0",
    "tailwind-merge": "^3.4.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.9.0",
    "vite": "^7.0.0"
  }
}
```

## 五、后端依赖清单

```json
{
  "dependencies": {
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "uuid": "^10.0.0"
  }
}
```

## 六、根目录启动脚本

```json
{
  "name": "flow-studio",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && node server.js",
    "build": "cd frontend && npm run build",
    "install:all": "npm install && cd frontend && npm install && cd ../backend && npm install"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

用户只需：

```bash
git clone <repo>
cd flow-studio
npm run install:all
npm run dev
```
