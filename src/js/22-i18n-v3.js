/* =====================================================================
   v3 — interface text for the new navigation, data hub, appearance, guide and assistant
   ===================================================================== */
Object.assign(I18N.en, {
  ss_tabbar:'Tab bar', ss_badges:'Badges', tb_desc:'Choose what sits in the bar at the bottom of the screen. Drag the handle to reorder.', tb_enabled:'In the tab bar', tb_disabled:'Not in the tab bar', tb_max:'Max number of tabs', tb_over:'Tabs over the limit, and everything you turn off, stay in the ☰ menu. Settings and your profile are always there.', tb_reset:'Restore default', tb_in_more:'in menu', tb_remove:'Remove from the bar', tb_add:'Add to the bar', tb_reorder:'Reorder (drag, or use the arrow keys)', tb_none:'Everything is in the bar.', tb_min:'Keep at least one tab in the bar.',
  bs_desc:'Pick how every badge looks, or give any badge your own picture. Tap a badge on your profile to see its page and share it.', bs_style:'Default look', bs_upload:'Picture', bs_custom:'Your picture', bs_default:'Default', bp_share:'Share this badge', bp_earned:'Earned', bp_locked:'Earn it to share it.', nav_assist_label:'Assistant', nav_ask:'Ask AI', nav_data:'Import & export', nav_guide:'Guide', nav_lib_label:'Library', nav_data_label:'Data',
  me_guest:'Your name', hub_share:'Share', hub_reset:'Reset',
  ex_backup:'Backup of everything', ex_restore_t:'Restore a backup', ex_restore_d:'Bring a backup file (JSON) back into this browser.', ex_restore_b:'Go to Import',
  export_desc:'Take your library out as a page, a spreadsheet or a full backup. Files use the language chosen in Settings.',
  share_title:'Share', share_desc:'Turn what you have collected into a card or page you can send to someone.',
  sh_profile_t:'My profile card', sh_profile_d:'Your name, level and favourite things on one shareable card.',
  sh_ins_t:'Insights report', sh_ins_d:'A designed summary of a day, month or year of watching.',
  sh_badges_t:'Badges', sh_badges_d:'Show off the badges you have earned.',
  ask_title:'Ask AI', ask_desc:'Ask in plain words: what to watch tonight, how your year went, or add something to your library.',
  ask_clear:'New chat', ask_how:'How it works', ask_ph:'Ask anything about your library…', ask_send:'Send',
  ask_can:'Things you can say', ask_privacy:'Your privacy', ask_settings:'AI settings',
  ask_priv_local:'On-device mode: nothing leaves this browser. Answers come from rules that read your own library.',
  ask_priv_claude:'Claude mode: each open question sends a compact summary of your library (titles, status, ratings) to Anthropic with your own key. Nothing is stored by this app anywhere else.',
  ask_mode_local:'On-device · private', ask_mode_claude:'Claude · your key',
  a_hello:'Hi{name}! I can pick what to watch, count and search your library, and add or finish items for you.', a_hello2:'Try one of the ideas below, or just type.',
  a_rec:'From your want-to list{why}, I would start with:', a_rec_none:'Your want-to list is empty. Add a few things first and I will choose from them.', a_rec_loose:'Nothing in your list fits that exactly, so here are the closest options:',
  a_doing:'You are in the middle of {n}:', a_doing_none:'You are not in the middle of anything. Ask “what should I watch” and I will pick something.',
  a_stats:'You have {total} items: {want} to go, {doing} in progress, {done} done, {dropped} dropped.\nFinished this year: {y} · this month: {m}.', a_avg:'Average rating {avg} across {n} rated items.', a_time:'Time spent on finished items: {h} h.',
  a_top:'Your highest rated:', a_top_none:'Nothing is rated yet. Give a few things stars and ask again.',
  a_unrated:'{n} finished item(s) have no rating:', a_unrated_none:'Every finished item already has a rating.',
  a_old:'Waiting the longest on your list:', a_find:'{n} match(es):', a_find_none:'No matches. Try a title, a person or a genre.',
  a_add_ask:'I will add this to your library. Is that right?', a_added:'Added “{t}”.', a_btn_add:'Add', a_btn_done:'Mark done', a_btn_start:'Start', a_btn_open:'Open', a_btn_cancel:'Not now',
  a_fin_ask:'Mark “{t}” as finished{r}?', a_fin_nf:'I could not find “{t}” in your library. Add it as finished?', a_finished:'Marked “{t}” as finished.', a_dup:'“{t}” is already in your library.', a_started:'Started “{t}”.',
  a_unknown:'I am not sure what you mean yet. I can recommend, count, search, add and finish items. For open-ended questions, turn on Claude in Settings → AI.',
  a_think:'Thinking…', a_err:'Claude could not answer: {e}', 
  a_c1:'What should I watch tonight?', a_c2:'Something under 100 minutes', a_c3:'How many did I finish this year?', a_c4:'Show my top rated', a_c5:'What is in progress?', a_c6:'Add Spirited Away 2001 anime', a_c7:'Which films have I not rated?', a_c8:'Which genres do I lean toward?', a_c9:'Suggest 3 things based on my favourites',
  fill_btn:'Fill with AI', fill_need:'Turn on Claude in Settings → AI to fill details automatically.', fill_busy:'Looking it up…', fill_ok:'Filled {n} empty field(s). Please check them.', fill_none:'Nothing new to fill in.', fill_title:'Type a title first.',
  guide_title:'Guide', guide_desc:'What it is, how to set it up, what it can look like, and answers to common questions.', guide_tour:'Replay welcome tour', guide_sample:'Add sample items', guide_unsample:'Remove sample items', guide_sample_ok:'Added {n} sample items.', guide_unsample_ok:'Removed {n} sample items.',
  g_ai:'The AI assistant', g_faq:'Questions',
  
  
  
  
  
  
  
  g_ai_l:'The assistant takes plain sentences. By default it runs on your device. It can also ask Claude, if you want that, for open questions.',
  g_ai_local:'On-device (default)', g_ai_local_p:'Rules running inside this page. Free, quick, private. No connection needed.', g_ai_local_l:['Pick something to watch from your want-to list', 'Count items by status, year or month', 'Find items by title, person, genre or type', 'Add an item or mark one finished — always after you confirm'],
  g_ai_cl:'Claude (optional)', g_ai_cl_p:'Bring your own Anthropic API key. It answers open questions and fills in the details when you add a title.', g_ai_cl_l:['Free-form questions about your taste and library', 'Fill with AI: year, creator, cast, genres and a summary', 'Your key stays in this browser and goes only to api.anthropic.com', 'You pay Anthropic yourself, usually a fraction of a cent a question'],
  
  
  
  
  
  
  
  wl_skip:'Skip', wl_next:'Next', wl_back:'Back',
  wl0_t:'Welcome to Media Tracker', wl0_p:'One calm place for everything you watch, read and play. First, what should I call you?', wl_lang:'Language',
  
  
  wl3_t:'Meet your assistant', wl3_p:'Ask in plain words. Pick how smart and how private you want it to be.', wl3_a:'On-device', wl3_ad:'Private and instant. Picks, counts, search, add and finish.', wl3_b:'Claude (your own key)', wl3_bd:'Also answers open questions and fills in details. Set it up later in Settings → AI.',
  wl_acc_t:'Files & media access', wl_acc_f:'Choose a backup or list', wl_acc_fd:'Open a JSON/CSV exported earlier.', wl_acc_n:'Your phone shows its own file picker each time; you can skip this and do it later from Files or Import.',
  
  wl4_t:'You are all set', wl4_a:'Add sample items', 
  ss_general:'General', ss_plugins:'Plug-ins & checks', ss_appearance:'Appearance', ss_features:'Switches', ss_ai:'AI',   sg_name_ph:'What should we call you?',   set_start:'Open on', sg_look:'Theme & layout', sg_fonts:'Fonts', set_size:'Text size', size_s:'Small', size_m:'Default', size_l:'Large', size_xl:'Extra large',
  font_classic:'Classic', font_classic_d:'Elegant serif headings', font_modern:'Modern', font_modern_d:'Clean sans-serif', font_editorial:'Editorial', font_editorial_d:'Bookish serif', font_friendly:'Friendly', font_friendly_d:'Soft and rounded', font_system:'System', font_system_d:'Your device’s own font · fastest',
  font_sample:'Quiet evenings, good films.',
  sg_features:'Switches', sg_features_d:'Every on/off option in one place. Turn them all on or off at once, or one by one.', sw_all_on:'All on', sw_all_off:'All off',
  sw_g_home:'Home & display', sw_g_smart:'Assistant', sw_g_lists:'Automatic lists',
  sw_secs:'Show seconds on the clock', sw_secs_d:'Adds a ticking seconds digit on Home.', sw_credit:'Show picture credit', sw_credit_d:'The small caption naming the artwork behind Home.', sw_motion:'Animations', sw_motion_d:'Turn off to reduce movement across the app.', sw_ai:'AI assistant', sw_ai_d:'Shows Ask AI in the sidebar and the Fill with AI button.',
  sg_ai:'Assistant mode', sg_ai_d:'Choose how Ask AI thinks. You can change this at any time.', sg_ai_key:'Claude connection',
  ai_local:'On-device', ai_local_d:'Rules run in this page. Private, instant, works offline. Understands recommend, count, find, add and finish.', ai_local_tag:'Default',
  ai_claude:'Claude', ai_claude_d:'Open-ended answers about your taste and library, plus Fill with AI when you add an item. Needs your own Anthropic API key.', ai_claude_tag:'Optional',
  ai_key:'Anthropic API key', ai_model:'Model', ai_m_haiku:'Claude Haiku 4.5 — fast and the lowest cost', ai_m_sonnet:'Claude Sonnet 5.5 — smarter, a little slower', ai_test:'Test connection', ai_forget:'Remove key', ai_testing:'Testing…', ai_ok:'Connected.', ai_bad:'Failed: {e}', ai_nokey:'Paste a key first.', ai_forgot:'Key removed.',
  ai_f1:'The key is stored only in this browser, on this device.', ai_f2:'It is sent only to api.anthropic.com, never to anyone else.', ai_f3:'Each question sends a compact list of your titles, statuses and ratings — no notes, no file names.', ai_f4:'Claude can read and suggest, but it cannot change your library.'
});
Object.assign(I18N.zh, {
  ss_tabbar:'底部导航栏', ss_badges:'徽章', tb_desc:'选择屏幕底部导航栏里放什么。按住右侧手柄拖动即可排序。', tb_enabled:'显示在导航栏', tb_disabled:'未放入导航栏', tb_max:'导航栏最多显示', tb_over:'超出数量的标签，以及你关闭的标签，都会收进 ☰ 菜单。设置和个人主页始终在菜单里。', tb_reset:'恢复默认', tb_in_more:'在菜单中', tb_remove:'从导航栏移除', tb_add:'加入导航栏', tb_reorder:'调整顺序（拖动，或用方向键）', tb_none:'所有标签都已在导航栏中。', tb_min:'导航栏至少保留一个标签。',
  bs_desc:'选择所有徽章的外观，也可以为任一徽章换上你自己的图片。在个人主页点开徽章，进入它的页面并分享。', bs_style:'默认外观', bs_upload:'换图', bs_custom:'你的图片', bs_default:'默认', bp_share:'分享此徽章', bp_earned:'已获得', bp_locked:'获得后才能分享。', nav_assist_label:'助手', nav_ask:'AI 助手', nav_data:'导入与导出', nav_guide:'使用指南', nav_lib_label:'资料库', nav_data_label:'数据',
  me_guest:'你的名字', hub_share:'分享', hub_reset:'重置',
  ex_backup:'完整备份', ex_restore_t:'恢复备份', ex_restore_d:'把备份文件（JSON）导回此浏览器。', ex_restore_b:'前往导入',
  export_desc:'把资料库导出为网页、表格或完整备份。文件语言跟随设置。',
  share_title:'分享', share_desc:'把你的收藏做成卡片或网页，发给朋友。',
  sh_profile_t:'我的名片', sh_profile_d:'名字、等级和喜爱的作品，做成一张可分享的卡片。', sh_ins_t:'洞察报告', sh_ins_d:'某天、某月或某年观影的设计感总结。', sh_badges_t:'徽章', sh_badges_d:'展示你获得的徽章。',
  ask_title:'AI 助手', ask_desc:'用日常语言提问：今晚看什么、今年看了多少，或直接添加条目。',
  ask_clear:'新对话', ask_how:'使用说明', ask_ph:'问问你的资料库……', ask_send:'发送', ask_can:'你可以这样说', ask_privacy:'隐私', ask_settings:'AI 设置',
  ask_priv_local:'本机模式：数据不会离开此浏览器，回答来自读取你资料库的规则。',
  ask_priv_claude:'Claude 模式：每个开放性问题会用你自己的密钥，把资料库的精简摘要（标题、状态、评分）发送给 Anthropic。本应用不会在其他地方保存。',
  ask_mode_local:'本机 · 私密', ask_mode_claude:'Claude · 你的密钥',
  a_hello:'你好{name}！我可以帮你挑片、统计和搜索资料库，也能替你添加条目或标记看完。', a_hello2:'试试下面的想法，或者直接输入。',
  a_rec:'从你的想看清单{why}，我建议先看：', a_rec_none:'你的想看清单是空的，先添加几部，我再来挑。', a_rec_loose:'清单里没有完全符合的，下面是最接近的：',
  a_doing:'你正在进行 {n} 项：', a_doing_none:'你现在没有进行中的内容。问我“今晚看什么”，我来挑一部。',
  a_stats:'共 {total} 项：想看 {want}、进行中 {doing}、已完成 {done}、已放弃 {dropped}。\n今年完成 {y} 项 · 本月 {m} 项。', a_avg:'{n} 项已评分，平均 {avg} 分。', a_time:'已完成条目累计约 {h} 小时。',
  a_top:'你评分最高的：', a_top_none:'还没有评分，先给几部打星再来问我。', a_unrated:'有 {n} 项已完成但未评分：', a_unrated_none:'已完成的条目都评过分了。',
  a_old:'清单里等得最久的：', a_find:'找到 {n} 项：', a_find_none:'没有匹配项。试试标题、人名或类型。',
  a_add_ask:'我将把它加入资料库，确认吗？', a_added:'已添加“{t}”。', a_btn_add:'添加', a_btn_done:'标记完成', a_btn_start:'开始', a_btn_open:'打开', a_btn_cancel:'先不了',
  a_fin_ask:'把“{t}”标记为已完成{r}？', a_fin_nf:'资料库里没找到“{t}”，要以“已完成”添加吗？', a_finished:'已把“{t}”标记为完成。', a_dup:'“{t}”已在资料库中。', a_started:'已开始“{t}”。',
  a_unknown:'我还没听懂。我可以推荐、统计、搜索、添加和标记完成。开放性问题请在 设置 → AI 中开启 Claude。', a_think:'思考中……', a_err:'Claude 无法回答：{e}', 
  a_c1:'今晚看什么？', a_c2:'100 分钟以内的', a_c3:'今年我看完了多少？', a_c4:'显示我评分最高的', a_c5:'有哪些进行中的？', a_c6:'添加 千与千寻 2001 动画', a_c7:'哪些电影我还没评分？', a_c8:'我偏爱哪些类型？', a_c9:'根据我的最爱推荐 3 部',
  fill_btn:'AI 填写', fill_need:'请先在 设置 → AI 中开启 Claude，才能自动填写。', fill_busy:'查询中……', fill_ok:'已填写 {n} 个空白项，请核对。', fill_none:'没有可补充的内容。', fill_title:'请先输入标题。',
  guide_title:'使用指南', guide_desc:'它是什么、怎样设置、可以是什么样子，以及常见问题的解答。', guide_tour:'重看欢迎导览', guide_sample:'添加示例条目', guide_unsample:'移除示例条目', guide_sample_ok:'已添加 {n} 个示例。', guide_unsample_ok:'已移除 {n} 个示例。',
  g_ai:'AI 助手', g_faq:'常见问题',
  
  
  
  
  
  
  g_ai_l:'助手听得懂平常的话。默认在本机运行，想问开放的问题，也可以请 Claude 来答。',
  g_ai_local:'本机模式（默认）', g_ai_local_p:'规则就在页面里跑：不花钱，反应快，不外传，没网也能用。', g_ai_local_l:['从想看清单里挑一部', '按状态、年份或月份统计', '按标题、人名、类型查找', '添加条目或标记完成，始终先让你确认'],
  g_ai_cl:'Claude（可选）', g_ai_cl_p:'填上你自己的 Anthropic API 密钥，它能回答开放的问题，添加条目时还会帮你补全信息。', g_ai_cl_l:['关于口味与资料库的自由提问', 'AI 填写：年份、创作者、演员、类型与简介', '密钥只存在这个浏览器里，只会发给 api.anthropic.com', '费用直接付给 Anthropic，一次提问通常不到一分钱'],
  
  
  
  
  
  
  wl_skip:'跳过', wl_next:'下一步', wl_back:'上一步',
  wl0_t:'欢迎使用媒体追踪', wl0_p:'一个安静的地方，收纳你看过、读过、玩过的一切。先告诉我怎么称呼你？', wl_lang:'语言',
  
  
  wl3_t:'认识你的助手', wl3_p:'用日常语言提问。选择你想要的智能程度与隐私程度。', wl3_a:'本机模式', wl3_ad:'私密、即时。挑片、统计、搜索、添加、标记完成。', wl3_b:'Claude（你自己的密钥）', wl3_bd:'还能回答开放性问题并补全信息。稍后可在 设置 → AI 中配置。',
  wl_acc_t:'文件与媒体访问', wl_acc_f:'选择备份或清单', wl_acc_fd:'打开之前导出的 JSON/CSV。', wl_acc_n:'每次都会弹出手机自带的文件选择器；也可跳过，稍后在文件库或导入页操作。',
  
  wl4_t:'一切就绪', wl4_a:'添加示例条目', 
  ss_general:'通用', ss_plugins:'插件与自检', ss_appearance:'外观', ss_features:'开关', ss_ai:'AI',   sg_name_ph:'我们该怎么称呼你？',   set_start:'启动页', sg_look:'主题与布局', sg_fonts:'字体', set_size:'文字大小', size_s:'小', size_m:'默认', size_l:'大', size_xl:'特大',
  font_classic:'经典', font_classic_d:'优雅的衬线标题', font_modern:'现代', font_modern_d:'干净的无衬线', font_editorial:'书卷', font_editorial_d:'书籍感衬线', font_friendly:'亲和', font_friendly_d:'柔和圆润', font_system:'系统', font_system_d:'设备自带字体 · 最快',
  font_sample:'安静的夜晚，好看的电影。',
  sg_features:'开关', sg_features_d:'所有开/关选项集中在这里，可一次全开全关，也可逐项设置。', sw_all_on:'全部开启', sw_all_off:'全部关闭',
  sw_g_home:'首页与显示', sw_g_smart:'助手', sw_g_lists:'自动清单',
  sw_secs:'时钟显示秒', sw_secs_d:'在首页加入跳动的秒数。', sw_credit:'显示图片署名', sw_credit_d:'首页背景作品的小字署名。', sw_motion:'动画效果', sw_motion_d:'关闭可减少整个应用的动态效果。', sw_ai:'AI 助手', sw_ai_d:'在侧栏显示“AI 助手”以及“AI 填写”按钮。',
  sg_ai:'助手模式', sg_ai_d:'选择 AI 助手的工作方式，随时可更改。', sg_ai_key:'Claude 连接',
  ai_local:'本机模式', ai_local_d:'规则在页面内运行：私密、即时、可离线。能听懂推荐、统计、查找、添加、完成。', ai_local_tag:'默认',
  ai_claude:'Claude', ai_claude_d:'回答关于口味与资料库的开放性问题，并在添加条目时提供“AI 填写”。需要你自己的 Anthropic API 密钥。', ai_claude_tag:'可选',
  ai_key:'Anthropic API 密钥', ai_model:'模型', ai_m_haiku:'Claude Haiku 4.5 — 快速、成本最低', ai_m_sonnet:'Claude Sonnet 5.5 — 更聪明、稍慢', ai_test:'测试连接', ai_forget:'移除密钥', ai_testing:'测试中……', ai_ok:'已连接。', ai_bad:'失败：{e}', ai_nokey:'请先粘贴密钥。', ai_forgot:'密钥已移除。',
  ai_f1:'密钥只保存在此设备的此浏览器中。', ai_f2:'只会发送到 api.anthropic.com，不会发给其他任何人。', ai_f3:'每次提问发送精简的标题、状态和评分列表，不含笔记与文件名。', ai_f4:'Claude 只能阅读和建议，不能修改你的资料库。'
});

