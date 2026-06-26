/* ═══════════════════════════════════════════════════
   NEXUS Chat · app.js  v3.0  Dock Edition
═══════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://xoazpnamzmluqedmggty.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYXpwbmFtem1sdXFlZG1nZ3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjE1MzksImV4cCI6MjA5Nzc5NzUzOX0.4THXg-WGVHZzQMkM4gaH-W7QOTden58ICRiLa1q_y_k';
const REDIRECT_URL = 'https://www.xxcyou.com/chat';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce' } });

let me = null, isAdmin = false, myProfile = null;
let channels = [], currentChannel = null;
let realtimeSub = null, replyTo = null;
let presenceChannel = null, onlineUsers = {};
let tokenTimer = null, currentToken = null;
let activeMenu = null, activePanel = null;

const EMOJIS = [
  '😀','😂','🤣','😊','😍','🥰','😎','🤔','😅','😭','😤','🥳',
  '👍','👎','❤️','🔥','✨','💯','🎉','🎊','😈','💀','👀','🙈',
  '🤡','💪','🙏','👋','✌️','🤞','🫡','😏','🥺','😴','🤓','👻',
  '🐱','🐶','🦊','🐻','🐼','🦄','🐉','🌙','⭐','☀️','🌈','⚡',
];

/* ══════════════════════════════════ INIT ══════════════════════════════════ */
async function init() {
  buildEmojiPicker();
  bindUI();

  const search = window.location.search;
  const hash = window.location.hash;

  // 错误处理
  if (search.includes('error=')) {
    const p = new URLSearchParams(search);
    toast('登录失败：' + (p.get('error_description') || p.get('error')), 4000);
    window.history.replaceState(null, '', REDIRECT_URL);
    showAuth();
    return;
  }

  // 监听所有 auth 事件（必须最先注册）
  sb.auth.onAuthStateChange(async (event, session) => {
    console.log('auth event:', event, !!session);
    if (event === 'SIGNED_IN' && session) {
      window.history.replaceState(null, '', REDIRECT_URL);
      if (document.getElementById('auth-screen').style.display !== 'none') {
        await showApp(session.user);
      }
    } else if (event === 'SIGNED_OUT') {
      showAuth();
    }
  });

  // PKCE 回调：有 code 参数时 supabase 会自动处理并触发 SIGNED_IN
  if (search.includes('code=')) {
    // supabase js v2 会自动检测 URL 中的 code 并兑换
    // 等待 onAuthStateChange 触发即可，这里先显示加载状态
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';

    // 兜底：3秒后还没跳转就手动检查
    setTimeout(async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (session && document.getElementById('auth-screen').style.display !== 'none') {
        window.history.replaceState(null, '', REDIRECT_URL);
        await showApp(session.user);
      } else if (!session) {
        toast('登录超时，请重试');
        showAuth();
      }
    }, 3000);
    return;
  }

  // 普通访问：检查已有 session
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await showApp(session.user);
  } else {
    showAuth();
  }
}

/* ══════════════════════════════════ AUTH ══════════════════════════════════ */
function showAuth() {
  me = null; isAdmin = false; myProfile = null;
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  cleanupPresence();
}

async function showApp(user) {
  me = user;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  await checkAdmin();
  await loadProfile();
  await loadAnnouncements();
  await loadChannels();
  setupPresence();
}

/* ══════════════════════════════════ ADMIN ══════════════════════════════════ */
async function checkAdmin() {
  const { data } = await sb.from('admins').select('user_id').eq('user_id', me.id).single();
  isAdmin = !!data;
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
  // Show admin dock button
  const adminBtn = document.getElementById('dock-admin');
  if (adminBtn) adminBtn.style.display = isAdmin ? 'flex' : 'none';
}

/* ══════════════════════════════════ PROFILE ══════════════════════════════════ */
async function loadProfile() {
  const ghName = me.user_metadata?.user_name || me.email?.split('@')[0] || '用户';
  const ghAvatar = me.user_metadata?.avatar_url || null;

  // Try load existing profile
  const { data, error } = await sb.from('profiles').select('*').eq('user_id', me.id).single();

  if (data && !error) {
    // Always keep github_username in sync
    myProfile = { ...data };
    if (!myProfile.avatar_url) myProfile.avatar_url = ghAvatar;
  } else {
    // First login - create profile
    const insertData = {
      user_id: me.id,
      github_username: ghName,
      display_name: ghName,
      avatar_url: ghAvatar,
    };
    const { data: newProf } = await sb.from('profiles').insert(insertData).select().single();
    myProfile = newProf || insertData;
  }

  updateDockAvatar();
  updateProfilePanel();
}

function updateDockAvatar() {
  if (!myProfile) return;
  const name = myProfile.display_name || myProfile.github_username || '我';
  const avatar = myProfile.avatar_url;

  // Dock center
  const imgEl = document.getElementById('dock-avatar-img');
  const phEl  = document.getElementById('dock-avatar-ph');
  const nameEl = document.getElementById('dock-display-name');

  if (avatar) {
    imgEl.src = avatar; imgEl.style.display = 'block'; phEl.style.display = 'none';
  } else {
    phEl.textContent = name[0].toUpperCase(); imgEl.style.display = 'none'; phEl.style.display = 'flex';
  }

  // Show admin tag under avatar if admin
  if (nameEl) {
    nameEl.innerHTML = esc(name.length > 6 ? name.slice(0,6)+'…' : name);
    if (isAdmin) {
      nameEl.innerHTML += ' <span class="dock-admin-tag">ADM</span>';
    }
  }
}

function updateProfilePanel() {
  if (!myProfile) return;
  const ghName = myProfile.github_username || me.user_metadata?.user_name || '';
  const dispName = myProfile.display_name || ghName;
  const avatar = myProfile.avatar_url;

  document.getElementById('profile-display-name').value = dispName;
  document.getElementById('profile-github-name').textContent = '@' + ghName + ' · GitHub 用户名不可修改';

  const imgEl = document.getElementById('profile-avatar-img');
  const phEl  = document.getElementById('profile-avatar-ph');
  if (avatar) {
    imgEl.src = avatar; imgEl.style.display = 'block'; phEl.style.display = 'none';
  } else {
    phEl.textContent = dispName[0].toUpperCase(); imgEl.style.display = 'none'; phEl.style.display = 'flex';
  }
}

async function saveProfile() {
  const displayName = document.getElementById('profile-display-name').value.trim();
  if (!displayName) { toast('昵称不能为空'); return; }
  if (displayName.length > 20) { toast('昵称最多20字'); return; }

  const ghName = myProfile?.github_username || me.user_metadata?.user_name || me.email?.split('@')[0] || '';

  // Try update first, then insert
  const { data: existing } = await sb.from('profiles').select('user_id').eq('user_id', me.id).single();

  let error;
  if (existing) {
    const res = await sb.from('profiles').update({
      display_name: displayName,
      updated_at: new Date().toISOString(),
    }).eq('user_id', me.id);
    error = res.error;
  } else {
    const res = await sb.from('profiles').insert({
      user_id: me.id,
      github_username: ghName,
      display_name: displayName,
      avatar_url: myProfile?.avatar_url || null,
    });
    error = res.error;
  }

  if (error) { toast('保存失败：' + error.message); return; }
  myProfile = { ...myProfile, display_name: displayName, github_username: ghName };
  updateDockAvatar();
  updateProfilePanel();
  toast('✓ 昵称已保存');
}

async function uploadAvatar(file) {
  if (file.size > 2 * 1024 * 1024) { toast('头像不能超过 2MB'); return; }
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${me.id}/avatar.${ext}`;

  const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
  if (upErr) { toast('上传失败：' + upErr.message); return; }

  const { data } = sb.storage.from('avatars').getPublicUrl(path);
  const url = data.publicUrl + '?t=' + Date.now(); // bust cache

  const { error } = await sb.from('profiles').upsert({
    user_id: me.id,
    github_username: myProfile?.github_username || '',
    display_name: myProfile?.display_name || '',
    avatar_url: url,
    updated_at: new Date().toISOString(),
  });

  if (error) { toast('保存头像失败'); return; }
  myProfile = { ...myProfile, avatar_url: url };
  updateDockAvatar();
  updateProfilePanel();
  toast('✓ 头像已更新');
}

/* ══════════════════════════════════ DOCK ══════════════════════════════════ */
function openPanel(panelId) {
  // Close all panels first
  document.querySelectorAll('.dock-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
  removeOverlay();
  document.getElementById('token-widget').style.display = 'none';

  if (activePanel === panelId) {
    activePanel = null;
    return;
  }

  const panel = document.getElementById('panel-' + panelId);
  if (!panel) return;

  panel.style.display = 'flex';
  activePanel = panelId;

  const btn = document.getElementById('dock-' + panelId);
  if (btn) btn.classList.add('active');

  // No overlay needed - click outside closes via document listener
}

function closePanel() {
  document.querySelectorAll('.dock-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
  activePanel = null;
  removeOverlay();
}

function closePanelAndToken() {
  closePanel();
  document.getElementById('token-widget').style.display = 'none';
}

function addOverlay(cb) {
  removeOverlay();
  const el = document.createElement('div');
  el.className = 'panel-overlay'; el.id = 'panel-overlay';
  el.addEventListener('click', cb);
  document.body.appendChild(el);
}

function removeOverlay() {
  document.getElementById('panel-overlay')?.remove();
}

/* Dock slide up/down */
function toggleDock() {
  const dock = document.getElementById('dock-wrap');
  dock.classList.toggle('expanded');
}

function collapseDock() {
  document.getElementById('dock-wrap').classList.remove('expanded');
}

function expandDock() {
  document.getElementById('dock-wrap').classList.add('expanded');
}

/* ══════════════════════════════════ CHANNELS ══════════════════════════════════ */
async function loadChannels() {
  const { data } = await sb.from('channels').select('*').order('id');
  channels = data || [];
  renderChannelList();
  if (channels.length > 0) selectChannel(channels[0]);
}

function renderChannelList() {
  const list = document.getElementById('channel-list');
  list.innerHTML = '';
  channels.forEach(ch => {
    const el = document.createElement('div');
    el.className = 'channel-item' + (currentChannel?.id === ch.id ? ' active' : '');
    const delBtn = isAdmin ? `<button class="ch-delete-btn" data-id="${ch.id}">✕</button>` : '';
    el.innerHTML = `<span class="ch-hash">#</span><span class="ch-name">${esc(ch.name)}</span>${delBtn}`;
    el.addEventListener('click', e => {
      if (e.target.classList.contains('ch-delete-btn')) return;
      selectChannel(ch);
      closePanel();
    });
    el.querySelector('.ch-delete-btn')?.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm(`删除 #${ch.name}？`)) return;
      const { error } = await sb.from('channels').delete().eq('id', ch.id);
      if (error) { toast('删除失败'); return; }
      channels = channels.filter(c => c.id !== ch.id);
      renderChannelList();
      if (currentChannel?.id === ch.id && channels.length > 0) selectChannel(channels[0]);
      toast('✓ 频道已删除');
    });
    list.appendChild(el);
  });
}

async function selectChannel(ch) {
  currentChannel = ch;
  document.getElementById('channel-title').textContent = ch.name;
  document.getElementById('channel-desc').textContent = ch.description || '';
  renderChannelList();
  clearReply();
  await loadMessages();
  subscribeRealtime();
}

async function createChannel(name, desc) {
  if (!isAdmin) { toast('⛔ 权限不足'); return; }
  name = name.trim();
  if (!name) { toast('请输入频道名称'); return; }
  const { data, error } = await sb.from('channels')
    .insert({ name, description: desc.trim() || null }).select().single();
  if (error) { toast('创建失败：' + error.message); return; }
  channels.push(data);
  renderChannelList();
  selectChannel(data);
  toast('✓ #' + name + ' 已创建');
}

/* ══════════════════════════════════ MESSAGES ══════════════════════════════════ */
async function loadMessages() {
  if (!currentChannel) return;
  const msgEl = document.getElementById('messages');
  msgEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-title">加载中…</div></div>';

  const { data, error } = await sb.from('messages')
    .select('*')
    .eq('channel_id', currentChannel.id)
    .order('created_at', { ascending: true })
    .limit(120);

  msgEl.innerHTML = '';

  if (error) {
    console.error('loadMessages error:', error);
    msgEl.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">加载失败</div><div class="empty-sub">${esc(error.message)}</div></div>`;
    return;
  }

  if (!data || data.length === 0) {
    msgEl.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div>
      <div class="empty-title">#${esc(currentChannel.name)}</div>
      <div class="empty-sub">来说第一句话吧</div></div>`;
    return;
  }

  let lastDay = null;
  data.forEach(msg => {
    const day = new Date(msg.created_at).toLocaleDateString('zh-CN');
    if (day !== lastDay) {
      const sep = document.createElement('div');
      sep.className = 'day-sep'; sep.textContent = day;
      msgEl.appendChild(sep); lastDay = day;
    }
    msgEl.appendChild(buildMsgEl(msg));
  });
  scrollBottom(true);
}

function buildMsgEl(msg) {
  const isMe = me && msg.user_id === me.id;
  const canDelete = isAdmin || isMe;
  const time = new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const initial = (msg.username || '?')[0].toUpperCase();

  const div = document.createElement('div');
  div.className = 'msg'; div.dataset.id = msg.id;

  const avatarHTML = msg.avatar_url
    ? `<img class="msg-avatar" src="${esc(msg.avatar_url)}" alt="" loading="lazy"/>`
    : `<div class="msg-avatar-ph">${esc(initial)}</div>`;

  let replyHTML = '';
  if (msg.reply_to_id && msg.reply_to_username) {
    const ref = msg.reply_to_content
      ? (msg.reply_to_content.length > 60 ? msg.reply_to_content.slice(0,60)+'…' : msg.reply_to_content)
      : '[图片]';
    replyHTML = `<div class="msg-reply-ref" data-target="${msg.reply_to_id}">
      <span class="reply-ref-user">@${esc(msg.reply_to_username)}</span>${esc(ref)}</div>`;
  }

  let contentHTML = '';
  if (msg.image_url) contentHTML = `<img class="msg-image" src="${esc(msg.image_url)}" alt="" loading="lazy" data-fullsrc="${esc(msg.image_url)}"/>`;
  if (msg.content) contentHTML += `<div class="msg-text">${esc(msg.content)}</div>`;

  let menuItems = `<button class="menu-item reply-btn"><span class="menu-icon">↩</span>回复</button>`;
  if (!isMe) menuItems += `<button class="menu-item report-btn"><span class="menu-icon">🚨</span>举报</button>`;
  if (canDelete) menuItems += `<button class="menu-item danger delete-btn"><span class="menu-icon">🗑</span>删除</button>`;
  if (isAdmin && !isMe) menuItems += `<button class="menu-item danger ban-msg-btn"><span class="menu-icon">🚫</span>封禁用户</button>`;

  div.innerHTML = `
    <div class="msg-avatar-wrap">${avatarHTML}</div>
    <div class="msg-body">
      ${replyHTML}
      <div class="msg-meta">
        <span class="msg-username${isMe?' is-me':''}">${esc(msg.username)}</span>
        <span class="msg-time">${time}</span>
      </div>
      ${contentHTML}
    </div>
    <div class="msg-actions">
      <button class="msg-action-trigger">⋯</button>
      <div class="msg-action-menu">${menuItems}</div>
    </div>`;

  const trigger = div.querySelector('.msg-action-trigger');
  const menu = div.querySelector('.msg-action-menu');
  trigger.addEventListener('click', e => {
    e.stopPropagation();
    // Close other menus
    document.querySelectorAll('.msg-action-menu.open').forEach(m => {
      if (m !== menu) m.classList.remove('open');
    });
    // Position menu relative to trigger
    const rect = trigger.getBoundingClientRect();
    const menuW = 140;
    const menuH = 36 * menu.querySelectorAll('.menu-item').length + 8;
    // horizontal: align right edge with trigger right
    let right = window.innerWidth - rect.right;
    if (right < 0) right = 8;
    // vertical: prefer above trigger
    let top = rect.top - menuH - 6;
    if (top < 60) top = rect.bottom + 6; // flip below if no space
    menu.style.position = 'fixed';
    menu.style.top = top + 'px';
    menu.style.right = right + 'px';
    menu.style.left = 'auto';
    menu.classList.toggle('open');
    activeMenu = menu.classList.contains('open') ? menu : null;
  });

  div.querySelector('.reply-btn')?.addEventListener('click', () => { menu.classList.remove('open'); setReply(msg); });
  div.querySelector('.report-btn')?.addEventListener('click', () => { menu.classList.remove('open'); reportMsg(msg); });
  div.querySelector('.delete-btn')?.addEventListener('click', async () => {
    menu.classList.remove('open');
    if (!confirm('确定删除？')) return;
    const { error } = await sb.from('messages').delete().eq('id', msg.id);
    if (error) { toast('删除失败'); return; }
    div.style.opacity = '0'; div.style.transition = 'opacity .3s';
    setTimeout(() => div.remove(), 300);
  });
  div.querySelector('.ban-msg-btn')?.addEventListener('click', async () => {
    menu.classList.remove('open');
    if (!confirm(`封禁 ${msg.username}？`)) return;
    const { error } = await sb.from('banned_users').insert({
      user_id: msg.user_id, github_name: msg.username, banned_by: me.id, reason: '管理员操作'
    });
    if (error) toast('封禁失败：' + error.message);
    else toast(`✓ 已封禁 ${msg.username}`);
  });

  div.querySelector('.msg-image')?.addEventListener('click', e => {
    document.getElementById('modal-img-src').src = e.target.dataset.fullsrc;
    document.getElementById('modal-img').style.display = 'flex';
  });
  div.querySelector('.msg-reply-ref')?.addEventListener('click', () => scrollToMsg(msg.reply_to_id));

  return div;
}

function scrollBottom(force = false) {
  const el = document.getElementById('messages');
  if (force || el.scrollHeight - el.scrollTop - el.clientHeight < 120)
    el.scrollTop = el.scrollHeight;
}

function scrollToMsg(id) {
  const t = document.querySelector(`.msg[data-id="${id}"]`);
  if (t) {
    t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    t.style.background = 'rgba(124,58,237,.2)';
    setTimeout(() => t.style.background = '', 1200);
  }
}

/* ══════════════════════════════════ SEND ══════════════════════════════════ */
async function sendMessage() {
  if (!me || !currentChannel) return;
  const input = document.getElementById('msg-input');
  const content = input.value.trim();
  if (!content) return;
  document.getElementById('btn-send').disabled = true;

  const payload = { channel_id: currentChannel.id, content };
  if (replyTo) {
    payload.reply_to_id = replyTo.id;
    payload.reply_to_username = replyTo.username;
    payload.reply_to_content = replyTo.content || null;
  }

  const { error } = await sb.from('messages').insert(payload);
  if (error) toast('发送失败：' + (error.message || '可能已被封禁'));
  else { input.value = ''; input.style.height = 'auto'; clearReply(); }
  document.getElementById('btn-send').disabled = false;
  input.focus();
}

/* ══════════════════════════════════ IMAGE ══════════════════════════════════ */
async function uploadAndSend(file) {
  if (!me || !currentChannel) return;
  if (file.size > 5*1024*1024) { toast('图片不能超过 5MB'); return; }
  const ind = document.createElement('div');
  ind.className = 'upload-indicator'; ind.textContent = '上传中…';
  document.querySelector('.input-area').prepend(ind);

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${me.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await sb.storage.from('chat-images').upload(path, file);
  if (upErr) { toast('上传失败'); ind.remove(); return; }

  const { data } = sb.storage.from('chat-images').getPublicUrl(path);
  const payload = { channel_id: currentChannel.id, content: null, image_url: data.publicUrl };
  if (replyTo) {
    payload.reply_to_id = replyTo.id;
    payload.reply_to_username = replyTo.username;
    payload.reply_to_content = replyTo.content || null;
  }
  const { error } = await sb.from('messages').insert(payload);
  if (error) toast('发送失败');
  else clearReply();
  ind.remove();
}

/* ══════════════════════════════════ REALTIME ══════════════════════════════════ */
function subscribeRealtime() {
  if (realtimeSub) sb.removeChannel(realtimeSub);
  realtimeSub = sb.channel(`msgs-${currentChannel.id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages',
      filter: `channel_id=eq.${currentChannel.id}` }, payload => {
      const msgEl = document.getElementById('messages');
      if (msgEl.querySelector('.empty-state')) msgEl.innerHTML = '';
      const day = new Date(payload.new.created_at).toLocaleDateString('zh-CN');
      const seps = msgEl.querySelectorAll('.day-sep');
      const lastSep = seps[seps.length-1];
      if (!lastSep || lastSep.textContent !== day) {
        const sep = document.createElement('div');
        sep.className = 'day-sep'; sep.textContent = day;
        msgEl.appendChild(sep);
      }
      msgEl.appendChild(buildMsgEl(payload.new));
      scrollBottom();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages',
      filter: `channel_id=eq.${currentChannel.id}` }, payload => {
      const el = document.querySelector(`.msg[data-id="${payload.old.id}"]`);
      if (el) { el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }
    })
    .subscribe();
}

/* ══════════════════════════════════ PRESENCE ══════════════════════════════════ */
function setupPresence() {
  if (presenceChannel) sb.removeChannel(presenceChannel);
  const name = myProfile?.display_name || me.user_metadata?.user_name || '用户';
  const avatar = myProfile?.avatar_url || null;
  presenceChannel = sb.channel('online-users', { config: { presence: { key: me.id } } });
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      onlineUsers = {};
      Object.values(state).forEach(arr => arr.forEach(u => { onlineUsers[u.user_id] = u; }));
      renderOnlineUsers();
    })
    .subscribe(async status => {
      if (status === 'SUBSCRIBED')
        await presenceChannel.track({ user_id: me.id, username: name, avatar_url: avatar });
    });
}

function cleanupPresence() {
  if (presenceChannel) { sb.removeChannel(presenceChannel); presenceChannel = null; }
  onlineUsers = {}; renderOnlineUsers();
}

function renderOnlineUsers() {
  const count = Object.keys(onlineUsers).length;
  document.getElementById('online-count').textContent = count;
  document.getElementById('header-online').textContent = count;
  const list = document.getElementById('online-list');
  list.innerHTML = '';
  Object.values(onlineUsers).forEach(u => {
    const el = document.createElement('div');
    el.className = 'online-member';
    el.innerHTML = u.avatar_url
      ? `<img class="online-avatar" src="${esc(u.avatar_url)}" alt=""/><span>${esc(u.username)}</span>`
      : `<div class="online-avatar-ph">${esc((u.username||'?')[0].toUpperCase())}</div><span>${esc(u.username)}</span>`;
    list.appendChild(el);
  });
}

/* ══════════════════════════════════ ANNOUNCEMENTS ══════════════════════════════════ */
async function loadAnnouncements() {
  const { data } = await sb.from('announcements')
    .select('*').eq('pinned', true).order('created_at', { ascending: false }).limit(3);
  document.getElementById('announcement-bar')?.remove();
  if (!data?.length) return;
  const bar = document.createElement('div');
  bar.id = 'announcement-bar'; bar.className = 'announcement-bar';
  bar.innerHTML = data.map(a =>
    `<div class="announce-item"><span class="announce-icon">📢</span><span>${esc(a.content)}</span></div>`
  ).join('');
  document.querySelector('.chat-main').insertBefore(bar, document.getElementById('messages'));
}

/* ══════════════════════════════════ REPORT ══════════════════════════════════ */
async function reportMsg(msg) {
  if (!me) { toast('请先登录'); return; }
  if (msg.user_id === me.id) { toast('不能举报自己'); return; }
  const reason = prompt('举报原因（可选）：');
  if (reason === null) return;
  const { error } = await sb.from('reports').insert({
    message_id: msg.id, reported_by: me.id,
    reported_user_id: msg.user_id, reported_username: msg.username,
    reason: reason || null, status: 'pending',
  });
  if (error) toast('举报失败');
  else toast('✓ 举报已提交');
}

/* ══════════════════════════════════ REPLY ══════════════════════════════════ */
function setReply(msg) {
  replyTo = msg;
  document.getElementById('reply-bar').style.display = 'flex';
  document.getElementById('reply-user').textContent = msg.username;
  document.getElementById('reply-preview').textContent = msg.content
    ? (msg.content.length > 50 ? msg.content.slice(0,50)+'…' : msg.content) : '[图片]';
  document.getElementById('msg-input').focus();
}
function clearReply() {
  replyTo = null;
  document.getElementById('reply-bar').style.display = 'none';
}

/* ══════════════════════════════════ TOKEN ══════════════════════════════════ */
async function generateToken() {
  if (!me) { toast('请先登录'); return; }
  await sb.from('temp_tokens').delete().eq('user_id', me.id);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const { data: { session } } = await sb.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) { toast('获取 token 失败，请重新登录'); return; }
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { error } = await sb.from('temp_tokens').insert({
    code, user_id: me.id, access_token: accessToken, expires_at: expiresAt
  });
  if (error) { toast('生成失败：' + error.message); return; }
  currentToken = code;
  document.getElementById('token-code').textContent = code;
  startTokenTimer(300);
}

function startTokenTimer(seconds) {
  if (tokenTimer) clearInterval(tokenTimer);
  const timerEl = document.getElementById('token-timer');
  let remaining = seconds;
  timerEl.textContent = `有效期 ${remaining} 秒`;
  tokenTimer = setInterval(() => {
    remaining--;
    timerEl.textContent = `有效期 ${remaining} 秒`;
    if (remaining <= 0) {
      clearInterval(tokenTimer);
      timerEl.textContent = '已过期，请重新生成';
      document.getElementById('token-code').textContent = '------';
      currentToken = null;
    }
  }, 1000);
}

/* ══════════════════════════════════ EMOJI ══════════════════════════════════ */
function buildEmojiPicker() {
  const picker = document.getElementById('emoji-picker');
  EMOJIS.forEach(e => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn'; btn.textContent = e;
    btn.addEventListener('click', () => {
      const input = document.getElementById('msg-input');
      const pos = input.selectionStart;
      input.value = input.value.slice(0,pos) + e + input.value.slice(pos);
      input.selectionStart = input.selectionEnd = pos + e.length;
      input.focus();
    });
    picker.appendChild(btn);
  });
}

/* ══════════════════════════════════ UI BINDINGS ══════════════════════════════════ */
function bindUI() {
  // Auth
  document.getElementById('login-btn').addEventListener('click', () =>
    sb.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: REDIRECT_URL } }));
  document.getElementById('btn-logout').addEventListener('click', () => sb.auth.signOut());

  // Send
  document.getElementById('btn-send').addEventListener('click', sendMessage);
  document.getElementById('msg-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.getElementById('msg-input').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 140) + 'px';
  });

  // Emoji
  document.getElementById('btn-emoji').addEventListener('click', e => {
    e.stopPropagation();
    const picker = document.getElementById('emoji-picker');
    picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#emoji-picker') && !e.target.closest('#btn-emoji'))
      document.getElementById('emoji-picker').style.display = 'none';
    if (!e.target.closest('.msg-action-menu') && !e.target.closest('.msg-action-trigger')) {
      document.querySelectorAll('.msg-action-menu.open').forEach(m => m.classList.remove('open'));
      activeMenu = null;
    }
    if (!e.target.closest('#token-widget') && !e.target.closest('#dock-token'))
      document.getElementById('token-widget').style.display = 'none';
  });

  // Image upload
  document.getElementById('img-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) { uploadAndSend(file); e.target.value = ''; }
  });

  // Reply cancel
  document.getElementById('reply-cancel').addEventListener('click', clearReply);

  // Channel modal
  document.getElementById('btn-add-channel').addEventListener('click', () => {
    if (!isAdmin) { toast('⛔ 权限不足'); return; }
    document.getElementById('new-channel-name').value = '';
    document.getElementById('new-channel-desc').value = '';
    document.getElementById('modal-channel').style.display = 'flex';
    setTimeout(() => document.getElementById('new-channel-name').focus(), 50);
  });
  document.getElementById('modal-cancel').addEventListener('click', () =>
    document.getElementById('modal-channel').style.display = 'none');
  document.getElementById('modal-ok').addEventListener('click', async () => {
    const name = document.getElementById('new-channel-name').value;
    const desc = document.getElementById('new-channel-desc').value;
    document.getElementById('modal-channel').style.display = 'none';
    await createChannel(name, desc);
  });
  document.getElementById('new-channel-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('modal-ok').click();
  });

  // Image modal
  document.getElementById('modal-img-close').addEventListener('click', () =>
    document.getElementById('modal-img').style.display = 'none');
  document.getElementById('modal-img').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });
  document.getElementById('modal-channel').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });

  // ── DOCK - default collapsed (slide down) ──
  // collapseDock is called on init, expandDock on peek click

  document.getElementById('dock-peek').addEventListener('click', e => {
    e.stopPropagation();
    const dock = document.getElementById('dock-wrap');
    if (dock.classList.contains('expanded')) {
      closePanelAndToken();
      collapseDock();
    } else {
      expandDock();
    }
  });

  // Click outside dock+panels to collapse
  document.addEventListener('click', e => {
    const dock = document.getElementById('dock-wrap');
    if (!dock.classList.contains('expanded')) return;
    if (
      e.target.closest('#dock-wrap') ||
      e.target.closest('.dock-panel') ||
      e.target.closest('#token-widget')
    ) return;
    closePanelAndToken();
    collapseDock();
  });

  document.getElementById('dock-channels').addEventListener('click', e => {
    e.stopPropagation();
    openPanel('channels');
  });
  document.getElementById('dock-members').addEventListener('click', e => {
    e.stopPropagation();
    openPanel('members');
  });
  document.getElementById('dock-profile').addEventListener('click', e => {
    e.stopPropagation();
    updateProfilePanel();
    openPanel('profile');
  });
  document.getElementById('dock-admin')?.addEventListener('click', e => {
    e.stopPropagation();
    window.location.href = '/chat/admin';
  });
  document.getElementById('dock-token').addEventListener('click', async e => {
    e.stopPropagation();
    closePanel();
    const tw = document.getElementById('token-widget');
    const isHidden = tw.style.display === 'none' || tw.style.display === '';
    if (isHidden) {
      tw.style.display = 'block';
      if (!currentToken) await generateToken();
    } else {
      tw.style.display = 'none';
    }
  });

  // Token widget
  document.getElementById('token-copy-btn').addEventListener('click', () => {
    if (!currentToken) { toast('请先生成验证码'); return; }
    navigator.clipboard.writeText(currentToken).then(() => toast('✓ 验证码已复制'));
  });
  document.getElementById('token-refresh-btn').addEventListener('click', generateToken);

  // Profile
  document.getElementById('profile-save-btn').addEventListener('click', saveProfile);
  document.getElementById('avatar-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) { uploadAvatar(file); e.target.value = ''; }
  });
}

/* ══════════════════════════════════ UTILS ══════════════════════════════════ */
function esc(s) {
  return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
let toastTimer;
function toast(msg, duration = 2800) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), duration);
}

/* ── START ── */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
