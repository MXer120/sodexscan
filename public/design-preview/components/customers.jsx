// ============================================
// CUSTOMER LIST PAGE
// ============================================

const CUSTOMERS = [
  { id: 'CU-10291', name: 'Ryan Korsgaard',   email: 'ryan.k@northmail.co',     status: 'active',   tier: 'VIP',    orders: 42, spent: 128400, country: 'United States', joined: '2023-03-14', color: '#f59e0b' },
  { id: 'CU-10292', name: 'Madelyn Lubin',    email: 'madelyn@lubinworks.com',  status: 'active',   tier: 'Standard', orders: 28, spent: 89200,  country: 'Canada',        joined: '2023-05-22', color: '#ec4899' },
  { id: 'CU-10293', name: 'Abram Bergson',    email: 'abram.b@bergson.co',      status: 'active',   tier: 'VIP',    orders: 56, spent: 215900, country: 'Germany',       joined: '2022-11-08', color: '#8b5cf6' },
  { id: 'CU-10294', name: 'Phillip Mango',    email: 'phil@mangocorp.io',       status: 'inactive', tier: 'Standard', orders: 4,  unit: 1950, spent: 7800,  country: 'United Kingdom', joined: '2024-01-17', color: '#10b981' },
  { id: 'CU-10295', name: 'Nora Whitfield',   email: 'nora.white@field.com',    status: 'active',   tier: 'Standard', orders: 14, spent: 12840,  country: 'Australia',     joined: '2023-09-30', color: '#3b82f6' },
  { id: 'CU-10296', name: 'Kenji Watanabe',   email: 'kenji@watanabe.jp',       status: 'active',   tier: 'VIP',    orders: 71, spent: 342100, country: 'Japan',         joined: '2022-06-11', color: '#f26b1f' },
  { id: 'CU-10297', name: 'Priya Raman',      email: 'priya@ramanstudio.in',    status: 'active',   tier: 'Standard', orders: 19, spent: 36000,  country: 'India',         joined: '2023-12-04', color: '#06b6d4' },
  { id: 'CU-10298', name: 'Elena Vasquez',    email: 'elena.v@vasquez.co',      status: 'active',   tier: 'VIP',    orders: 38, spent: 156700, country: 'Spain',         joined: '2023-02-19', color: '#a855f7' },
  { id: 'CU-10299', name: 'Dmitri Volkov',    email: 'dmitri@volkov.dev',       status: 'inactive', tier: 'Standard', orders: 2,  spent: 3400,   country: 'Poland',        joined: '2024-03-28', color: '#ef4444' },
  { id: 'CU-10300', name: 'Sofia Lindqvist',  email: 'sofia@lindqvist.se',      status: 'active',   tier: 'VIP',    orders: 45, spent: 198200, country: 'Sweden',        joined: '2023-07-03', color: '#14b8a6' },
  { id: 'CU-10301', name: 'Marcus Delacroix', email: 'marcus@delacroix.fr',     status: 'active',   tier: 'Standard', orders: 22, spent: 48300,  country: 'France',        joined: '2023-11-12', color: '#eab308' },
  { id: 'CU-10302', name: 'Aaliyah Brooks',   email: 'aaliyah@brooks.co',       status: 'active',   tier: 'Standard', orders: 17, spent: 23800,  country: 'United States', joined: '2024-02-09', color: '#6366f1' },
];

const CustomerList = () => {
  const [selected, setSelected] = React.useState(new Set());
  const [query, setQuery] = React.useState('');
  const [sortKey, setSortKey] = React.useState('name');
  const [sortDir, setSortDir] = React.useState('asc');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [tierFilter, setTierFilter] = React.useState('all');
  const [page, setPage] = React.useState(1);
  const [menuOpen, setMenuOpen] = React.useState(null);
  const [drawerCustomer, setDrawerCustomer] = React.useState(null);
  const perPage = 8;

  const filtered = React.useMemo(() => {
    return CUSTOMERS.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (tierFilter !== 'all' && c.tier.toLowerCase() !== tierFilter) return false;
      if (query && !(c.name.toLowerCase().includes(query.toLowerCase())
          || c.email.toLowerCase().includes(query.toLowerCase())
          || c.id.toLowerCase().includes(query.toLowerCase()))) return false;
      return true;
    });
  }, [query, statusFilter, tierFilter]);

  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / perPage));
  const paged = sorted.slice((page - 1) * perPage, page * perPage);

  React.useEffect(() => { if (page > pageCount) setPage(1); }, [pageCount]);

  const toggle = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    const allIds = paged.map(c => c.id);
    const allSelected = allIds.every(id => selected.has(id));
    const s = new Set(selected);
    allIds.forEach(id => allSelected ? s.delete(id) : s.add(id));
    setSelected(s);
  };

  const sortBy = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const arrow = (key) => {
    if (sortKey !== key) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const totalCustomers = CUSTOMERS.length;
  const activeCount = CUSTOMERS.filter(c => c.status === 'active').length;
  const vipCount = CUSTOMERS.filter(c => c.tier === 'VIP').length;
  const totalRevenue = CUSTOMERS.reduce((s, c) => s + c.spent, 0);

  const fmt = (n) => '$' + n.toLocaleString();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Customer List</h1>
        <div className="page-actions">
          <button className="btn btn-secondary"><Icon name="sliders" size={12}/> Filters</button>
          <button className="btn btn-secondary"><Icon name="export" size={12}/> Export</button>
          <button className="btn btn-primary"><Icon name="plus" size={12}/> Add Customer</button>
        </div>
      </div>

      <div className="kpi-grid">
        <KPIStat label="TOTAL CUSTOMERS" value={totalCustomers.toLocaleString()} delta="+12.4%" />
        <KPIStat label="ACTIVE" value={activeCount.toLocaleString()} delta="+8.1%" accent/>
        <KPIStat label="VIP MEMBERS" value={vipCount.toLocaleString()} delta="+3 this month" />
        <KPIStat label="TOTAL SPEND" value={fmt(totalRevenue)} delta="+15.2%" />
      </div>

      <div className="card table-card">
        <div className="table-header">
          <div className="card-title">
            ALL CUSTOMERS <span className="info-icon">i</span>
            <span style={{marginLeft:8, color:'var(--text-tertiary)', textTransform:'none', letterSpacing:0, fontSize:11}}>
              {sorted.length} results
            </span>
          </div>
          <div className="table-tools">
            <div className="table-search">
              <Icon name="search" size={12}/>
              <input placeholder="Search by name, email, ID..." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="table-inner">
        <div className="filter-bar">
          <span style={{fontSize:11, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.08em', marginRight:4}}>Status:</span>
          {[{k:'all',l:'All'},{k:'active',l:'Active'},{k:'inactive',l:'Inactive'}].map(f => (
            <button key={f.k} className={`chip ${statusFilter===f.k?'active':''}`} onClick={()=>setStatusFilter(f.k)}>
              {f.l}
            </button>
          ))}
          <span style={{fontSize:11, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.08em', marginLeft:12, marginRight:4}}>Tier:</span>
          {[{k:'all',l:'All'},{k:'vip',l:'VIP'},{k:'standard',l:'Standard'}].map(f => (
            <button key={f.k} className={`chip ${tierFilter===f.k?'active':''}`} onClick={()=>setTierFilter(f.k)}>
              {f.l}
            </button>
          ))}
          {(statusFilter !== 'all' || tierFilter !== 'all' || query) && (
            <button className="chip" onClick={()=>{setStatusFilter('all'); setTierFilter('all'); setQuery('');}} style={{marginLeft:'auto'}}>
              <Icon name="x" size={11}/> Clear
            </button>
          )}
        </div>

        <table>
          <thead>
            <tr>
              <th style={{width: 44}}>
                <span
                  className={`checkbox ${paged.length > 0 && paged.every(c => selected.has(c.id)) ? 'checked' : ''}`}
                  onClick={toggleAll}
                />
              </th>
              <th className={sortKey==='id'?'sorted':''} onClick={()=>sortBy('id')}>ID {arrow('id')}</th>
              <th className={sortKey==='name'?'sorted':''} onClick={()=>sortBy('name')}>CUSTOMER {arrow('name')}</th>
              <th className={sortKey==='country'?'sorted':''} onClick={()=>sortBy('country')}>COUNTRY {arrow('country')}</th>
              <th className={sortKey==='status'?'sorted':''} onClick={()=>sortBy('status')}>STATUS {arrow('status')}</th>
              <th className={sortKey==='tier'?'sorted':''} onClick={()=>sortBy('tier')}>TIER {arrow('tier')}</th>
              <th className={sortKey==='orders'?'sorted':''} onClick={()=>sortBy('orders')}>ORDERS {arrow('orders')}</th>
              <th className={sortKey==='spent'?'sorted':''} onClick={()=>sortBy('spent')}>TOTAL SPEND {arrow('spent')}</th>
              <th className={sortKey==='joined'?'sorted':''} onClick={()=>sortBy('joined')}>JOINED {arrow('joined')}</th>
              <th style={{width: 60}}></th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr><td colSpan={10} style={{textAlign:'center', padding:40, color:'var(--text-tertiary)'}}>No customers match your filters.</td></tr>
            )}
            {paged.map(c => (
              <tr key={c.id} onClick={()=>setDrawerCustomer(c)} style={{cursor:'pointer'}}>
                <td onClick={(e)=>e.stopPropagation()}>
                  <span className={`checkbox ${selected.has(c.id) ? 'checked' : ''}`} onClick={()=>toggle(c.id)}/>
                </td>
                <td className="mono">{c.id}</td>
                <td>
                  <div className="customer-cell">
                    <div className="customer-avatar" style={{background:c.color}}>{c.name.split(' ').map(n=>n[0]).join('')}</div>
                    <div>
                      <div style={{fontWeight:500}}>{c.name}</div>
                      <div style={{fontSize:11, color:'var(--text-tertiary)'}}>{c.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{color:'var(--text-secondary)'}}>{c.country}</td>
                <td><span className={`status-pill ${c.status}`}>{c.status}</span></td>
                <td>
                  {c.tier === 'VIP'
                    ? <span className="status-pill vip">VIP</span>
                    : <span style={{color:'var(--text-secondary)'}}>Standard</span>}
                </td>
                <td className="num">{c.orders}</td>
                <td className="num" style={{fontWeight:600}}>{fmt(c.spent)}</td>
                <td className="mono">{c.joined}</td>
                <td onClick={(e)=>e.stopPropagation()}>
                  <div className="dropdown">
                    <button className="row-actions" onClick={()=>setMenuOpen(menuOpen===c.id?null:c.id)}>
                      <Icon name="more"/>
                    </button>
                    {menuOpen === c.id && (
                      <div className="dropdown-menu">
                        <button className="dropdown-item"><Icon name="eye" size={12}/> View profile</button>
                        <button className="dropdown-item"><Icon name="mail" size={12}/> Send email</button>
                        <button className="dropdown-item"><Icon name="edit" size={12}/> Edit</button>
                        <button className="dropdown-item" style={{color:'#f87171'}}><Icon name="trash" size={12}/> Delete</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        </div>
        <div className="pagination">
          <span>Showing {Math.min(sorted.length, (page-1)*perPage + 1)}–{Math.min(page*perPage, sorted.length)} of {sorted.length}{selected.size > 0 && <span style={{marginLeft:12, color:'var(--accent)'}}> · {selected.size} selected</span>}</span>
          <div className="pagination-btns">
            <button className="page-btn" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button>
            {Array.from({length: pageCount}, (_, i) => i+1).map(n => (
              <button key={n} className={`page-btn ${n===page?'active':''}`} onClick={()=>setPage(n)}>{n}</button>
            ))}
            <button className="page-btn" disabled={page===pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>›</button>
          </div>
        </div>
      </div>

      {drawerCustomer && <CustomerDrawer customer={drawerCustomer} onClose={()=>setDrawerCustomer(null)} />}
    </>
  );
};

const KPIStat = ({ label, value, delta, accent }) => {
  const sparkData = [30,50,40,60,45,70,55,80,65,90,75,100,85];
  const peak = sparkData.indexOf(Math.max(...sparkData));
  return (
    <div className="kpi-card">
      <div className="kpi-inner">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value-row">
          <div className="kpi-value" style={accent ? {color:'var(--accent)'} : {}}>{value}</div>
        </div>
        <div className="kpi-sparkline">
          {sparkData.map((h, i) => (
            <div key={i} className={`bar ${i === peak ? 'peak' : ''}`} style={{ height: `${h}%` }}/>
          ))}
        </div>
      </div>
      <div className="kpi-footer">
        <span className="info-icon">i</span>
        <span className="kpi-delta">{delta}</span>
      </div>
    </div>
  );
};

const CustomerDrawer = ({ customer, onClose }) => {
  const fmt = (n) => '$' + n.toLocaleString();
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e)=>e.stopPropagation()}>
        <div className="drawer-header">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <div className="customer-avatar" style={{background:customer.color, width:44, height:44, fontSize:14}}>
              {customer.name.split(' ').map(n=>n[0]).join('')}
            </div>
            <div>
              <div style={{fontSize:16, fontWeight:600}}>{customer.name}</div>
              <div style={{fontSize:12, color:'var(--text-tertiary)'}}>{customer.email}</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>
        <div className="drawer-body">
          <div className="drawer-stats">
            <div className="drawer-stat">
              <div className="drawer-stat-label">Total Orders</div>
              <div className="drawer-stat-value">{customer.orders}</div>
            </div>
            <div className="drawer-stat">
              <div className="drawer-stat-label">Total Spend</div>
              <div className="drawer-stat-value">{fmt(customer.spent)}</div>
            </div>
            <div className="drawer-stat">
              <div className="drawer-stat-label">Avg Order</div>
              <div className="drawer-stat-value">{fmt(Math.round(customer.spent / Math.max(1,customer.orders)))}</div>
            </div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">Profile</div>
            <div className="drawer-field"><span>Customer ID</span><span className="mono">{customer.id}</span></div>
            <div className="drawer-field"><span>Status</span><span className={`status-pill ${customer.status}`}>{customer.status}</span></div>
            <div className="drawer-field"><span>Tier</span>{customer.tier === 'VIP' ? <span className="status-pill vip">VIP</span> : <span>Standard</span>}</div>
            <div className="drawer-field"><span>Country</span><span>{customer.country}</span></div>
            <div className="drawer-field"><span>Joined</span><span className="mono">{customer.joined}</span></div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-title">Activity (last 8 weeks)</div>
            <div style={{display:'flex', alignItems:'flex-end', gap:3, height:60, padding:'8px 0'}}>
              {Array.from({length:40}).map((_,i) => {
                const h = 20 + ((i * 17 + customer.orders) % 80);
                return <div key={i} style={{flex:1, height:`${h}%`, background:'var(--accent)', opacity: 0.3 + (h/100)*0.7, borderRadius:1}}/>;
              })}
            </div>
          </div>
        </div>
        <div className="drawer-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary"><Icon name="mail" size={12}/> Contact</button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { CustomerList });
