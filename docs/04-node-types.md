# Flow Studio — 节点类型系统

---

## 一、TypeScript 类型定义

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

## 二、完整节点类型注册表

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

## 三、数据传递规则

节点之间连线时，数据传递遵循以下规则：

```
每个节点的"输出端口"产出数据 → 通过连线 → 传入下一个节点的"输入端口"

示例：
  文本输入节点 输出: text = "画一只猫"
    ↓ 连线
  AI对话节点 接收: prompt = "画一只猫"，输出: response = "一只橘色小猫坐在窗台上"
    ↓ 连线
  图像生成节点 接收: prompt = "一只橘色小猫坐在窗台上"，输出: images = [图片数据]
    ↓ 连线
  输出展示节点 接收: content = [图片数据]，展示给用户

类型匹配：
  string → string ✅  （文字传文字）
  string → image  ✅  （文字可当提示词）
  image  → image  ✅  （图片传图片）
  image  → string ❌  （图片不能当文字用）
  video  → video  ✅  （视频传视频）
```
