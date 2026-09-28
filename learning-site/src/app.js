(() => {
  'use strict';
  const docs = window.COURSE.docs;
  const byPath = Object.assign(Object.create(null), Object.fromEntries(docs.map(d => [d.path, d])));
  const modules = docs.filter(d => d.path.startsWith('modules/'));
  const stages = docs.filter(d => d.path.startsWith('practice/stage-'));
  const allUnits = modules.flatMap(d => d.units);
  const unitIds = new Set(allUnits.map(u => u.id));
  const checkIds = new Set(docs.flatMap(d => d.checks.map(c => c.id)));
  const KEY = 'java-learning-atlas-v1';
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const route = (path, section = '') => '#doc=' + encodeURIComponent(path) + (section ? '&section=' + encodeURIComponent(section) : '');
  const moduleInfo = [
    ['语言与核心库', '对象、泛型、集合与现代 Java。把业务规则写进可靠的代码。', 0, '{ }', 'Java / Collections'],
    ['计算机基础与算法', '沿一次请求，理解数据结构、操作系统与网络的协作。', 0, 'O(n)', 'OS / Network'],
    ['并发编程', '从竞态到线程池，回答怎样保证正确、怎样限制资源。', 0, '⇄', 'JMM / Threads'],
    ['JVM 与性能诊断', '用线程、内存与性能证据，把“很慢”变成具体的原因。', 0, '⌁', 'JFR / GC'],
    ['数据库与数据访问', '建模、索引与事务。既保证数据正确，也解释查询成本。', 1, '▤', 'SQL / InnoDB'],
    ['Spring 与 Web 工程', '看清请求、代理与事务的路径，理解注解背后的行为。', 1, '↗', 'Spring / HTTP'],
    ['软件设计与工程质量', '让测试保护修改，让清晰的边界降低变化成本。', 1, '✓', 'Design / Testing'],
    ['缓存、消息与搜索', '理解加速与解耦的收益，也理解它们引入的失败方式。', 2, '≋', 'Redis / RabbitMQ'],
    ['分布式系统', '从部分失败出发，设计幂等、可靠事件与一致性策略。', 2, '⋈', 'Outbox / Saga'],
    ['部署与可靠性', '让系统可交付、可观测、可恢复，并验证服务目标。', 2, '◉', 'SLO / Recovery'],
    ['业务建模与架构设计', '根据业务和团队约束划分边界，留下有依据的取舍。', 2, '⊞', 'DDD / Decisions'],
    ['安全与技术协作', '保护身份与数据边界，让设计被团队理解和验证。', 1, '◇', 'Security / Review']
  ];
  const phaseInfo = [
    ['诊断基础', '用四个小任务定位薄弱环节，先找到自己的出发点。', '四项诊断 · 能力矩阵', '从这里开始'],
    ['业务闭环', '把客户、商机、报价和订单连起来，保护规则与数据。', '10 项任务 · 13 个验收场景', '做正确'],
    ['并发与排障', '加入库存与模拟支付，复现竞争、定位瓶颈、验证优化。', '库存与支付 · 故障诊断', '看透机制'],
    ['故障下运行', '让缓存失效、消息重投和服务重启都能得到明确处理。', '可靠事件 · 观测与恢复', '应对失败'],
    ['架构决策', '比较可行方案，再完成一次有检查点、能回退的迁移。', '方案比较 · 迁移实验', '学会取舍'],
    ['真实迁移', '将方法带回实际工作，用团队反馈和业务结果修正判断。', '真实问题 · 团队反馈', '创造价值']
  ];
  const levels = ['未开始', '学习中', 'L1 · 能解释', 'L2 · 能实现', 'L3 · 能诊断', 'L4 · 能权衡'];
  const fresh = () => ({schema: 1, units: {}, notes: {}, checks: {}, quiz: {}, bookmarks: [], last: ''});
  let state = fresh();
  let storageWarning = false;
  function validateState(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.schema !== 1) throw new Error('备份格式不正确或版本不受支持。');
    const clean = fresh();
    for (const [id, value] of Object.entries(input.units || {})) {
      if (unitIds.has(id) && Number.isInteger(value) && value >= 0 && value <= 5) clean.units[id] = value;
    }
    for (const [path, text] of Object.entries(input.notes || {})) {
      if (byPath[path] && typeof text === 'string' && text.length <= 50000) clean.notes[path] = text;
    }
    for (const [id, checked] of Object.entries(input.checks || {})) {
      if (checkIds.has(id) && checked === true) clean.checks[id] = true;
    }
    for (const [id, answer] of Object.entries(input.quiz || {})) {
      if (/^q(?:[1-9]|1[0-2])$/.test(id) && Number.isInteger(answer) && answer >= 0 && answer < 3) clean.quiz[id] = answer;
    }
    clean.bookmarks = Array.isArray(input.bookmarks) ? [...new Set(input.bookmarks.filter(p => byPath[p]))] : [];
    clean.last = byPath[input.last] ? input.last : '';
    return clean;
  }
  try { const raw = localStorage.getItem(KEY); if (raw) state = validateState(JSON.parse(raw)); }
  catch (_) { storageWarning = true; }
  let toastTimer;
  function toast(message) {
    $('#toast').textContent = message; $('#toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (_) { toast('浏览器暂时无法保存，请及时导出学习记录。'); return false; }
  }
  function stats() {
    const values = allUnits.map(u => state.units[u.id] || 0);
    return {started: values.filter(v => v > 0).length, explained: values.filter(v => v >= 2).length, practiced: values.filter(v => v >= 3).length};
  }
  function updateChrome(active) {
    const s = stats();
    $('#top-progress').textContent = `${s.started} / 71 已开始`;
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === active);
      if (el.dataset.nav === active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    const names = {home:'学习地图',modules:'知识模块',stages:'实战路线',lab:'互动实验室',quiz:'随堂挑战',progress:'学习记录',library:'文档书架',reader:'阅读指南'};
    $('#breadcrumb').innerHTML = `学习工作台 <span>/</span> ${names[active] || '阅读指南'}`;
  }
  function pageHead(eyebrow, title, description, extra = '') {
    return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${extra}</div>`;
  }
  function moduleCard(d, i) {
    const [name, desc, group, symbol, tag] = moduleInfo[i];
    const count = d.units.filter(u => (state.units[u.id] || 0) >= 3).length;
    return `<a class="module-card" data-group="${group}" href="${route(d.path)}"><div class="module-top"><span class="module-id">M${String(i + 1).padStart(2, '0')}</span><span class="module-symbol">${esc(symbol)}</span></div><h3>${name}</h3><p>${desc}</p><div class="module-bottom"><span>${d.units.length} 个单元 · <b>${count} 个能实现</b></span><span class="mono">${tag} ↗</span></div><div class="micro-progress" aria-hidden="true"><span style="width:${count / d.units.length * 100}%"></span></div></a>`;
  }
  function filters() {
    return `<div class="filter-row" aria-label="按知识领域筛选">${['全部模块', '语言与底层', '业务与工程', '系统与架构'].map((t,i) => `<button class="filter-chip ${i===0?'selected':''}" data-filter="${i-1}" aria-pressed="${i===0}">${t}</button>`).join('')}</div>`;
  }
  function renderHome() {
    const s = stats(), last = byPath[state.last];
    const dest = last ? last.path : stages[0].path;
    return pageHead('YOUR LEARNING ATLAS', '从会写业务，到看清系统。', '12 个知识模块，一条实践主线。按理解的深度，走出自己的进阶路径。', '<span class="head-tag">JAVA 21 / 实践驱动</span>') +
      `<div class="intro-grid"><section class="start-card"><div><div class="eyebrow">${last?'CONTINUE YOUR JOURNEY':'START WITH A QUESTION'}</div><h2>${last?'接着上次，向前一步。':'先找到，你的出发点。'}</h2><p>${last?esc(last.title):'一份报价、一条查询、一个并发错误。用四个小任务，找到真正值得补齐的地方。'}</p><a class="btn" href="${route(dest)}">${last?'继续阅读':'开始能力诊断'} <span>↗</span></a></div><div class="start-code">YOUR FIRST STEP<br><b>00</b><br>理解 → 验证 → 复盘</div></section><section class="progress-summary"><div class="summary-top"><div><h3>每一点理解，都算数。</h3><p>按单元自评，记录成长。</p></div><div class="progress-ring" style="--pct:${s.practiced/71*100}%"><span>${Math.round(s.practiced/71*100)}%</span></div></div><div class="summary-stats"><div><strong>${String(s.started).padStart(2,'0')}</strong><small>已开始</small></div><div><strong>${String(s.explained).padStart(2,'0')}</strong><small>能解释</small></div><div><strong>${String(s.practiced).padStart(2,'0')}</strong><small>能实现 / 71</small></div></div></section></div>` +
      `<section><div class="section-head"><h2>你的进阶路线 <small>THE JOURNEY</small></h2><a href="#stages" class="text-link">查看实践任务 <span>↗</span></a></div><div class="phase-track" aria-label="选择学习阶段">${phaseInfo.map((p,i)=>`<button class="phase-node ${i===0?'selected':''}" data-phase="${i}" aria-pressed="${i===0}"><span class="phase-no">0${i}</span><strong>${p[0]}</strong></button>`).join('')}</div><div class="phase-detail" id="phase-detail">${phaseDetail(0)}</div></section>` +
      `<section><div class="section-head"><h2>连接你的知识 <small>12 MODULES</small></h2>${filters()}</div><div class="module-grid">${modules.map(moduleCard).join('')}</div></section>` +
      `<div class="bottom-grid"><a class="lab-teaser" href="#lab"><span class="big-symbol" aria-hidden="true">⇄</span><div><h3>只剩 1 件库存，为什么卖出 2 件？</h3><p>动手推进两个请求，观察竞态发生的那一刻。</p></div><span style="margin-left:auto">↗</span></a><a class="method-strip" href="#quiz"><strong>先想一想，再看答案。 <span>↗</span></strong><p>12 道情景题，把“听懂了”变成“解释得清”。</p></a></div>`;
  }
  function phaseDetail(i) {
    return `<span class="pill">PHASE 0${i} / ${phaseInfo[i][3]}</span><p>${phaseInfo[i][1]}</p><a class="text-link" href="${route(stages[i].path)}">进入阶段 <span>↗</span></a>`;
  }
  function renderModules() {
    return pageHead('EXPLORE THE KNOWLEDGE', '知识模块', '从一个问题进入。把原理、实验和验收连在一起。') + `<div class="section-head">${filters()}<span class="muted" style="font-size:11px">71 个学习单元</span></div><div class="module-grid">${modules.map(moduleCard).join('')}</div>`;
  }
  function renderStages() {
    return pageHead('BUILD SOMETHING REAL', '让知识，在项目里发生。', '客户 → 商机 → 报价 → 订单。让同一个系统，陪你逐步深入。') + `<div class="stage-grid">${stages.map((d,i)=>`<section class="stage-card"><span>0${i}</span><span class="pill" style="position:absolute;right:24px;top:28px">${phaseInfo[i][3]}</span><h2>${phaseInfo[i][0]}</h2><p>${phaseInfo[i][1]}</p><p class="mono" style="font-size:10px">${phaseInfo[i][2]}</p><a class="btn secondary" href="${route(d.path)}">打开任务手册 <span>↗</span></a></section>`).join('')}</div><div class="method-strip" style="margin-top:20px"><strong>先明确“什么不能被破坏”。</strong><p>贯穿所有阶段的 10 条业务不变量，是每一次实现与架构决策的检验标准。</p><a class="text-link" href="${route('practice/README.md')}" style="margin-top:10px">查看业务约定 ↗</a></div>`;
  }
  function renderLibrary() {
    const groups = [['学习导航',docs.filter(d=>!d.path.includes('/'))],['模块指南',modules],['实践手册',docs.filter(d=>d.path.startsWith('practice/'))],['资料与模板',docs.filter(d=>/^(resources|templates)\//.test(d.path))]];
    return pageHead('YOUR READING SHELF', '全部资料，一处阅读。', '原有 27 份资料完整收录；文档之间的引用可直接跳转。') + groups.map(([title, list])=>`<div class="section-head"><h2>${title}<small>${list.length}</small></h2></div><div class="library-list">${list.map(d=>`<a class="library-item" href="${route(d.path)}"><div><strong>${esc(d.title)}</strong><small>${esc(d.path)}</small></div><span>↗</span></a>`).join('')}</div>`).join('');
  }
  function renderUnits(doc) {
    return `<div class="section-head"><h2>把一个知识点，学扎实。<small>${doc.units.length} UNITS</small></h2><span class="muted" style="font-size:11px">点击展开 · 自评进度</span></div><div class="unit-list">${doc.units.map(u=>`<details class="unit-card" id="unit-${u.id}"><summary><span class="pill">${u.id}</span><span class="unit-title">${esc(u.topic)}</span><span class="unit-status" data-status="${u.id}">${levels[state.units[u.id]||0]}</span></summary><div class="unit-body"><dl><dt>前置知识</dt><dd>${esc(u.prereq)}</dd><dt>怎么学习</dt><dd>${esc(u.method)}</dd><dt>怎样验收</dt><dd>${esc(u.criteria)}</dd></dl><div class="level-control"><label for="level-${u.id}">我目前能做到</label><select id="level-${u.id}" data-unit="${u.id}">${levels.map((l,v)=>`<option value="${v}" ${(state.units[u.id]||0)===v?'selected':''}>${l}</option>`).join('')}</select></div></div></details>`).join('')}</div><p class="muted" style="font-size:11px;margin-bottom:20px">自评用于安排下一步；达到阶段标准，还需实验、证据和变式复测。</p>`;
  }
  function renderDoc(doc) {
    state.last = doc.path; save();
    const bookmarked = state.bookmarks.includes(doc.path);
    const toc = doc.toc.filter(h=>h.level===2||h.level===3).map(h=>`<a class="${h.level===3?'toc-sub':''}" href="${route(doc.path,h.id)}">${esc(h.title)}</a>`).join('');
    return `<div class="reader-tools"><a class="text-link" href="${doc.units.length?'#modules':doc.path.startsWith('practice/')?'#stages':'#library'}">← 返回${doc.units.length?'知识模块':doc.path.startsWith('practice/')?'实战路线':'文档书架'}</a><div class="actions"><button class="btn secondary" data-action="bookmark" data-path="${esc(doc.path)}" aria-pressed="${bookmarked}">${bookmarked?'★ 已收藏':'☆ 收藏'}</button><button class="btn secondary" data-action="focus">${document.body.classList.contains('reader-focus')?'退出专注':'专注阅读'}</button><button class="btn secondary" data-action="print">打印 / PDF</button></div></div>${doc.units.length?renderUnits(doc):''}<div class="reader-layout"><div class="reader-main"><article class="reader">${doc.html}</article><section class="reading-note"><label for="document-note">留下一点自己的理解</label><p>记下证据、仍有疑问的地方，或下一次想做的实验。仅保存在当前浏览器，可在学习记录中导出。</p><textarea id="document-note" data-note="${esc(doc.path)}" maxlength="50000" placeholder="我原来以为……现在的证据表明……">${esc(state.notes[doc.path]||'')}</textarea><p id="note-status" role="status" style="margin-bottom:0">${state.notes[doc.path]?'已读取本地手记':'还没有手记'}</p></section></div><aside class="toc" aria-label="本页目录"><p>ON THIS PAGE / 本页目录</p>${toc}<a href="#main">↑ 回到顶部</a></aside></div>`;
  }
  function renderProgress() {
    const s=stats();
    const saved=state.bookmarks.map(p=>byPath[p]);
    return pageHead('SMALL STEPS, REAL PROGRESS', '看见自己的进步。', '进度来自你的自评；读完、答对与真正掌握，是不同的事情。') +
      `<div class="progress-summary" style="margin-bottom:25px"><div class="summary-stats" style="margin:0"><div><strong>${s.started}<small>已开始 / 71</small></strong></div><div><strong>${s.explained}<small>能解释 / 71</small></strong></div><div><strong>${s.practiced}<small>能实现 / 71</small></strong></div></div></div><div class="module-grid">${modules.map(moduleCard).join('')}</div><div class="section-head"><h2>收藏与手记</h2></div><div class="library-list">${[...new Set([...saved.map(d=>d.path),...Object.keys(state.notes).filter(p=>state.notes[p].trim())])].map(p=>`<a class="library-item" href="${route(p)}"><div><strong>${esc(byPath[p].title)}</strong><small>${state.bookmarks.includes(p)?'已收藏 · ':''}${state.notes[p]?'有学习手记':'继续阅读'}</small></div><span>↗</span></a>`).join('')||'<div class="empty-state"><h3>给理解留一个位置。</h3><p>阅读时收藏资料、写下手记，它们会出现在这里。</p></div>'}</div><section class="reading-note"><h3>你的记录，由你保管。</h3><p style="margin:8px 0 15px">单元自评、检查项、挑战答题、收藏和手记存于当前浏览器；不会修改 Markdown 文档。更换浏览器、文件位置或清理浏览器数据可能使记录不可用，建议定期导出。导入会替换当前记录。</p><div class="actions"><button class="btn" data-action="export">导出学习记录 ↓</button><label class="btn secondary" for="import-progress" style="margin:0;cursor:pointer;font-size:12px">导入备份 ↑</label><input id="import-progress" type="file" accept="application/json,.json" class="sr-only"><button class="btn secondary" data-action="reset">清空本地记录</button></div></section>`;
  }
  const questions = [
    {id:'q1',module:0,title:'报价发布后，为什么价格还被改了？',prompt:'你把一份可变明细列表放进 record 报价对象，之后修改了列表里的明细。哪种判断正确？',options:['record 自动保证所有内部对象深度不可变','record 的字段引用不可重新赋值，内部对象仍可能可变','只要列表字段是 final，就不会改变历史报价'],answer:1,explanation:'record 提供的是浅不可变性。需要同时考虑列表本身与元素的可变性；历史报价应保存不可变值或完整的防御性快照。',unit:'M01-4'},
    {id:'q2',module:1,title:'请求很慢，但 CPU 很闲。',prompt:'报价接口耗时升高，应用 CPU 占用却很低。下一步最有价值的动作是什么？',options:['立即换更快的 CPU','直接增加应用线程到原来的十倍','观察线程等待、连接池、慢查询与下游耗时，区分假设'],answer:2,explanation:'延迟可能来自等待锁、连接、磁盘或网络。低 CPU 本身不能确定根因，先用证据定位等待发生在哪里。',unit:'M02-3'},
    {id:'q3',module:2,title:'volatile 能保护这件库存吗？',prompt:'两个线程都执行“如果库存 > 0，就库存减 1”。把库存声明为 volatile，足够了吗？',options:['不够，检查和扣减组成的复合操作仍需原子边界','足够，因为读取总能看到新值','足够，只要每次扣减前 sleep 一下'],answer:0,explanation:'可见性不等于复合操作原子性。两个请求仍可能在扣减前读到同一余量；单进程可用合适同步，多实例应把边界落在数据库等共享资源处。',unit:'M03-1'},
    {id:'q4',module:3,title:'内存一直涨，就一定是泄漏？',prompt:'你观察到进程 RSS 上升，但还没有堆转储或分配数据。现在能得出什么结论？',options:['已经证明有 Java 堆泄漏','需要区分存活集、堆外内存与泄漏，并补充证据','先强制 GC，恢复不了就重写服务'],answer:1,explanation:'RSS 不等于 Java 堆。缓存增长、直接内存、线程栈等也会改变进程内存；需要看趋势、对象保留链和运行时分区。',unit:'M04-2'},
    {id:'q5',module:4,title:'客户成交额为什么翻倍了？',prompt:'一笔 60 元订单有两行明细。订单表 JOIN 明细后直接 SUM(订单总额)，可能发生什么？',options:['总额仍然是 60 元，因为数据库自动去重','索引会消除重复金额','同一订单被重复计算，可能得到 120 元'],answer:2,explanation:'JOIN 产生的行与业务统计粒度可能不同。应在正确粒度聚合，或先汇总明细；SUM(DISTINCT 金额) 也不能通用修复，因为不同订单金额可能相同。',unit:'M05-1'},
    {id:'q6',module:5,title:'方法上有事务注解，为什么没回滚？',prompt:'默认代理式事务下，同一个对象内部直接调用另一个带 @Transactional 的方法。首先检查什么？',options:['调用是否经过代理，以及实际生效的事务边界','注解字体或方法名是否规范','增加三次重试就能保证回滚'],answer:0,explanation:'默认代理机制只能处理经过代理的调用。自调用通常绕过该代理入口；还应核对已有事务、传播和回滚规则，再用数据库结果验证。',unit:'M06-2'},
    {id:'q7',module:6,title:'全量 mock 的测试能证明事务正确吗？',prompt:'仓储层全部被 mock，服务测试通过。你能据此确认真实数据库的多表回滚吗？',options:['能，因为业务代码已执行过','不能，还需经过真实数据库提交与失败边界的集成验证','只要覆盖率达到 100% 就可以'],answer:1,explanation:'mock 可验证部分应用行为，但不能证明真实连接、数据库约束和事务配置。测试应选择与风险相匹配的层级。',unit:'M07-3'},
    {id:'q8',module:7,title:'消息确认丢了，成交额会重复吗？',prompt:'消费者已提交 CRM 统计，但在确认消息前退出。重启后消息再次送达，正确设计应怎样处理？',options:['直接丢掉所有重投消息','再次加上成交额，然后人工对账','用同一事务内的去重与业务更新，让重投不重复生效'],answer:2,explanation:'提交与确认之间存在故障窗口。至少一次投递可能重投；持久化去重与业务更新需要同一原子边界，避免漏处理或重复处理。',unit:'M08-4'},
    {id:'q9',module:8,title:'支付请求超时，等于没有支付吗？',prompt:'模拟支付渠道已扣款，但响应在网络中丢失。调用方超时后应如何理解结果？',options:['结果未知，需要按业务号查询、幂等重试或对账','一定失败，可以换新业务号再次扣款','一定成功，不必查询'],answer:0,explanation:'超时是调用方观察到的通信结果，不是远端业务状态。重试要保留稳定业务标识，并有查询、对账和补偿机制。',unit:'M09-1'},
    {id:'q10',module:9,title:'备份文件已经有了，恢复能力就有了？',prompt:'你成功生成了数据库备份。还缺哪项关键证据？',options:['备份文件名足够长','在独立实例恢复，校验数据，并记录实际恢复时间与丢失窗口','截图证明文件存在即可'],answer:1,explanation:'可恢复性要用恢复演练证明。RTO 关注恢复所需时间，RPO 关注可接受的数据丢失窗口；两者都需要目标和实际观测。',unit:'M10-5'},
    {id:'q11',module:10,title:'CRM 报表变慢，要马上拆服务吗？',prompt:'报表查询影响下单，但还没测量瓶颈。什么是更好的架构下一步？',options:['立即拆成十个微服务','先部署 Kubernetes，再讨论需求','测量基线，比较索引优化、异步读模型与拆服务的成本收益'],answer:2,explanation:'架构决策需要业务约束和测量。不同方案解决不同问题；团队协作、部署、数据一致性和迁移成本也属于决策的一部分。',unit:'M11-5'},
    {id:'q12',module:11,title:'请求里加 tenantId 就算租户隔离？',prompt:'客户端可自由传 tenantId，后端直接用它过滤数据。问题在哪里？',options:['租户必须绑定可信身份，并贯穿所有数据通道校验','只需要把前端输入框隐藏','tenantId 足够长就不会被猜到'],answer:0,explanation:'不可信请求参数不能决定授权范围。数据库、缓存、搜索、消息和导出都要保持租户边界；隐藏前端控件不是安全控制。',unit:'M12-2'}
  ];
  let quizIndex = 0;
  let labType = 'race';
  let labSafe = false;
  let labStep = 0;
  let outboxFault = 'publish';
  let deduplicate = true;
  function renderLab() {
    return pageHead('MAKE THE INVISIBLE VISIBLE', '把机制，亲手走一遍。', '先预测结果，再推进事件。观察同一段逻辑，在不同顺序下会发生什么。') +
      `<div class="experiment-tabs" role="group" aria-label="选择互动实验"><button data-lab-tab="race" class="${labType==='race'?'selected':''}" aria-pressed="${labType==='race'}">01 / 库存竞态</button><button data-lab-tab="outbox" class="${labType==='outbox'?'selected':''}" aria-pressed="${labType==='outbox'}">02 / 可靠消息</button></div><div class="lab-layout"><section class="experiment"><div class="experiment-head"><div class="eyebrow">${labType==='race'?'CONCURRENCY / INTERLEAVING':'DISTRIBUTED / FAILURE WINDOW'}</div><h2>${labType==='race'?'1 件库存，2 个请求。':'消息重复，业务不必重复。'}</h2><p>${labType==='race'?'把“读库存”和“写库存”分开，看看重复出售发生在哪里。':'订单与 outbox 同事务写入，消费者在数据库里去重。沿故障窗口检查结果。'}</p></div>${labType==='race'?`<div class="mode-switch" role="group" aria-label="选择库存方案"><button data-race-mode="unsafe" class="${!labSafe?'selected':''}" aria-pressed="${!labSafe}">先检查，再写入</button><button data-race-mode="safe" class="${labSafe?'selected':''}" aria-pressed="${labSafe}">数据库原子条件更新</button></div>`:`<div class="outbox-controls"><label>在什么时刻故障？<select id="outbox-fault"><option value="publish" ${outboxFault==='publish'?'selected':''}>提交后，发布前</option><option value="mark" ${outboxFault==='mark'?'selected':''}>发布确认后，标记前</option><option value="ack" ${outboxFault==='ack'?'selected':''}>消费者提交后，确认前</option></select></label><label class="toggle-label"><input id="deduplicate" type="checkbox" ${deduplicate?'checked':''}>消费者去重与更新同事务</label></div>`}<div id="lab-stage">${labStage()}</div><div class="lab-controls"><span class="mono" id="lab-step-count">STEP ${labStep} / ${labLimit()}</span><div class="actions"><button class="btn secondary" data-lab-action="reset">重新开始</button><button class="btn" data-lab-action="next" ${labStep>=labLimit()?'disabled':''}>下一步 →</button></div></div></section><aside class="lab-guide"><span class="pill">思考提示</span><h3>${labType==='race'?'余量没有变成负数，就一定没超卖？':'确认成功，确认的究竟是什么？'}</h3><p>${labType==='race'?'同时关注“数据库余量”和“成功卖出数”。两个请求各拿着旧快照，可能都成功写入 0，却卖出了 2 件。':'区分业务提交、broker 接受、消费者提交和消息确认。它们之间的任一间隙，都可能发生故障。'}</p><details class="answer-card"><summary>看完演示后，再想一步</summary><p>${labType==='race'?'如果服务变成两个实例，本地 synchronized 还能保护同一份库存吗？原子边界应放在共同访问的资源处。':'如果先提交去重记录，再单独更新统计，中途退出会不会漏处理？两个动作必须共享正确的事务边界。'}</p></details><a class="text-link" href="${route(modules[labType==='race'?2:8].path)}">回到模块，继续实验 ↗</a><div class="lab-disclaimer">这是固定时序的教学模型，不运行真实线程、数据库或消息队列。请按实践手册在真实组件上复现。</div></aside></div>`;
  }
  function labLimit(){return labType==='race'?(labSafe?2:4):4;}
  function labStage(){
    if(labType==='outbox')return outboxStage();
    const step=labStep;
    const stock=labSafe?(step>=1?0:1):(step>=3?0:1);
    const sold=labSafe?(step>=1?1:0):(step>=3?step-2:0);
    const a=labSafe?(step>=1?'条件满足，原子扣减成功':'等待提交条件更新'):(step===0?'等待读取':step<3?'已读到 1，准备写入':'按旧值 1 写入 0，成功');
    const b=labSafe?(step>=2?'条件不满足，影响 0 行，拒绝':'等待提交条件更新'):(step<2?'等待读取':step<4?'已读到 1，准备写入':'也按旧值 1 写入 0，成功');
    const messages=labSafe?['先预测：两个请求会成功几个？把检查和扣减放入数据库同一条原子更新。','A 的条件更新匹配一行并扣减成功。库存从 1 变成 0。','B 的条件更新不匹配，影响 0 行。只有 A 成功，库存和成功数保持一致。']:['初始库存为 1。两个请求准备执行“读取 → 判断 → 写回”。','A 读到 1。它还没有写回；另一个请求仍能读到同样的值。','B 也读到 1。现在两个请求都认为自己可以购买。','A 根据自己读到的 1，写回 0，并向调用方返回成功。','B 也根据旧值 1，写回 0，并返回成功。余量仍是 0，但成功卖出 2 件：超卖了。'];
    return `<div class="race-diagram"><div class="request-box ${(labSafe?step===1:step===1||step===3)?'active':''}"><span class="request-label">REQUEST A</span><h3>请求 A</h3><p>${a}</p></div><div class="stock-box"><span>共享库存</span><strong>${stock}</strong><small>初始 1 件</small></div><div class="request-box ${(labSafe?step===2:step===2||step===4)?'active':''}"><span class="request-label">REQUEST B</span><h3>请求 B</h3><p>${b}</p></div></div><div class="lab-metrics"><div><span>剩余库存</span><strong>${stock}</strong></div><div><span>成功卖出</span><strong class="${sold>1?'bad-text':''}">${sold}</strong></div><div><span>业务不变量</span><strong class="${sold>1?'bad-text':''}">${sold>1?'已破坏':step===labLimit()?'通过':'观察中'}</strong></div></div><div class="lab-event ${sold>1?'warning':''}" role="status" aria-live="polite"><b>${step===0?'先想一想':`第 ${step} 步`}</b><p>${messages[step]}</p></div><pre class="experiment-code"><code>${labSafe?'UPDATE inventory\nSET available = available - 1\nWHERE sku = ? AND available > 0;\n// 以受影响行数判断是否成功': 'int seen = readStock();\nif (seen > 0) {\n    writeStock(seen - 1);\n    return SUCCESS;\n}'}</code></pre>`;
  }
  function outboxStage(){
    const step=labStep, duplicate=outboxFault!=='publish';
    const committed=step>=1;
    const sent=step>=3?(duplicate?2:1):step>=2&&duplicate?1:0;
    const effects=step>=4?(duplicate&&!deduplicate?2:1):step>=2&&outboxFault==='ack'?1:0;
    const explanations={publish:['本地事务还未提交。预测：提交后立刻退出，事件会丢吗？','订单和 outbox 一起提交。即使尚未发布，事件记录已经持久存在。','发布前进程退出。订单仍然有效，outbox 也仍然待投递。','投递器重启，从 outbox 重新读取并发送事件。','消费者处理并提交业务变化，随后确认消息。业务效果出现一次。'],mark:['预测：broker 已接受事件，但发送标记没写入，会发生什么？','订单和 outbox 一起提交。事件现在可以被投递。','broker 接受了一次事件，投递器在标记已发送前退出。','重启后 outbox 仍显示待发送，投递器再发一次；同一事件出现两次投递。',deduplicate?'消费者持久化去重与业务更新同事务，第二次事件不重复增加成交额。':'没有业务去重，两次投递各增加一次成交额。Outbox 解决漏发，不能代替消费者幂等。'],ack:['预测：CRM 已提交，但消息确认还没发出，重启后怎样？','订单和 outbox 一起提交。事件投递给消费者。','消费者已提交一次 CRM 更新，但在确认消息前退出。','消息没有被确认，broker 再次投递同一事件。',deduplicate?'去重记录与第一次 CRM 更新同事务提交，重投时可识别，业务效果仍为一次。':'没有持久化去重，重投再次更新 CRM，业务效果变成两次。']};
    return `<div class="delivery-flow"><div class="${committed?'done':''}"><b>01</b><strong>订单</strong><small>${committed?'已提交':'待提交'}</small></div><span>→</span><div class="${committed?'done':''}"><b>02</b><strong>Outbox</strong><small>${committed?'记录已持久化':'同事务写入'}</small></div><span>→</span><div class="${sent?'done':''}"><b>03</b><strong>消息投递</strong><small>${sent} 次</small></div><span>→</span><div class="${effects?'done':''}"><b>04</b><strong>CRM 更新</strong><small>${effects} 次生效</small></div></div><div class="lab-metrics"><div><span>订单事实</span><strong>${committed?1:0}</strong></div><div><span>消息投递</span><strong>${sent}</strong></div><div><span>业务效果</span><strong class="${effects>1?'bad-text':''}">${effects}</strong></div></div><div class="lab-event ${effects>1?'warning':''}" role="status" aria-live="polite"><b>${step===0?'先想一想':`第 ${step} 步`}</b><p>${explanations[outboxFault][step]}</p></div><div class="outbox-rule"><strong>两个原子边界</strong><p>生产端：业务事实 + Outbox。<br>消费端：去重记录 + 业务更新。提交后再确认消息。</p></div>`;
  }
  function updateLab(){
    $('#lab-stage').innerHTML=labStage();$('#lab-step-count').textContent=`STEP ${labStep} / ${labLimit()}`;
    $('[data-lab-action="next"]').disabled=labStep>=labLimit();
  }
  function renderQuiz() {
    const q=questions[quizIndex];
    const chosen=state.quiz[q.id];
    const answered=Number.isInteger(chosen);
    const correct=questions.filter(x=>state.quiz[x.id]===x.answer).length;
    return pageHead('THINK BEFORE YOU REVEAL','先判断，再找到依据。','12 个真实情景，检查你能否把原理迁移到业务。答题不计入掌握进度。')+
      `<div class="quiz-layout"><section class="quiz-card"><div class="quiz-meta"><span class="pill">${q.unit} / ${moduleInfo[q.module][0]}</span><span class="mono">${String(quizIndex+1).padStart(2,'0')} / 12</span></div><h2>${q.title}</h2><p class="quiz-prompt">${q.prompt}</p><div class="quiz-options" role="group" aria-label="选择一个答案">${q.options.map((option,i)=>`<button data-answer="${i}" class="quiz-option ${answered&&i===q.answer?'correct':''} ${answered&&i===chosen&&chosen!==q.answer?'incorrect':''}" ${answered?'disabled':''}><span>${String.fromCharCode(65+i)}</span><p>${option}</p>${answered&&i===q.answer?'<b>✓</b>':answered&&i===chosen?'<b>×</b>':''}</button>`).join('')}</div><div id="quiz-feedback" class="quiz-feedback ${answered?(chosen===q.answer?'good':'review'):''}" role="status" aria-live="polite">${answered?`<strong>${chosen===q.answer?'判断正确。再试着解释为什么。':'这个问题值得再想一步。'}</strong><p>${q.explanation}</p><a class="text-link" href="${route(modules[q.module].path)}">回到 ${q.unit} 深入学习 ↗</a>`:'选择之后会显示判断依据。先不要查资料，试着说出自己的理由。'}</div><div class="quiz-controls"><button class="btn secondary" data-quiz-action="prev" ${quizIndex===0?'disabled':''}>← 上一题</button>${answered?'<button class="text-link" data-quiz-action="retry">重新思考这道题</button>':''}<button class="btn" data-quiz-action="next" ${quizIndex===11?'disabled':''}>下一题 →</button></div></section><aside class="quiz-aside"><div class="eyebrow">YOUR CHECKPOINTS</div><h3>理解，逐点连接。</h3><div class="question-dots">${questions.map((x,i)=>`<button data-question="${i}" class="${i===quizIndex?'current':''} ${state.quiz[x.id]===x.answer?'passed':Number.isInteger(state.quiz[x.id])?'review':''}" aria-label="第 ${i+1} 题：${x.title}" ${i===quizIndex?'aria-current="step"':''}>${String(i+1).padStart(2,'0')}</button>`).join('')}</div><p class="quiz-score"><strong>${correct}</strong> / 12 当前答对</p><p class="muted" style="font-size:11px">正确答案只是一小步。回到实验，用证据证明自己的理解。</p><a class="text-link" href="${route(modules[q.module].path,modules[q.module].toc.find(h=>h.title==='自测与模块验收').id)}" style="margin-top:20px">继续本模块的开放题 ↗</a></aside></div>`;
  }
  let currentDoc = null;
  function closeMenu() { document.body.classList.remove('nav-open'); $('#menu-button').setAttribute('aria-expanded','false'); $('#nav-scrim').hidden=true; }
  function navigate() {
    const hash=location.hash.slice(1)||'home';
    // #main is a skip link, not an application route.
    if(hash==='main'){ $('#main').focus(); window.scrollTo({top:0}); return; }
    currentDoc=null;
    let content, active;
    if(hash.startsWith('doc=')){
      const params=new URLSearchParams(hash); const path=params.get('doc');
      currentDoc=byPath[path]; active=currentDoc?.units.length?'modules':path?.startsWith('practice/')?'stages':'reader';
      content=currentDoc?renderDoc(currentDoc):`<div class="empty-state"><h1>没有找到这份资料</h1><p>入口可能已变更，可以回到全部文档继续查找。</p><a href="#library" class="btn" style="margin-top:20px">打开文档书架</a></div>`;
    }else{
      document.body.classList.remove('reader-focus');
      const pages={home:renderHome,modules:renderModules,stages:renderStages,library:renderLibrary,progress:renderProgress,lab:renderLab,quiz:renderQuiz};
      active=pages[hash]?hash:'home'; content=pages[active]();
    }
    $('#main').innerHTML=content; updateChrome(active); closeMenu();
    document.title=(currentDoc?currentDoc.title:$('#main h1')?.textContent||'学习地图')+' · Java 进阶图谱';
    document.querySelectorAll('[data-check]').forEach(el=>{el.checked=!!state.checks[el.dataset.check];});
    $('#main').focus({preventScroll:true});
    const section=new URLSearchParams(hash).get('section');
    if(section && document.getElementById(section)) document.getElementById(section).scrollIntoView({behavior:'instant',block:'start'});
    else window.scrollTo({top:0,behavior:'instant'});
  }
  function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  document.addEventListener('click',event=>{
    const labTab=event.target.closest('[data-lab-tab]');
    if(labTab){labType=labTab.dataset.labTab;labStep=0;$('#main').innerHTML=renderLab();$(`[data-lab-tab="${labType}"]`).focus();return;}
    const mode=event.target.closest('[data-race-mode]');
    if(mode){labSafe=mode.dataset.raceMode==='safe';labStep=0;$('#main').innerHTML=renderLab();$(`[data-race-mode="${labSafe?'safe':'unsafe'}"]`).focus();return;}
    const labAction=event.target.closest('[data-lab-action]');
    if(labAction){labStep=labAction.dataset.labAction==='reset'?0:Math.min(labStep+1,labLimit());updateLab();return;}
    const answer=event.target.closest('[data-answer]');
    if(answer){const q=questions[quizIndex];if(!Number.isInteger(state.quiz[q.id])){state.quiz[q.id]=Number(answer.dataset.answer);save();$('#main').innerHTML=renderQuiz();$('#quiz-feedback').setAttribute('tabindex','-1');$('#quiz-feedback').focus({preventScroll:true});}return;}
    const question=event.target.closest('[data-question]');
    const quizAction=event.target.closest('[data-quiz-action]');
    if(question||quizAction){if(question)quizIndex=Number(question.dataset.question);else if(quizAction.dataset.quizAction==='retry'){delete state.quiz[questions[quizIndex].id];save();}else quizIndex=Math.max(0,Math.min(11,quizIndex+(quizAction.dataset.quizAction==='next'?1:-1)));$('#main').innerHTML=renderQuiz();$('.quiz-card h2').setAttribute('tabindex','-1');$('.quiz-card h2').focus({preventScroll:true});return;}
    const filter=event.target.closest('[data-filter]');
    if(filter){document.querySelectorAll('[data-filter]').forEach(el=>{const on=el===filter;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on));});document.querySelectorAll('.module-card').forEach(el=>{el.hidden=filter.dataset.filter!=='-1'&&el.dataset.group!==filter.dataset.filter;});}
    const phase=event.target.closest('[data-phase]');
    if(phase){document.querySelectorAll('[data-phase]').forEach(el=>{const on=el===phase;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on));});$('#phase-detail').innerHTML=phaseDetail(Number(phase.dataset.phase));}
    const action=event.target.closest('[data-action]');
    if(!action)return;
    switch(action.dataset.action){
      case 'focus': document.body.classList.toggle('reader-focus');action.textContent=document.body.classList.contains('reader-focus')?'退出专注':'专注阅读';break;
      case 'print': window.print();break;
      case 'bookmark': {const path=action.dataset.path;const found=state.bookmarks.includes(path);state.bookmarks=found?state.bookmarks.filter(p=>p!==path):[...state.bookmarks,path];save();action.textContent=found?'☆ 收藏':'★ 已收藏';action.setAttribute('aria-pressed',String(!found));break;}
      case 'export': download('java-learning-progress.json',JSON.stringify(state,null,2),'application/json');toast('已导出学习记录，请妥善保存。');break;
      case 'reset': if(confirm('确定清空当前浏览器里的自评、手记、收藏与答题记录吗？建议先导出备份。原始学习文档不受影响。')){state=fresh();save();navigate();toast('本地记录已清空。');}break;
    }
  });
  document.addEventListener('change',async event=>{
    const el=event.target;
    if(el.id==='outbox-fault'){outboxFault=el.value;labStep=0;updateLab();}
    if(el.id==='deduplicate'){deduplicate=el.checked;labStep=0;updateLab();}
    if(el.matches('[data-unit]')){state.units[el.dataset.unit]=Number(el.value);save();const status=document.querySelector(`[data-status="${el.dataset.unit}"]`);if(status)status.textContent=levels[Number(el.value)];updateChrome('modules');}
    if(el.matches('[data-check]')){if(el.checked)state.checks[el.dataset.check]=true;else delete state.checks[el.dataset.check];save();}
    if(el.id==='import-progress'&&el.files[0]){
      try{if(el.files[0].size>3000000)throw new Error('文件过大，请选择本页面导出的 JSON 备份。');const imported=validateState(JSON.parse(await el.files[0].text()));if(confirm('导入将替换当前浏览器里的学习记录。确定继续吗？')){state=imported;save();navigate();toast('学习记录已导入。');}}
      catch(error){toast(error.message||'无法读取备份，请检查文件。');}
      el.value='';
    }
  });
  document.addEventListener('input',event=>{const el=event.target;if(el.matches('[data-note]')){state.notes[el.dataset.note]=el.value;$('#note-status').textContent=save()?'已保存到当前浏览器':'未能持久保存，请导出备份';}});
  const dialog=$('#search-dialog');
  function openSearch(){if(!dialog.open)dialog.showModal();$('#search-input').focus();search($('#search-input').value);}
  function highlight(text,query){const idx=text.toLowerCase().indexOf(query.toLowerCase());if(idx<0)return esc(text);return esc(text.slice(0,idx))+'<mark>'+esc(text.slice(idx,idx+query.length))+'</mark>'+esc(text.slice(idx+query.length));}
  function search(value){
    const q=value.trim();
    if(!q){$('#search-count').textContent='搜索 27 份学习文档，支持中文与单元编号。';$('#search-results').innerHTML='<div class="empty-state"><h3>你想弄懂哪个问题？</h3><p>例如：事务、库存、JVM、Outbox、M03。</p></div>';return;}
    const matches=docs.map(doc=>({doc,index:doc.text.toLowerCase().indexOf(q.toLowerCase())})).filter(x=>x.index>=0).sort((a,b)=>Number(b.doc.title.toLowerCase().includes(q.toLowerCase()))-Number(a.doc.title.toLowerCase().includes(q.toLowerCase())));
    $('#search-count').textContent=`找到 ${matches.length} 份相关资料`;
    $('#search-results').innerHTML=matches.map(({doc,index})=>{const excerpt=doc.text.slice(Math.max(0,index-38),index+110).replace(/[\n|#]/g,' ');return `<a class="search-result" href="${route(doc.path)}"><strong>${highlight(doc.title,q)}</strong><p>${highlight(excerpt,q)}…</p></a>`;}).join('')||'<div class="empty-state"><h3>暂时没有匹配的内容</h3><p>试着换一个更短的关键词，或输入模块编号。</p></div>';
  }
  $('#search-trigger').addEventListener('click',openSearch);
  $('#search-close').addEventListener('click',()=>dialog.close());
  $('#search-input').addEventListener('input',e=>search(e.target.value));
  $('#search-results').addEventListener('click',e=>{if(e.target.closest('a'))dialog.close();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  $('#menu-button').addEventListener('click',()=>{const on=document.body.classList.toggle('nav-open');$('#menu-button').setAttribute('aria-expanded',String(on));$('#nav-scrim').hidden=!on;});
  $('#nav-scrim').addEventListener('click',closeMenu);
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){e.preventDefault();openSearch();}if(e.key==='Escape')closeMenu();});
  window.addEventListener('hashchange',navigate);
  navigate();
  if(storageWarning)toast('未能读取原有本地记录；可以在学习记录中导入备份。');
})();
