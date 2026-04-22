# Flow Studio — 项目需求文档

> AI 可视化工作流编辑器，类似 ComfyUI 的节点式操作体验

---

## 一、项目概述

### 1.1 产品定位

一个可视化的 AI 工作流编辑器，用户通过拖拽节点、连线组合的方式，自定义 AI 任务的执行流程。支持对话、图像生成、视频生成、网页搜索等多种 AI 能力的编排。

### 1.2 核心用户场景

```
场景1：内容创作者
  搜索热点 → AI 总结 → AI 润色 → 输出文章

场景2：设计师
  文本提示词 → AI 扩写提示词 → 图像生成 → 输出图片

场景3：开发者
  代码问题描述 → AI 对话 → 代码审查 → 输出建议

场景4：视频创作者
  文本描述 → AI 生成脚本 → 视频生成 → 输出视频
```

### 1.3 参考产品

- ComfyUI（最新版）— 核心交互和视觉风格
- Dify — 工作流编排思路
- Node-RED — 节点连线和数据传递

---

## 二、技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────┐
│                   前端                       │
│         React + Vite + @xyflow/react         │
│         Zustand 状态管理                      │
│         iOS 毛玻璃风格 UI                     │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 节点编辑器 │  │ 属性面板  │  │ 节点库   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└──────────────────┬──────────────────────────┘
                   │ HTTP / SSE
┌──────────────────▼──────────────────────────┐
│                   后端                       │
│            Node.js + Express                 │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 工作流API │  │ 执行引擎  │  │ 文件存储  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                              │
│  storage/                                    │
│  ├── workflows/    ← 工作流 JSON 文件        │
│  ├── outputs/      ← 生成的图片/视频         │
│  └── settings.json ← 配置文件               │
└─────────────────────────────────────────────┘
                   │
                   │ 第三方 API
┌──────────────────▼──────────────────────────┐
│  OpenAI / 火山引擎 / 通义千问 / Tavily / ... │
└─────────────────────────────────────────────┘
```

### 2.2 前后端分工

| 职责 | 前端 | 后端 |
|------|:----:|:----:|
| 节点编辑器 UI（拖拽/连线/缩放） | ✅ | |
| 工作流可视化渲染 | ✅ | |
| 节点参数配置面板 | ✅ | |
| 工作流 CRUD | 发起请求 | ✅ 文件系统存储 |
| 工作流执行（拓扑排序 + 逐节点执行） | | ✅ |
| API Key 管理 | | ✅ 加密存储 |
| 图片/视频文件存储 | | ✅ 文件系统 |
| 执行进度实时推送 | 接收 SSE | ✅ SSE 推送 |
| 主题/设置持久化 | | ✅ |

### 2.3 为什么需要后端执行

```
纯前端方案的问题：
  ❌ API Key 暴露在浏览器中，不安全
  ❌ 关闭浏览器后执行中断
  ❌ 大量图片/视频数据占用浏览器内存
  ❌ 无法定时/后台执行工作流

后端执行的好处：
  ✅ API Key 安全存储在服务端
  ✅ 关闭浏览器后继续执行
  ✅ 文件直接保存到磁盘
  ✅ 未来可扩展定时任务、API 对外服务
```

---

## 三、前端设计

### 3.1 页面布局

```
┌──────────────────────────────────────────────────────┐
│  顶部工具栏                                           │
│  [Logo] [工作流名称 ▾] [+新建] [💾保存] [↩撤销] [↪重做] [▶执行] [⚙设置] [🌙/☀️] │
├─────────┬────────────────────────────────┬───────────┤
│ 左侧    │                                │ 右侧      │
│ 节点库  │        画布区域                 │ 属性面板  │
│ ─────── │    （无限平移 + 滚轮缩放）      │ ──────── │
│ 📝 输入  │                                │ 选中节点  │
│ 🤖 对话  │   [节点A]──→[节点B]──→[节点C]  │ 的参数    │
│ 🎨 图像  │      ↓                         │ 配置      │
│ 🎬 视频  │   [节点D]                      │           │
│ 🔍 搜索  │                                │ 无选中时  │
│ 📤 输出  │                                │ 显示帮助  │
│         │                                │           │
├─────────┴────────────────────────────────┴───────────┤
│  底部状态栏：节点数 | 连线数 | 最近执行状态 | 版本     │
└──────────────────────────────────────────────────────┘
```

### 3.2 节点视觉设计

每个节点采用**毛玻璃卡片**风格（复用现有 glass 样式）：

```
┌──────────────────────────┐
│ 🎨 图像生成          [×] │  ← 标题栏（节点类型颜色）
├──────────────────────────┤
│ ○ 提示词                  │  ← 输入端口（左侧圆点）
│ ○ 参考图片                │  ← 输入端口
├──────────────────────────┤
│ 模型: [seedream ▾]       │  ← 节点内置参数（折叠显示）
│ 比例: [1:1 ▾]            │
├──────────────────────────┤
│              生成图片 ●   │  ← 输出端口（右侧圆点）
└──────────────────────────┘

○ = 输入端口（左侧）   ● = 输出端口（右侧）
```

### 3.3 节点类型详细规格

#### 📝 文本输入节点

| 属性 | 说明 |
|------|------|
| 用途 | 输入任意文本，作为其他节点的输入 |
| 输入端口 | 无 |
| 输出端口 | `text`（string） |
| 参数 | 文本内容（多行输入框） |
| 颜色 | 蓝色 `#007AFF` |

#### 🤖 AI 对话节点

| 属性 | 说明 |
|------|------|
| 用途 | 调用对话模型，支持上下文 |
| 输入端口 | `prompt`（string） |
| 输出端口 | `response`（string） |
| 参数 | 模型选择、系统提示词、温度、最大 token |
| 颜色 | 绿色 `#30D158` |

#### 🎨 图像生成节点

| 属性 | 说明 |
|------|------|
| 用途 | 调用图像模型生成图片 |
| 输入端口 | `prompt`（string）、`reference`（image，可选） |
| 输出端口 | `images`（image[]） |
| 参数 | 模型选择、图片比例 |
| 颜色 | 橙色 `#FF9500` |

#### 🎬 视频生成节点

| 属性 | 说明 |
|------|------|
| 用途 | 调用视频模型生成视频 |
| 输入端口 | `prompt`（string）、`reference`（image，可选） |
| 输出端口 | `video`（video） |
| 参数 | 模型选择、时长、分辨率、比例 |
| 颜色 | 紫色 `#AF52DE` |

#### 🔍 网页搜索节点

| 属性 | 说明 |
|------|------|
| 用途 | 调用 Tavily 搜索 API |
| 输入端口 | `query`（string） |
| 输出端口 | `results`（string） |
| 参数 | 最大结果数、是否包含摘要 |
| 颜色 | 青色 `#5AC8FA` |

#### 📤 输出展示节点

| 属性 | 说明 |
|------|------|
| 用途 | 展示工作流执行结果（文本/图片/视频） |
| 输入端口 | `content`（string / image / video） |
| 输出端口 | 无 |
| 参数 | 无 |
| 颜色 | 灰色 `#8E8E93` |

### 3.4 连线规则

```
类型兼容矩阵：
                目标输入端口
                string  image  image[]  video
源输出端口
string           ✅      ✅      ✅      ✅
image            ❌      ✅      ✅      ✅
image[]          ❌      ✅      ✅      ✅
video            ❌      ❌      ❌      ✅

说明：
- string 可以连任何输入口（文字可以当提示词用）
- image/image[] 可以连 image 或 image[] 输入
- 一个输入口只能接收一根连线
- 一个输出口可以连多个输入口（广播）
```

### 3.5 右侧属性面板

选中节点时显示该节点的所有可配置参数：

```
┌─────────────────────────┐
│ 🎨 图像生成              │
│ ─────────────────────── │
│ 模型                     │
│ [seedream-3.0     ▾]    │
│                         │
│ 图片比例                 │
│ [1:1 | 16:9 | 9:16 ▾]  │
│                         │
│ 提示词（来自连线）        │
│ "一只可爱的橘猫"         │
│ ↑ 来自 [文本输入] 节点   │
│                         │
│ 参考图片                 │
│ （未连接）               │
│                         │
│ 执行历史                 │
│ ┌─────────────────────┐ │
│ │ #3 ✅ 2张图片 14:32  │ │
│ │ #2 ✅ 2张图片 14:28  │ │
│ │ #1 ❌ 超时    14:20  │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

未选中节点时显示帮助信息和工作流统计。

### 3.6 执行流程 UI

```
1. 用户点击 ▶执行
2. 顶部工具栏显示进度条：
   [████████░░░░░░] 正在执行 3/6 节点...
3. 画布上正在执行的节点高亮边框 + 脉冲动画
4. 已完成的节点显示 ✅ 小角标
5. 失败的节点显示 ❌ 小角标 + 错误提示
6. 全部完成后底部状态栏显示: "执行完成 (2.3s)"
```

---

## 四、后端设计

### 4.1 目录结构

```
backend/
├── server.js              ← 入口，启动 Express
├── routes/
│   ├── workflows.js       ← 工作流 CRUD API
│   ├── execute.js         ← 工作流执行 API + SSE 进度
│   ├── storage.js         ← 文件/图片/视频存取
│   └── settings.js        ← 设置管理
├── engine/
│   ├── executor.js        ← 工作流执行引擎（核心）
│   ├── nodes/
│   │   ├── textInput.js   ← 各节点的执行逻辑
│   │   ├── aiChat.js
│   │   ├── imageGen.js
│   │   ├── videoGen.js
│   │   ├── webSearch.js
│   │   └── output.js
│   └── validator.js       ← 工作流校验（类型检查、环检测）
├── middleware/
│   ├── errorHandler.js    ← 统一错误处理
│   └── sse.js             ← SSE 中间件
├── storage/
│   ├── workflows/         ← 工作流 JSON 文件
│   └── outputs/           ← 生成的图片/视频
├── package.json
└── README.md
```

### 4.2 API 规范

#### 工作流 CRUD

```
GET    /api/workflows              ← 列出所有工作流
GET    /api/workflows/:id          ← 获取单个工作流
POST   /api/workflows              ← 创建工作流
PUT    /api/workflows/:id          ← 更新工作流
DELETE /api/workflows/:id          ← 删除工作流
POST   /api/workflows/:id/duplicate ← 复制工作流
```

#### 工作流执行

```
POST   /api/execute/:id            ← 开始执行工作流（返回 SSE 流）
GET    /api/execute/:id/status     ← 查询执行状态
POST   /api/execute/:id/cancel     ← 取消执行
```

#### SSE 事件格式

```
event: node_start
data: {"nodeId": "node_1", "nodeType": "imageGen", "index": 2, "total": 6}

event: node_progress
data: {"nodeId": "node_1", "progress": 50, "message": "生成中..."}

event: node_complete
data: {"nodeId": "node_1", "outputs": {"images": ["url1", "url2"]}, "duration": 3200}

event: node_error
data: {"nodeId": "node_1", "error": "API 调用失败: HTTP 429"}

event: workflow_complete
data: {"totalDuration": 8500, "successCount": 5, "failCount": 1}

event: workflow_error
data: {"error": "工作流校验失败: 检测到循环依赖"}
```

#### 设置

```
GET    /api/settings               ← 获取设置
PUT    /api/settings               ← 更新设置
POST   /api/settings/test-api      ← 测试 API 连接
```

#### 文件

```
GET    /api/outputs/:filename      ← 获取生成的图片/视频
POST   /api/outputs/upload         ← 上传参考图片
```

### 4.3 工作流数据结构

```json
{
  "id": "wf_1709123456789",
  "name": "我的图像生成工作流",
  "description": "搜索灵感 → AI 扩写 → 生成图片",
  "version": 1,
  "createdAt": 1709123456789,
  "updatedAt": 1709123456789,
  "nodes": [
    {
      "id": "node_1",
      "type": "textInput",
      "position": { "x": 100, "y": 200 },
      "data": {
        "text": "一只可爱的橘猫坐在窗台上"
      }
    },
    {
      "id": "node_2",
      "type": "aiChat",
      "position": { "x": 400, "y": 200 },
      "data": {
        "model": "gpt-4o",
        "systemPrompt": "你是一个专业的提示词扩写专家...",
        "temperature": 0.7
      }
    },
    {
      "id": "node_3",
      "type": "imageGen",
      "position": { "x": 700, "y": 200 },
      "data": {
        "model": "seedream-3.0",
        "ratio": "1:1"
      }
    },
    {
      "id": "node_4",
      "type": "output",
      "position": { "x": 1000, "y": 200 },
      "data": {}
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "sourceHandle": "text",
      "target": "node_2",
      "targetHandle": "prompt"
    },
    {
      "id": "edge_2",
      "source": "node_2",
      "sourceHandle": "response",
      "target": "node_3",
      "targetHandle": "prompt"
    },
    {
      "id": "edge_3",
      "source": "node_3",
      "sourceHandle": "images",
      "target": "node_4",
      "targetHandle": "content"
    }
  ],
  "settings": {
    "apiConfigId": "config_1",
    "providerConfig": {
      "authType": "bearer",
      "imageMode": "chat",
      "videoMode": "poll"
    }
  }
}
```

### 4.4 执行引擎核心逻辑

```
executor.js 伪代码：

async function executeWorkflow(workflow, apiConfig) {
  // 1. 校验
  validate(workflow);           // 检查连线类型、检测环
  
  // 2. 拓扑排序
  const sorted = topoSort(workflow.nodes, workflow.edges);
  // 结果: [node_1, node_2, node_3, node_4]
  
  // 3. 逐节点执行
  const outputs = {};           // 存储每个节点的输出
  
  for (const node of sorted) {
    sendSSE('node_start', { nodeId: node.id });
    
    // 收集输入（从上游节点的输出中获取）
    const inputs = collectInputs(node, workflow.edges, outputs);
    
    // 执行节点
    try {
      const result = await executeNode(node, inputs, apiConfig);
      outputs[node.id] = result;
      sendSSE('node_complete', { nodeId: node.id, outputs: result });
    } catch (err) {
      sendSSE('node_error', { nodeId: node.id, error: err.message });
      // 决定是否继续执行后续节点
      if (isCritical(node)) break;
    }
  }
  
  sendSSE('workflow_complete', { ... });
}
```

### 4.5 拓扑排序算法

```
将工作流的节点和连线转化为有向无环图（DAG），然后按依赖关系排序：

输入: nodes = [A, B, C, D]  edges = [A→B, A→C, B→D, C→D]

排序过程:
  1. 找到没有输入边的节点: A
  2. 移除 A 及其边，找到下一个: B, C（可并行）
  3. 移除 B, C 及其边，找到: D
  4. 完成

结果: [A] → [B, C] → [D]

同层节点（B、C）可以并行执行，这是后续优化的方向。
MVP 先串行执行，后续版本改为并行。
```

---

## 五、节点类型系统

### 5.1 类型定义（TypeScript）

```typescript
// 端口数据类型
type PortDataType = 'string' | 'image' | 'image[]' | 'video' | 'any';

// 端口定义
interface PortDef {
  id: string;           // 端口唯一ID
  label: string;        // 显示名称
  type: PortDataType;   // 数据类型
  required?: boolean;   // 是否必填
  default?: any;        // 默认值
}

// 节点参数定义
interface ParamDef {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'slider' | 'toggle';
  default?: any;
  options?: { label: string; value: any }[];  // select 类型的选项
  min?: number;   // number/slider
  max?: number;   // number/slider
  step?: number;  // number/slider
}

// 节点类型定义
interface NodeTypeDef {
  type: string;           // 如 'textInput', 'aiChat'
  label: string;          // 如 '文本输入', 'AI 对话'
  icon: string;           // 图标名
  color: string;          // 主题色
  category: string;       // 分类: 'input' | 'ai' | 'output'
  inputs: PortDef[];      // 输入端口
  outputs: PortDef[];     // 输出端口
  params: ParamDef[];     // 节点参数（非连线输入）
}
```

### 5.2 完整节点类型注册表

```typescript
const NODE_REGISTRY: NodeTypeDef[] = [
  {
    type: 'textInput',
    label: '文本输入',
    icon: 'pen',
    color: '#007AFF',
    category: 'input',
    inputs: [],
    outputs: [
      { id: 'text', label: '文本', type: 'string' }
    ],
    params: [
      { id: 'text', label: '文本内容', type: 'textarea', default: '' }
    ]
  },
  {
    type: 'aiChat',
    label: 'AI 对话',
    icon: 'bot',
    color: '#30D158',
    category: 'ai',
    inputs: [
      { id: 'prompt', label: '提示词', type: 'string', required: true }
    ],
    outputs: [
      { id: 'response', label: '回复', type: 'string' }
    ],
    params: [
      { id: 'model', label: '模型', type: 'select', options: [] },
      { id: 'systemPrompt', label: '系统提示词', type: 'textarea', default: '' },
      { id: 'temperature', label: '温度', type: 'slider', min: 0, max: 2, step: 0.1, default: 0.7 },
      { id: 'maxTokens', label: '最大 Token', type: 'number', min: 1, max: 32000, default: 4096 }
    ]
  },
  {
    type: 'imageGen',
    label: '图像生成',
    icon: 'palette',
    color: '#FF9500',
    category: 'ai',
    inputs: [
      { id: 'prompt', label: '提示词', type: 'string', required: true },
      { id: 'reference', label: '参考图片', type: 'image', required: false }
    ],
    outputs: [
      { id: 'images', label: '生成图片', type: 'image[]' }
    ],
    params: [
      { id: 'model', label: '模型', type: 'select', options: [] },
      { id: 'ratio', label: '图片比例', type: 'select', options: [
        { label: '1:1', value: '1:1' },
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' },
        { label: '4:3', value: '4:3' },
        { label: '3:4', value: '3:4' }
      ], default: '1:1' }
    ]
  },
  {
    type: 'videoGen',
    label: '视频生成',
    icon: 'clapperboard',
    color: '#AF52DE',
    category: 'ai',
    inputs: [
      { id: 'prompt', label: '提示词', type: 'string', required: true },
      { id: 'reference', label: '参考图片', type: 'image', required: false }
    ],
    outputs: [
      { id: 'video', label: '生成视频', type: 'video' }
    ],
    params: [
      { id: 'model', label: '模型', type: 'select', options: [] },
      { id: 'duration', label: '时长(秒)', type: 'select', options: [
        { label: '5秒', value: 5 },
        { label: '10秒', value: 10 }
      ], default: 5 },
      { id: 'resolution', label: '分辨率', type: 'select', options: [
        { label: '720p', value: '720p' },
        { label: '1080p', value: '1080p' }
      ], default: '720p' },
      { id: 'ratio', label: '比例', type: 'select', options: [
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' },
        { label: '1:1', value: '1:1' }
      ], default: '16:9' }
    ]
  },
  {
    type: 'webSearch',
    label: '网页搜索',
    icon: 'search',
    color: '#5AC8FA',
    category: 'ai',
    inputs: [
      { id: 'query', label: '搜索词', type: 'string', required: true }
    ],
    outputs: [
      { id: 'results', label: '搜索结果', type: 'string' }
    ],
    params: [
      { id: 'maxResults', label: '最大结果数', type: 'number', min: 1, max: 10, default: 5 },
      { id: 'includeAnswer', label: '包含AI摘要', type: 'toggle', default: true }
    ]
  },
  {
    type: 'output',
    label: '输出展示',
    icon: 'eye',
    color: '#8E8E93',
    category: 'output',
    inputs: [
      { id: 'content', label: '内容', type: 'any', required: true }
    ],
    outputs: [],
    params: []
  }
];
```

---

## 六、可复用代码清单

以下文件可以直接从现有项目（ai-assistant）复制到 flow-studio，只需微调：

### 6.1 前端可直接复用

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

### 6.2 后端可参考

| 源文件 | 参考内容 |
|--------|---------|
| `server.js` | Express 服务搭建、文件服务、CORS 配置 |
| `src/lib/api.ts` | API 调用模式（SSE 解析、图片提取） |
| `src/lib/videoPoll.ts` | 视频任务轮询模式 |

### 6.3 不需要复用的文件

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

## 七、依赖清单

### 7.1 前端

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

### 7.2 后端

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

---

## 八、实施计划

### 阶段一：基础框架（批次 1-3）

| 批次 | 内容 | 产出 |
|------|------|------|
| 1 | 项目初始化 + 前后端目录搭建 + Express 启动 | 可运行的空项目 |
| 2 | 复用代码迁移 + @xyflow/react 集成 + 基础布局 | 空白画布 + 左侧节点库 |
| 3 | 节点类型系统 + 文本输入节点 + 自定义节点渲染 | 可拖拽第一个节点 |

### 阶段二：核心功能（批次 4-6）

| 批次 | 内容 | 产出 |
|------|------|------|
| 4 | AI 对话节点 + 连线数据传递 | 两个节点可连线运行 |
| 5 | 图像生成 + 视频生成节点 | AI 生图/视频能力 |
| 6 | 后端执行引擎 + SSE 进度推送 | 前端发起 → 后端执行 → 实时进度 |

### 阶段三：完善体验（批次 7-10）

| 批次 | 内容 | 产出 |
|------|------|------|
| 7 | 网页搜索节点 + 输出展示节点 | 全部6种节点可用 |
| 8 | 工作流保存/加载/导出/导入 | 持久化 |
| 9 | 设置页面（API配置 + Provider选择） | 多 API 支持 |
| 10 | UI 美化（毛玻璃风格、动画、右键菜单） | 接近成品 |

### 阶段四：高级功能（后续）

- 撤销/重做
- 小地图
- 节点分组
- 条件判断节点
- 循环节点
- 定时执行
- 工作流模板市场

---

## 九、启动脚本

根目录 `package.json`：

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

---

## 十、注意事项

1. **@xyflow/react v12 是最新版**，API 与 v11 有较大变化，请参考最新文档
2. **前端不做 API 调用**，所有 AI 相关请求通过后端代理，API Key 只存后端
3. **后端执行引擎是核心**，先保证正确性，再考虑并行优化
4. **MVP 先串行执行**，后续版本再做同层节点并行
5. **文件存储路径统一用 `path.join(__dirname, ...)`**，避免路径问题
6. **SSE 连接要有超时和重连机制**，防止长时间执行时连接断开
