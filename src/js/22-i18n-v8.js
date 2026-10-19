/* =====================================================================
   v18 strings: opening files, the player, the reader, folders, cloud sync.
   Every control that is left carries four lines — what it does, what you get, what you lose without it, how to reach it —
   as the project's NOTES.md asks (principle 3). They show as a tooltip and, in full, in the Shortcuts sheet (the ? button, or the ? key).
   ===================================================================== */
Object.assign(I18N.en, {
  fp_play:'Play', fp_read:'Read', fp_open:'Open', fp_resume:'Resume', fp_choose_read:'Choose the book to read', fp_choose_play:'Choose the file to play', fp_unsupported:'“{name}” is not a video, audio or book file.',
  prog_follows:'This item has a file, so its progress is the place you reached in it. Open the file to change it.',
  loc_h:'Find the file', loc_d:'This browser does not keep access to “{name}” ({size}) after you close it. Choose it once and it will open from here on.', loc_drop:'Drop the file here, or choose it', loc_pick:'Choose file…', loc_diff:'“{name}” is not the file that was catalogued (different name or size). Use it anyway?', loc_use:'Use this file',
  fin_done:'Finished “{title}” — marked as done.',
  pl_aria:'Player', pl_close:'Close player', pl_close_d:'Close the player. Audio keeps playing in the small bar; video pauses at this spot.', pl_seek:'Seek', pl_remain:'Show remaining time instead of total', pl_speed:'Speed',
  pl_mini_aria:'Now playing', pl_expand:'Open the player', pl_stop:'Stop and close', pl_err_h:'This browser cannot play this file', pl_err_d:'The .{ext} container or its codec is one this browser has no decoder for. The file is fine: a player such as VLC plays nearly everything. Your place, notes and tracker entry stay here.', pl_err_vlc:'Get VLC',
  pl_at:'{a} of {b}', pl_resumed:'Resumed at {t}', pl_volume:'Volume', pl_muted:'Muted', pl_unmuted:'Sound on',
  pl_loop_off:'In order', pl_loop_all:'Repeat all', pl_loop_one:'Repeat this one', pl_loop_shuffle:'Shuffle',
  pl_sub_on:'Subtitles: {n}', pl_sub_off:'Subtitles off', pl_sub_none:'No subtitles loaded', pl_sub_bad:'That file has no readable subtitles.', pl_sub_load:'Load subtitle file…', pl_sub_delay:'Subtitle delay {n} ms', pl_track_n:'Track {n}',
  pl_marks:'Bookmarks', pl_marks_add:'Add a bookmark here', pl_marks_none:'No bookmarks yet. Press D to mark a moment.', pl_bm_added:'Bookmark at {t}', pl_bm_del:'Remove this bookmark', pl_bm_go:'Go to {t}',
  pl_g_play:'Play and seek', pl_g_list:'List', pl_g_sound:'Sound', pl_g_speed:'Speed', pl_g_pic:'Subtitles', pl_g_mark:'Bookmarks and help',
  pl_keys_h:'Shortcuts', pl_keys_d:'Open a row to see what a control does and why it is there. Shortcuts work only while the player or the book is in front of you, so they never clash with other pages.',
  why_m:'What you get', why_n:'Without it', why_a:'Where to find it', pk_done:'Done'
});
Object.assign(I18N.zh, {
  fp_play:'播放', fp_read:'阅读', fp_open:'打开', fp_resume:'继续', fp_choose_read:'选择要阅读的书', fp_choose_play:'选择要播放的文件', fp_unsupported:'“{name}”不是视频、音频或书籍文件。',
  prog_follows:'这个条目已经对应了文件，所以进度就是你在文件里读到/看到的位置。打开文件即可改变。',
  loc_h:'找到这个文件', loc_d:'关闭页面后，浏览器不再保留对“{name}”（{size}）的访问权限。请选择一次，之后就能从这里直接打开。', loc_drop:'把文件拖到这里，或点击选择', loc_pick:'选择文件…', loc_diff:'“{name}”与登记的文件不同（名称或大小不一致）。仍要使用吗？', loc_use:'仍然使用',
  fin_done:'已完成“{title}”，已标为完成。',
  pl_aria:'播放器', pl_close:'关闭播放器', pl_close_d:'关闭播放器。音频会继续在小条里播放；视频会停在当前位置。', pl_seek:'进度', pl_remain:'显示剩余时间而不是总时长', pl_speed:'倍速',
  pl_mini_aria:'正在播放', pl_expand:'展开播放器', pl_stop:'停止并关闭', pl_err_h:'此浏览器无法播放这个文件', pl_err_d:'.{ext} 的封装或编码，这个浏览器没有对应的解码器。文件本身没有问题：VLC 之类的播放器几乎什么都能播。你的进度、笔记和追踪记录都保留在这里。', pl_err_vlc:'获取 VLC',
  pl_at:'{a} / {b}', pl_resumed:'已从 {t} 继续', pl_volume:'音量', pl_muted:'已静音', pl_unmuted:'已开声音',
  pl_loop_off:'顺序播放', pl_loop_all:'列表循环', pl_loop_one:'单曲循环', pl_loop_shuffle:'随机播放',
  pl_sub_on:'字幕：{n}', pl_sub_off:'已关闭字幕', pl_sub_none:'尚未载入字幕', pl_sub_bad:'这个文件里没有可读取的字幕。', pl_sub_load:'载入字幕文件…', pl_sub_delay:'字幕延迟 {n} 毫秒', pl_track_n:'轨道 {n}',
  pl_marks:'书签', pl_marks_add:'在这里添加书签', pl_marks_none:'还没有书签。按 D 标记一个时刻。', pl_bm_added:'已在 {t} 添加书签', pl_bm_del:'删除这个书签', pl_bm_go:'跳到 {t}',
  pl_g_play:'播放与跳转', pl_g_list:'列表', pl_g_sound:'声音', pl_g_speed:'速度', pl_g_pic:'字幕', pl_g_mark:'书签与帮助',
  pl_keys_h:'快捷键', pl_keys_d:'展开一行，可以看到这个控件做什么、为什么需要它。快捷键只在播放器或书本在最前面时有效，不会和其他页面冲突。',
  why_m:'你得到什么', why_n:'没有它会怎样', why_a:'在哪里找到', pk_done:'完成'
});
/* one line per control: [name, what it does, what you get, without it, where to find it] */
const PC_EN = {
  play:['Play / pause', 'Starts or stops the picture and the sound.', 'Step away for a moment and come back to the exact frame.', 'You could not stop a film for a phone call without losing your place.', 'Space or K; the centre button; a click on the picture; headset and lock-screen controls.'],
  back:['Back 10 s', 'Jumps back ten seconds.', 'Catch a line you missed without dragging a bar.', 'You would have to aim at the seek line every time.', '← or J; double-tap the left third on a touch screen.'],
  fwd:['Forward 10 s', 'Jumps ahead ten seconds.', 'Skip a recap or an ad quickly.', 'Long scenes could only be skipped by dragging the line.', '→; double-tap the right third on a touch screen. Keys 1–9 jump to 10–90 %.'],
  prev:['Previous', 'Restarts this file, or goes to the one before it in the list.', 'Move through an album or a season in order.', 'Each file would need the library to open.', 'P or Page Up; the headset button.'],
  next:['Next', 'Goes to the next file in the list.', 'Binge a season or an album without going back to the library.', 'You would open every episode by hand.', 'N or Page Down; the headset button.'],
  loop:['Order', 'Cycles: in order, repeat all, repeat this one, shuffle.', 'Keep a song or a playlist going, or mix it up.', 'Playback would stop at the end every time.', 'L; the order button.'],
  volup:['Volume up', 'Raises the volume by 5 %.', 'Fine control without leaving the keyboard.', 'You would use the slider every time.', '↑ (when the volume slider is not focused).'],
  voldown:['Volume down', 'Lowers the volume by 5 %.', 'Quiet a loud scene at once.', 'Same.', '↓.'],
  mute:['Mute', 'Switches the sound off and on, keeping the level.', 'Silence in a second, back to the same level.', 'You would drag the slider to zero and then find the old level.', 'M; the speaker button.'],
  faster:['Faster', 'Steps to the next playback speed.', 'Get through a lecture in less time.', 'Everything would play at 1×.', '+; the speed button lists every step.'],
  slower:['Slower', 'Steps to the previous speed.', 'Follow fast speech or practise a language.', 'No slow-down.', '−.'],
  normal:['Normal speed', 'Returns to 1×.', 'One key to undo any speed change.', 'You would step back one speed at a time.', '=.'],
  subs:['Subtitles', 'Cycles through the subtitle tracks and off; the button opens the list and loads a file.', 'Watch in another language or with sound off.', 'Foreign films would be out of reach.', 'V; the CC button. Files in UTF-8, GBK, Big5, Shift-JIS are read correctly.'],
  subearlier:['Subtitles earlier', 'Shows subtitles 50 ms sooner.', 'Fix a file that is out of step.', 'A late subtitle file would stay unusable.', 'G; the CC menu.'],
  sublater:['Subtitles later', 'Shows subtitles 50 ms later.', 'The same, the other way.', 'Same.', 'H; the CC menu.'],
  full:['Full screen', 'Fills the screen with the picture.', 'No distractions.', 'The picture would stay in a window.', 'F; double-click the picture; Esc leaves.'],
  mark:['Add bookmark', 'Marks the current moment with its time.', 'Return to a scene or a quote.', 'You would remember times by heart.', 'D; the bookmark button.'],
  marks:['Bookmarks', 'Lists your bookmarks with their times; go to one or remove it.', 'See every marked moment and jump to it.', 'Marks would be kept but unseen.', 'B; the list button. Marks also show on the seek line.'],
  keys:['Shortcuts', 'Opens this list of every control.', 'Learn what each control is for.', 'Shortcuts would be a secret.', '? or F1; the keyboard button.']
};
const PC_ZH = {
  play:['播放 / 暂停', '开始或停止画面和声音。', '离开一会儿，回来时画面停在原处。', '接个电话就会丢失位置。', '空格或 K；中间的按钮；点击画面；耳机和锁屏控制。'],
  back:['后退 10 秒', '后退十秒。', '没听清的一句话，不用拖进度条就能回放。', '每次都要对准进度条。', '← 或 J；触屏上双击左侧三分之一。'],
  fwd:['前进 10 秒', '前进十秒。', '快速跳过片头回顾或广告。', '长场景只能靠拖进度条。', '→；触屏上双击右侧三分之一。数字键 1–9 跳到 10%–90%。'],
  prev:['上一个', '从头重播当前文件，或回到列表里的上一个。', '按顺序听完整张专辑或看完一季。', '每个文件都要回到资料库打开。', 'P 或 Page Up；耳机按键。'],
  next:['下一个', '播放列表中的下一个文件。', '连续看完一季或听完专辑，不必回到资料库。', '每一集都要手动打开。', 'N 或 Page Down；耳机按键。'],
  loop:['播放顺序', '依次切换：顺序、列表循环、单曲循环、随机。', '让一首歌或一个列表一直播放，或打乱顺序。', '每次播完都会停下。', 'L；顺序按钮。'],
  volup:['音量加', '音量增加 5%。', '不离开键盘就能微调。', '每次都要用滑块。', '↑（音量滑块未获得焦点时）。'],
  voldown:['音量减', '音量降低 5%。', '立刻压低过响的场景。', '同上。', '↓。'],
  mute:['静音', '开关声音，保留音量大小。', '一秒静音，恢复时音量不变。', '要把滑块拖到零，再去找回原来的音量。', 'M；喇叭按钮。'],
  faster:['加速', '切换到下一档播放速度。', '用更少的时间听完讲座。', '一切都只能 1 倍速。', '+；倍速按钮可看到所有档位。'],
  slower:['减速', '切换到上一档速度。', '跟上很快的语速，或练习外语。', '无法放慢。', '−。'],
  normal:['正常速度', '回到 1 倍速。', '一键撤销任何变速。', '要一档一档地退回来。', '=。'],
  subs:['字幕', '依次切换各字幕轨和关闭；按钮可打开列表并载入文件。', '用另一种语言观看，或静音观看。', '外语片无法看懂。', 'V；CC 按钮。UTF-8、GBK、Big5、Shift-JIS 编码的文件都能正确读取。'],
  subearlier:['字幕提前', '字幕提前 50 毫秒显示。', '修正不同步的字幕文件。', '偏晚的字幕文件无法使用。', 'G；CC 菜单。'],
  sublater:['字幕延后', '字幕延后 50 毫秒显示。', '同上，方向相反。', '同上。', 'H；CC 菜单。'],
  full:['全屏', '让画面铺满屏幕。', '没有干扰。', '画面只能停在窗口里。', 'F；双击画面；Esc 退出。'],
  mark:['添加书签', '用时间标记当前时刻。', '回到某个场景或一句引文。', '只能凭记忆记时间。', 'D；书签按钮。'],
  marks:['书签', '列出你的书签和时间；可跳转或删除。', '看到每个标记的时刻并跳过去。', '书签虽然保留却看不见。', 'B；列表按钮。书签也会显示在进度条上。'],
  keys:['快捷键', '打开这份所有控件的列表。', '了解每个控件的用处。', '快捷键成了秘密。', '? 或 F1；键盘按钮。']
};
for (const [id, v] of Object.entries(PC_EN)) { const k = 'pc_' + id; I18N.en[k] = v[0]; I18N.en[k + '_d'] = v[1]; I18N.en[k + '_m'] = v[2]; I18N.en[k + '_n'] = v[3]; I18N.en[k + '_a'] = v[4]; }
for (const [id, v] of Object.entries(PC_ZH)) { const k = 'pc_' + id; I18N.zh[k] = v[0]; I18N.zh[k + '_d'] = v[1]; I18N.zh[k + '_m'] = v[2]; I18N.zh[k + '_n'] = v[3]; I18N.zh[k + '_a'] = v[4]; }

/* ---- the reader ---- */
Object.assign(I18N.en, {
  rd_aria:'Reader', rd_close:'Close book', rd_close_d:'Close the book. Your place is saved and the tracker is updated.', rd_frame:'Book text', rd_sel:'Selected text', rd_seek:'Position in the book', rd_at:'{p} percent', rd_resumed:'Back at {n}%',
  rd_err_h:'This book cannot be opened here', rd_err_fmt:'.{ext} files are catalogued but this reader does not open them yet. Convert the book to EPUB (Calibre does this for free) and add that file; the tracker entry and notes carry over.', rd_err_read:'“{name}” could not be read. It may be damaged, protected by DRM, or moved.', rd_err_ch:'This chapter could not be read.', rd_err_calibre:'Get Calibre',
  rd_ch_n:'Chapter {n}', rd_part_n:'Part {n}', rd_page_n:'Page {n}', rd_page_of:'Page {n} of {total}', rd_first:'This is the first page', rd_last:'This is the end', rd_left:'{ch} min left in chapter',
  rd_bm_added:'Bookmark added', rd_bm_off:'Bookmark removed', rd_here:'You are here', rd_note:'Note', rd_note_ask:'Your note for this passage', rd_copy:'Copy', rd_copied:'Copied', rd_hl_del:'Remove highlight', rd_hl_gone:'Highlight removed', rd_note_save:'Save note',
  rd_c_yellow:'Yellow', rd_c_green:'Green', rd_c_blue:'Blue', rd_c_pink:'Pink', rd_hl_in:'Highlight {c}',
  rd_find_ph:'Search the book', rd_find_clear:'Clear search', rd_no_text:'A comic has no text to search.', rd_pdf_find:'Search inside PDFs is not available yet; use the page slider or contents.', rd_searching:'Searching…', rd_found:'{n} result(s)', rd_nothing:'Nothing found.',
  rd_tab_toc:'Contents', rd_tab_marks:'Marks', rd_bookmarks:'Bookmarks', rd_highlights:'Highlights and notes', rd_no_bm:'No bookmarks yet. Press D to add one.', rd_no_hl:'Select text to highlight it.', rd_export:'Export highlights (Markdown)', rd_del:'Remove', rd_edit_note:'Edit note',
  rd_theme:'Background', rd_th_day:'Day', rd_th_paper:'Paper', rd_th_green:'Green', rd_th_night:'Night', rd_th_black:'Black', rd_th_custom:'Custom', rd_bg:'Background colour', rd_fg:'Text colour', rd_custom_d:'Pick any colours. The text colour follows the background unless you choose one.', rd_text_auto:'Match the background',
  rd_size:'Text size', rd_lh:'Line spacing', rd_mx:'Side margins', rd_font:'Font', rd_f_serif:'Serif', rd_f_sans:'Sans', rd_f_kai:'Kai (楷)',
  rd_flow:'Page layout', rd_pg_auto:'Auto', rd_pg_one:'One page', rd_pg_two:'Two pages', rd_pg_scroll:'Scroll', rd_pg_auto_d:'Two pages side by side when the window is wide, one when it is narrow.', rd_reset:'Back to defaults',
  rd_ext:'This link goes to {url}.', rd_ext_go:'Open in a new tab', rd_prev_pg:'Previous page', rd_next_pg:'Next page',
  pl_g_turn:'Turning pages', pl_g_find:'Finding and marking', pl_g_look:'Look', pl_g_read:'Screen'
});
Object.assign(I18N.zh, {
  rd_aria:'阅读器', rd_close:'关闭书籍', rd_close_d:'关闭这本书。阅读位置会被保存，追踪清单同步更新。', rd_frame:'书籍正文', rd_sel:'选中的文字', rd_seek:'全书位置', rd_at:'{p}%', rd_resumed:'已回到 {n}%',
  rd_err_h:'这里无法打开这本书', rd_err_fmt:'.{ext} 文件已收录，但阅读器暂不支持打开。可用 Calibre（免费）转换成 EPUB 再添加；追踪记录和笔记会保留。', rd_err_read:'无法读取“{name}”。文件可能已损坏、受 DRM 保护或已被移动。', rd_err_ch:'这一章无法读取。', rd_err_calibre:'获取 Calibre',
  rd_ch_n:'第 {n} 章', rd_part_n:'第 {n} 部分', rd_page_n:'第 {n} 页', rd_page_of:'第 {n} / {total} 页', rd_first:'已是第一页', rd_last:'已到末尾', rd_left:'本章还剩 {ch} 分钟',
  rd_bm_added:'已添加书签', rd_bm_off:'已取消书签', rd_here:'你在这里', rd_note:'笔记', rd_note_ask:'写下你对这段文字的笔记', rd_copy:'复制', rd_copied:'已复制', rd_hl_del:'删除高亮', rd_hl_gone:'已删除高亮', rd_note_save:'保存笔记',
  rd_c_yellow:'黄色', rd_c_green:'绿色', rd_c_blue:'蓝色', rd_c_pink:'粉色', rd_hl_in:'{c}高亮',
  rd_find_ph:'在书中搜索', rd_find_clear:'清除搜索', rd_no_text:'漫画没有可搜索的文字。', rd_pdf_find:'暂不支持在 PDF 内搜索；请使用页码滑块或目录。', rd_searching:'正在搜索…', rd_found:'{n} 条结果', rd_nothing:'没有找到。',
  rd_tab_toc:'目录', rd_tab_marks:'标记', rd_bookmarks:'书签', rd_highlights:'高亮与笔记', rd_no_bm:'还没有书签。按 D 添加。', rd_no_hl:'选中文字即可高亮。', rd_export:'导出高亮（Markdown）', rd_del:'删除', rd_edit_note:'编辑笔记',
  rd_theme:'背景', rd_th_day:'日间', rd_th_paper:'纸张', rd_th_green:'护眼绿', rd_th_night:'夜间', rd_th_black:'纯黑', rd_th_custom:'自定义', rd_bg:'背景颜色', rd_fg:'文字颜色', rd_custom_d:'可以任选颜色。文字颜色会随背景自动调整，除非你自己选择。', rd_text_auto:'随背景自动',
  rd_size:'字号', rd_lh:'行距', rd_mx:'左右边距', rd_font:'字体', rd_f_serif:'衬线', rd_f_sans:'无衬线', rd_f_kai:'楷体',
  rd_flow:'页面布局', rd_pg_auto:'自动', rd_pg_one:'单页', rd_pg_two:'双页', rd_pg_scroll:'滚动', rd_pg_auto_d:'窗口较宽时左右并排两页，较窄时单页。', rd_reset:'恢复默认',
  rd_ext:'这个链接指向 {url}。', rd_ext_go:'在新标签页打开', rd_prev_pg:'上一页', rd_next_pg:'下一页',
  pl_g_turn:'翻页', pl_g_find:'查找与标记', pl_g_look:'外观', pl_g_read:'屏幕'
});
const RC_EN = {
  next:['Next page', 'Turns to the next page, then the next chapter.', 'Read straight through without touching the screen.', 'You would have to scroll or drag to move on.', 'Right arrow, Page Down or Space; click or tap the right edge; swipe left; the mouse wheel.'],
  prev:['Previous page', 'Turns back one page, then to the previous chapter.', 'Re-read a line you lost.', 'You could only move forwards.', 'Left arrow, Page Up or Shift + Space; click or tap the left edge; swipe right.'],
  nextch:['Next chapter', 'Jumps to the start of the next chapter.', 'Skip a part you do not want.', 'You would turn page after page.', ']; Ctrl + →.'],
  prevch:['Previous chapter', 'Jumps to the start of the chapter before.', 'Return to where a chapter began.', 'Same, backwards.', '[; Ctrl + ←.'],
  toc:['Contents', 'Lists the chapters and takes you to one; your bookmarks and notes are on the second tab.', 'Move through a long book by its structure.', 'Only page-by-page movement.', 'T; the list button in the top bar.'],
  search:['Search', 'Finds words in the whole book and lists where they are.', 'Find that sentence you half remember.', 'You would scroll hoping to spot it.', '/ or Ctrl + F; the magnifier in the top bar.'],
  mark:['Bookmark', 'Marks this place, or removes the mark if one is already here.', 'Come back to a passage or keep several places.', 'Only one remembered place: where you stopped.', 'D; the bookmark button.'],
  marks:['Bookmarks and notes', 'Lists your bookmarks, highlights and notes; go to one, edit its note or remove it; export highlights.', 'Review what you marked without re-reading.', 'Marks would be kept but unseen.', 'M; the second tab of Contents.'],
  look:['Text and look', 'Opens the background and text colours, font, size, spacing, margins and page layout.', 'Make long reading comfortable for your eyes.', 'One fixed look for everyone.', 'O; the Aa button.'],
  bigger:['Larger text', 'Raises the text size by one step.', 'Read without strain.', 'Small print would stay small.', '+ or =.'],
  smaller:['Smaller text', 'Lowers the text size by one step.', 'More words on a page.', 'Same.', '−.'],
  night:['Day / night', 'Switches between a light and a dark background.', 'Read in bed without lighting the room.', 'You would open the settings each evening.', 'N.'],
  full:['Full screen', 'Fills the screen with the book.', 'No distractions.', 'The book would sit in a window.', 'F.'],
  keys:['Shortcuts', 'Opens this list of every control.', 'Learn what each control is for.', 'Shortcuts would be a secret.', '? or F1.']
};
const RC_ZH = {
  next:['下一页', '翻到下一页，到章末则进入下一章。', '不用碰屏幕就能一直读下去。', '只能靠滚动或拖动前进。', '→、Page Down 或空格；点击右侧边缘；向左滑；鼠标滚轮。'],
  prev:['上一页', '翻回上一页，到章首则回到上一章。', '重读刚才漏掉的一句。', '只能向前翻。', '←、Page Up 或 Shift + 空格；点击左侧边缘；向右滑。'],
  nextch:['下一章', '跳到下一章开头。', '跳过不想读的部分。', '只能一页一页翻。', ']；Ctrl + →。'],
  prevch:['上一章', '跳到前一章开头。', '回到某一章开始的地方。', '同上，方向相反。', '[；Ctrl + ←。'],
  toc:['目录', '列出章节并跳转；书签和笔记在第二个标签里。', '按结构在长书里穿行。', '只能一页一页移动。', 'T；顶部栏的列表按钮。'],
  search:['搜索', '在整本书里查找文字并列出位置。', '找到那句只记得一半的话。', '只能边翻边碰运气。', '/ 或 Ctrl + F；顶部栏的放大镜。'],
  mark:['书签', '标记这个位置；如果这里已有书签则取消它。', '回到某一段，或同时保留几个位置。', '只记得一个位置：你停下的地方。', 'D；书签按钮。'],
  marks:['书签与笔记', '列出书签、高亮和笔记；可跳转、编辑笔记或删除；可导出高亮。', '不必重读就能回顾标记。', '标记虽然保留却看不见。', 'M；目录的第二个标签。'],
  look:['文字与外观', '打开背景与文字颜色、字体、字号、行距、边距和页面布局。', '让长时间阅读对眼睛舒服。', '所有人只能用同一种样子。', 'O；Aa 按钮。'],
  bigger:['放大文字', '字号增加一档。', '读起来不吃力。', '小字永远是小字。', '+ 或 =。'],
  smaller:['缩小文字', '字号减小一档。', '一页容纳更多文字。', '同上。', '−。'],
  night:['日间 / 夜间', '在浅色和深色背景之间切换。', '睡前阅读，不必开灯。', '每晚都要打开设置。', 'N。'],
  full:['全屏', '让书本铺满屏幕。', '没有干扰。', '书只能待在窗口里。', 'F。'],
  keys:['快捷键', '打开这份所有控件的列表。', '了解每个控件的用处。', '快捷键成了秘密。', '? 或 F1。']
};
for (const [id, v] of Object.entries(RC_EN)) { const k = 'rc_' + id; I18N.en[k] = v[0]; I18N.en[k + '_d'] = v[1]; I18N.en[k + '_m'] = v[2]; I18N.en[k + '_n'] = v[3]; I18N.en[k + '_a'] = v[4]; }
for (const [id, v] of Object.entries(RC_ZH)) { const k = 'rc_' + id; I18N.zh[k] = v[0]; I18N.zh[k + '_d'] = v[1]; I18N.zh[k + '_m'] = v[2]; I18N.zh[k + '_n'] = v[3]; I18N.zh[k + '_a'] = v[4]; }

Object.assign(I18N.en, { stat_week:'Time with files, 7 days' });
Object.assign(I18N.zh, { stat_week:'近 7 天陪伴时长' });

/* ---- account sync ---- */
Object.assign(I18N.en, {
  sync_other:'Other ways: sync file, WebDAV', sync_file_d:'Without an account: keep one file in a folder your cloud service already syncs (iCloud, OneDrive, Dropbox, Nutstore) and merge it on each device.', sync_dav_forget:'Forget this login',
  sync_auth:'The service refused the login. Check the user name and the app password.', sync_cors:'The browser could not reach that address. Many WebDAV services do not allow web pages to call them; use a cloud account above, or the sync file.',
  cl_h:'Sync with your account', cl_d:'Sign in once on each device. Your library, lists, where you stopped, bookmarks and highlights follow you. Nothing passes through our servers: the browser talks to your provider directly.',
  cl_ready:'Ready', cl_needkey:'Needs an app ID (add yours, or the publisher’s build includes one)', cl_signin:'Sign in', cl_key_add:'Add app ID…', cl_key_edit:'Change app ID…', cl_key_ask:'App ID (client ID) for {n}',
  cl_nokey:'{n} needs an app ID first.', cl_insecure:'Signing in needs a secure page (https).', cl_connected:'Connected to {n}.', cl_signin_fail:'Sign-in did not complete.', cl_on:'Connected to {n}', cl_off:'Disconnect', cl_off_ask:'Disconnect this device? Your data stays here and in your cloud folder; syncing stops.',
  cl_syncing:'Syncing…', cl_offline:'Offline. It will sync when you are back online.', cl_reconnect:'Sign in again to keep syncing.', cl_foreign:'The cloud file is not a sync file from this app, so it was left alone.', cl_err:'Could not sync. It will try again.', cl_last:'Last synced {when}',
  cl_never:'never', cl_now:'just now', cl_min:'{n} min ago', cl_auto:'Sync automatically after changes and when I come back', cl_what:'Synced: library, lists, where you stopped, bookmarks, highlights and notes. Not synced: the files themselves, so the same file must exist on each device.',
  cl_priv:'Only a private app folder is used, and it holds a single small file. You can revoke access from your provider’s security page at any time.'
});
Object.assign(I18N.zh, {
  sync_other:'其他方式：同步文件、WebDAV', sync_file_d:'不用账号：把一个文件放在云盘已同步的文件夹里（iCloud、OneDrive、Dropbox、坚果云），在每台设备上合并。', sync_dav_forget:'忘记此登录',
  sync_auth:'服务拒绝了登录。请检查用户名和应用密码。', sync_cors:'浏览器无法访问该地址。许多 WebDAV 服务不允许网页直接调用；请改用上面的云盘账号，或使用同步文件。',
  cl_h:'用账号同步', cl_d:'每台设备登录一次。你的资料库、清单、阅读/播放进度、书签与高亮都会跟着你走。数据不经过我们的服务器：浏览器直接和你的云服务通信。',
  cl_ready:'可用', cl_needkey:'需要应用 ID（可自行填写，或由发布方在构建时内置）', cl_signin:'登录', cl_key_add:'填写应用 ID…', cl_key_edit:'修改应用 ID…', cl_key_ask:'{n} 的应用 ID（Client ID）',
  cl_nokey:'{n} 需要先填写应用 ID。', cl_insecure:'登录需要安全页面（https）。', cl_connected:'已连接 {n}。', cl_signin_fail:'登录没有完成。', cl_on:'已连接 {n}', cl_off:'断开连接', cl_off_ask:'断开这台设备吗？数据仍保留在本机和你的云盘里，只是不再同步。',
  cl_syncing:'正在同步…', cl_offline:'当前离线，恢复网络后会自动同步。', cl_reconnect:'请重新登录以继续同步。', cl_foreign:'云端的文件不是本应用的同步文件，已保持原样。', cl_err:'同步失败，稍后会重试。', cl_last:'上次同步：{when}',
  cl_never:'从未', cl_now:'刚刚', cl_min:'{n} 分钟前', cl_auto:'有改动后以及回到应用时自动同步', cl_what:'会同步：资料库、清单、进度、书签、高亮与笔记。不会同步：文件本身，所以每台设备上都需要有同一个文件。',
  cl_priv:'只使用云服务里的一个私有应用文件夹，里面只有一个很小的文件。你可以随时在服务商的安全页面撤销授权。'
});
Object.assign(I18N.en, { sync_desc:'Keep the library, lists and where you stopped the same on every device. Sign in with a cloud account, or use a sync file. The newest edit wins and deletions carry over. The media files themselves are never uploaded.' });
Object.assign(I18N.zh, { sync_desc:'让每台设备上的资料库、清单和进度保持一致。可用云盘账号登录，或使用同步文件。以最新修改为准，删除也会同步。媒体文件本身不会上传。' });

/* ---- library folders ---- */
Object.assign(I18N.en, {
  fo_h:'Folders', fo_d:'Choose a folder once. New videos, music and books in it are catalogued each time you rescan, they open with one permission, and subtitle files beside a video load with it.', fo_d_nofs:'This browser cannot remember a folder. Choosing one catalogues what is in it for this session only.',
  fo_add:'Add a folder', fo_rescan:'Rescan', fo_rescan_all:'Rescan all', fo_remove:'Forget this folder', fo_remove_d:'Stops watching it. Catalogued files and your notes stay.', fo_remove_ask:'Forget this folder? Files already catalogued stay in your library.',
  fo_scanning:'Looking through the folder… {n} found', fo_done:'{new} new of {n} files found.', fo_missing:'{n} no longer there', fo_last:'{n} files · scanned {when}', fo_never:'Not scanned yet',
  fo_err:'Could not read that folder.', fo_gone:'That folder is no longer available. Add it again.', fo_denied:'Access to the folder was not allowed.'
});
Object.assign(I18N.zh, {
  fo_h:'文件夹', fo_d:'选择一次文件夹。之后每次重新扫描，会收录其中新增的视频、音乐和书籍；打开它们只需一次授权；视频旁边的字幕文件会自动加载。', fo_d_nofs:'此浏览器无法记住文件夹。选择后只会在本次使用中收录其内容。',
  fo_add:'添加文件夹', fo_rescan:'重新扫描', fo_rescan_all:'全部重新扫描', fo_remove:'忘记此文件夹', fo_remove_d:'不再监视它。已收录的文件和你的笔记都会保留。', fo_remove_ask:'忘记这个文件夹吗？已收录的文件仍留在资料库中。',
  fo_scanning:'正在查看文件夹……已找到 {n} 个', fo_done:'共找到 {n} 个文件，其中 {new} 个是新的。', fo_missing:'{n} 个已不在原处', fo_last:'{n} 个文件 · 扫描于 {when}', fo_never:'尚未扫描',
  fo_err:'无法读取这个文件夹。', fo_gone:'这个文件夹已不可用，请重新添加。', fo_denied:'没有获得访问文件夹的权限。'
});
Object.assign(I18N.en, { fp_cover:'Cover', pl_skipped:'Skipped {n} file(s) that need to be found again.', pl_skipped_all:'The next {n} file(s) need to be found again. Open one from the library to choose it.', imp_sync_d:'Keep library, lists and where you stopped the same on every device, with a cloud account or a file.' });
Object.assign(I18N.zh, { fp_cover:'封面', pl_skipped:'已跳过 {n} 个需要重新定位的文件。', pl_skipped_all:'接下来的 {n} 个文件需要重新定位。请从资料库中打开其中一个来选择它。', imp_sync_d:'让每台设备上的资料库、清单和进度保持一致：用云盘账号，或用一个文件。' });

Object.assign(I18N.en, {
  rd_bm_untitled:'Bookmark', rd_bm_dup:'This place is already bookmarked', rd_found_cap:'showing the first 200',
  rd_nb_search:'Search bookmarks and notes', rd_nb_book:'Book order', rd_nb_new:'Newest first', rd_nb_empty:'Nothing here yet. Press D to bookmark a page, or select text to highlight it.', rd_nb_nomatch:'Nothing matches.',
  rd_nb_count:'{b} bookmarks · {h} highlights', rd_nb_name:'Name', rd_nb_note:'Note', rd_nb_edit:'Rename or add a note', rd_nb_add:'Bookmark this page', rd_nb_md:'Export as text', rd_nb_json:'Export file', rd_nb_import:'Import file',
  rd_nb_imported:'{n} added, {d} already there.', rd_nb_bad:'That file is not a notebook from this app.',
  pl_bm_dup:'Already bookmarked at {t}', pl_bm_rename:'Rename or add a note', pl_marks_time:'By time', pl_marks_new:'Newest first', pl_marks_filter:'Search bookmarks', pl_bm_name:'Name', pl_bm_note:'Note'
});
Object.assign(I18N.zh, {
  rd_bm_untitled:'书签', rd_bm_dup:'这个位置已经有书签了', rd_found_cap:'仅显示前 200 条',
  rd_nb_search:'搜索书签和笔记', rd_nb_book:'按书中顺序', rd_nb_new:'最新在前', rd_nb_empty:'这里还没有内容。按 D 给当前页加书签，或选中文字加高亮。', rd_nb_nomatch:'没有匹配的内容。',
  rd_nb_count:'{b} 个书签 · {h} 条高亮', rd_nb_name:'名称', rd_nb_note:'笔记', rd_nb_edit:'重命名或添加笔记', rd_nb_add:'给当前页加书签', rd_nb_md:'导出为文本', rd_nb_json:'导出文件', rd_nb_import:'导入文件',
  rd_nb_imported:'已添加 {n} 条，{d} 条已存在。', rd_nb_bad:'这不是本应用导出的笔记文件。',
  pl_bm_dup:'{t} 处已有书签', pl_bm_rename:'重命名或添加笔记', pl_marks_time:'按时间', pl_marks_new:'最新在前', pl_marks_filter:'搜索书签', pl_bm_name:'名称', pl_bm_note:'笔记'
});
Object.assign(I18N.en, { rc_marks:'Notebook', rc_marks_d:'Bookmarks, highlights and notes in one place: search them, order them, rename, add notes, remove, export or import.', rc_marks_m:'Everything you marked, together, without re-reading.', rc_marks_n:'Marks would be kept but spread out and hard to manage.', rc_marks_a:'M; the notebook button in the top bar.' });
Object.assign(I18N.zh, { rc_marks:'笔记本', rc_marks_d:'书签、高亮和笔记集中在一处：可搜索、排序、重命名、加笔记、删除、导出或导入。', rc_marks_m:'不必重读，就能集中看到所有标记。', rc_marks_n:'标记虽然保留，却分散而难以整理。', rc_marks_a:'M；顶部栏的笔记本按钮。' });
Object.assign(I18N.en, { rc_toc_d:'Lists the chapters and takes you to one.', rc_toc_a:'T; the list button in the top bar.' });
Object.assign(I18N.zh, { rc_toc_d:'列出章节并跳转。', rc_toc_a:'T；顶部栏的列表按钮。' });

Object.assign(I18N.en, { db_new:'New', lib_hide_all:'Hide all', lib_show_all:'Show all', calc_calculate:'Calculate', calc_none:'None', calc_count:'Count', calc_values:'Count values', calc_empty:'Count empty', calc_unique:'Count unique', calc_pfilled:'Percent filled', calc_pempty:'Percent empty', calc_sum:'Sum', calc_avg:'Average', calc_median:'Median', calc_min:'Min', calc_max:'Max', calc_range:'Range', calc_earliest:'Earliest', calc_latest:'Latest', ask_avatar:'Assistant' });
Object.assign(I18N.zh, { db_new:'新建', lib_hide_all:'全部隐藏', lib_show_all:'全部显示', calc_calculate:'计算', calc_none:'无', calc_count:'总数', calc_values:'非空数', calc_empty:'空值数', calc_unique:'唯一值数', calc_pfilled:'非空占比', calc_pempty:'空值占比', calc_sum:'求和', calc_avg:'平均值', calc_median:'中位数', calc_min:'最小值', calc_max:'最大值', calc_range:'极差', calc_earliest:'最早', calc_latest:'最晚', ask_avatar:'助手' });

Object.assign(I18N.en, { hint_off:"Don't show again", hint_off_done:'Hint hidden. Turn hints back on in Settings → Features.', sw_hints:'Show hints', sw_hints_d:'Short tips that appear while you work. Each one can also be hidden on its own. All shortcuts are listed in the Guide.', gd_keys:'Shortcuts', kk_title:'Shortcuts and hints', kk_lead:'Terms, page notes and every shortcut, in one place. Hints can be switched off in Settings → Features.', kk_lib:'Library and Files', kk_player:'Player', kk_reader:'Reader', kk_open:'Open the Settings switch', kk_tick:'Tick a row or card', kk_range:'Tick a range', kk_start:'Start a selection from any layout', kk_all:'Select everything shown', kk_end:'Clear the selection', kk_fill:'Fill down: drag the small square at a cell\'s corner', kk_cell:'Edit a cell', kk_calc:'Choose a footer calculation', kk_tour:'Pages', kk_tourd:'Each page used to carry a note under its title. They now live here: Tracker lists what you want to watch, read or play; Files library is your own files; Lists curates collections; Insights charts your year; Profile is your public page; Import, Export and Share move data in and out; Ask answers questions about your library.' , bagg:'Summary', bagg_none:'None', bagg_count:'Count', fill_n:'Filled {n} cells', fill_ro:'This column cannot be filled' });
Object.assign(I18N.zh, { hint_off:'不再提示', hint_off_done:'提示已隐藏。可在 设置 → 功能 中重新打开。', sw_hints:'显示提示', sw_hints_d:'操作时出现的简短提示，每条也可单独隐藏。所有快捷键都列在指南里。', gd_keys:'快捷键', kk_title:'快捷键与提示', kk_lead:'词汇、页面说明和所有快捷键，集中在这里。', kk_lib:'资料库与文件', kk_player:'播放器', kk_reader:'阅读器', kk_open:'打开设置开关', kk_tick:'勾选一行或一张卡片', kk_range:'勾选一段', kk_start:'在任意布局中开始选择', kk_all:'选中当前显示的全部', kk_end:'清除选择', kk_fill:'向下填充：拖动单元格角上的小方块', kk_cell:'编辑单元格', kk_calc:'选择底部计算', kk_tour:'页面', kk_tourd:'各页标题下原有的说明都收在这里：追踪清单记录想看、想读、想玩的；文件库是你自己的文件；清单用来整理合集；洞察汇总你的一年；个人主页是你的公开页；导入、导出与分享负责数据进出；提问回答关于资料库的问题。', bagg:'汇总', bagg_none:'无', bagg_count:'总数', fill_n:'已填充 {n} 格', fill_ro:'此列无法填充' });

Object.assign(I18N.en, { calc_percent:'Percent', calc_more:'More' });
Object.assign(I18N.zh, { calc_percent:'占比', calc_more:'更多' });

Object.assign(I18N.en, { sel_hint:'Tick rows in the table to select them. Shift-click selects a range, ⌘/Ctrl+A selects everything shown. A change applies at once and can be undone from the message that follows.', tc_open:'Play / Read', hb_prev:'Previous page', hb_next:'Next page', hb_page:'Page {a} of {b}', hb_contents:'Contents' });
Object.assign(I18N.zh, { sel_hint:'在表格中勾选行即可选中；Shift 点击选中一段，⌘/Ctrl+A 选中当前显示的全部。每项更改立即生效，之后弹出的提示里都可以撤销。', tc_open:'播放 / 阅读', hb_prev:'上一页', hb_next:'下一页', hb_page:'第 {a} / {b} 页', hb_contents:'目录' });

Object.assign(I18N.en, { lib_sort_off:'Remove sort', lib_freeze:'Freeze up to this column', lib_unfreeze:'Unfreeze columns', lib_add_sort:'Add a sort' });
Object.assign(I18N.zh, { lib_sort_off:'取消排序', lib_freeze:'冻结至此列', lib_unfreeze:'取消冻结', lib_add_sort:'添加排序' });

Object.assign(I18N.en, { pt_action:'Play / Read' });
Object.assign(I18N.zh, { pt_action:'播放 / 阅读' });
