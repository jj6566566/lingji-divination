# 灵机 — AI 智能占卜平台

一款融合传统易学文化与现代 AI 技术的智能占卜平台。AI 实时流式解读卦象，支持六爻、八字、塔罗等多种占卜方式，带来沉浸式的东方神秘学体验。

登录后选择占卜方式 → 起卦（纯算法，零 Token 消耗）→ AI 流式解读 → 多轮追问。全程 SSE 实时推送，打字机效果逐字呈现。

## 核心特色

🪙 **三枚铜钱起卦动画** — SVG 铜钱旋转/滚动动效，交互式手动摇晃或一键自动起卦，仪式感拉满。完整 64 卦索引 + 384 爻辞知识库，纯算法生成卦象，零 Token 消耗。

🔮 **引擎 + 解释器架构** — 算卦引擎（纯代码，确定性可复现）与解卦解释器（调 LLM）完全解耦。新增占卜方式只需加一个引擎 + 一个 Prompt 模板，上下文管理、压缩、会话全部自动继承。

💬 **智能上下文管理** — 会话级对话历史追踪，超过 8000 Token 自动触发 LLM 压缩为结构化摘要（用户画像 + 占卜概要 + 关键洞察 + 待解决问题），保留最近 5 轮原文，Token 消耗降低 80%。

🧵 **多线程对话系统** — 侧边栏会话管理，支持同时开启多个独立对话线程。每条线程拥有独立的上下文和消息历史，切换即恢复，聊天记录完整持久化到 MySQL。

📜 **千年智慧知识库** — 内置《周易》64 卦完整卦辞、大象传、彖传、384 条爻辞，结构化 JSON 存储。AI 解读时自动匹配对应卦象知识，引用原文并翻译为白话。

🎯 **边界兜底机制** — 内置 fallback 边界 Prompt，AI 拒绝回答与占卜无关的问题、不预测具体数字、不替代医疗法律建议，确保输出安全可控。

⚡ **每日配额管理** — 未登录用户每天免费 3 次，JWT 鉴权 + BCrypt 密码加密，Spring Security 全局拦截，配额不足即时提示。

## 完整功能矩阵

| 模块 | 功能 |
|------|------|
| 占卜引擎 | 六爻起卦（已实现）、八字排盘（规划中）、塔罗占卜（规划中）、梅花易数（规划中） |
| AI 解读 | SSE 流式输出、多轮追问、上下文压缩、结构化摘要 |
| 用户系统 | 注册/登录、JWT 鉴权、BCrypt 加密、每日免费配额（3 次） |
| 对话管理 | 多线程会话、侧边栏切换、消息持久化、历史加载 |
| 起卦交互 | SVG 铜钱动画、手动摇晃/自动起卦双模式、变爻高亮标注 |
| 卦象展示 | 本卦 → 变卦、卦名 + 卦符 + 拼音、卦辞爻辞引用、五行分析 |
| 记录管理 | 占卜历史列表、详情查看、软删除、反馈评价（赞/踩） |
| 知识库 | 64 卦完整数据、天干地支属性、五行生克关系 |

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 16 + TypeScript | App Router，React 19 |
| UI 组件 | Radix UI + Tailwind CSS v4 | 无头组件 + 原子化样式 |
| 状态管理 | Zustand | 轻量状态管理 |
| 图标 | Lucide React | SVG 图标库 |
| 后端语言 | Java 21 (Temurin) | LTS 版本 |
| 后端框架 | Spring Boot 3.3.5 | 企业级 Java 框架 |
| ORM | MyBatis-Plus 3.5.7 | 国内主流 ORM |
| 鉴权 | Spring Security + JWT | 无状态鉴权 |
| AI 框架 | Python FastAPI | 异步 Web 框架 |
| LLM SDK | OpenAI SDK (兼容模式) | 调用 DeepSeek API |
| AI 模型 | DeepSeek (deepseek-chat) | 默认模型，中文能力强 |
| 数据库 | MySQL 8.0 | 关系型数据库 |
| 容器化 | Docker Compose | MySQL 容器编排 |

## 架构设计

### 三层架构

```
用户 (浏览器)
        │
        ▼
┌───────────────────────────────────────────┐
│           Nginx 反向代理 (生产环境)          │
│           域名、HTTPS、负载均衡              │
└──────────────┬────────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│ 前端    │ │Java 后端│ │AI 服务  │
│Next.js │ │Spring  │ │FastAPI │
│ :3000  │ │:8080   │ │ :8000  │
└────────┘ └───┬────┘ └────────┘
               │
          ┌────┴────┐
          ▼         ▼
      ┌──────┐ ┌──────┐
      │MySQL │ │Redis │
      │ 8.0  │ │(V2)  │
      └──────┘ └──────┘
```

### 各层职责

| 层 | 职责 | 不该做 |
|----|------|--------|
| 前端 (Next.js) | UI、交互、动效、SSE 流式接收 | 算卦逻辑、直接调 LLM |
| 后端 (Spring Boot) | 用户、鉴权、记录、配额、调 AI 服务 | 起卦、直接调 LLM |
| AI (FastAPI) | 起卦算法、Prompt 组装、LLM 调用、上下文管理 | 用户管理、鉴权 |

### 引擎 + 解释器架构

```
                算卦引擎 (纯代码，不调 LLM)
                ════════════════════════
                负责: 生成卦象、掷铜钱、排八字、抽牌
                特点: 确定性、可复现、零 Token 成本

    六爻引擎   八字引擎   塔罗引擎   梅花易数引擎
       │          │          │          │
       └──────────┼──────────┼──────────┘
                  │
                  ▼
            统一解卦解释器 (调 LLM)
            ════════════════════
            负责: 理解卦象 + 用户问题 → 流式解读
            特点: 动态加载 System Prompt、知识库、上下文
```

**为什么不是多个 Agent？** 新增占卜方式只需：加一个引擎 + 加一个 Prompt 模板 + 注册。上下文管理、压缩、会话全部自动继承。

### 数据流（一次占卜）

```
前端 POST /api/v1/chat/stream {method, message, sessionId, action}
  → Java 鉴权 → 调 AI 服务 → SSE 流式转发给前端
  → AI 服务: 起卦(纯算法) → 查知识库 → 组装 Prompt → 调 DeepSeek 流式返回
  → Java: 转码 UTF-8 → 逐帧转发 SSE → 解读结束 → 存库 → 配额更新
```

## 快速开始

### 1. 环境要求

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | 18+ | 前端运行时 |
| Java | 21 (Temurin) | 后端运行时 |
| Python | 3.9+ | AI 服务运行时 |
| Docker | 20+ | MySQL 容器 |
| Maven | 3.x | Java 构建工具（或使用 ./mvnw） |

### 2. 启动数据库

```bash
docker compose up -d
```

这会在 `localhost:3306` 启动 MySQL 8.0，自动执行 `sql/init.sql` 初始化表结构。

### 3. 配置环境变量

```bash
# AI 服务 — 配置 DeepSeek API Key
cd ai-service
cp .env.example .env   # 如需要
```

编辑 `ai-service/.env`：

| 变量 | 说明 |
|------|------|
| `LINGJI_DEEPSEEK_API_KEY` | DeepSeek API 密钥 |

### 4. 安装依赖

```bash
# 前端依赖
cd frontend
npm install

# AI 服务依赖
cd ai-service
pip install -r requirements.txt
```

### 5. 启动服务

按以下顺序分别启动三个服务：

```bash
# 终端 1 — AI 服务 (→ http://localhost:8000)
cd ai-service
python main.py

# 终端 2 — Java 后端 (→ http://localhost:8080)
cd java-backend
./mvnw spring-boot:run

# 终端 3 — 前端 (→ http://localhost:3000)
cd frontend
npm run dev
```

### 6. 访问

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 设计思路

### 模型选择

默认使用 DeepSeek (deepseek-chat)，通过 OpenAI 兼容 SDK 调用。

| 维度 | DeepSeek | Claude (备选) |
|------|----------|--------------|
| 成本 | 极低（约 GPT-4 的 1/50） | 中等 |
| 中文理解 | 优秀 | 顶级 |
| 响应速度 | 快 | 快 |
| 上下文窗口 | 128K tokens | 200K tokens |

选择 DeepSeek 的核心考量：
- 成本优势使其适合频繁的占卜解读场景
- 中文传统文化内容（易经、卦辞）理解能力出色
- 通过 OpenAI 兼容 SDK 调用，切换模型零代码改动

### 上下文管理策略

```
最终 Prompt 结构:

┌─────────────────────────────────────┐
│ 层级1: System Prompt                │  ← 角色设定（永远不变）
│ "你是精通六爻的占卜师..."           │
├─────────────────────────────────────┤
│ 层级2: 硬知识（不参与压缩）           │
│ ┌─────────────────────────────────┐ │
│ │ 卦象: ䷊ 地天泰 → ䷡ 雷天大壮  │ │
│ │ 变爻: 九二                      │ │
│ │ 卦辞: 小往大来，吉亨            │ │
│ │ 爻辞: 九二 包荒，用冯河...      │ │
│ │ 五行: 坤土 → 震木              │ │
│ └─────────────────────────────────┘ │
│ 用户问题 + 用户画像                 │
├─────────────────────────────────────┤
│ 层级3: 会话历史（可能被压缩）         │
│ [摘要] 之前讨论过跳槽时机...         │ ← 压缩的旧消息
│ [user] 那什么时候好？               │ ← 最近5轮原文保留
│ [assistant] 结合大壮卦...           │
└─────────────────────────────────────┘
```

**压缩触发条件：**
- 当前上下文 Token > 8000 → 触发 LLM 压缩
- 保留最近 5 轮原始对话
- 旧消息压缩为结构化 JSON 摘要（用户画像 + 占卜概要 + 关键洞察 + 待解决问题）
- Token 消耗比原文减少 80%

### 上下文获取方式

在调用 AI 解读前，系统通过以下步骤构建充分上下文：

1. **引擎起卦** — 纯算法生成卦象（六爻：三枚铜钱 × 6 次），返回本卦、变卦、变爻详情
2. **知识库查询** — 根据卦象匹配 iching_64.json，加载卦辞、大象传、彖传、爻辞
3. **会话恢复** — 按 sessionId 恢复历史对话，如存在压缩摘要则注入
4. **Prompt 组装** — 将角色设定 + 知识 + 卦象 + 用户问题 + 历史组装为结构化 Prompt
5. **流式调用** — 通过 OpenAI 兼容接口调用 DeepSeek，SSE 逐句推送

### 自定义规则引擎（Prompt 模板）

占卜师人设通过 Markdown 格式的 Prompt 模板控制，位于 `ai-service/prompts/`：

- **角色设定** — 博学、沉稳、有共情力的占卜师
- **解读风格** — 先讲卦象含义 → 结合用户问题 → 引用原文并翻译白话
- **安全边界** — 不预测具体数字、不替代医疗法律建议、拒绝违法内容
- **输出约束** — 优雅简洁的中文、积极但有分寸、最终选择权交还用户

## 项目结构

```
├── frontend/                          # Next.js 16 前端
│   ├── src/
│   │   ├── app/                       # App Router 页面
│   │   │   ├── page.tsx               #   首页 — 占卜方式选择
│   │   │   ├── login/page.tsx         #   登录页
│   │   │   ├── register/page.tsx      #   注册页
│   │   │   ├── me/page.tsx            #   个人中心
│   │   │   ├── me/records/page.tsx    #   占卜记录列表
│   │   │   └── divine/
│   │   │       ├── liuyao/page.tsx    #   六爻占卜（输入问题）
│   │   │       └── [method]/[id]/
│   │   │           ├── page.tsx       #   占卜详情
│   │   │           └── chat/page.tsx  #   追问对话页
│   │   ├── components/
│   │   │   ├── ui/                    #   Radix UI 基础组件
│   │   │   │   ├── Button.tsx         #     按钮
│   │   │   │   ├── Input.tsx          #     输入框
│   │   │   │   └── Card.tsx           #     卡片容器
│   │   │   ├── layout/
│   │   │   │   └── Header.tsx         #     顶部导航栏
│   │   │   ├── divination/
│   │   │   │   ├── MethodCard.tsx     #     占卜方式卡片
│   │   │   │   ├── HexagramDisplay.tsx#     卦象展示组件
│   │   │   │   └── StreamingText.tsx  #     流式文字打字机
│   │   │   └── chat/
│   │   │       ├── ChatBubble.tsx     #     聊天气泡
│   │   │       ├── ChatInput.tsx      #     输入框
│   │   │       ├── CastingModal.tsx   #     起卦弹窗
│   │   │       ├── CopperCoin.tsx     #     SVG 铜钱动画
│   │   │       └── SessionSidebar.tsx #     会话侧边栏
│   │   ├── hooks/
│   │   │   └── useChatStream.ts       #   SSE 流式聊天 Hook
│   │   ├── stores/
│   │   │   └── auth.ts               #   Zustand 认证状态
│   │   └── lib/
│   │       └── api.ts                 #   HTTP 客户端（含 JWT 注入）
│   ├── package.json
│   └── next.config.ts
│
├── java-backend/                      # Spring Boot 3 后端
│   ├── src/main/java/com/divination/
│   │   ├── DivinationApplication.java #   启动类
│   │   ├── config/                    #   配置层
│   │   │   ├── SecurityConfig.java    #     Spring Security + JWT
│   │   │   ├── CorsConfig.java        #     跨域配置
│   │   │   └── MyBatisPlusConfig.java #     MyBatis-Plus 分页
│   │   ├── controller/                #   控制器层
│   │   │   ├── AuthController.java    #     注册/登录/刷新
│   │   │   ├── UserController.java    #     用户信息
│   │   │   ├── ChatController.java    #     多轮对话 SSE + 起卦
│   │   │   ├── DivinationController.java#   占卜记录 CRUD
│   │   │   └── ThreadController.java  #     对话线程管理
│   │   ├── service/                   #   业务层
│   │   │   ├── AuthService.java       #     登录注册逻辑
│   │   │   ├── UserService.java       #     用户信息服务
│   │   │   ├── ChatService.java       #     AI 对话调度（核心）
│   │   │   ├── DivinationService.java #     占卜记录管理
│   │   │   ├── ThreadService.java     #     对话线程管理
│   │   │   ├── QuotaService.java      #     配额管理
│   │   │   └── client/
│   │   │       └── AiServiceClient.java#   调用 AI 服务 HTTP Client
│   │   ├── entity/                    #   数据库实体
│   │   │   ├── User.java
│   │   │   ├── DivinationRecord.java
│   │   │   └── DailyQuota.java
│   │   ├── dto/                       #   请求体 (DTO)
│   │   ├── vo/                        #   响应体 (VO)
│   │   ├── enums/                     #   枚举
│   │   ├── exception/                 #   全局异常拦截
│   │   ├── common/                    #   公共组件 (Result, JwtUtil)
│   │   └── interceptor/
│   │       └── JwtInterceptor.java    #   JWT 验证拦截器
│   ├── src/main/resources/
│   │   └── application.yml            #   开发环境配置
│   └── pom.xml
│
├── ai-service/                        # Python FastAPI AI 服务
│   ├── main.py                        #   FastAPI 入口
│   ├── settings.py                    #   配置管理 (pydantic-settings)
│   ├── engines/                       #   算卦引擎（纯算法）
│   │   ├── base.py                    #     引擎基类 BaseEngine
│   │   └── liuyao.py                  #     六爻起卦引擎
│   ├── interpreter/                   #   解卦解释器
│   │   ├── dispatcher.py              #     统一调度器（核心入口）
│   │   ├── chat_dispatcher.py         #     多轮对话调度器
│   │   └── llm_client.py              #     DeepSeek API 流式客户端
│   ├── knowledge/                     #   知识库
│   │   ├── loader.py                  #     知识加载器
│   │   ├── formatter.py               #     知识格式化
│   │   └── iching_64.json             #     64 卦完整数据
│   ├── prompts/                       #   Prompt 模板
│   │   ├── manager.py                 #     Prompt 管理器
│   │   ├── liuyao_system.md           #     六爻解读 System Prompt
│   │   └── liuyao_chat_system.md      #     六爻追问 System Prompt
│   ├── context/                       #   上下文管理
│   │   ├── session_manager.py         #     会话管理器
│   │   ├── context_assembler.py       #     上下文组装器
│   │   └── summarizer.py              #     对话摘要压缩
│   └── router/                        #   API 路由
│       ├── divine.py                  #     /api/v1/divine/stream
│       ├── cast.py                    #     /api/v1/divine/cast
│       └── chat.py                    #     /api/v1/chat/stream
│
├── sql/                               # 数据库脚本
│   ├── init.sql                       #   初始化建表
│   └── migration_v2_thread.sql        #   v2 对话线程迁移
├── docs/                              # 设计文档
│   ├── 00-整体架构.md
│   ├── 01-前端设计.md
│   ├── 02-后端设计.md
│   └── 03-AI服务设计.md
└── docker-compose.yml                 # MySQL 容器编排
```

## API 接口

基地址: `http://localhost:8080/api/v1`

### 认证模块

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/auth/register` | 用户注册 | 无 |
| POST | `/auth/login` | 用户登录，返回 JWT | 无 |
| POST | `/auth/refresh` | 刷新 Token | Bearer |

### 对话模块

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/chat/stream` | SSE 流式对话（含起卦 + 解读 + 追问） | Bearer |
| POST | `/divine/cast` | 纯起卦（只跑算法，不调 LLM） | Bearer |

### 占卜记录

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/divination` | 发起占卜（SSE 流式） | Bearer |
| GET | `/divination` | 记录列表（分页） | Bearer |
| GET | `/divination/{id}` | 记录详情 | Bearer |
| DELETE | `/divination/{id}` | 软删除 | Bearer |
| POST | `/divination/{id}/feedback` | 反馈评价 | Bearer |

### 对话线程

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/threads` | 线程列表 | Bearer |
| POST | `/threads` | 创建线程 | Bearer |
| GET | `/threads/{id}` | 线程详情 | Bearer |
| PUT | `/threads/{id}` | 更新线程标题 | Bearer |
| DELETE | `/threads/{id}` | 软删除线程 | Bearer |
| GET | `/threads/{id}/messages` | 线程聊天历史 | Bearer |

### 用户模块

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/user/me` | 当前用户信息 | Bearer |
| PUT | `/user/me` | 更新个人信息 | Bearer |
| GET | `/user/me/quota` | 今日配额状态 | Bearer |

### 统一返回格式

```json
// 成功
{ "code": 200, "message": "成功", "data": { ... } }

// 业务异常
{ "code": 429, "message": "今日免费次数已用完（3/3）", "data": null }

// 参数校验失败
{ "code": 400, "message": "问题内容不能为空", "data": null }
```

## 依赖清单

### 前端

| 包名 | 版本 | 用途 |
|------|------|------|
| next | ^16.2.10 | React 全栈框架 |
| react | ^19.2.4 | UI 框架 |
| react-dom | ^19.2.4 | DOM 渲染 |
| @radix-ui/react-dialog | ^1.1.19 | 对话框组件 |
| @radix-ui/react-label | ^2.1.11 | 标签组件 |
| @radix-ui/react-select | ^2.3.3 | 选择器组件 |
| @radix-ui/react-slot | ^1.3.0 | 插槽组件 |
| @radix-ui/react-tabs | ^1.1.17 | 标签页组件 |
| class-variance-authority | ^0.7.1 | 组件变体管理 |
| clsx | ^2.1.1 | 条件类名拼接 |
| tailwind-merge | ^3.6.0 | 类名去重合并 |
| lucide-react | ^1.24.0 | SVG 图标库 |
| zustand | ^5.0.14 | 轻量状态管理 |
| tailwindcss | ^4 | 原子化 CSS 框架 |
| typescript | ^5 | 类型系统 |

### Java 后端

| 包名 | 版本 | 用途 |
|------|------|------|
| spring-boot-starter-web | 3.3.5 | Web 框架 |
| spring-boot-starter-security | 3.3.5 | 安全框架 |
| spring-boot-starter-validation | 3.3.5 | 参数校验 |
| mybatis-plus-spring-boot3-starter | 3.5.7 | ORM 框架 |
| mysql-connector-j | (runtime) | MySQL 驱动 |
| jjwt-api | 0.12.6 | JWT 签发与验证 |
| lombok | (latest) | 代码简化 |

### AI 服务

| 包名 | 版本 | 用途 |
|------|------|------|
| fastapi | 0.115.6 | 异步 Web 框架 |
| uvicorn[standard] | 0.34.0 | ASGI 服务器 |
| openai | >=1.0.0 | DeepSeek API 客户端（兼容） |
| pydantic | 2.10.4 | 数据校验与序列化 |
| pydantic-settings | 2.7.1 | 环境变量配置 |
| python-dotenv | 1.0.1 | .env 环境变量加载 |
| lunardate | 0.2.2 | 农历日期转换 |

### 基础设施

| 组件 | 用途 |
|------|------|
| MySQL 8.0 | 主数据库 |
| Docker Compose | 数据库容器编排 |

## 版本路线

| 版本 | 功能范围 | 目标 |
|------|---------|------|
| **MVP (当前)** | 注册登录 + 六爻起卦 + AI 流式解读 + 多轮追问 + 对话线程 | 跑通全链路 |
| V1 | 八字排盘 + 塔罗占卜 + 占卜记录管理 + 反馈系统 | 完整产品 |
| V2 | 微信小程序 + 会员付费 + Redis 缓存 + 向量记忆 | 开始推广 |
| V3 | 多 Agent 协作 + 每日运势推送 + 社区分享 | 体验壁垒 |

## 开发说明

- 本仓库为灵机 AI 占卜平台的全栈代码
- 前端采用 Next.js 16 App Router + Tailwind CSS v4，暗色东方神秘风格主题
- Java 后端基于 Spring Boot 3.3.5，MyBatis-Plus 作为 ORM
- AI 服务采用「引擎 + 解释器」解耦架构，新增占卜方式只需添加引擎和 Prompt 模板
- 所有 AI 调用使用 DeepSeek API（OpenAI 兼容接口），可零代码切换至其他兼容模型
- 主分支 `main` 始终保持可运行状态
- 所有第三方依赖已在上方「依赖清单」中列明
