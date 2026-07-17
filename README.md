# 灵机 — AI 智能占卜平台

一款融合《周易》六爻传统与 AI 大模型的智能占卜工具。三枚铜钱起卦，AI 真人感对话式解卦，SSE 流式逐字呈现。

选择占卜方式 → 与 AI 卜者"清玄"对话交流 → 铜钱起卦动画 → 卦象生成 → AI 逐爻解读 → 多轮追问。全程流式推送，打字机效果呈现。

## 核心特色

🪙 **三枚铜钱起卦动画** — 交互式 SVG 铜钱滚动动效，支持手动摇晃和自动起卦两种模式。每次投掷三枚铜钱（阳面=2，阴面=3），六轮生成六爻，自动识别本卦、变卦、变爻。完整 64 卦索引，纯算法生成，零 Token 消耗。

🎭 **真人感 AI 卜者** — AI 以"清玄道人"身份对话，252 行 System Prompt 定义了完整的人格、话术和对话节奏。六个对话阶段（初见→倾听→邀请起卦→解卦→追问→撰写报告），每阶段有详细行为规范。起卦前绝不引用具体卦名卦辞，解卦时逐爻锚定用户所述的具体处境，不泛泛而谈。

🔮 **逐爻拆解式解读** — 解卦严格遵循三步结构：收束（一句话过渡）→ 分层拆解（六爻逐一分析，每爻引用卦辞爻辞原文+白话翻译+锚定用户处境）→ 综合解读（六爻串联成完整叙事弧线，给出有画面感的结尾）。变爻特别标注，非变爻也不跳过。

💬 **多轮追问 + 上下文压缩** — 解读完成后可继续追问，AI 基于原始卦象从新角度重新分析（不会重新起卦，不会编造新卦名）。对话超过 8000 Token 自动触发 LLM 压缩——旧消息压缩为结构化 JSON 摘要（用户画像+占卜概要+关键洞察+待解决问题），保留最近 5 轮原文。内置会话 TTL（默认 1 小时），过期自动清理。

🧵 **对话线程系统** — 侧边栏多线程会话管理，每条线程独立上下文和消息历史。切换即恢复，聊天记录完整持久化到 MySQL。支持创建、切换、删除线程，删除线程级联清理关联的占卜记录。

📜 **周易知识库** — 内置 64 卦卦辞、大象传、384 条爻辞（彖传覆盖 4 卦，爻象传覆盖 18 条，其余待补全）。结构化 JSON 存储，AI 解读时自动匹配对应卦象并注入 Prompt，对外以 `[HEXAGRAM_KNOWLEDGE]` 占位符替换。

⚙️ **Function Calling 起卦控制** — AI 通过 `invite_casting()` 工具函数触发起卦，不是随意发起。触发条件严格：至少两轮有实质内容的交流 + 用户明确回应 + 问题已清晰。起卦后进入冷却期，AI 不再主动提议重起。唯一触发方式是调用函数——AI 不能自己描述掷铜钱过程或编造卦象。

## 当前功能

| 模块 | 功能 |
|------|------|
| 六爻起卦 | 三枚铜钱随机算法、64 卦完整索引、本卦+变卦+变爻自动识别 |
| AI 解读 | SSE 流式输出、六阶段对话节奏、逐爻拆解、综合解读 |
| 起卦动画 | SVG 铜钱交互动画、手动/自动双模式 |
| 多轮追问 | 会话级对话历史、上下文超长自动压缩、结构化摘要 |
| 对话线程 | 侧边栏多线程管理、消息持久化、切换恢复、级联删除 |
| 用户系统 | 注册/登录、JWT 鉴权、BCrypt 密码加密、每日免费 3 次 |
| 记录管理 | 占卜历史分页列表、详情查看、软删除、赞/踩反馈 |
| 知识库 | 64 卦卦辞、大象传、384 条爻辞、彖传和象传部分覆盖 |

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 16 + TypeScript | App Router，React 19 |
| UI | Radix UI + Tailwind CSS v4 | 无头组件 + 原子化样式，暗色东方主题 |
| 状态管理 | Zustand | 轻量状态管理 |
| 图标 | Lucide React | SVG 图标库 |
| 后端语言 | Java 21 (Temurin) | LTS 版本 |
| 后端框架 | Spring Boot 3.3.5 | 企业级 Java 框架 |
| ORM | MyBatis-Plus 3.5.7 | 国内主流 ORM，分页、软删除、自动填充 |
| 鉴权 | Spring Security + JWT (jjwt 0.12.6) | 无状态鉴权，BCrypt 密码加密 |
| AI 框架 | Python FastAPI 0.115.6 | 异步 Web 框架 |
| LLM SDK | OpenAI SDK（兼容模式） | 调用 DeepSeek API |
| AI 模型 | DeepSeek (deepseek-chat) | 默认模型，中文能力强，成本极低 |
| 数据库 | MySQL 8.0 | 关系型数据库，Docker 部署 |
| 容器化 | Docker Compose | MySQL 容器编排 |

## 设计思路

### 引擎 + 解释器架构

算卦引擎（纯代码，确定性可复现）与解卦解释器（调 LLM）完全解耦。新增占卜方式只需加一个引擎类 + System Prompt 模板，上下文管理、压缩、会话自动继承。

```
六爻引擎 (liuyao.py)          八字引擎 (规划中)
       │                           │
       └───────────┬───────────────┘
                   │
                   ▼
         解卦解释器 (dispatcher.py / chat_dispatcher.py)
                   │
         ┌─────────┼─────────┐
         ▼         ▼         ▼
    知识库查询   Prompt组装   LLM流式调用
```

当前实现了 `LiuyaoEngine`：三枚铜钱每轮 value=6/7/8/9 → 阴阳爻识别 → 下卦+上卦组成 6 位 key → 查 `HEXAGRAM_INDEX` 匹配卦名和卦符 → 变爻反转生成变卦。

### 上下文管理

一次解卦的 Prompt 由三层组装：

```
层级1: System Prompt（永久不变）
  252 行角色设定 — 清玄的人格、话术、六阶段节奏、禁忌

层级2: 硬知识（不参与压缩）
  卦象数据 + 匹配的卦辞爻辞 + 用户问题

层级3: 对话历史（可能被压缩）
  最近 5 轮保留原文
  更早的消息压缩为结构化摘要
```

压缩触发条件：当前上下文 Token 估算值 > 8000 → 调 LLM 将旧消息压缩为 `{user_profile, divination_brief, key_insights, unresolved_questions}` 格式的 JSON 摘要。压缩使用 `deepseek-chat` 模型，temperature=0.3，max_tokens=500。

### 对话调度

`chat_dispatcher.py` 统一处理四种 action：

| Action | 触发场景 | 行为 |
|--------|---------|------|
| `greet` | 新线程首次进入 | 注入欢迎指令，AI 作为清玄主动打招呼 |
| `chat` | 用户发送消息 | 常规对话，AI 判断是否调用 `invite_casting()` |
| `interpret` | 起卦完成后 | 注入解卦指令（三步结构），AI 逐爻解读 |
| `report` | 用户要保存 | AI 以"一封信"格式撰写完整占卜报告 |

AI 通过 DeepSeek Function Calling 调用 `invite_casting()` 工具函数。后端收到 tool_call → 在响应中设置 `offer_cast=true` → 前端弹出铜钱动画 → 用户起卦 → 后端调 `interpret` action 触发解读。整个流程中 AI 不参与卦象生成，只负责判断"何时邀请"和"如何解读"。

### 知识库查询

起卦完成后，`knowledge/loader.py` 根据卦象结果查询 `iching_64.json`：

1. 匹配本卦 → 加载卦名、卦符、卦辞、大象传、彖传（如有）、六条爻辞
2. 匹配变卦 → 加载变卦的卦名、卦符、卦辞
3. 匹配变爻 → 标记变爻对应的爻辞
4. 通过 `formatter.py` 将匹配结果格式化为 Markdown，注入 System Prompt 的 `[HEXAGRAM_KNOWLEDGE]` 占位符

## 快速开始

### 1. 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 前端运行时 |
| Java | 21 (Temurin) | 后端运行时 |
| Python | 3.9+ | AI 服务运行时 |
| Docker | 20+ | MySQL 容器 |

### 2. 启动数据库

```bash
docker compose up -d
```

在 `localhost:3306` 启动 MySQL 8.0，自动执行 `sql/init.sql` 创建 user、divination_record、daily_quota 三张表。

### 3. 配置 DeepSeek API Key

编辑 `ai-service/.env`：

```
LINGJI_DEEPSEEK_API_KEY=你的密钥
```

### 4. 安装依赖

```bash
# 前端
cd frontend && npm install

# AI 服务
cd ai-service && pip install -r requirements.txt
```

### 5. 启动服务

按顺序启动三个服务：

```bash
# 终端 1 — AI 服务 (http://localhost:8000)
cd ai-service && python main.py

# 终端 2 — Java 后端 (http://localhost:8080)
cd java-backend && ./mvnw spring-boot:run

# 终端 3 — 前端 (http://localhost:3000)
cd frontend && npm run dev
```

浏览器访问 `http://localhost:3000`。

## API 接口

基地址：`http://localhost:8080/api/v1`

鉴权方式：Header `Authorization: Bearer <JWT>`

### 认证

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/auth/register` | 无 | 注册，返回 JWT + 用户信息 |
| POST | `/auth/login` | 无 | 登录，返回 JWT + 用户信息 |
| POST | `/auth/refresh` | Bearer | 刷新即将过期的 Token |

### 对话

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/chat/stream` | Bearer | SSE 流式对话（greet/chat/interpret/report 统一入口） |
| POST | `/divine/cast` | Bearer | 纯起卦，只跑铜钱算法，不调 LLM |

### 占卜记录

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/divination?page=1&size=10` | Bearer | 分页列表（按时间倒序） |
| GET | `/divination/{id}` | Bearer | 详情（含卦象、解读、对话历史、Token 消耗） |
| DELETE | `/divination/{id}` | Bearer | 软删除 |
| POST | `/divination/{id}/feedback` | Bearer | 赞/踩反馈 |

### 对话线程

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/threads` | Bearer | 线程列表（按更新时间倒序） |
| DELETE | `/threads/{id}` | Bearer | 软删除线程及关联记录 |

### 用户

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/user/me` | Bearer | 当前用户信息 |
| GET | `/user/me/quota` | Bearer | 今日配额（used/maxFree/remaining） |

### 返回格式

```json
// 成功
{ "code": 200, "message": "成功", "data": { ... } }
// 业务异常
{ "code": 429, "message": "今日免费次数已用完（3/3）", "data": null }
// 参数校验失败
{ "code": 400, "message": "问题内容不能为空", "data": null }
```

## 项目结构

```
├── frontend/                              # Next.js 16 前端
│   └── src/
│       ├── app/                           # 页面
│       │   ├── page.tsx                   #   首页（占卜方式选择）
│       │   ├── login/page.tsx             #   登录（含记住密码）
│       │   ├── register/page.tsx          #   注册
│       │   ├── me/page.tsx                #   个人中心 + 配额展示
│       │   ├── me/records/page.tsx        #   占卜记录分页列表
│       │   └── divine/liuyao/page.tsx     #   六爻对话页（聊天+侧边栏+起卦弹窗）
│       ├── components/
│       │   ├── ui/                        #   Radix UI 组件（Button, Input, Card）
│       │   ├── layout/Header.tsx          #   顶部导航
│       │   ├── divination/                #   MethodCard, HexagramDisplay, StreamingText
│       │   └── chat/                      #   ChatBubble, ChatInput, CastingModal, CopperCoin, SessionSidebar
│       ├── hooks/
│       │   ├── useChatStream.ts           #   SSE 流式聊天（多线程 slot 管理）
│       │   └── useThreads.ts              #   线程列表获取
│       ├── stores/auth.ts                 #   Zustand 认证状态
│       └── lib/api.ts                     #   HTTP 客户端（JWT 注入 + 401 拦截）
│
├── java-backend/                          # Spring Boot 3.3 后端
│   └── src/main/java/com/divination/
│       ├── controller/                    # Auth, User, Chat, Divination, Thread
│       ├── service/                       # 业务逻辑
│       │   ├── ChatService.java           #   对话调度核心（线程管理+流式转发+持久化）
│       │   ├── QuotaService.java          #   每日配额（事务扣减+失败回滚）
│       │   └── client/AiServiceClient.java#   AI 服务 HTTP 客户端（SSE 代理+中断保存）
│       ├── entity/                        # User, DivinationRecord, DailyQuota, ChatThread
│       ├── config/SecurityConfig.java     #   Spring Security 无状态配置
│       ├── interceptor/JwtInterceptor.java#   JWT 过滤器 + ThreadLocal 用户 ID
│       └── common/                        #   Result<T>, PageResult<T>, JwtUtil
│
├── ai-service/                            # Python FastAPI AI 服务
│   ├── engines/
│   │   ├── base.py                        #   BaseEngine 抽象基类
│   │   └── liuyao.py                      #   六爻引擎（铜钱模拟+64卦索引查询）
│   ├── interpreter/
│   │   ├── chat_dispatcher.py             #   多轮对话调度（greet/chat/interpret/report）
│   │   ├── dispatcher.py                  #   传统占卜流调度
│   │   └── llm_client.py                  #   DeepSeek 流式客户端（含 tool call 累积）
│   ├── knowledge/
│   │   ├── iching_64.json                 #   64 卦完整数据（41KB）
│   │   ├── loader.py                      #   知识库查询（卦象+爻辞匹配）
│   │   └── formatter.py                   #   查询结果格式化为 Markdown
│   ├── prompts/
│   │   ├── manager.py                     #   Prompt 模板加载器（按 method 名缓存）
│   │   ├── liuyao_system.md               #   简版解卦 Prompt
│   │   └── liuyao_chat_system.md          #   完整对话 Prompt（252行，六阶段+禁忌+知识库占位）
│   ├── context/
│   │   ├── session_manager.py             #   会话管理器（按 sessionId 索引，TTL 过期）
│   │   ├── context_assembler.py           #   三层 Prompt 组装器
│   │   └── summarizer.py                  #   对话压缩（调 LLM 生成结构化摘要）
│   └── router/                            #   divine, cast, chat 路由
│
├── sql/
│   ├── init.sql                           # 建表：user, divination_record, daily_quota
│   └── migration_v2_thread.sql            # v2 新增 chat_thread 表 + 记录关联 thread_id
├── docs/                                  # 架构设计文档
│   ├── 00-整体架构.md
│   ├── 01-前端设计.md
│   ├── 02-后端设计.md
│   └── 03-AI服务设计.md
└── docker-compose.yml                     # MySQL 8.0 容器
```

## 版本

| 版本 | 状态 | 内容 |
|------|------|------|
| MVP | ✅ 已完成 | 注册登录、六爻起卦、AI 流式解读、多轮追问、对话线程、记录管理、铜钱动画、Function Calling 起卦控制 |
| V1 | 开发中 | 八字排盘、塔罗占卜、反馈优化 |
| V2 | 规划中 | 微信小程序、会员付费、Redis 缓存 |

## 依赖清单

### 前端

| 包名 | 版本 | 用途 |
|------|------|------|
| next | ^16.2.10 | React 全栈框架 |
| react | ^19.2.4 | UI 框架 |
| @radix-ui/react-dialog | ^1.1.19 | 起卦弹窗 |
| @radix-ui/react-label | ^2.1.11 | 表单标签 |
| @radix-ui/react-select | ^2.3.3 | 选择器 |
| @radix-ui/react-slot | ^1.3.0 | 组件插槽 |
| @radix-ui/react-tabs | ^1.1.17 | 标签页 |
| class-variance-authority | ^0.7.1 | 组件变体管理 |
| clsx | ^2.1.1 | 条件类名拼接 |
| tailwind-merge | ^3.6.0 | 类名去重合并 |
| lucide-react | ^1.24.0 | SVG 图标库 |
| zustand | ^5.0.14 | 状态管理 |
| tailwindcss | ^4 | 原子化 CSS |
| typescript | ^5 | 类型系统 |

### Java 后端

| 包名 | 版本 | 用途 |
|------|------|------|
| spring-boot-starter-web | 3.3.5 | Web + Tomcat |
| spring-boot-starter-security | 3.3.5 | 安全框架 |
| spring-boot-starter-validation | 3.3.5 | 参数校验 |
| mybatis-plus-spring-boot3-starter | 3.5.7 | ORM + 分页 + 软删除 |
| mysql-connector-j | runtime | MySQL 驱动 |
| jjwt-api / jjwt-impl / jjwt-jackson | 0.12.6 | JWT 签发与验证 |
| lombok | latest | 代码简化 |

### AI 服务

| 包名 | 版本 | 用途 |
|------|------|------|
| fastapi | 0.115.6 | 异步 Web 框架 |
| uvicorn[standard] | 0.34.0 | ASGI 服务器 |
| openai | >=1.0.0 | DeepSeek API 客户端（OpenAI 兼容） |
| pydantic | 2.10.4 | 数据校验与序列化 |
| pydantic-settings | 2.7.1 | 环境变量配置管理 |
| python-dotenv | 1.0.1 | .env 加载 |
| lunardate | 0.2.2 | 农历日期转换（八字引擎预留） |

### 基础设施

| 组件 | 用途 |
|------|------|
| MySQL 8.0 | 主数据库 |
| Docker Compose | MySQL 容器编排 |

## 开发说明

- 本仓库为灵机 AI 占卜平台全栈代码，主分支保持可运行
- 前端暗色东方主题（暖白文字+玄金强调色+毛玻璃卡片+鼠标跟随光晕）
- AI 服务采用引擎+解释器解耦架构，新增占卜方式只需加引擎类和 Prompt 模板
- LLM 默认使用 DeepSeek，通过 OpenAI 兼容 SDK 调用，切换模型零代码改动
- 所有第三方依赖版本已在依赖清单中列明
