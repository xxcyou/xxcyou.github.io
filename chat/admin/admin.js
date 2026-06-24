/* ═══════════════════════════════════════════════════
   NEXUS Chat · admin.js
   管理员后台逻辑
═══════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://xoazpnamzmluqedmggty.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYXpwbmFtem1sdXFlZG1nZ3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjE1MzksImV4cCI6MjA5Nzc5NzUzOX0.4THXg-WGVHZzQMkM4gaH-W7QOTden58ICRiLa1q_y_k';
const REDIRECT_URL = 'https://www.xxcyou.com/chat/admin';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'pkce' }
});

let me = null;
let banTargetUser = null;
let allChannels = [];

/* ══════════════════════════════════
   INIT
══════════════════════════════════ */
async function init() {
  bindUI();

  const search = window.location.search;
  if (search.includes('code=')) {
    await sb.auth.getSession();
    window.history.replaceState(null, '', REDIRECT_URL);
  }
  if (search.includes('error=')) {
    showError('登录失败，请重试');
    window.history.replaceState(null, '', REDIRECT_URL);
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  if (session) await enterAdmin(session.user);

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) await enterAdmin(session.user);
    else if (event === 'SIGNED_OUT') showGuard();
  });
}

function showGuard() {
  document.getElementById('auth-guard').style.display = 'flex';
  document.getElementById('admin-app').style.display = 'none';
}

function showError(msg) {
  const el = document.getElementById('guard-error');
  el.textContent = msg; el.style.display = 'block';
}

async function enterAdmin(user) {
  // 验证管理员身份（数据库层面）
  const { data, error } = await sb.from('admins').select('user_id').eq('user_id', user.id).single();
  if (error || !data) {
    showError('⛔ 权限不足，你不是管理员');
    await sb.auth.signOut();
    return;
  }

  me = user;
  document.getElementById('auth-guard').style.display = 'none';
  document.getElementById('admin-app').style.display = 'flex';

  const name = user.user_metadata?.user_name || user.email?.split('@')[0] || '管理员';
  const avatar = user.user_metadata?.avatar_url || null;

  document.getElementById('admin-name').textContent = name;
  if (avatar) {
    document.getElementById('admin-avatar').src = avatar;
    document.getElementById('admin-avatar').style.display = 'block';
    document.getElementById('admin-avatar-ph').style.display = 'none';
  } else {
    document.getElementById('admin-avatar-ph').textContent = name[0].toUpperCase();
  }

  await loadDashboard();
}

/* ══════════════════════════════════
   TAB NAVIGATION
══════════════════════════════════ */
function switchTab(tabName) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  const loaders = {
    dashboard: loadDashboard,
    announcements: loadAnnouncements,
    users: loadUsers,
    banned: loadBanned,
    messages: loadAdminMessages,
    reports: loadReports,
    channels: loadAdminChannels,
  };
  loaders[tabName]?.();
}

/* ══════════════════════════════════
   DASHBOARD
══════════════════════════════════ */
async function loadDashboard() {
  const [users, messages, channels, banned, reports, announcements] = await Promise.all([
    sb.from('messages').select('id', { count: 'exact', head: true }),
    sb.from('messages').select('id', { count: 'exact', head: true }),
    sb.from('channels').select('id', { count: 'exact', head: true }),
    sb.from('banned_users').select('id', { count: 'exact', head: true }),
    sb.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('announcements').select('id', { count: 'exact', head: true }),
  ]);

  // 用户数从 auth.users 拿不到，显示消息数代替
  document.getElementById('stat-users').textContent = 'GitHub';
  document.getElementById('stat-messages').textContent = messages.count ?? '-';
  document.getElementById('stat-channels').textContent = channels.count ?? '-';
  document.getElementById('stat-banned').textContent = banned.count ?? '-';
  document.getElementById('stat-reports').textContent = reports.count ?? '-';
  document.getElementById('stat-announcements').textContent = announcements.count ?? '-';

  // 最近10条消息
  const { data: recentMsgs } = await sb.from('messages')
    .select('*').order('created_at', { ascending: false }).limit(10);

  const container = document.getElementById('recent-messages');
  container.innerHTML = '';
  if (!recentMsgs?.length) { container.innerHTML = '<div class="empty-tip">暂无消息</div>'; return; }

  recentMsgs.forEach(msg => {
    const el = document.createElement('div');
    el.className = 'recent-msg';
    const time = new Date(msg.created_at).toLocaleString('zh-CN');
    el.innerHTML = `
      <div class="recent-msg-meta">${esc(msg.username)} · ${time}</div>
      <div>${msg.content ? esc(msg.content) : '[图片]'}</div>`;
    container.appendChild(el);
  });
}

/* ══════════════════════════════════
   ANNOUNCEMENTS
══════════════════════════════════ */
async function loadAnnouncements() {
  const { data } = await sb.from('announcements')
    .select('*').order('created_at', { ascending: false });

  const container = document.getElementById('announcements-list');
  container.innerHTML = '';

  if (!data?.length) { container.innerHTML = '<div class="empty-tip">暂无公告</div>'; return; }

  data.forEach(a => {
    const el = document.createElement('div');
    el.className = 'announce-card';
    const time = new Date(a.created_at).toLocaleString('zh-CN');
    el.innerHTML = `
      <div class="announce-text">${esc(a.content)}</div>
      <div class="announce-meta">
        <span>📢 ${esc(a.created_by_name || '管理员')}</span>
        <span>${time}</span>
        <div class="announce-actions">
          <button class="btn-sm danger" data-id="${a.id}">删除</button>
        </div>
      </div>`;
    el.querySelector('.btn-sm.danger').addEventListener('click', () => deleteAnnouncement(a.id, el));
    container.appendChild(el);
  });
}

async function postAnnouncement() {
  const content = document.getElementById('announce-content').value.trim();
  if (!content) { toast('请输入公告内容'); return; }

  const name = me.user_metadata?.user_name || '管理员';
  const { error } = await sb.from('announcements').insert({
    content, created_by: me.id, created_by_name: name
  });

  if (error) { toast('发布失败'); return; }
  document.getElementById('announce-content').value = '';
  document.getElementById('announce-compose').style.display = 'none';
  toast('✓ 公告已发布');
  loadAnnouncements();

  // 同时在所有频道发一条系统消息
  const { data: chs } = await sb.from('channels').select('id');
  if (chs) {
    await Promise.all(chs.map(ch =>
      sb.from('messages').insert({
        channel_id: ch.id,
        content: `📢 【管理员公告】${content}`,
      })
    ));
  }
}

async function deleteAnnouncement(id, el) {
  if (!confirm('确定删除这条公告？')) return;
  const { error } = await sb.from('announcements').delete().eq('id', id);
  if (error) { toast('删除失败'); return; }
  el.style.opacity = '0'; el.style.transition = 'opacity .3s';
  setTimeout(() => el.remove(), 300);
  toast('✓ 公告已删除');
}

/* ══════════════════════════════════
   USERS
══════════════════════════════════ */
async function loadUsers(search = '') {
  // 通过 messages 表获取发过消息的用户（anon key 无法直接查 auth.users）
  let query = sb.from('messages')
    .select('user_id, username, avatar_url')
    .order('created_at', { ascending: false });

  const { data } = await query;
  if (!data) return;

  // 去重
  const seen = new Set();
  const users = [];
  data.forEach(m => {
    if (!seen.has(m.user_id) && m.user_id) {
      seen.add(m.user_id);
      users.push({ user_id: m.user_id, username: m.username, avatar_url: m.avatar_url });
    }
  });

  // 获取封禁列表
  const { data: bans } = await sb.from('banned_users').select('user_id');
  const bannedIds = new Set(bans?.map(b => b.user_id) || []);

  const container = document.getElementById('users-list');
  container.innerHTML = '';

  const filtered = search
    ? users.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()))
    : users;

  if (!filtered.length) { container.innerHTML = '<div class="empty-tip">暂无用户数据</div>'; return; }

  filtered.forEach(u => {
    const isBanned = bannedIds.has(u.user_id);
    const el = document.createElement('div');
    el.className = 'item-card';
    el.innerHTML = `
      ${u.avatar_url
        ? `<img class="item-avatar" src="${esc(u.avatar_url)}" alt=""/>`
        : `<div class="item-avatar-ph">${esc((u.username||'?')[0].toUpperCase())}</div>`}
      <div class="item-info">
        <div class="item-name">${esc(u.username)} ${isBanned ? '<span class="badge badge-banned">已封禁</span>' : ''}</div>
        <div class="item-sub">${u.user_id}</div>
      </div>
      <div class="item-actions">
        ${isBanned
          ? `<button class="btn-sm success unban-btn" data-id="${u.user_id}" data-name="${esc(u.username)}">解封</button>`
          : `<button class="btn-sm danger ban-btn" data-id="${u.user_id}" data-name="${esc(u.username)}" data-avatar="${esc(u.avatar_url||'')}">封禁</button>`
        }
      </div>`;

    el.querySelector('.ban-btn')?.addEventListener('click', () => openBanModal(u));
    el.querySelector('.unban-btn')?.addEventListener('click', () => unbanUser(u.user_id, u.username, el));
    container.appendChild(el);
  });
}

function openBanModal(user) {
  banTargetUser = user;
  document.getElementById('ban-target-info').textContent = `目标用户：${user.username}`;
  document.getElementById('ban-reason').value = '';
  document.getElementById('modal-ban').style.display = 'flex';
}

async function banUser() {
  if (!banTargetUser) return;
  const reason = document.getElementById('ban-reason').value.trim();
  const { error } = await sb.from('banned_users').insert({
    user_id: banTargetUser.user_id,
    github_name: banTargetUser.username,
    reason: reason || null,
    banned_by: me.id,
  });
  document.getElementById('modal-ban').style.display = 'none';
  if (error) { toast('封禁失败：' + error.message); return; }
  toast(`✓ 已封禁 ${banTargetUser.username}`);
  banTargetUser = null;
  loadUsers();
}

async function unbanUser(userId, username, el) {
  if (!confirm(`确定解封 ${username}？`)) return;
  const { error } = await sb.from('banned_users').delete().eq('user_id', userId);
  if (error) { toast('解封失败'); return; }
  toast(`✓ 已解封 ${username}`);
  loadUsers();
}

/* ══════════════════════════════════
   BANNED LIST
══════════════════════════════════ */
async function loadBanned() {
  const { data } = await sb.from('banned_users').select('*').order('created_at', { ascending: false });
  const container = document.getElementById('banned-list');
  container.innerHTML = '';

  if (!data?.length) { container.innerHTML = '<div class="empty-tip">暂无封禁记录</div>'; return; }

  data.forEach(b => {
    const el = document.createElement('div');
    el.className = 'item-card';
    const time = new Date(b.created_at).toLocaleString('zh-CN');
    el.innerHTML = `
      <div class="item-avatar-ph">${esc((b.github_name||'?')[0].toUpperCase())}</div>
      <div class="item-info">
        <div class="item-name">${esc(b.github_name)} <span class="badge badge-banned">已封禁</span></div>
        <div class="item-sub">封禁时间：${time}</div>
        <div class="item-content">原因：${esc(b.reason || '未填写')}</div>
      </div>
      <div class="item-actions">
        <button class="btn-sm success" data-id="${b.user_id}" data-name="${esc(b.github_name)}">解封</button>
      </div>`;
    el.querySelector('.btn-sm.success').addEventListener('click', () => unbanUser(b.user_id, b.github_name, el));
    container.appendChild(el);
  });
}

/* ══════════════════════════════════
   MESSAGES ADMIN
══════════════════════════════════ */
async function loadAdminMessages() {
  // Load channels for filter
  const { data: chs } = await sb.from('channels').select('*').order('id');
  allChannels = chs || [];

  const select = document.getElementById('msg-channel-filter');
  select.innerHTML = '<option value="">所有频道</option>';
  allChannels.forEach(ch => {
    const opt = document.createElement('option');
    opt.value = ch.id; opt.textContent = '#' + ch.name;
    select.appendChild(opt);
  });

  await fetchAdminMessages();
}

async function fetchAdminMessages() {
  const channelId = document.getElementById('msg-channel-filter').value;
  let query = sb.from('messages').select('*').order('created_at', { ascending: false }).limit(50);
  if (channelId) query = query.eq('channel_id', channelId);

  const { data } = await query;
  const container = document.getElementById('admin-messages-list');
  container.innerHTML = '';

  if (!data?.length) { container.innerHTML = '<div class="empty-tip">暂无消息</div>'; return; }

  data.forEach(msg => {
    const el = document.createElement('div');
    el.className = 'item-card';
    const time = new Date(msg.created_at).toLocaleString('zh-CN');
    const chName = allChannels.find(c => c.id === msg.channel_id)?.name || msg.channel_id;
    el.innerHTML = `
      ${msg.avatar_url
        ? `<img class="item-avatar" src="${esc(msg.avatar_url)}" alt=""/>`
        : `<div class="item-avatar-ph">${esc((msg.username||'?')[0].toUpperCase())}</div>`}
      <div class="item-info">
        <div class="item-name">${esc(msg.username)} <span style="color:var(--muted2);font-weight:400;font-size:12px">#${esc(chName)}</span></div>
        <div class="item-sub">${time}</div>
        <div class="item-content">${msg.content ? esc(msg.content) : '[图片]'}</div>
      </div>
      <div class="item-actions">
        <button class="btn-sm danger del-msg-btn" data-id="${msg.id}">删除</button>
      </div>`;
    el.querySelector('.del-msg-btn').addEventListener('click', async () => {
      if (!confirm('确定删除这条消息？')) return;
      const { error } = await sb.from('messages').delete().eq('id', msg.id);
      if (error) { toast('删除失败'); return; }
      el.style.opacity = '0'; el.style.transition = 'opacity .3s';
      setTimeout(() => el.remove(), 300);
      toast('✓ 消息已删除');
    });
    container.appendChild(el);
  });
}

async function clearChannelMessages() {
  const channelId = document.getElementById('msg-channel-filter').value;
  if (!channelId) { toast('请先选择一个频道'); return; }
  const chName = allChannels.find(c => c.id == channelId)?.name || channelId;
  if (!confirm(`确定清空频道 #${chName} 的所有消息？此操作不可撤销！`)) return;

  const { error } = await sb.from('messages').delete().eq('channel_id', channelId);
  if (error) { toast('清空失败：' + error.message); return; }
  toast(`✓ #${chName} 消息已全部清空`);
  fetchAdminMessages();
}

/* ══════════════════════════════════
   REPORTS
══════════════════════════════════ */
async function loadReports() {
  const { data } = await sb.from('reports').select('*').order('created_at', { ascending: false });
  const container = document.getElementById('reports-list');
  container.innerHTML = '';

  if (!data?.length) { container.innerHTML = '<div class="empty-tip">暂无举报记录</div>'; return; }

  data.forEach(r => {
    const el = document.createElement('div');
    el.className = 'item-card';
    const time = new Date(r.created_at).toLocaleString('zh-CN');
    const badge = r.status === 'pending'
      ? '<span class="badge badge-pending">待处理</span>'
      : '<span class="badge badge-resolved">已处理</span>';
    el.innerHTML = `
      <div class="item-info">
        <div class="item-name">举报 ${esc(r.reported_username || '未知用户')} ${badge}</div>
        <div class="item-sub">${time} · 消息ID: ${r.message_id || '-'}</div>
        <div class="item-content">原因：${esc(r.reason || '未填写')}</div>
      </div>
      <div class="item-actions">
        ${r.status === 'pending' ? `
          <button class="btn-sm danger ban-report-btn" data-uid="${r.reported_user_id}" data-name="${esc(r.reported_username||'')}">封禁用户</button>
          <button class="btn-sm del-report-msg-btn" data-msgid="${r.message_id}">删消息</button>
          <button class="btn-sm success resolve-btn" data-id="${r.id}">标记处理</button>
        ` : ''}
        <button class="btn-sm danger dismiss-btn" data-id="${r.id}">忽略</button>
      </div>`;

    el.querySelector('.ban-report-btn')?.addEventListener('click', () => {
      openBanModal({ user_id: r.reported_user_id, username: r.reported_username });
    });
    el.querySelector('.del-report-msg-btn')?.addEventListener('click', async () => {
      if (!r.message_id) { toast('消息ID无效'); return; }
      await sb.from('messages').delete().eq('id', r.message_id);
      toast('✓ 消息已删除');
    });
    el.querySelector('.resolve-btn')?.addEventListener('click', async () => {
      await sb.from('reports').update({ status: 'resolved' }).eq('id', r.id);
      toast('✓ 已标记为处理完成');
      loadReports();
    });
    el.querySelector('.dismiss-btn')?.addEventListener('click', async () => {
      if (!confirm('确定忽略这条举报？')) return;
      await sb.from('reports').delete().eq('id', r.id);
      el.remove(); toast('✓ 举报已忽略');
    });

    container.appendChild(el);
  });
}

/* ══════════════════════════════════
   CHANNELS ADMIN
══════════════════════════════════ */
async function loadAdminChannels() {
  const { data } = await sb.from('channels').select('*').order('id');
  const container = document.getElementById('channels-list');
  container.innerHTML = '';

  if (!data?.length) { container.innerHTML = '<div class="empty-tip">暂无频道</div>'; return; }

  data.forEach(ch => {
    const el = document.createElement('div');
    el.className = 'item-card';
    const time = new Date(ch.created_at).toLocaleString('zh-CN');
    el.innerHTML = `
      <div class="item-info">
        <div class="item-name"># ${esc(ch.name)}</div>
        <div class="item-sub">${esc(ch.description || '无描述')} · 创建于 ${time}</div>
      </div>
      <div class="item-actions">
        <button class="btn-sm danger del-ch-btn" data-id="${ch.id}" data-name="${esc(ch.name)}">删除</button>
      </div>`;
    el.querySelector('.del-ch-btn').addEventListener('click', async () => {
      if (!confirm(`确定删除频道 #${ch.name}？所有消息将被清空！`)) return;
      const { error } = await sb.from('channels').delete().eq('id', ch.id);
      if (error) { toast('删除失败：' + error.message); return; }
      el.remove(); toast(`✓ 频道 #${ch.name} 已删除`);
    });
    container.appendChild(el);
  });
}

async function createChannelAdmin() {
  const name = document.getElementById('nc-name').value.trim();
  const desc = document.getElementById('nc-desc').value.trim();
  if (!name) { toast('请输入频道名称'); return; }
  const { error } = await sb.from('channels').insert({ name, description: desc || null });
  document.getElementById('modal-new-channel').style.display = 'none';
  if (error) { toast('创建失败：' + error.message); return; }
  toast(`✓ 频道 #${name} 已创建`);
  loadAdminChannels();
}

/* ══════════════════════════════════
   UI BINDINGS
══════════════════════════════════ */
function bindUI() {
  // Login
  document.getElementById('guard-login-btn').addEventListener('click', () => {
    sb.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: REDIRECT_URL } });
  });

  // Logout
  document.getElementById('admin-logout').addEventListener('click', () => sb.auth.signOut());

  // Tab navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Announcements
  document.getElementById('btn-new-announce').addEventListener('click', () => {
    const compose = document.getElementById('announce-compose');
    compose.style.display = compose.style.display === 'none' ? 'block' : 'none';
    if (compose.style.display === 'block') document.getElementById('announce-content').focus();
  });
  document.getElementById('announce-cancel').addEventListener('click', () => {
    document.getElementById('announce-compose').style.display = 'none';
  });
  document.getElementById('announce-submit').addEventListener('click', postAnnouncement);

  // User search
  document.getElementById('user-search').addEventListener('input', e => {
    loadUsers(e.target.value);
  });

  // Ban modal
  document.getElementById('ban-confirm').addEventListener('click', banUser);
  document.getElementById('ban-cancel').addEventListener('click', () => {
    document.getElementById('modal-ban').style.display = 'none';
    banTargetUser = null;
  });

  // Messages filter
  document.getElementById('msg-channel-filter').addEventListener('change', fetchAdminMessages);
  document.getElementById('btn-clear-channel').addEventListener('click', clearChannelMessages);

  // New channel
  document.getElementById('btn-new-channel-admin').addEventListener('click', () => {
    document.getElementById('nc-name').value = '';
    document.getElementById('nc-desc').value = '';
    document.getElementById('modal-new-channel').style.display = 'flex';
    setTimeout(() => document.getElementById('nc-name').focus(), 50);
  });
  document.getElementById('nc-cancel').addEventListener('click', () => {
    document.getElementById('modal-new-channel').style.display = 'none';
  });
  document.getElementById('nc-confirm').addEventListener('click', createChannelAdmin);
  document.getElementById('nc-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') createChannelAdmin();
  });

  // Close modals on overlay click
  document.getElementById('modal-ban').addEventListener('click', e => {
    if (e.target === e.currentTarget) { e.currentTarget.style.display = 'none'; banTargetUser = null; }
  });
  document.getElementById('modal-new-channel').addEventListener('click', e => {
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