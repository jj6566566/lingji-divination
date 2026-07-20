# 灵机 — 大模型应用实践平台

一个集成多种大模型能力的一站式应用平台。当前涵盖 AI 图像创作与 AI 角色扮演对话两大模块，采用三层架构（前端 → Java 后端 → Python AI 服务），SSE 流式响应。

## 核心特色

### 🎨 AI 图像创作

基于通义万相 wan2.7 模型的图像生成与编辑工具，非对话式直接操作。

**文生图** — 输入中文画面描述 → DeepSeek 自动扩写为高质量绘画提示词（正向 + 负向）→ 通义万相 wan2.7-image-pro 生成 1K 分辨率图片。可选上传参考图，模型自动融合参考图的风格与构图。

**图片编辑** — 五种编辑功能，统一的 wan2.7-image-pro 后端：
- **去水印**：框选水印区域，AI 精准去除并自然填充背景
- **指令编辑**：一句话描述修改内容，AI 自动改图
- **风格迁移**：保留画面内容，转换绘画风格（水墨、油画等）
- **扩图**：四向独立控制扩展比例（1×~2×），AI 智能补全四周
- **超分**：模糊图片变高清，2~4 倍分辨率提升

上传图片自动预处理：等比缩放到 512~4096 区间，极端比例（如 200×5000）居中加黑边，避免 API 拒绝。

### 💬 AI 角色扮演对话

基于 DeepSeek 模型的 Function Calling 对话系统。AI 以特定角色身份与用户交流，可在对话中调用工具完成复杂交互。当前内置一个六爻对话角色，后续可扩展更多角色场景。

**角色系统** — 252 行 System Prompt 定义角色的完整人格、语气、对话节奏和行为规范。AI 严格遵循角色设定，包含六个对话阶段（问候→倾听→邀请使用工具→结果解读→追问→总结），每阶段有明确的行为边界。

**Function Calling 工具调用** — AI 通过 `invite_casting()` 函数主动邀请用户使用工具。触发条件：至少两轮有实质内容的交流 + 用户明确回应。工具调用后 AI 进入冷却期，不重复提议。AI 不参与工具内部计算，只负责判断"何时调用"和"如何解读结果"。

**工具引擎** — 纯代码实现的铜钱随机算法。三枚铜钱随机模拟（value 6/7/8/9）→ 六轮生成六爻 → 查 64 卦索引匹配卦名卦符 → 变爻反转生成变卦。结果确定、可复现，零 Token 消耗。

**流式输出** — SSE 逐字推送，解读结果严格遵循三步结构：收束（一句话过渡）→ 分层拆解（逐个结果逐一分析，引用知识库原文 + 白话 + 锚定用户处境）→ 综合解读（串联成完整叙事）。

**多轮追问 + 上下文压缩** — 结果输出后可继续追问，AI 基于原始结果从新角度分析。上下文超 8000 Token 自动触发 LLM 压缩为结构化 JSON 摘要，保留最近 5 轮原文。会话 TTL 默认 1 小时。

**对话线程** — 侧边栏多线程管理，每条线程独立上下文。消息持久化到 MySQL，切换即恢复，线程删除级联清理关联记录。

**知识库** — 内置 64 卦相关数据（卦辞、大象传、384 条爻辞），结构化 JSON 存储。工具调用后自动匹配并注入 Prompt，对外以占位符替换。

## 当前功能

| 模块 | 功能 |
|------|------|
| 文生图 | LLM 提示词扩写 + 通义万相 wan2.7 生成、支持参考图 |
| 图片编辑 | 去水印、指令编辑、风格迁移、扩图、超分 |
| 角色扮演对话 | 252 行角色 Prompt、六阶段对话、Function Calling 工具调用 |
| 工具引擎 | 铜钱随机算法、64 卦索引、自动识别本变卦与变爻 |
| 流式输出 | SSE 逐字推送、三步分析结构、知识库引用 |
| 上下文管理 | 超长自动压缩、结构化摘要、5 轮原文保留、TTL 过期 |
| 对话线程 | 侧边栏多线程管理、消息持久化、切换恢复、级联删除 |
| 用户系统 | 注册/登录、JWT 鉴权、BCrypt 密码加密、每日免费 3 次 |
| 对话记录 | 历史分页、详情查看、软删除、赞/踩反馈 |

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 16 + TypeScript | App Router，React 19 |
| UI | Radix UI + Tailwind CSS v4 | 无头组件 + 原子化样式，暗色主题 |
| 状态管理 | Zustand | 轻量状态管理 |
| 后端语言 | Java 21 (Temurin) | LTS |
| 后端框架 | Spring Boot 3.3.5 | 企业级 Java 框架 |
| ORM | MyBatis-Plus 3.5.7 | 分页、软删除、自动填充 |
| 鉴权 | Spring Security + JWT (jjwt 0.12.6) | 无状态鉴权，BCrypt 加密 |
| AI 框架 | Python FastAPI 0.115.6 | 异步 Web 框架 |
| 对话模型 | DeepSeek (deepseek-chat) | OpenAI 兼容 SDK，中文能力强 |
| 生图模型 | 通义万相 wan2.7 (DashScope) | 文生图 + 图片编辑，阿里云百炼 |
| 数据库 | MySQL 8.0 | Docker 部署 |
| 容器化 | Docker Compose | MySQL 容器编排 |

## 设计思路

### 生图链路

```
用户输入中文描述
       │
       ▼
DeepSeek 扩写 → { positive_prompt, negative_prompt }
       │
       ▼
通义万相 wan2.7-image-pro → 返回图片 URL
```

文生图为两步流水线：LLM 扩写 + 模型生成。图片编辑全功能统一走通义万相，前端收集参数 → AI 服务构建对应 Prompt → DashScope 同步接口返回结果图。两类模型权责清晰，互不耦合。

### 角色对话：引擎 + 解释器解耦

```
工具引擎 (纯代码，确定性)            AI 解释器 (调 LLM)
         │                                  │
   ┌─────┴─────┐                  ┌─────────┼─────────┐
   │           │                  │         │         │
铜钱随机   64卦索引           知识库查询   Prompt组装   流式调用
```

工具引擎纯算法完成，结果确定、可复现。AI 只通过 Function Calling 判断何时调用工具、如何解读结果，不参与引擎内部计算。新增角色场景只需加引擎类 + System Prompt 模板，上下文管理、压缩、会话自动继承。

### 对话调度

`chat_dispatcher.py` 统一处理四种 action：

| Action | 触发场景 | 行为 |
|--------|---------|------|
| `greet` | 新线程首次进入 | 注入欢迎指令，AI 以角色身份主动打招呼 |
| `chat` | 用户发送消息 | 常规对话，AI 判断是否调用工具函数 |
| `interpret` | 工具调用完成后 | 注入解读指令（三步结构），AI 逐项分析 |
| `report` | 用户要求总结 | AI 撰写完整对话总结 |

### 上下文管理与压缩

三层 Prompt 组装：System Prompt（角色设定，永久不变）→ 硬知识（工具结果 + 知识库数据，不参与压缩）→ 对话历史（最近 5 轮原文保留，更早消息 LLM 压缩为 JSON 摘要）。触发条件：Token 估算 > 8000。

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

自动执行 `sql/init.sql` 建表。

### 3. 配置 API Key

编辑 `ai-service/.env`：

```
LINGJI_DEEPSEEK_API_KEY=你的DeepSeek密钥
LINGJI_DASHSCOPE_API_KEY=你的阿里云百炼密钥
```

### 4. 安装依赖

```bash
# 前端
cd frontend && npm install

# AI 服务
cd ai-service && pip install -r requirements.txt
```

### 5. 启动服务

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

基地址：`http://localhost:8080/api/v1`（业务接口），`http://localhost:8000/api/v1`（AI 服务直连）

鉴权方式：Header `Authorization: Bearer <JWT>`

### 生图

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/image/enhance` | 无 | LLM 扩写提示词（text → positive + negative） |
| POST | `/image/generate` | 无 | 文生图（positive_prompt + 可选参考图） |
| POST | `/image/edit` | 无 | 图片编辑（function + base_image + 对应参数） |

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
| POST | `/divine/cast` | Bearer | 工具调用：铜钱六爻算法，不调 LLM |

### 对话记录

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/divination?page=1&size=10` | Bearer | 分页列表（按时间倒序） |
| GET | `/divination/{id}` | Bearer | 详情（含结果、解读、对话历史、Token 消耗） |
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
│       │   ├── page.tsx                   #   首页（生图入口 + 对话入口）
│       │   ├── login/page.tsx             #   登录
│       │   ├── register/page.tsx          #   注册
│       │   ├── me/page.tsx                #   个人中心 + 配额展示
│       │   ├── me/records/page.tsx        #   对话记录分页列表
│       │   ├── create/page.tsx            #   生图创作页（文生图 + 图片编辑）
│       │   └── divine/liuyao/page.tsx     #   角色对话页（聊天 + 侧边栏 + 工具弹窗）
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
│       │   ├── ChatService.java           #   对话调度核心（线程管理 + 流式转发 + 持久化）
│       │   ├── QuotaService.java          #   每日配额（事务扣减 + 失败回滚）
│       │   └── client/AiServiceClient.java#   AI 服务 HTTP 客户端（SSE 代理 + 中断保存）
│       ├── entity/                        # User, DivinationRecord, DailyQuota, ChatThread
│       ├── config/SecurityConfig.java     #   Spring Security 无状态配置
│       ├── interceptor/JwtInterceptor.java#   JWT 过滤器 + ThreadLocal 用户 ID
│       └── common/                        #   Result<T>, PageResult<T>, JwtUtil
│
├── ai-service/                            # Python FastAPI AI 服务
│   ├── engines/
│   │   ├── base.py                        #   BaseEngine 抽象基类
│   │   └── liuyao.py                      #   铜钱六爻引擎（随机算法 + 64 卦索引）
│   ├── interpreter/
│   │   ├── chat_dispatcher.py             #   多轮对话调度（greet/chat/interpret/report）
│   │   ├── dispatcher.py                  #   单次对话流调度
│   │   └── llm_client.py                  #   DeepSeek 流式客户端（含 tool call 累积）
│   ├── knowledge/
│   │   ├── iching_64.json                 #   64 卦完整数据（41KB）
│   │   ├── loader.py                      #   知识库查询（卦象 + 爻辞匹配）
│   │   └── formatter.py                   #   查询结果格式化为 Markdown
│   ├── prompts/
│   │   ├── manager.py                     #   Prompt 模板加载器
│   │   └── liuyao_chat_system.md          #   角色设定 Prompt（252 行）
│   ├── context/
│   │   ├── session_manager.py             #   会话管理器（sessionId 索引，TTL 过期）
│   │   ├── context_assembler.py           #   三层 Prompt 组装器
│   │   └── summarizer.py                  #   对话压缩（LLM 生成结构化摘要）
│   └── router/                            #   divine, cast, chat, image_gen 路由
│
├── sql/
│   ├── init.sql                           # 建表：user, divination_record, daily_quota
│   └── migration_v2_thread.sql            # chat_thread 表 + 记录关联 thread_id
├── docs/                                  # 架构设计文档
└── docker-compose.yml                     # MySQL 8.0 容器
```

## 依赖清单

### 前端

| 包名 | 版本 | 用途 |
|------|------|------|
| next | ^16.2.10 | React 全栈框架 |
| react | ^19.2.4 | UI 框架 |
| @radix-ui/react-dialog | ^1.1.19 | 弹窗 |
| @radix-ui/react-select | ^2.3.3 | 选择器 |
| @radix-ui/react-tabs | ^1.1.17 | 标签页 |
| class-variance-authority | ^0.7.1 | 组件变体管理 |
| clsx + tailwind-merge | ^2.1 / ^3.6 | 条件类名拼接与去重 |
| lucide-react | ^1.24.0 | SVG 图标 |
| zustand | ^5.0.14 | 状态管理 |
| tailwindcss | ^4 | 原子化 CSS |

### Java 后端

| 包名 | 版本 | 用途 |
|------|------|------|
| spring-boot-starter-web | 3.3.5 | Web + Tomcat |
| spring-boot-starter-security | 3.3.5 | 安全框架 |
| spring-boot-starter-validation | 3.3.5 | 参数校验 |
| mybatis-plus-spring-boot3-starter | 3.5.7 | ORM + 分页 + 软删除 |
| mysql-connector-j | runtime | MySQL 驱动 |
| jjwt-api / jjwt-impl / jjwt-jackson | 0.12.6 | JWT 签发与验证 |

### AI 服务

| 包名 | 版本 | 用途 |
|------|------|------|
| fastapi | 0.115.6 | 异步 Web 框架 |
| uvicorn[standard] | 0.34.0 | ASGI 服务器 |
| openai | >=1.0.0 | DeepSeek API 客户端（OpenAI 兼容） |
| pydantic + pydantic-settings | 2.10 / 2.7 | 数据校验 + 配置管理 |
| aiohttp | - | 通义万相 API 异步调用 |
| Pillow | - | 图片预处理（缩放/填充/格式转换） |
| lunardate | 0.2.2 | 农历日期转换（扩展预留） |

## 开发说明

- 前端暗色主题（暖白文字 + 玄金强调色 + 毛玻璃卡片），Tailwind CSS v4 构建
- AI 服务工具引擎与解释器解耦，新增角色场景只需加引擎类 + Prompt 模板
- 对话模型通过 OpenAI 兼容 SDK 调用 DeepSeek，生图通过 aiohttp 调通义万相
- 主分支保持可运行，所有第三方依赖版本已在依赖清单中列明
