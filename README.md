# 灵机 — AI 智能占卜平台

AI 驱动的六爻占卜平台。用户登录后选择起卦方式 → 掷铜钱生成卦象 → AI 流式解读 → 多轮追问。

## 已实现功能

🪙 **六爻起卦** — 三枚铜钱随机算法生成卦象（6/7/8/9），完整 64 卦索引，自动识别本卦、变卦、变爻。交互式 SVG 铜钱动画，支持手动摇晃和自动起卦两种模式。

🔮 **AI 流式解读** — SSE 实时推送，打字机效果逐字呈现。AI 以"清玄道人"身份解读，先讲卦象含义，再结合用户问题分析，引用原文并翻译白话。

💬 **多轮追问** — 解读完成后可继续追问，AI 基于当前卦象和对话历史回答。会话超过一定长度自动调用 LLM 将旧消息压缩为结构化摘要，保留最近几轮原文。

🧵 **对话线程管理** — 侧边栏支持多个独立对话线程，每条线程有独立的上下文和消息历史，切换即恢复，聊天记录持久化到 MySQL。

📜 **周易知识库** — 内置 64 卦完整卦辞、大象传、384 条爻辞（彖传和爻象传目前覆盖乾、坤、屯、泰等卦，其余待补全），结构化 JSON 存储。

👤 **用户系统** — 注册、登录、JWT 鉴权、BCrypt 密码加密。未登录用户每天免费 3 次占卜。

📊 **记录管理** — 占卜历史列表分页查询、详情查看、软删除、赞/踩反馈。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 + TypeScript + Tailwind CSS v4 + Radix UI + Zustand |
| 后端 | Java 21 + Spring Boot 3.3.5 + MyBatis-Plus 3.5.7 |
| AI 服务 | Python FastAPI + OpenAI SDK（兼容 DeepSeek API） |
| 数据库 | MySQL 8.0 |
| 容器化 | Docker Compose |

## 项目结构

```
├── frontend/                          # Next.js 16 前端（端口 3000）
│   └── src/
│       ├── app/                       # 页面路由
│       │   ├── page.tsx               #   首页
│       │   ├── login/page.tsx         #   登录
│       │   ├── register/page.tsx      #   注册
│       │   ├── me/page.tsx            #   个人中心
│       │   ├── me/records/page.tsx    #   占卜记录
│       │   └── divine/liuyao/page.tsx #   六爻占卜（对话 + 起卦）
│       ├── components/
│       │   ├── ui/                    #   Button, Input, Card
│       │   ├── layout/Header.tsx      #   顶部导航
│       │   ├── divination/            #   MethodCard, HexagramDisplay, StreamingText
│       │   └── chat/                  #   ChatBubble, ChatInput, CastingModal, CopperCoin, SessionSidebar
│       ├── hooks/useChatStream.ts     #   SSE 流式聊天
│       ├── stores/auth.ts             #   认证状态
│       └── lib/api.ts                 #   HTTP 客户端
│
├── java-backend/                      # Spring Boot 后端（端口 8080）
│   └── src/main/java/com/divination/
│       ├── controller/                # Auth, User, Chat, Divination, Thread
│       ├── service/                   # 业务逻辑 + AiServiceClient
│       ├── entity/                    # User, DivinationRecord, DailyQuota, ChatThread
│       ├── config/SecurityConfig.java # Spring Security + JWT
│       ├── interceptor/               # JWT 验证
│       ├── common/                    # Result, JwtUtil
│       └── exception/                 # 全局异常处理
│
├── ai-service/                        # Python AI 服务（端口 8000）
│   ├── engines/liuyao.py             #   六爻起卦引擎（纯算法）
│   ├── interpreter/                  #   解卦调度 + LLM 客户端
│   ├── knowledge/iching_64.json      #   64 卦知识库
│   ├── prompts/                      #   System Prompt 模板
│   ├── context/                      #   会话管理 + 上下文组装 + 摘要压缩
│   └── router/                       #   API 路由
│
├── sql/                               # init.sql + migration_v2_thread.sql
├── docs/                              # 架构设计文档
└── docker-compose.yml                 # MySQL 容器
```

## 快速开始

### 1. 环境要求

| 工具 | 版本 |
|------|------|
| Node.js | 18+ |
| Java | 21 (Temurin) |
| Python | 3.9+ |
| Docker | 20+ |

### 2. 启动数据库

```bash
docker compose up -d
```

在 `localhost:3306` 启动 MySQL 8.0，自动建表。

### 3. 配置 API Key

编辑 `ai-service/.env`：

```
LINGJI_DEEPSEEK_API_KEY=你的DeepSeek密钥
```

### 4. 安装依赖

```bash
cd frontend && npm install
cd ai-service && pip install -r requirements.txt
```

### 5. 启动服务

```bash
# 终端 1 — AI 服务
cd ai-service && python main.py

# 终端 2 — Java 后端
cd java-backend && ./mvnw spring-boot:run

# 终端 3 — 前端
cd frontend && npm run dev
```

浏览器访问 `http://localhost:3000`

## API 接口

基地址：`http://localhost:8080/api/v1`

### 认证（无需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 注册，返回 JWT |
| POST | `/auth/login` | 登录，返回 JWT |

### 对话（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat/stream` | SSE 流式对话（起卦/解读/追问统一入口） |
| POST | `/divine/cast` | 纯起卦，只跑算法不调 LLM |

### 占卜记录（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/divination` | 记录列表（分页） |
| GET | `/divination/{id}` | 记录详情 |
| DELETE | `/divination/{id}` | 软删除 |
| POST | `/divination/{id}/feedback` | 赞/踩反馈 |

### 对话线程（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/threads` | 线程列表 |
| DELETE | `/threads/{id}` | 软删除线程及关联记录 |

### 用户（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/user/me` | 当前用户信息 |
| GET | `/user/me/quota` | 今日剩余次数 |

### 返回格式

```json
// 成功
{ "code": 200, "message": "成功", "data": { ... } }
// 失败
{ "code": 400, "message": "错误描述", "data": null }
```

## 版本

| 版本 | 状态 | 内容 |
|------|------|------|
| MVP | ✅ 已完成 | 注册登录、六爻起卦、AI 流式解读、多轮追问、对话线程、记录管理 |
| V1 | 开发中 | 八字排盘、塔罗占卜、反馈优化 |
| V2 | 规划中 | 微信小程序、会员付费、Redis 缓存 |

## 依赖清单

### 前端

| 包 | 版本 | 用途 |
|----|------|------|
| next | 16.2.10 | React 框架 |
| react | 19.2.4 | UI |
| @radix-ui/react-dialog | 1.1.19 | 对话框 |
| @radix-ui/react-tabs | 1.1.17 | 标签页 |
| lucide-react | 1.24.0 | 图标 |
| zustand | 5.0.14 | 状态管理 |
| tailwindcss | 4 | 样式 |

### Java 后端

| 包 | 版本 | 用途 |
|----|------|------|
| spring-boot-starter-web | 3.3.5 | Web 框架 |
| spring-boot-starter-security | 3.3.5 | 安全框架 |
| mybatis-plus-spring-boot3-starter | 3.5.7 | ORM |
| mysql-connector-j | runtime | MySQL 驱动 |
| jjwt-api | 0.12.6 | JWT |

### AI 服务

| 包 | 版本 | 用途 |
|----|------|------|
| fastapi | 0.115.6 | Web 框架 |
| uvicorn | 0.34.0 | ASGI 服务器 |
| openai | 1.x | DeepSeek API 客户端 |
| pydantic | 2.10.4 | 数据校验 |
| lunardate | 0.2.2 | 农历转换 |
