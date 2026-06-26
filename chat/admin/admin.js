/* ═══════════════════════════════════════════════════
   NEXUS Admin · admin.js  v3.0
═══════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://xoazpnamzmluqedmggty.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYXpwbmFtem1sdXFlZG1nZ3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjE1MzksImV4cCI6MjA5Nzc5NzUzOX0.4THXg-WGVHZzQMkM4gaH-W7QOTden58ICRiLa1q_y_k';
const REDIRECT_URL = 'https://www.xxcyou.com/chat/admin';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce' } });

let me = null;
let banTargetUser = null;
let allChannels = [];
let adminIds = new Set();

/* ══════════════════════════════════ INIT ══════════════════════════════════ */
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

  sb.auth.onAuthStateChange(async (event, session) => {
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
      await enterAdmin(session.user);
    } else if (event === 'SIGNED_OUT') {
      showGuard();
    }
  });

  const { data: { session } } = await sb.auth.getSession();
  if (session) await enterAdmin(session.user);
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
  const { data, error } = await sb.from('admins').select('user_id').eq('user_id', user.id).single();
  if (error || !data) {
    showError('⛔ 权限不足，你不是管理员');
    await sb.auth.signOut();
    return;
  }

  me = user;

  // Load all admin IDs
  const { data: allAdmins } = await sb.from('admins').select('user_id');
  adminIds = new Set((allAdmins || []).map(a => a.user_id));

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

/* ══════════════════════════════════ TABS ══════════════════════════════════ */
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

/* ══════════════════════════════════ DASHBOARD ══════════════════════════════════ */
async function loadDashboard() {
  const [msgRes, chRes, banRes, repRes, annRes, profRes] = await Promise.all([
    sb.from('messages').select('id', { count: 'exact', head: true }),
    sb.from('channels').select('id', { count: 'exact', head: true }),
    sb.from('banned_users').select('id', { count: 'exact', head: true }),
    sb.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('announcements').select('id', { count: 'exact', head: true }),
    sb.from('profiles').select('user_id', { count: 'exact', head: true }),
  ]);

  document.getElementById('stat-users').textContent = profRes.count ?? '-';
  document.getElementById('stat-messages').textContent = msgRes.count ?? '-';
  document.getElementById('stat-channels').textContent = chRes.count ?? '-';
  document.getElementById('stat-banned').textContent = banRes.count ?? '-';
  document.getElementById('stat-reports').textContent = repRes.count ?? '-';
  document.getElementById('stat-announcements').textContent = annRes.count ?? '-';

  const { data: recentMsgs } = await sb.from('messages')
    .select('*').order('created_at', { ascending: false }).limit(10);

  const container = document.getElementById('recent-messages');
  container.innerHTML = '';
  if (!recentMsgs?.length) { container.innerHTML = '<div class="empty-tip">暂无消息</div>'; return; }

  recentMsgs.forEach(msg => {
    const el = document.createElement('div');
    el.className = 'recent-msg';
    const time = new Date(msg.created_at).toLocaleString('zh-CN');
    const isAdmin = adminIds.has(msg.user_id);
    el.innerHTML = `
      <div class="recent-msg-meta">
        ${isAdmin ? '<span style="color:var(--yellow)">👑</span> ' : ''}
        <strong>${esc(msg.username)}</strong>
        ${msg.github_username ? `<span style="color:var(--text3);font-size:10px"> @${esc(msg.github_username)}</span>` : ''}
        <span style="margin-left:8px;color:var(--text3)">${time}</span>
      </div>
      <div>${msg.content ? esc(msg.content) : '<span style="color:var(--text3)">[图片]</span>'}</div>`;
    container.appendChild(el);
  });
}

/* ══════════════════════════════════ ANNOUNCEMENTS ══════════════════════════════════ */
async function loadAnnouncements() {
  const { data } = await sb.from('announcements').select('*').order('created_at', { ascending: false });
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

  // Broadcast to all channels
  const { data: chs } = await sb.from('channels').select('id');
  if (chs) {
    await Promise.all(chs.map(ch =>
      sb.from('messages').insert({ channel_id: ch.id, content: `📢 【管理员公告】${content}` })
    ));
  }
}

async function deleteAnnouncement(id, el) {
  if (!confirm('确定删除这条公告？')) return;
  const { error } = await sb.from('announcements').delete().eq('id', id);
  if (error) { toast('删除失败'); return; }
  el.style.opacity = '0'; el.style.transition = 'opacity .3s';
  setTimeout(() => el.remove(), 300);
  toast('✓ 已删除');
}

/* ══════════════════════════════════ USERS ══════════════════════════════════ */
async function loadUsers(search = '') {
  // Load from profiles table - shows ALL registered users
  let { data: profiles } = await sb.from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (!profiles) profiles = [];

  // Get banned list
  const { data: bans } = await sb.from('banned_users').select('user_id');
  const bannedIds = new Set(bans?.map(b => b.user_id) || []);

  const container = document.getElementById('users-list');
  container.innerHTML = '';

  let filtered = search
    ? profiles.filter(p =>
        p.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.github_username?.toLowerCase().includes(search.toLowerCase())
      )
    : profiles;

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-tip">暂无用户数据</div>';
    return;
  }

  filtered.forEach(p => {
    const isBanned = bannedIds.has(p.user_id);
    const isAdminUser = adminIds.has(p.user_id);
    const el = document.createElement('div');
    el.className = 'item-card';
    const initial = (p.display_name || p.github_username || '?')[0].toUpperCase();

    el.innerHTML = `
      ${p.avatar_url
        ? `<img class="item-avatar" src="${esc(p.avatar_url)}" alt=""/>`
        : `<div class="item-avatar-ph">${esc(initial)}</div>`}
      <div class="item-info">
        <div class="item-name">
          ${isAdminUser ? '<span style="color:var(--yellow)">👑</span> ' : ''}
          ${esc(p.display_name || p.github_username)}
          ${isAdminUser ? '<span class="badge" style="background:rgba(124,58,237,.15);color:var(--accent);border:1px solid rgba(124,58,237,.25)">ADMIN</span>' : ''}
          ${isBanned ? '<span class="badge badge-banned">已封禁</span>' : ''}
        </div>
        <div class="item-sub">@${esc(p.github_username || '-')}</div>
      </div>
      <div class="item-actions">
        ${isBanned
          ? `<button class="btn-sm success unban-btn">解封</button>`
          : `<button class="btn-sm danger ban-btn">封禁</button>`}
        ${!isAdminUser
          ? `<button class="btn-sm make-admin-btn">设管理员</button>`
          : p.user_id !== me.id
            ? `<button class="btn-sm danger remove-admin-btn">撤管理员</button>`
            : ''}
      </div>`;

    el.querySelector('.ban-btn')?.addEventListener('click', () => openBanModal(p));
    el.querySelector('.unban-btn')?.addEventListener('click', () => unbanUser(p.user_id, p.display_name || p.github_username));
    el.querySelector('.make-admin-btn')?.addEventListener('click', () => makeAdmin(p));
    el.querySelector('.remove-admin-btn')?.addEventListener('click', () => removeAdmin(p));
    container.appendChild(el);
  });
}

async function makeAdmin(p) {
  if (!confirm(`确定将 ${p.display_name || p.github_username} 设为管理员？`)) return;
  const { error } = await sb.from('admins').insert({
    user_id: p.user_id,
    github_name: p.github_username || p.display_name,
  });
  if (error) { toast('设置失败：' + error.message); return; }
  adminIds.add(p.user_id);
  toast(`✓ 已将 ${p.display_name || p.github_username} 设为管理员`);
  loadUsers();
}

async function removeAdmin(p) {
  if (!confirm(`确定撤销 ${p.display_name || p.github_username} 的管理员权限？`)) return;
  const { error } = await sb.from('admins').delete().eq('user_id', p.user_id);
  if (error) { toast('撤销失败：' + error.message); return; }
  adminIds.delete(p.user_id);
  toast(`✓ 已撤销管理员权限`);
  loadUsers();
}

function openBanModal(p) {
  banTargetUser = p;
  document.getElementById('ban-target-info').textContent =
    `目标用户：${p.display_name || p.github_username} (@${p.github_username || '-'})`;
  document.getElementById('ban-reason').value = '';
  document.getElementById('modal-ban').style.display = 'flex';
}

async function banUser() {
  if (!banTargetUser) return;
  const reason = document.getElementById('ban-reason').value.trim();
  const { error } = await sb.from('banned_users').insert({
    user_id: banTargetUser.user_id,
    github_name: banTargetUser.github_username || banTargetUser.display_name,
    reason: reason || null,
    banned_by: me.id,
  });
  document.getElementById('modal-ban').style.display = 'none';
  if (error) { toast('封禁失败：' + error.message); return; }
  toast(`✓ 已封禁 ${banTargetUser.display_name || banTargetUser.github_username}`);
  banTargetUser = null;
  loadUsers();
}

async function unbanUser(userId, name) {
  if (!confirm(`确定解封 ${name}？`)) return;
  const { error } = await sb.from('banned_users').delete().eq('user_id', userId);
  if (error) { toast('解封失败'); return; }
  toast(`✓ 已解封 ${name}`);
  loadUsers();
}

/* ══════════════════════════════════ BANNED ══════════════════════════════════ */
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
        <button class="btn-sm success">解封</button>
      </div>`;
    el.querySelector('.btn-sm.success').addEventListener('click', () => unbanUser(b.user_id, b.github_name));
    container.appendChild(el);
  });
}

/* ══════════════════════════════════ MESSAGES ADMIN ══════════════════════════════════ */
async function loadAdminMessages() {
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
    const isAdminMsg = adminIds.has(msg.user_id);
    el.innerHTML = `
      ${msg.avatar_url
        ? `<img class="item-avatar" src="${esc(msg.avatar_url)}" alt=""/>`
        : `<div class="item-avatar-ph">${esc((msg.username||'?')[0].toUpperCase())}</div>`}
      <div class="item-info">
        <div class="item-name">
          ${isAdminMsg ? '<span style="color:var(--yellow)">👑</span> ' : ''}
          ${esc(msg.username)}
          ${msg.github_username ? `<span style="color:var(--text3);font-size:11px"> @${esc(msg.github_username)}</span>` : ''}
          <span style="color:var(--text2);font-weight:400;font-size:12px"> · #${esc(chName)}</span>
        </div>
        <div class="item-sub">${time}</div>
        <div class="item-content">${msg.content ? esc(msg.content) : '[图片]'}</div>
      </div>
      <div class="item-actions">
        <button class="btn-sm danger del-msg-btn">删除</button>
      </div>`;
    el.querySelector('.del-msg-btn').addEventListener('click', async () => {
      if (!confirm('确定删除？')) return;
      const { error } = await sb.from('messages').delete().eq('id', msg.id);
      if (error) { toast('删除失败'); return; }
      el.style.opacity = '0'; el.style.transition = 'opacity .3s';
      setTimeout(() => el.remove(), 300);
      toast('✓ 已删除');
    });
    container.appendChild(el);
  });
}

async function clearChannelMessages() {
  const channelId = document.getElementById('msg-channel-filter').value;
  if (!channelId) { toast('请先选择频道'); return; }
  const chName = allChannels.find(c => c.id == channelId)?.name || channelId;
  if (!confirm(`确定清空 #${chName} 所有消息？不可撤销！`)) return;
  const { error } = await sb.from('messages').delete().eq('channel_id', channelId);
  if (error) { toast('清空失败：' + error.message); return; }
  toast(`✓ #${chName} 已清空`);
  fetchAdminMessages();
}

/* ══════════════════════════════════ REPORTS ══════════════════════════════════ */
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
        <div class="item-name">举报 ${esc(r.reported_username || '未知')} ${badge}</div>
        <div class="item-sub">${time} · 消息ID: ${r.message_id || '-'}</div>
        <div class="item-content">原因：${esc(r.reason || '未填写')}</div>
      </div>
      <div class="item-actions">
        ${r.status === 'pending' ? `
          <button class="btn-sm danger ban-report-btn">封禁</button>
          <button class="btn-sm del-msg-btn">删消息</button>
          <button class="btn-sm success resolve-btn">已处理</button>
        ` : ''}
        <button class="btn-sm danger dismiss-btn">忽略</button>
      </div>`;

    el.querySelector('.ban-report-btn')?.addEventListener('click', () => {
      openBanModal({ user_id: r.reported_user_id, github_username: r.reported_username, display_name: r.reported_username });
    });
    el.querySelector('.del-msg-btn')?.addEventListener('click', async () => {
      if (!r.message_id) { toast('消息ID无效'); return; }
      await sb.from('messages').delete().eq('id', r.message_id);
      toast('✓ 消息已删除');
    });
    el.querySelector('.resolve-btn')?.addEventListener('click', async () => {
      await sb.from('reports').update({ status: 'resolved' }).eq('id', r.id);
      toast('✓ 已标记处理'); loadReports();
    });
    el.querySelector('.dismiss-btn')?.addEventListener('click', async () => {
      if (!confirm('确定忽略？')) return;
      await sb.from('reports').delete().eq('id', r.id);
      el.remove(); toast('✓ 已忽略');
    });
    container.appendChild(el);
  });
}

/* ══════════════════════════════════ CHANNELS ADMIN ══════════════════════════════════ */
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
        <div class="item-sub">${esc(ch.description || '无描述')} · ${time}</div>
      </div>
      <div class="item-actions">
        <button class="btn-sm danger">删除</button>
      </div>`;
    el.querySelector('.btn-sm.danger').addEventListener('click', async () => {
      if (!confirm(`删除 #${ch.name}？所有消息将清空！`)) return;
      const { error } = await sb.from('channels').delete().eq('id', ch.id);
      if (error) { toast('删除失败：' + error.message); return; }
      el.remove(); toast(`✓ #${ch.name} 已删除`);
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
  toast(`✓ #${name} 已创建`);
  loadAdminChannels();
}

/* ══════════════════════════════════ UI BINDINGS ══════════════════════════════════ */
function bindUI() {
  document.getElementById('guard-login-btn').addEventListener('click', () =>
    sb.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: REDIRECT_URL } }));

  document.getElementById('admin-logout').addEventListener('click', () => sb.auth.signOut());

  document.querySelectorAll('.nav-item').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  // Announcements
  document.getElementById('btn-new-announce').addEventListener('click', () => {
    const c = document.getElementById('announce-compose');
    c.style.display = c.style.display === 'none' ? 'block' : 'none';
    if (c.style.display === 'block') document.getElementById('announce-content').focus();
  });
  document.getElementById('announce-cancel').addEventListener('click', () =>
    document.getElementById('announce-compose').style.display = 'none');
  document.getElementById('announce-submit').addEventListener('click', postAnnouncement);

  // User search
  document.getElementById('user-search').addEventListener('input', e => loadUsers(e.target.value));

  // Ban modal
  document.getElementById('ban-confirm').addEventListener('click', banUser);
  document.getElementById('ban-cancel').addEventListener('click', () => {
    document.getElementById('modal-ban').style.display = 'none';
    banTargetUser = null;
  });

  // Messages
  document.getElementById('msg-channel-filter').addEventListener('change', fetchAdminMessages);
  document.getElementById('btn-clear-channel').addEventListener('click', clearChannelMessages);

  // New channel
  document.getElementById('btn-new-channel-admin').addEventListener('click', () => {
    document.getElementById('nc-name').value = '';
    document.getElementById('nc-desc').value = '';
    document.getElementById('modal-new-channel').style.display = 'flex';
    setTimeout(() => document.getElementById('nc-name').focus(), 50);
  });
  document.getElementById('nc-cancel').addEventListener('click', () =>
    document.getElementById('modal-new-channel').style.display = 'none');
  document.getElementById('nc-confirm').addEventListener('click', createChannelAdmin);
  document.getElementById('nc-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') createChannelAdmin();
  });

  // Modal overlays
  ['modal-ban', 'modal-new-channel'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });
  });
}

/* ══════════════════════════════════ UTILS ══════════════════════════════════ */
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
