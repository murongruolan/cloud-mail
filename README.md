<p align="center">
    <img src="doc/demo/logo.png" width="80px" />
    <h1 align="center">Cloud Mail</h1>
    <p align="center">基于 Cloudflare 的简约响应式邮箱服务，支持邮件发送、附件收发 🎉</p> 
    <p align="center">
        简体中文 | <a href="/README-en.md" style="margin-left: 5px">English </a>
    </p>
    <p align="center">
        <a href="https://github.com/murongruolan/cloud-mail/blob/main/LICENSE" target="_blank" >
            <img src="https://img.shields.io/badge/license-MIT-green" />
        </a>    
        <a href="https://github.com/murongruolan/cloud-mail/tags" target="_blank" >
            <img src="https://img.shields.io/github/v/tag/murongruolan/cloud-mail" alt="releases" />
        </a>  
        <a href="https://github.com/murongruolan/cloud-mail/issues" >
            <img src="https://img.shields.io/github/issues/murongruolan/cloud-mail" alt="issues" />
        </a>  
        <a href="https://github.com/murongruolan/cloud-mail/stargazers" target="_blank">
            <img src="https://img.shields.io/github/stars/murongruolan/cloud-mail" alt="stargazers" />
        </a>  
        <a href="https://github.com/murongruolan/cloud-mail/forks" target="_blank" >
            <img src="https://img.shields.io/github/forks/murongruolan/cloud-mail" alt="forks" />
        </a>
    </p>
</p>

---

## 关于本Fork分支
本项目是 **[maillab/cloud-mail](https://github.com/maillab/cloud-mail) v2.9.0** 的独立Fork分支，遵循原项目MIT开源协议。

### 分支管理说明
- `main` 分支：保持与原项目上游仓库同步，无任何自定义修改
- `developer` 分支：日常开发分支，新增功能、问题修复
- `release` 分支：生产可用分支，发布Tag版本

### 本分支核心变更
**2026-05-02**
**[2.9.0-murong.1.2](https://github.com/murongruolan/cloud-mail/tags)**
- 公共接口能力：新增基于 `c-app-key` 请求头鉴权的公共 App API，支持创建邮箱账号、获取用户未读邮件列表、获取邮件详情、标记邮件已读
- 接口配置：在系统设置页新增「接口设置」区块，可配置公共 API 开关与 apiKey，配置数据存储于 Cloudflare KV
- 接口文档：根目录新增 `swagger.yaml`，提供公共接口的 OpenAPI/Swagger 文档，包含请求头鉴权、入参模型、出参模型与成功/失败示例

**2026-04-30**
**[2.9.0-murong.1.0](https://github.com/murongruolan/cloud-mail/tags)**
- 新增管理能力：新增子管理员体系与操作日志页面，支持主管理员添加/备注/禁用/删除子管理员，并对管理类修改操作进行独立记录与筛选查询
- 用户管理增强：用户列表支持备注展示与修改、批量添加用户、窄屏下管理列自适应优化，并补充对超级管理员行的安全限制
- 安全与风控：新增登录 Turnstile 验证、验证完成后自动继续登录、初始化接口幂等保护、附件与正文图片大小限制，以及登录/注册页更顺手的键盘交互
- 数据备份：新增系统数据库备份模块，支持独立对象存储配置、定时备份、手动备份、状态回显与失败详情展示，并自动仅保留最新 5 份备份
- 部署与稳定性修复：优化 GitHub Actions 自动部署初始化流程，修复备份导出 D1 内部表导致的异常，统一备份时间为上海时区显示

---



## 项目简介

只需要一个域名，就可以创建多个不同的邮箱，类似各大邮箱平台，本项目支持署到 Cloudflare Workers ，降低服务器成本，搭建自己的邮箱服务

## 项目展示

- [在线演示](https://skymail.ink)<br>
- [部署文档](https://doc.skymail.ink)<br>

| ![](/doc/demo/demo1.png) | ![](/doc/demo/demo2.png) |
|-----------------------|-----------------------|
| ![](/doc/demo/demo3.png) | ![](/doc/demo/demo4.png) |




## 功能介绍

- **💰 低成本使用**： 可部署到 Cloudflare Workers 降低服务器成本

- **💻 响应式设计**：响应式布局自动适配PC和大部分手机端浏览器

- **📧 邮件发送**：集成Resend发送邮件，支持群发，内嵌图片和附件发送，发送状态查看

- **🛡️ 管理员功能**：可以对用户，邮件进行管理，RABC权限控制对功能及使用资源限制

- **📦 附件收发**：支持收发附件，使用R2对象存储保存和下载文件

- **🔔 邮件推送**：接收邮件后可以转发到TG机器人或其他服务商邮箱

- **📡 开放API**：支持使用API批量生成用户，多条件查询邮件 

- **📈 数据可视化**：使用ECharts对系统数据详情，用户邮件增长可视化显示

- **🎨 个性化设置**：可以自定义网站标题，登录背景，透明度

- **🤖 人机验证**：集成Turnstile人机验证，防止人机批量注册

- **📜 更多功能**：正在开发中...



## 技术栈

- **平台**：[Cloudflare Workers](https://developers.cloudflare.com/workers/)

- **Web框架**：[Hono](https://hono.dev/)

- **ORM：**[Drizzle](https://orm.drizzle.team/)

- **前端框架**：[Vue3](https://vuejs.org/) 

- **UI框架**：[Element Plus](https://element-plus.org/) 

- **邮件推送：** [Resend](https://resend.com/)

- **缓存**：[Cloudflare KV](https://developers.cloudflare.com/kv/)

- **数据库**：[Cloudflare D1](https://developers.cloudflare.com/d1/)

- **文件存储**：[Cloudflare R2](https://developers.cloudflare.com/r2/)

## 目录结构

```
cloud-mail
├── mail-worker				    # worker后端项目
│   ├── src                  
│   │   ├── api	 			    # api接口层			
│   │   ├── const  			    # 项目常量
│   │   ├── dao                 # 数据访问层
│   │   ├── email			    # 邮件处理接收
│   │   ├── entity			    # 数据库实体
│   │   ├── error			    # 自定义异常
│   │   ├── hono			    # web框架配置、拦截器、全局异常等
│   │   ├── i18n			    # 语言国际化
│   │   ├── init			    # 数据库缓存初始化
│   │   ├── model			    # 响应体数据封装
│   │   ├── security			# 身份权限认证
│   │   ├── service			    # 业务服务层
│   │   ├── template			# 消息模板
│   │   ├── utils			    # 工具类
│   │   └── index.js			# 入口文件
│   ├── pageckge.json			# 项目依赖
│   └── wrangler.toml			# 项目配置
│
├── mail-vue				    # vue前端项目
│   ├── src
│   │   ├── axios 			    # axios配置
│   │   ├── components			# 自定义组件
│   │   ├── echarts			    # echarts组件导入
│   │   ├── i18n			    # 语言国际化
│   │   ├── init			    # 入站初始化
│   │   ├── layout			    # 主体布局组件
│   │   ├── perm			    # 权限认证
│   │   ├── request			    # api接口
│   │   ├── router			    # 路由配置
│   │   ├── store			    # 全局状态管理
│   │   ├── utils			    # 工具类
│   │   ├── views			    # 页面组件
│   │   ├── app.vue			    # 入口组件
│   │   ├── main.js			    # 入口js
│   │   └── style.css			# 全局css
│   ├── package.json			# 项目依赖
└── └── env.release				# 项目配置
```

## 赞助
原项目赞助入口
<a href="https://doc.skymail.ink/support.html" >
<img width="170px" src="./doc/images/support.png" alt="原项目赞助入口">
</a>

## 许可证

- 本项目基于原项目 **MIT License** 进行二次开发，原项目完整版权声明见 [原项目LICENSE](https://github.com/maillab/cloud-mail/tree/main?tab=MIT-1-ov-file)
- 本分支二次开发的代码，同样遵循 **MIT License** 开源协议，完整内容见 [LICENSE](LICENSE)


## 交流

## 交流反馈
- 原项目官方交流：[Telegram](https://t.me/cloud_mail_tg)
- 本仓库相关问题：可在 [本仓库Issues](https://github.com/murongruolan/cloud-mail/issues) 中反馈



