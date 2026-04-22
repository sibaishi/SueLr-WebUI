# Flow Studio — 后端设计

---

## 一、目录结构

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

## 二、API 规范

### 工作流 CRUD

```
GET    /api/workflows              ← 列出所有工作流
GET    /api/workflows/:id          ← 获取单个工作流
POST   /api/workflows              ← 创建工作流
PUT    /api/workflows/:id          ← 更新工作流
DELETE /api/workflows/:id          ← 删除工作流
POST   /api/workflows/:id/duplicate ← 复制工作流
```

### 工作流执行

```
POST   /api/execute/:id            ← 开始执行工作流（返回 SSE 流）
GET    /api/execute/:id/status     ← 查询执行状态
POST   /api/execute/:id/cancel     ← 取消执行
```

### SSE 事件格式

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

### 设置

```
GET    /api/settings               ← 获取设置
PUT    /api/settings               ← 更新设置
POST   /api/settings/test-api      ← 测试 API 连接
```

### 文件

```
GET    /api/outputs/:filename      ← 获取生成的图片/视频
POST   /api/outputs/upload         ← 上传参考图片
```

## 三、工作流数据结构

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

## 四、执行引擎核心逻辑

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

## 五、拓扑排序算法

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
