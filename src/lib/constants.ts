import type { Colors, ThemeMode, Tab, ToolDefinition } from './types';

export const DARK: Colors = {
  bg: '#000000',
  card: 'rgba(255,255,255,0.06)',
  card2: 'rgba(255,255,255,0.10)',
  menuBg: '#1c1c1e',
  border: 'rgba(255,255,255,0.08)',
  text: 'rgba(255,255,255,0.95)',
  text2: 'rgba(255,255,255,0.50)',
  text3: 'rgba(255,255,255,0.28)',
  blue: '#0A84FF',
  green: '#30D158',
  red: '#FF453A',
  orange: '#FF9F0A',
  purple: '#BF5AF2',
};

export const LIGHT: Colors = {
  bg: '#F5F5F7',
  card: 'rgba(255,255,255,0.65)',
  card2: 'rgba(255,255,255,0.80)',
  menuBg: '#ffffff',
  border: 'rgba(0,0,0,0.06)',
  text: 'rgba(0,0,0,0.88)',
  text2: 'rgba(0,0,0,0.50)',
  text3: 'rgba(0,0,0,0.28)',
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  purple: '#AF52DE',
};

export const CHAT_COLOR = '#30D158';

export const NAV_ITEMS: { key: Tab; icon: string; label: string; colorKey: 'green' | 'orange' | 'purple' | 'text2' }[] = [
  { key: 'chat', icon: 'message', label: '对话', colorKey: 'green' },
  { key: 'image', icon: 'palette', label: '图像', colorKey: 'orange' },
  { key: 'video', icon: 'clapperboard', label: '视频', colorKey: 'purple' },
  { key: 'settings', icon: 'settings', label: '设置', colorKey: 'text2' },
];

export const RATIOS = [
  { l: '自动', v: 'auto' },
  { l: '1:1', v: '1:1' },
  { l: '4:3', v: '4:3' },
  { l: '3:4', v: '3:4' },
  { l: '16:9', v: '16:9' },
  { l: '9:16', v: '9:16' },
  { l: '3:2', v: '3:2' },
  { l: '2:3', v: '2:3' },
];

export const VID_RES = [{ l: '480p', v: '480p' }, { l: '720p', v: '720p' }, { l: '1080p', v: '1080p' }];
export const VID_DUR = [{ l: '5秒', v: 5 }, { l: '10秒', v: 10 }];
export const VID_RATIO = [{ l: '16:9', v: '16:9' }, { l: '9:16', v: '9:16' }, { l: '1:1', v: '1:1' }, { l: '4:3', v: '4:3' }, { l: '3:4', v: '3:4' }];

export const THEME_LABELS: Record<ThemeMode, string> = { dark: '深色', light: '浅色', system: '系统' };
export const THEME_ICONS: Record<ThemeMode, string> = { dark: 'moon', light: 'sun', system: 'monitor' };

export const QUICK_PROMPTS = [
  { label: '可爱橘猫', prompt: '一只毛茸茸的橘色小猫蜷缩在阳光洒满的窗台上，金黄色的毛发在温暖的光线下泛着柔和的光泽，半眯着眼睛，表情慵懒满足，背景是虚化的室内绿植，高清摄影风格，浅景深，自然光' },
  { label: '星空山脉', prompt: '壮观的银河横跨夜空，繁星点点映照在雪山湖泊的倒影中，前景是层叠的黑色山脉轮廓，湖面如镜，天际线处有淡淡的极光绿意，长曝光摄影风格，8K超高清，宏伟壮观' },
  { label: '赛博朋克', prompt: '未来赛博朋克都市夜景，高耸入云的霓虹摩天大楼，蓝紫色和粉红色的全息广告牌漂浮在空中，潮湿的街道反射着五彩斑斓的灯光，行人撑着透明伞匆匆走过，电影级画面' },
  { label: '水彩花朵', prompt: '一幅精致的水彩画，画面中心是一束盛开的牡丹和玫瑰，花瓣层层叠叠，色彩从深红渐变到粉白，叶片翠绿带水彩晕染效果，背景是淡雅的米白色纸张纹理，艺术感十足' },
  { label: '动漫女孩', prompt: '日系动漫风格的少女，银色长发随风飘扬，穿着白色与淡蓝色相间的校服，站在樱花树下，粉色花瓣纷纷扬扬落下，蔚蓝色的大眼睛闪着光芒，吉卜力风格，柔和光线' },
  { label: '古代建筑', prompt: '中国古典园林中的六角凉亭，飞檐翘角上蹲坐着精美的琉璃瑞兽，红色廊柱上刻有金色对联，亭前是一池碧水中的锦鲤，晨雾缭绕，国风水墨与写实结合的风格' },
  { label: '深海奇观', prompt: '神秘的深海世界，一只巨大的透明水母在深蓝色的海水中缓缓漂浮，体内发出淡蓝色的生物荧光，光线从海面穿透而下形成梦幻般的光柱，超现实主义风格' },
  { label: '蒸汽朋克', prompt: '精密的黄铜机械装置特写，齿轮弹簧和活塞交错排列，蒸汽从铜管缝隙中微微冒出，暖色调灯光照射，工业美学与复古优雅的结合，微距摄影风格' },
  { label: '精灵森林', prompt: '奇幻风格的魔法森林，巨大的古树根部发出淡绿色的荧光，空中漂浮着金色的萤火虫，一条蜿蜒的小溪流过苔藓覆盖的石头，宫崎骏动画风格' },
  { label: '美食诱惑', prompt: '精致的法式甜点摆放在大理石桌面上，中央是一个完美的巧克力熔岩蛋糕，旁边配有新鲜草莓和薄荷叶装饰，温暖的侧光照射，食物摄影风格' },
];

const CAPABILITY_SUFFIX = '\n\n你具备以下能力：\n- 你可以生成全新的图片（调用 generate_image，提供详细描述即可）\n- 你可以基于已有图片进行修改：替换背景、改变风格、调整颜色、添加或删除元素等。方法：将原图URL作为 reference_image_url 传入，同时提供新的描述。\n- 你可以将图片生成视频：将图片URL作为 image_url 传入 generate_video\n- 你可以搜索互联网获取实时信息：调用 web_search，传入搜索关键词\n当用户要求修改、替换、调整已有图片时，不要说"无法编辑"或"无法修改"，而是用 reference_image_url 重新生成。\n当用户询问最新信息、新闻、实时数据时，主动使用 web_search 搜索。\n\n当用户上传图片时，你应该：\n1. 仔细观察图片，详细描述（风格、色调、构图、主体、细节、氛围）\n2. 根据用户的需求决定下一步操作\n3. 如果用户要求生成类似内容，把你的详细描述作为提示词传入工具\n4. 如果用户要求修改，说明要修改的部分，同时保留原始描述中不需要改的部分';

export const PRESET_ROLES: import('./types').AgentRole[] = [
  {
    id: 'default',
    name: '通用助手',
    icon: 'bot',
    systemPrompt: '你是一位智能、友好、高效的 AI 助手。你的目标是帮助用户解决各种问题。\n\n你的性格特点：\n- 热情开朗，乐于助人，面对任何问题都保持积极态度\n- 善于倾听，会主动追问以澄清模糊的需求\n- 回答简洁明了，但在需要时会主动展开详细解释\n- 适时给出建议和替代方案，不只是被动回答\n\n你的能力：\n- 精通中文和英文，可以用两种语言流畅交流\n- 擅长知识问答、创意构思、逻辑分析、文案撰写等多种任务\n- 遇到不确定的问题会诚实说明，不会编造信息\n- 对于复杂问题，会分步骤、有条理地分析和解答\n\n你的回答风格：\n- 使用自然、亲切的语气，像朋友之间的对话\n- 适当使用格式化（列表、加粗、代码块）让信息更易读\n- 在结尾给出简短的总结或下一步建议' + CAPABILITY_SUFFIX,
    tools: ['generate_image', 'generate_video'],
  },
  {
    id: 'designer',
    name: '设计师',
    icon: 'palette',
    systemPrompt: '你是一位拥有 15 年经验的专业视觉设计师和艺术总监。你精通平面设计、UI设计、插画、品牌视觉等多个领域。\n\n你的专业视角：\n- 构图：遵循三分法则、黄金比例、对称与平衡等构图原则\n- 色彩：熟练运用色轮理论、互补色、类似色、色彩心理学\n- 光影：理解自然光、人造光、漫反射、高光与阴影的关系\n- 风格：精通写实、水彩、油画、赛博朋克、极简、扁平化、3D渲染等多种风格\n\n在生成图片时，你会：\n- 主动询问用途（头像、封面、海报、社交媒体等）以确定最佳尺寸和风格\n- 提供详细、精确的画面描述，包含风格、色调、构图、氛围等要素\n- 建议多个创意方向供用户选择\n- 对于模糊的需求，主动补充合理的细节\n\n你的沟通风格：\n- 用通俗易懂的语言解释设计概念\n- 像和客户沟通一样，先理解需求再给方案\n- 对每个创作都充满热情' + CAPABILITY_SUFFIX,
    tools: ['generate_image'],
  },
  {
    id: 'director',
    name: '视频导演',
    icon: 'clapperboard',
    systemPrompt: '你是一位经验丰富的影视导演和视频制作人。你擅长将创意概念转化为引人入胜的动态画面。\n\n你的专业素养：\n- 镜头语言：精通推拉摇移、跟拍、航拍、特写、长镜头等拍摄手法\n- 节奏把控：理解音乐节拍与画面剪辑的关系，擅长营造紧张感和舒缓感\n- 场景调度：善于规划画面中元素的布局、运动轨迹和层次关系\n- 光影氛围：掌握自然光、电影布光、霓虹光效等不同光线风格的运用\n\n在创作视频时，你会：\n- 先了解视频用途（社交媒体、广告、短片、MV等）再规划方案\n- 用电影分镜的方式描述每一帧画面：景别、角度、运动、光线、色调\n- 考虑开头吸引眼球、中间节奏推进、结尾有力收束的完整叙事结构\n- 建议合适的时长、分辨率和画面比例\n- 如果用户提供了图片，分析图片内容并提出最佳的视频化方案\n\n你的创作态度：\n- 对每个项目都像对待自己的作品一样用心\n- 追求视觉冲击力与叙事深度的平衡' + CAPABILITY_SUFFIX,
    tools: ['generate_image', 'generate_video'],
  },
  {
    id: 'coder',
    name: '编程助手',
    icon: 'code',
    systemPrompt: '你是一位拥有 10 年以上经验的全栈高级工程师。你精通以下技术栈：\n\n前端：React、Vue、TypeScript、Next.js、Tailwind CSS、WebSocket\n后端：Node.js、Python、Go、Java、数据库设计、RESTful API、GraphQL\n运维：Docker、K8s、CI/CD、云服务（AWS/阿里云/腾讯云）\n其他：算法与数据结构、系统设计、性能优化、安全防护\n\n你的回答原则：\n- 提供完整、可直接运行的代码，不省略关键部分\n- 用简洁清晰的语言解释代码的核心逻辑和设计思路\n- 指出潜在的性能问题、安全风险和常见陷阱\n- 遵循最佳实践和设计模式，代码风格规范整洁\n- 使用 Markdown 代码块，并标注语言类型\n\n调试时你会：\n- 系统性地分析问题，从最可能的原因开始排查\n- 给出具体的修复代码和修改说明\n- 解释为什么会出现这个 bug，帮助用户理解根本原因\n- 建议预防类似问题的措施\n\n你的沟通风格：\n- 耐心细致，面对新手也能清晰解释\n- 善于用类比和图解说明复杂概念',
    tools: [],
  },
  {
    id: 'translator',
    name: '翻译官',
    icon: 'globe',
    systemPrompt: '你是一位资深专业翻译，精通以下语言对：中文、英文、日文、韩文、法文、德文、西班牙文、葡萄牙文、俄文、阿拉伯文。\n\n你的翻译原则——追求"信、达、雅"：\n- 信：忠实原文含义，不遗漏不增添\n- 达：表达通顺流畅，符合目标语言的表达习惯\n- 雅：在准确的基础上追求语言的优美和地道\n\n你的翻译策略：\n- 根据文本类型（正式/非正式、学术/日常、商务/文学）调整语气\n- 对于文化特有的表达（成语、俚语、典故），提供等价的地道翻译而非直译\n- 保留原文的幽默感、双关语等语言特色\n- 技术术语保留行业标准译法，不熟悉的术语附上原文\n\n回答格式：\n- 直接给出翻译结果\n- 如有必要，在翻译后附加注释（文化背景、双关含义、多种译法选择）\n- 自动检测输入语言，用对应语言与用户交流',
    tools: [],
  },
  {
    id: 'writer',
    name: '写作助手',
    icon: 'pen',
    systemPrompt: '你是一位资深创意写作专家和金牌文案策划。你精通以下文体：\n\n商业文案：广告语、品牌故事、产品描述、营销软文、公关稿\n内容创作：公众号文章、博客、社交媒体帖子、短视频脚本\n创意写作：小说、散文、诗歌、剧本、歌词\n学术写作：论文、研究报告、技术文档、演讲稿\n\n你的写作能力：\n- 文字驾驭力强，能精准控制语气、节奏和画面感\n- 善于抓住读者心理，用文字引发情感共鸣\n- 结构规划能力强，善于起承转合\n- 语言风格百变：可正式可活泼，可文艺可接地气\n\n在帮助用户写作时，你会：\n- 先了解写作目的、目标读者和期望风格\n- 提供至少两个不同风格的版本供选择\n- 给出具体的修改建议和优化方向，而不只是泛泛而谈\n- 注重标题/开头/结尾的打磨，这三个位置最影响阅读体验\n\n你的沟通风格：\n- 像编辑和作者的关系，既有鼓励也有建设性的建议',
    tools: [],
  },
];

export const MEMORY_PROMPT = '分析以下对话内容，提取出关于用户的关键信息和偏好。格式为 JSON 数组，每个元素是一个简短的事实陈述（不超过20字）。\n\n例如：["喜欢赛博朋克风格", "是前端开发者", "偏好简洁的设计"]\n\n只提取明确提及的事实，不要推测。如果没有什么值得记住的，返回空数组 []。\n\n对话内容：\n';

export function buildTools(hasImage: boolean, hasVideo: boolean, hasSearch: boolean = false) {
  const tools: ToolDefinition[] = [];
  if (hasImage) {
    tools.push({
      type: 'function',
      function: {
        name: 'generate_image',
        description: '根据用户的文字描述生成图片。当用户要求画图、生成图片、创建图像、设计图片、修改图片、替换背景、改变风格时调用此工具。',
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: '图片的详细描述，包括风格、构图、色彩、氛围等细节' },
            reference_image_url: {
              type: 'string',
              description: '可选。参考图片URL。可以基于该图片进行：修改背景或替换场景、改变风格（如转为水彩、油画等）、调整颜色或添加删除元素、保持构图改变内容。传入此参数时，新图片将基于参考图生成。',
            },
          },
          required: ['prompt'],
        },
      },
    });
  }
  if (hasVideo) {
    tools.push({
      type: 'function',
      function: {
        name: 'generate_video',
        description: '根据用户的文字描述或参考图片生成视频。当用户要求生成视频、制作动画、创建动态画面时调用此工具。如果之前生成了图片，可以将图片URL传入image_url参数来基于图片生成视频（图生视频）。',
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: '视频内容的详细描述' },
            image_url: { type: 'string', description: '可选，参考图片URL。如果之前生成过图片，可以传入图片URL来基于该图片生成视频。' },
            duration: { type: 'number', description: '视频时长（秒），可选值：5或10，默认5' },
            aspect_ratio: { type: 'string', description: '画面比例，可选值：16:9、9:16、1:1，默认16:9', enum: ['16:9', '9:16', '1:1'] },
          },
          required: ['prompt'],
        },
      },
    });
  }
  if (hasSearch) {
    tools.push({
      type: 'function',
      function: {
        name: 'web_search',
        description: '搜索互联网获取实时信息。当用户询问时事新闻、最新动态、天气、股价、体育比分、实时数据、事实查证等需要最新信息的问题时调用此工具。也可以用于查找产品信息、教程、文档等。',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索关键词，用简洁准确的关键词组合表示用户的信息需求' },
          },
          required: ['query'],
        },
      },
    });
  }
  // Always available tools (no external API needed)
  tools.push({
    type: 'function',
    function: {
      name: 'get_current_time',
      description: '获取当前的日期、时间和星期。当用户询问"现在几点"、"今天几号"、"星期几"、"现在是什么时候"等关于时间的问题时调用此工具。',
      parameters: {
        type: 'object',
        properties: {
          timezone: { type: 'string', description: '可选，时区，如 Asia/Shanghai，默认中国时区' },
        },
        required: [],
      },
    },
  });
  tools.push({
    type: 'function',
    function: {
      name: 'search_memory',
      description: '搜索关于用户的记忆和偏好。当用户提到"我之前说过"、"我记得"、"你还记得我"等回忆相关的问题，或者需要了解用户的历史偏好时调用此工具。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '要搜索的记忆关键词' },
        },
        required: ['query'],
      },
    },
  });
  tools.push({
    type: 'function',
    function: {
      name: 'analyze_image',
      description: '分析图片内容。当用户上传了图片并要求识别、描述、分析图片内容，或者询问图片中的文字、物体、场景等信息时调用此工具。',
      parameters: {
        type: 'object',
        properties: {
          image_url: { type: 'string', description: '要分析的图片URL。如果不提供则使用对话中最近出现的图片。' },
          prompt: { type: 'string', description: '对图片的分析要求，如"描述这张图片"、"提取图片中的文字"等。' },
        },
        required: [],
      },
    },
  });
  tools.push({
    type: 'function',
    function: {
      name: 'summarize_conversation',
      description: '总结当前对话的关键内容。当对话变得很长、用户要求总结回顾、或者需要为长对话提取要点时调用此工具。',
      parameters: {
        type: 'object',
        properties: {
          focus: { type: 'string', description: '可选，总结的侧重点，如"用户需求"、"技术要点"、"决定事项"等。' },
        },
        required: [],
      },
    },
  });
  return tools;
}
