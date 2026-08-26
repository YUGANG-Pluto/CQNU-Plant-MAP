const labels = Object.freeze({
  accountKind: {
    admin: '管理员',
    user: '用户'
  },
  accessLevel: {
    read: '只读',
    edit: '编辑草稿',
    save: '编辑并保存'
  },
  status: {
    'pending-activation': '待激活',
    active: '已启用',
    disabled: '已停用'
  },
  auditOutcome: {
    allowed: '通过',
    denied: '拒绝',
    failed: '失败'
  },
  capability: {
    'workspace.read': '读取本地项目',
    'workspace.edit': '编辑本地项目草稿',
    'workspace.save': '保存本地项目',
    'site.read': '查看站点状态',
    'site.publish': '发布站点',
    'release.read': '查看版本',
    'release.manage': '管理版本',
    'member.read': '查看组成员',
    'member.manage': '创建和停用组成员',
    'member.permission.manage': '调整成员权限',
    'member.password.reset': '签发密码重置链接',
    'audit.read': '查看安全审计'
  },
  action: {
    'workspace.read': '读取工作区',
    'workspace.edit': '编辑工作区',
    'workspace.save': '保存工作区',
    'site.read': '查看站点',
    'site.publish': '发布站点',
    'release.read': '查看版本',
    'release.manage': '管理版本',
    'member.read': '查看成员',
    'member.manage': '管理成员',
    'member.permission.manage': '调整权限',
    'member.password.reset': '重置成员密码',
    'audit.read': '查看审计',
    'account.activate': '激活账户',
    'account.username.change': '修改用户名',
    'account.password.change': '修改密码',
    'account.password.reset.issue': '签发重置链接',
    'account.password.reset.consume': '使用重置链接',
    'session.create': '登录',
    'session.heartbeat': '会话续期',
    'session.rotate': '轮换会话',
    'session.revoke': '退出登录',
    'session.revoke_all': '撤销全部会话'
  }
} as const);

type LabelGroup = keyof typeof labels;

export function label(group: LabelGroup, value: string): string {
  const groupLabels = labels[group] as Readonly<Record<string, string>>;
  return groupLabels[value] || String(value || '—');
}

export function formatDateTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(timestamp));
}
