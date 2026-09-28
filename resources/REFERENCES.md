# 一手资料与版本约定

[总纲](../ROADMAP.md) · [学习方法](../METHOD.md)

入口核对日期：2026-09-26。这里是按问题阅读的导航，不是需要全部通读的书单。优先使用官方教程、规范、项目文档及作者原文。每份学习证据另记实际阅读章节、版本、访问日期；在线文档的默认版本可能变化。

<a id="baseline"></a>
## 技术基线与依赖锁定

| 项目 | 第一版约定 | 建立实践工程时要做的事 |
|---|---|---|
| Java | Java 21，禁用预览特性作为必修依赖 | 记录发行版与精确补丁版本，源码与运行时匹配 |
| 数据库 | MySQL 8.4 / InnoDB | 锁定镜像补丁或摘要，记录时区、字符集、隔离级别与自动提交 |
| Spring | 与 Java 21 兼容的稳定 Spring Boot；不使用 milestone/snapshot | 核对下方系统要求，锁定 Boot 版本，由 BOM 管理配套 Spring/Security/测试依赖 |
| 数据访问 | JDBC 对照 + MyBatis；Flyway 管理迁移 | 按 MyBatis Starter 兼容矩阵选版本；Flyway 核对数据库支持，不任意混用主版本 |
| 构建/测试 | Maven Wrapper；JUnit Jupiter；MySQL 集成测试 | 固定 Maven 版本；JUnit 版本跟随所选 Boot 支持范围，不照抄“current”网页版本 |
| 中间件 | Redis、RabbitMQ；可选真实 Elasticsearch | 到阶段 3 再锁定稳定版本及配置，记录队列/确认/持久化设置 |
| 模块验证 | 依赖规则测试，Spring Modulith 可辅助 | 若使用 Modulith，按官方兼容说明选择对应 Boot 的版本 |

核对时 [Spring Boot 系统要求](https://docs.spring.io/spring-boot/system-requirements.html) 页面展示的 Java 兼容范围覆盖 Java 21；第三方组件仍需分别核对。当前只有学习文档，尚无 pom 或已验证的依赖组合，不把网页信息当作构建成功证明。

<a id="java"></a>
## Java 教程：M01

主入口：[Dev.java Learn](https://dev.java/learn/)。

| 单元 | 定点阅读 |
|---|---|
| M01-1/2 | Language Basics、OOP、Generics、Collections |
| M01-3/4 | Exceptions，以及下方 API 的 AutoCloseable、BigDecimal、java.time |
| M01-5/6 | Streams、Pattern Matching、Annotations、Reflection |

教程用于建立概念，再以固定版本 API/规范核对关键行为。站点默认最新 Java 的内容不一定适用于 21。

<a id="java-spec"></a>
## Java 21 规范与 API：M01/M03/M04

- [Java 21 API](https://docs.oracle.com/en/java/javase/21/docs/api/index.html)：查 Object、BigDecimal、Map、java.time、java.util.concurrent 的契约及异常条件。
- [JLS Java SE 21](https://docs.oracle.com/javase/specs/jls/se21/html/index.html)：类型/泛型、表达式、执行、线程与锁；M03-1 重点第 17 章。规范不要求逐页通读。

<a id="virtual-threads"></a>
## 虚拟线程：M03-6

主入口：[Java 21 Virtual Threads](https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html)。阅读创建、调度、pinning、监控及使用建议；页面提供 JEP 444 的设计背景入口。这里保留已能访问的 Oracle 官方指南，JEP 站点在本次检查时返回访问限制。

尤其区分 Java 21 与后续版本的实现变化；对线程便宜的观察不能推导数据库连接或 CPU 也无限。

<a id="jvm"></a>
## JVM 诊断：M04

- 主资料：[Java 21 Troubleshooting Guide](https://docs.oracle.com/en/java/javase/21/troubleshoot/index.html)，按诊断工具、内存问题、性能问题选择章节。
- 基准：[OpenJDK JMH 官方仓库](https://github.com/openjdk/jmh)，从 samples 学习预热、fork、状态和避免优化干扰。不是把所有业务压测改成微基准。

<a id="foundations"></a>
## 计算机基础：M02

- 主资料：[OSTEP 作者网站](https://pages.cs.wisc.edu/~remzi/OSTEP/)，进程/调度→地址空间/分页→线程/锁→IO/文件，结合问题按章阅读。
- 算法：[MIT 6.006 官方课程](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/)，数据结构、排序、树、图和动态规划；将练习用 Java 实现。
- HTTP：[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)，阅读方法语义、幂等、状态码与条件请求，区分协议含义和业务幂等实现。
- TCP：[RFC 9293](https://www.rfc-editor.org/rfc/rfc9293.html)，按连接状态、序号/确认、重传与流量控制定点查阅。
- DNS：[RFC 1034](https://www.rfc-editor.org/rfc/rfc1034.html)，理解名称空间、解析与缓存；具体新增机制再查后续标准。
- TLS：[RFC 8446](https://www.rfc-editor.org/rfc/rfc8446.html)，TLS 1.3 握手和认证，配合请求时序学习，不背完整密码套件。
- Linux 工具使用练习环境对应版本的 man pages，避免照搬 macOS 命令结果。

<a id="mysql"></a>
## MySQL：M05

主资料：[MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/)。

| 单元 | 手册阅读位置 |
|---|---|
| M05-1/2 | Data Types、SQL Statements、约束与 JOIN |
| M05-3 | Optimization：索引、EXPLAIN、统计信息；InnoDB 页/索引与缓冲池 |
| M05-4 | InnoDB Transaction Model、Locking、Isolation Levels、Consistent Nonlocking Reads |
| M05-5/6 | 连接与事务使用；InnoDB 恢复；Backup and Recovery、Replication |

迁移工具：[Redgate Flyway 官方文档](https://documentation.red-gate.com/fd)，先读迁移版本、校验、失败处理与数据库支持；不要假定每种 DDL 都可事务回滚。

<a id="mybatis"></a>
## MyBatis：M05/M06

主入口：[MyBatis Spring Boot Starter](https://mybatis.org/spring-boot-starter/mybatis-spring-boot-autoconfigure/)。先读 Requirements 的 Java/Boot/MyBatis-Spring 兼容矩阵，再读自动配置和配置项，并从页面导航进入 MyBatis 映射与动态 SQL 文档。

先手写一次 JDBC 事务再对照框架，理解框架隐藏了什么、没有改变什么。

<a id="spring"></a>
## Spring：M06

- 主资料：[Spring Framework Reference](https://docs.spring.io/spring-framework/reference/)，Core/IoC → AOP → Data Access/Transaction → Web MVC → Testing。
- 工程入口：[Spring Boot Reference](https://docs.spring.io/spring-boot/reference/index.html)，配置、自动装配、Web、安全、测试、生产特性。

在页面版本选择器切到实际主版本；创建实验报告时引用具体小节。对代理、事务和自动配置的推断要通过实际 Bean/调用链/数据库结果验证。

<a id="engineering"></a>
## 测试、构建与协作：M07

- [JUnit 官方用户指南](https://docs.junit.org/6.1.3/overview.html)：从 Jupiter 的断言、生命周期、参数化测试与扩展机制进入；此处是已核对的版本入口，实际工程以兼容版本为准。
- [Maven Guides](https://maven.apache.org/guides/)：生命周期、依赖管理、插件、Wrapper 与可复现构建。
- [Pro Git 官方在线版](https://git-scm.com/book/en/v2)：记录变更、分支与合并、远程协作、调试与恢复。

测试集成依照所选 Boot 的 Testing 章节。旧 JUnit “current”链接会跳转更新版本，因此不把 URL 名称当版本保证。

<a id="middleware"></a>
## Redis、RabbitMQ、搜索：M08

- [Redis 官方文档](https://redis.io/docs/latest/)：数据类型、Key Expiration、Key Eviction、Persistence、Replication；选择与实验版本一致的行为说明。
- [RabbitMQ 官方文档](https://www.rabbitmq.com/docs)：Publisher Confirms / Consumer Acknowledgements → Reliability → Prefetch → Dead Lettering；再读对应队列类型的持久化与故障行为。
- [Elastic 官方文档](https://www.elastic.co/docs)：Elasticsearch 的映射、分词、查询、refresh 和 reindex；先学倒排模型，再做实际索引同步。

<a id="distributed"></a>
## 分布式机制：M09

- 主资料：[Raft 作者资料与论文入口](https://raft.github.io/)，先理解复制状态机、故障模型，再读选主、日志复制和安全性；不以手写完整算法作为必修。
- 理论课程：[MIT 6.5840](https://pdos.csail.mit.edu/6.5840/)，沿讲义和阅读列表学习一致性、复制、容错与事务；实验语言不同不影响概念学习，课程实验不是本路线额外必修。
- 补偿事务：[Saga 模式作者资料](https://microservices.io/patterns/data/saga.html)，比较编排与协同、本地事务和补偿的范围，映射到支付/取消/退款。
- [Debezium Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html)：观察事件标识、聚合与消息路由的设计，理解 outbox 记录与事件的关系。课程先用轮询投递，不要求采用 Debezium 的具体部署栈。
- 可靠投递与故障处理同时参考上方 RabbitMQ Reliability，以及下方 SRE 过载与故障章节。资料中的保证均需按其故障假设解释。

<a id="reliability"></a>
## SRE：M10

主资料：[Google SRE 在线书](https://sre.google/sre-book/table-of-contents/)。定点读第 4 章 SLO、第 6 章监控、第 10 章告警、第 12–15 章排障/事故/复盘、第 21–22 章过载与级联失败，以及可靠性测试章节。

学习原则与方法，具体目标根据练习的用户流程定义，不照抄其他组织的可用性指标。

<a id="operations"></a>
## 部署与观测工具：M10

- [Docker Docs](https://docs.docker.com/)：镜像、容器、网络、卷、Compose、资源与配置。
- [Kubernetes Concepts](https://kubernetes.io/docs/concepts/)：Workloads、Services、Configuration、资源与探针；先读最小部署需要的对象。
- [OpenTelemetry Docs](https://opentelemetry.io/docs/)：信号、上下文传播、采样和 Java 接入；关注高基数、敏感字段与采集成本。

<a id="architecture"></a>
## 业务建模与架构表达：M11

- [DDD Reference（Eric Evans）](https://www.domainlanguage.com/ddd/reference/)：统一语言、实体/值对象、聚合和限界上下文，先映射到 CRM 与交易中的真实概念。
- [Spring Modulith](https://spring.io/projects/spring-modulith/)：模块定义、验证、模块测试与事件，作为检验业务边界的工具。
- [C4 model 作者网站](https://c4model.com/)：系统上下文、容器、组件图；只画能帮助当前评审的层级。
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)：记录背景、决定与后果，配合仓库 ADR 模板使用。

<a id="security"></a>
## 安全：M12/M06

- 主资料：[OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)，先读 Authorization、Input Validation、SQL Injection Prevention、CSRF、SSRF、Logging 与 Password Storage，再按项目入口补充。
- 框架：[Spring Security Reference](https://docs.spring.io/spring-security/reference/)，按实际版本学习 Servlet Security、Authentication、Authorization、CSRF 与测试支持。

资料入口已核对可访问。后续链接迁移时优先从同一项目官方导航寻找替代入口，并更新此页日期与具体版本，不将搜索摘要作为机制依据。
