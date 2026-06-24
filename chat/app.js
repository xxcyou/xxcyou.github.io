/* ═══════════════════════════════════════════════════
   NEXUS Chat · app.js
   Supabase + GitHub OAuth + Admin System
═══════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://xoazpnamzmluqedmggty.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYXpwbmFtem1sdXFlZG1nZ3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjE1MzksImV4cCI6MjA5Nzc5NzUzOX0.4THXg-WGVHZzQMkM4gaH-W7QOTden58ICRiLa1q_y_k';
const REDIRECT_URL = 'https://www.xxcyou.com/chat';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'pkce' }
});

/* ── STATE ── */
let me = null;
let isAdmin = false;
let channels = [];
let currentChannel = null;
let realtimeSub = null;
let replyTo = null;
let presenceChannel = null;
let onlineUsers = {};

const EMOJIS = [
  '😀','😂','🤣','😊','😍','🥰','😎','🤔','😅','😭','😤','🥳',
  '👍','👎','❤️','🔥','✨','💯','🎉','🎊','😈','💀','👀','🙈',
  '🤡','💪','🙏','👋','✌️','🤞','🫡','😏','🥺','😴','🤓','👻',
  '🐱','🐶','🦊','🐻','🐼','🦄','🐉','🌙','⭐','☀️','🌈','⚡',
];

/* ══════════════════════════════════
   INIT
══════════════════════════════════ */
async function init() {
  buildEmojiPicker();
  bindUI();

  const search = window.location.search;
  const hash = window.location.hash;

  if (hash.includes('access_token') || search.includes('code=')) {
    await sb.auth.getSession();
    window.history.replaceState(null, '', REDIRECT_URL);
  }

  if (search.includes('error=')) {
    const params = new URLSearchParams(search);
    toast('登录失败：' + (params.get('error_description') || params.get('error')), 4000);
    window.history.replaceState(null, '', REDIRECT_URL);
  }

  const { data: { session } } = await sb.auth.getSession();
  if (session) await showApp(session.user);
  else showAuth();

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) await showApp(session.user);
    else if (event === 'SIGNED_OUT') showAuth();
  });
}

/* ══════════════════════════════════
   AUTH
══════════════════════════════════ */
function showAuth() {
  me = null; isAdmin = false;
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  cleanupPresence();
}

async function showApp(user) {
  me = user;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  const name = user.user_metadata?.user_name || user.email?.split('@')[0] || '用户';
  const avatar = user.user_metadata?.avatar_url || null;

  document.getElementById('me-name').textContent = name;
  const imgEl = document.getElementById('me-avatar');
  const phEl  = document.getElementById('me-avatar-placeholder');
  if (avatar) {
    imgEl.src = avatar; imgEl.style.display = 'block'; phEl.style.display = 'none';
  } else {
    phEl.textContent = name[0].toUpperCase(); imgEl.style.display = 'none'; phEl.style.display = 'flex';
  }

  // 检查管理员身份（从数据库验证，前端无法伪造）
  await checkAdmin();

  await loadChannels();
  await loadAnnouncements();
  setupPresence();
}

async function checkAdmin() {
  const { data } = await sb.from('admins').select('user_id').eq('user_id', me.id).single();
  isAdmin = !!data;

  // 显示/隐藏管理员专属 UI
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  // 管理员标记
  const nameEl = document.getElementById('me-name');
  if (isAdmin && !nameEl.querySelector('.admin-tag')) {
    const tag = document.createElement('span');
    tag.className = 'admin-tag'; tag.textContent = 'ADMIN';
    nameEl.appendChild(tag);
  }
}

/* ══════════════════════════════════
   CHANNELS
══════════════════════════════════ */
async function loadChannels() {
  const { data, error } = await sb.from('channels').select('*').order('id');
  if (error) { toast('加载频道失败'); return; }
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
    el.dataset.id = ch.id;

    // 管理员显示删除频道按钮
    const adminBtn = isAdmin
      ? `<button class="ch-delete-btn admin-only" data-id="${ch.id}" title="删除频道">✕</button>`
      : '';

    el.innerHTML = `<span class="ch-hash">#</span><span class="ch-name">${esc(ch.name)}</span>${adminBtn}`;

    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('ch-delete-btn')) return;
      selectChannel(ch);
      document.getElementById('sidebar').classList.remove('open');
    });

    // 删除频道
    el.querySelector('.ch-delete-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`确定删除频道 #${ch.name}？此操作不可撤销。`)) return;
      const { error } = await sb.from('channels').delete().eq('id', ch.id);
      if (error) { toast('删除失败，数据库拒绝了请求'); return; }
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
    .insert({ name, description: desc.trim() || null })
    .select().single();
  if (error) { toast('创建失败：' + (error.message || '名称可能已存在或权限不足')); return; }
  channels.push(data);
  renderChannelList();
  selectChannel(data);
  toast('✓ 频道 #' + name + ' 已创建');
}

/* ══════════════════════════════════
   MESSAGES
══════════════════════════════════ */
async function loadMessages() {
  const msgEl = document.getElementById('messages');
  msgEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-title">加载中…</div></div>';

  const { data, error } = await sb.from('messages')
    .select('*')
    .eq('channel_id', currentChannel.id)
    .order('created_at', { ascending: true })
    .limit(120);

  msgEl.innerHTML = '';

  if (error) {
    msgEl.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">加载失败</div></div>';
    return;
  }

  if (!data || data.length === 0) {
    msgEl.innerHTML = `<div class="empty-state">
      <div class="empty-icon">💬</div>
      <div class="empty-title">#${esc(currentChannel.name)}</div>
      <div class="empty-sub">这是频道的开始，来说第一句话吧</div>
    </div>`;
    return;
  }

  let lastDay = null;
  data.forEach(msg => {
    const day = new Date(msg.created_at).toLocaleDateString('zh-CN');
    if (day !== lastDay) {
      const sep = document.createElement('div');
      sep.className = 'day-sep'; sep.textContent = day;
      msgEl.appendChild(sep);
      lastDay = day;
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
  div.className = 'msg';
  div.dataset.id = msg.id;

  const avatarHTML = msg.avatar_url
    ? `<img class="msg-avatar" src="${esc(msg.avatar_url)}" alt="" loading="lazy"/>`
    : `<div class="msg-avatar-ph">${esc(initial)}</div>`;

  let replyHTML = '';
  if (msg.reply_to_id && msg.reply_to_username) {
    const refText = msg.reply_to_content
      ? (msg.reply_to_content.length > 60 ? msg.reply_to_content.slice(0, 60) + '…' : msg.reply_to_content)
      : '[图片]';
    replyHTML = `<div class="msg-reply-ref" data-target="${msg.reply_to_id}">
      <span class="reply-ref-user">@${esc(msg.reply_to_username)}</span>${esc(refText)}
    </div>`;
  }

  let contentHTML = '';
  if (msg.image_url) {
    contentHTML = `<img class="msg-image" src="${esc(msg.image_url)}" alt="图片" loading="lazy" data-fullsrc="${esc(msg.image_url)}"/>`;
  }
  if (msg.content) {
    contentHTML += `<div class="msg-text">${esc(msg.content)}</div>`;
  }

  // 管理员标记
  const isAdminMsg = false; // 可扩展：检查发送者是否是管理员

  // 操作按钮：回复所有人可用，删除仅自己或管理员
  const deleteBtn = canDelete
    ? `<button class="msg-action-btn delete-btn" title="删除">🗑 删除</button>`
    : '';

  div.innerHTML = `
    <div class="msg-avatar-wrap">${avatarHTML}</div>
    <div class="msg-body">
      ${replyHTML}
      <div class="msg-meta">
        <span class="msg-username${isMe ? ' is-me' : ''}">${esc(msg.username)}</span>
        ${isAdmin && !isMe ? '<span class="admin-viewing-tag">👑</span>' : ''}
        <span class="msg-time">${time}</span>
      </div>
      ${contentHTML}
    </div>
    <div class="msg-actions">
      <button class="msg-action-btn reply-btn" title="回复">↩ 回复</button>
      <button class="msg-action-btn report-btn" title="举报">🚨 举报</button>
      ${deleteBtn}
    </div>`;

  div.querySelector(".reply-btn").addEventListener("click", () => setReply(msg));
  div.querySelector(".report-btn")?.addEventListener("click", () => reportMsg(msg));

  div.querySelector('.delete-btn')?.addEventListener('click', async () => {
    if (!confirm('确定删除这条消息？')) return;
    const { error } = await sb.from('messages').delete().eq('id', msg.id);
    if (error) { toast('删除失败，权限不足'); return; }
    div.style.opacity = '0';
    div.style.transition = 'opacity .3s';
    setTimeout(() => div.remove(), 300);
  });

  const imgEl = div.querySelector('.msg-image');
  if (imgEl) {
    imgEl.addEventListener('click', () => {
      document.getElementById('modal-img-src').src = imgEl.dataset.fullsrc;
      document.getElementById('modal-img').style.display = 'flex';
    });
  }

  if (msg.reply_to_id) {
    div.querySelector('.msg-reply-ref')?.addEventListener('click', () => scrollToMsg(msg.reply_to_id));
  }

  return div;
}

function scrollBottom(force = false) {
  const el = document.getElementById('messages');
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  if (force || atBottom) el.scrollTop = el.scrollHeight;
}

function scrollToMsg(id) {
  const target = document.querySelector(`.msg[data-id="${id}"]`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.style.background = 'rgba(124,58,237,.2)';
    setTimeout(() => target.style.background = '', 1200);
  }
}

/* ══════════════════════════════════
   SEND MESSAGE
══════════════════════════════════ */
async function sendMessage() {
  if (!me || !currentChannel) return;
  const input = document.getElementById('msg-input');
  const content = input.value.trim();
  if (!content) return;

  const btn = document.getElementById('btn-send');
  btn.disabled = true;

  const payload = { channel_id: currentChannel.id, content };
  if (replyTo) {
    payload.reply_to_id = replyTo.id;
    payload.reply_to_username = replyTo.username;
    payload.reply_to_content = replyTo.content || null;
  }

  const { error } = await sb.from('messages').insert(payload);
  if (error) toast('发送失败');
  else { input.value = ''; input.style.height = 'auto'; clearReply(); }

  btn.disabled = false;
  input.focus();
}

/* ══════════════════════════════════
   IMAGE UPLOAD
══════════════════════════════════ */
async function uploadAndSend(file) {
  if (!me || !currentChannel) return;
  if (file.size > 5 * 1024 * 1024) { toast('图片不能超过 5MB'); return; }

  const inputArea = document.querySelector('.input-area');
  const ind = document.createElement('div');
  ind.className = 'upload-indicator'; ind.textContent = '上传中…';
  inputArea.prepend(ind);

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${me.id}/${Date.now()}.${ext}`;

  const { error: upErr } = await sb.storage.from('chat-images').upload(path, file);
  if (upErr) { toast('上传失败：' + upErr.message); ind.remove(); return; }

  const { data } = sb.storage.from('chat-images').getPublicUrl(path);

  const payload = { channel_id: currentChannel.id, content: null, image_url: data.publicUrl };
  if (replyTo) {
    payload.reply_to_id = replyTo.id;
    payload.reply_to_username = replyTo.username;
    payload.reply_to_content = replyTo.content || null;
  }

  const { error: msgErr } = await sb.from('messages').insert(payload);
  if (msgErr) toast('消息发送失败');
  else clearReply();
  ind.remove();
}

/* ══════════════════════════════════
   REALTIME
══════════════════════════════════ */
function subscribeRealtime() {
  if (realtimeSub) sb.removeChannel(realtimeSub);

  realtimeSub = sb.channel(`msgs-${currentChannel.id}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `channel_id=eq.${currentChannel.id}`
    }, payload => {
      const msg = payload.new;
      const msgEl = document.getElementById('messages');
      const empty = msgEl.querySelector('.empty-state');
      if (empty) msgEl.innerHTML = '';

      const day = new Date(msg.created_at).toLocaleDateString('zh-CN');
      const seps = msgEl.querySelectorAll('.day-sep');
      const lastSep = seps[seps.length - 1];
      if (!lastSep || lastSep.textContent !== day) {
        const sep = document.createElement('div');
        sep.className = 'day-sep'; sep.textContent = day;
        msgEl.appendChild(sep);
      }

      msgEl.appendChild(buildMsgEl(msg));
      scrollBottom();
    })
    .on('postgres_changes', {
      event: 'DELETE', schema: 'public', table: 'messages',
      filter: `channel_id=eq.${currentChannel.id}`
    }, payload => {
      const el = document.querySelector(`.msg[data-id="${payload.old.id}"]`);
      if (el) { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }
    })
    .subscribe();
}

/* ══════════════════════════════════
   PRESENCE
══════════════════════════════════ */
async function loadAnnouncements() {
  const { data } = await sb.from("announcements")
    .select("*").eq("pinned", true).order("created_at", { ascending: false }).limit(3);
  const existing = document.getElementById("announcement-bar");
  if (existing) existing.remove();
  if (!data || data.length === 0) return;
  const bar = document.createElement("div");
  bar.id = "announcement-bar";
  bar.className = "announcement-bar";
  bar.innerHTML = data.map(a => `<div class="announce-item"><span class="announce-icon">📢</span><span>${esc(a.content)}</span></div>`).join("");
  document.querySelector(".chat-main").insertBefore(bar, document.getElementById("messages"));
}


function setupPresence() {
  if (presenceChannel) sb.removeChannel(presenceChannel);

  const name = me.user_metadata?.user_name || me.email?.split('@')[0] || '用户';
  const avatar = me.user_metadata?.avatar_url || null;

  presenceChannel = sb.channel('online-users', {
    config: { presence: { key: me.id } }
  });

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      onlineUsers = {};
      Object.values(state).forEach(arr => arr.forEach(u => { onlineUsers[u.user_id] = u; }));
      renderOnlineUsers();
    })
    .subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ user_id: me.id, username: name, avatar_url: avatar });
      }
    });
}

function cleanupPresence() {
  if (presenceChannel) { sb.removeChannel(presenceChannel); presenceChannel = null; }
  onlineUsers = {};
  renderOnlineUsers();
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
      ? `<img class="online-member-avatar" src="${esc(u.avatar_url)}" alt=""/><span>${esc(u.username)}</span>`
      : `<div class="online-member-dot">${esc((u.username||'?')[0].toUpperCase())}</div><span>${esc(u.username)}</span>`;
    list.appendChild(el);
  });
}

/* ══════════════════════════════════
   REPLY
══════════════════════════════════ */
function setReply(msg) {
  replyTo = msg;
  document.getElementById('reply-bar').style.display = 'flex';
  document.getElementById('reply-user').textContent = msg.username;
  document.getElementById('reply-preview').textContent = msg.content
    ? (msg.content.length > 50 ? msg.content.slice(0, 50) + '…' : msg.content)
    : '[图片]';
  document.getElementById('msg-input').focus();
}

async function reportMsg(msg) {
  if (!me) { toast("请先登录"); return; }
  if (msg.user_id === me.id) { toast("不能举报自己的消息"); return; }
  const reason = prompt("举报原因（可选）：");
  if (reason === null) return;
  const { error } = await sb.from("reports").insert({
    message_id: msg.id,
    reported_by: me.id,
    reported_user_id: msg.user_id,
    reported_username: msg.username,
    reason: reason || null,
    status: "pending",
  });
  if (error) { toast("举报失败"); return; }
  toast("✓ 举报已提交，管理员将会处理");
}


function clearReply() {
  replyTo = null;
  document.getElementById('reply-bar').style.display = 'none';
}

/* ══════════════════════════════════
   EMOJI PICKER
══════════════════════════════════ */
function buildEmojiPicker() {
  const picker = document.getElementById('emoji-picker');
  EMOJIS.forEach(e => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn'; btn.textContent = e;
    btn.addEventListener('click', () => {
      const input = document.getElementById('msg-input');
      const pos = input.selectionStart;
      input.value = input.value.slice(0, pos) + e + input.value.slice(pos);
      input.selectionStart = input.selectionEnd = pos + e.length;
      input.focus();
    });
    picker.appendChild(btn);
  });
}

/* ══════════════════════════════════
   UI BINDINGS
══════════════════════════════════ */
function bindUI() {
  document.getElementById('login-btn').addEventListener('click', () => {
    sb.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: REDIRECT_URL } });
  });

  document.getElementById('btn-logout').addEventListener('click', () => sb.auth.signOut());

  document.getElementById('btn-send').addEventListener('click', sendMessage);

  document.getElementById('msg-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  document.getElementById('msg-input').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 140) + 'px';
  });

  document.getElementById('btn-emoji').addEventListener('click', e => {
    e.stopPropagation();
    const picker = document.getElementById('emoji-picker');
    picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
  });

  document.addEventListener('click', () => {
    document.getElementById('emoji-picker').style.display = 'none';
  });

  document.getElementById('img-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) { uploadAndSend(file); e.target.value = ''; }
  });

  document.getElementById('reply-cancel').addEventListener('click', clearReply);

  // 新建频道（管理员专属）
  document.getElementById('btn-add-channel').addEventListener('click', () => {
    if (!isAdmin) { toast('⛔ 只有管理员可以创建频道'); return; }
    document.getElementById('new-channel-name').value = '';
    document.getElementById('new-channel-desc').value = '';
    document.getElementById('modal-channel').style.display = 'flex';
    setTimeout(() => document.getElementById('new-channel-name').focus(), 50);
  });

  document.getElementById('modal-cancel').addEventListener('click', () => {
    document.getElementById('modal-channel').style.display = 'none';
  });

  document.getElementById('modal-ok').addEventListener('click', async () => {
    const name = document.getElementById('new-channel-name').value;
    const desc = document.getElementById('new-channel-desc').value;
    document.getElementById('modal-channel').style.display = 'none';
    await createChannel(name, desc);
  });

  document.getElementById('new-channel-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('modal-ok').click();
  });

  document.getElementById('modal-img-close').addEventListener('click', () => {
    document.getElementById('modal-img').style.display = 'none';
  });

  document.getElementById('modal-img').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });

  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
  });

  document.getElementById('modal-channel').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });
}

/* ══════════════════════════════════
   UTILS
══════════════════════════════════ */
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
function toast(msg, duration = 2800) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), duration);
}

/* ── START ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}