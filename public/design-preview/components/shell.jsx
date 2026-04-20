// Icons — simple stroked SVGs
const Icon = ({ name, size = 16 }) => {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>,
    package: <><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"/><path d="m3 7 9 5 9-5"/><path d="M12 22V12"/></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 14 3-3 4 4 5-5"/></>,
    message: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    clipboard: <><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    billing: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></>,
    plug: <><path d="M9 2v6"/><path d="M15 2v6"/><path d="M6 8h12l-1 8a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4z"/></>,
    support: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></>,
    help: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></>,
    export: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    caret: <><path d="m6 9 6 6 6-6"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    more: <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
    sparkle: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></>,
    arrow: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    up: <><path d="m18 15-6-6-6 6"/></>,
    down: <><path d="m6 9 6 6 6-6"/></>,
    arrowUpRight: <><path d="M7 17 17 7M7 7h10v10"/></>,
    filter: <><path d="M22 3H2l8 9.46V19l4 2v-8.54z"/></>,
    sort: <><path d="m3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16"/></>,
    check: <><path d="M20 6 9 17l-5-5"/></>,
    x: <><path d="M18 6 6 18M6 6l12 12"/></>,
    close: <><path d="M18 6 6 18M6 6l12 12"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></>,
    trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></>,
    sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></>,
  };
  const p = paths[name];
  if (!p) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {p}
    </svg>
  );
};

// ============================================
// SIDEBAR
// ============================================
const Sidebar = ({ currentPage, onNavigate }) => {
  const mainMenu = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'products', label: 'Products', icon: 'package' },
    { id: 'transactions', label: 'Transactions', icon: 'card' },
    { id: 'reports', label: 'Reports & Analytics', icon: 'chart' },
    { id: 'messages', label: 'Messages', icon: 'message', dot: true },
    { id: 'team', label: 'Team Performance', icon: 'users' },
    { id: 'campaigns', label: 'Campaigns', icon: 'target' },
  ];
  const customers = [
    { id: 'customers', label: 'Customer List', icon: 'user' },
    { id: 'channels', label: 'Channels', icon: 'link' },
    { id: 'orders', label: 'Order Management', icon: 'clipboard' },
  ];
  const management = [
    { id: 'roles', label: 'Roles & Permissions', icon: 'shield' },
    { id: 'billing', label: 'Billing & Subscription', icon: 'billing' },
    { id: 'integrations', label: 'Integrations', icon: 'plug' },
  ];
  const settings = [
    { id: 'support', label: 'Customer Support', icon: 'support' },
    { id: 'help', label: 'Help Center', icon: 'help' },
    { id: 'system', label: 'System Settings', icon: 'settings' },
  ];

  const section = (title, items) => (
    <div className="nav-section" key={title}>
      <div className="nav-title">{title}</div>
      {items.map(item => (
        <button
          key={item.id}
          className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
          {item.dot && <span className="badge-dot"/>}
        </button>
      ))}
    </div>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">NS</div>
        <div className="brand-text">
          <div className="brand-label">Agency</div>
          <div className="brand-name">Northside Studio</div>
        </div>
        <Icon name="caret" size={12} />
      </div>

      {section('Main Menu', mainMenu)}
      {section('Customers', customers)}
      {section('Management', management)}
      {section('Settings', settings)}

      <div className="sidebar-user">
        <div className="avatar">SP</div>
        <div className="user-info">
          <div className="user-name">Salung Prastyo</div>
          <div className="user-plan">Pro Plan</div>
        </div>
        <Icon name="caret" size={12} />
      </div>
    </aside>
  );
};

// ============================================
// TOPBAR
// ============================================
const Topbar = ({ crumbs }) => (
  <header className="topbar">
    <div className="breadcrumb">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          <span className={`breadcrumb-item ${i === crumbs.length - 1 ? 'current' : ''}`}>{c}</span>
          {i < crumbs.length - 1 && <span className="breadcrumb-sep">›</span>}
        </React.Fragment>
      ))}
    </div>
    <div className="topbar-search">
      <Icon name="search" size={14} />
      <input placeholder="Search..." />
      <span className="kbd">⌘</span>
      <span className="kbd">K</span>
    </div>
    <button className="topbar-iconbox"><Icon name="bell" size={15}/><span className="dot"/></button>
    <button className="topbar-iconbox"><Icon name="mail" size={15}/></button>
    <div className="topbar-avatarbox"><div className="av">SP</div></div>
  </header>
);

Object.assign(window, { Icon, Sidebar, Topbar });
