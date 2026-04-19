// ============================================
// OVERVIEW PAGE
// ============================================

// Pixelated chart — mimics the mosaic look from the ref
const PixelChart = () => {
  // 52 columns (weeks), each 20 rows tall
  // Pattern: low mid-year, peaks around Jun and Oct
  const columns = 52;
  const rows = 20;
  const monthLabels = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const [activeCol, setActiveCol] = React.useState(24); // Jun-ish
  const [view, setView] = React.useState('Monthly');

  // Generate deterministic heights per column — shorter orange bars, mostly lower half
  const heights = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < columns; i++) {
      const monthIdx = (i / columns) * 12;
      // Pattern: small bumps per month with a taller center column per month group
      const monthPhase = (i % 4);
      const base = monthPhase === 2 ? 6 : monthPhase === 1 ? 4 : monthPhase === 3 ? 3 : 2;
      const seasonal = Math.sin((monthIdx / 12) * Math.PI * 2) * 1.5;
      const noise = ((i * 37) % 3) - 1;
      arr.push(Math.max(1, Math.min(10, Math.round(base + seasonal + noise))));
    }
    return arr;
  }, []);

  const activeMonth = Math.floor((activeCol / columns) * 12);

  return (
    <div className="card pixel-chart-card">
      <div className="chart-topstrip">
        <div className="card-title">
          SALES TREND <span className="info-icon">i</span>
        </div>
        <button className="row-actions"><Icon name="more"/></button>
      </div>
      <div className="chart-inner">
      <div className="chart-meta">
        <div className="chart-meta-left">
          <div>
            <span className="chart-total-label">Total Revenue :</span>
            <span className="chart-total-value">$20,320</span>
          </div>
          <div className="legend">
            <span className="legend-item"><span className="legend-dot" style={{background:'#ff8844'}}/>NEW USER</span>
            <span className="legend-item"><span className="legend-dot" style={{background:'#f26b1f'}}/>EXISTING USER</span>
          </div>
        </div>
        <div className="segmented">
          {['Weekly','Monthly','Yearly'].map(v => (
            <button key={v} className={view===v?'active':''} onClick={()=>setView(v)}>{v}</button>
          ))}
        </div>
      </div>

      <div className="pixel-chart-wrap">
        <div className="y-axis">
          {['60k','50k','40k','30k','20k','10k','0k'].map(v=><span key={v}>{v}</span>)}
        </div>
        <div style={{ position: 'relative' }}>
          <div className="pixel-grid">
            {heights.map((h, col) => (
              <div
                key={col}
                className={`pixel-col ${col === activeCol ? 'active' : ''}`}
                onMouseEnter={() => setActiveCol(col)}
              >
                {Array.from({ length: rows }).map((_, rIdx) => {
                  const rowFromBottom = rows - rIdx;
                  let cls = 'pixel-cell';
                  if (rowFromBottom <= h) {
                    // split: new user lighter at top, existing orange below
                    const splitPoint = Math.max(1, Math.floor(h * 0.3));
                    if (rowFromBottom > h - splitPoint) cls += ' filled-low';
                    else cls += ' filled-high';
                  } else {
                    // dim speckle — dense scatter
                    const noise = ((col * 13 + rIdx * 7 + col * rIdx) % 100);
                    if (noise < 45) cls += ' dim';
                    else if (noise < 60) cls += ' speckle';
                  }
                  return <div key={rIdx} className={cls}/>;
                })}
              </div>
            ))}
          </div>

          {activeCol !== null && (
            <div
              className="chart-tooltip"
              style={{
                left: `${((activeCol + 0.5) / columns) * 100}%`,
                top: `${40}%`
              }}
            >
              <div className="chart-tooltip-title">{monthLabels[activeMonth]} 2025</div>
              <div className="chart-tooltip-row">
                <span className="dot" style={{background:'#ff8844'}}/>
                <span>New User</span>
                <span className="val">{(heights[activeCol] * 2.1).toFixed(0)}k</span>
              </div>
              <div className="chart-tooltip-row">
                <span className="dot" style={{background:'#f26b1f'}}/>
                <span>Existing</span>
                <span className="val">{(heights[activeCol] * 1.1).toFixed(0)}k</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="x-axis">
        {monthLabels.map((m, i) => (
          <span key={m} className={i === activeMonth ? 'active' : ''}>{m}</span>
        ))}
      </div>
      </div>
    </div>
  );
};

// Revenue bar chart
const RevenueBreakdown = () => {
  const bars = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < 30; i++) {
      const h = 20 + Math.abs(Math.sin(i * 0.6) * 60) + (i % 5 === 0 ? 30 : 0) + ((i * 17) % 25);
      arr.push(Math.min(100, h));
    }
    return arr;
  }, []);
  const [hoverIdx, setHoverIdx] = React.useState(null);

  const maxBar = Math.max(...bars);
  return (
    <div className="card pixel-chart-card">
      <div className="chart-topstrip">
        <div className="card-title">
          REVENUE BREAKDOWN <span className="info-icon">i</span>
        </div>
        <button className="row-actions"><Icon name="more"/></button>
      </div>
      <div className="chart-inner">
      <div className="rev-header">
        <div className="rev-subtitle">Revenue by Category</div>
        <div className="date-pill">
          <Icon name="calendar" size={11}/>
          Jan 1 - Aug 30 <Icon name="caret" size={10}/>
        </div>
      </div>
      <div className="rev-total">$20,320</div>

      <button className="ai-insight-pill">
        <span className="sparkle"><Icon name="sparkle" size={14}/></span>
        <span>Get AI insight for better analysis</span>
        <span className="arrow"><Icon name="arrowUpRight" size={12}/></span>
      </button>

      <div className="rev-bars">
        {bars.map((h, i) => {
          const fg = h * 0.55 + ((i * 11) % 18);
          return (
            <div
              key={i}
              className="rev-bar-col"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              title={`Day ${i+1}: $${(h * 12).toFixed(0)}`}
            >
              <div className="rev-bar-bg" style={{ height: `${h}%` }}/>
              <div className="rev-bar-fg" style={{ height: `${fg}%` }}/>
            </div>
          );
        })}
      </div>
      <div className="rev-dates">
        <span>1 JAN</span>
        <span>30 JAN 2025</span>
      </div>
      </div>
    </div>
  );
};

// KPI cards
const KPI = ({ label, value, suffix, delta, sparkData }) => {
  const peak = sparkData.indexOf(Math.max(...sparkData));
  return (
    <div className="kpi-card">
      <div className="kpi-inner">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value-row">
          <div className="kpi-value">{value}</div>
          {suffix && <div className="kpi-suffix">{suffix}</div>}
        </div>
        <div className="kpi-sparkline">
          {sparkData.map((h, i) => (
            <div key={i} className={`bar ${i === peak ? 'peak' : ''}`} style={{ height: `${h}%` }}/>
          ))}
        </div>
      </div>
      <div className="kpi-footer">
        <span className="info-icon">i</span>
        <span className="kpi-delta">
          +{delta}<span className="muted"> last year</span>
        </span>
      </div>
    </div>
  );
};

const KpiRow = () => {
  const spark1 = [30,50,40,60,45,70,55,80,65,90,75,100,85];
  const spark2 = [50,45,60,55,70,65,80,75,90,85,95,100,90];
  const spark3 = [40,55,45,65,55,75,65,85,75,95,85,100,95];
  const spark4 = [60,50,70,55,80,65,85,75,90,80,95,85,100];
  return (
    <div className="kpi-grid">
      <KPI label="TOTAL REVENUE" value="$20,320" delta="0.94" sparkData={spark1}/>
      <KPI label="TOTAL ORDERS" value="10,320" suffix="Orders" delta="0.94" sparkData={spark2}/>
      <KPI label="NEW CUSTOMERS" value="4,305" suffix="New Users" delta="0.94" sparkData={spark3}/>
      <KPI label="CONVERSION RATE" value="3.9%" delta="0.94" sparkData={spark4}/>
    </div>
  );
};

// Transactions table
const TRANSACTIONS = [
  { id: '#04910', customer: 'Ryan Korsgaard',  product: 'Ergo Office Chair', status: 'success', qty: 12, unit: 3450, total: 41400, color:'#f59e0b' },
  { id: '#04911', customer: 'Madelyn Lubin',   product: 'Sunset Desk 02',    status: 'success', qty: 20, unit: 2980, total: 89200, color:'#ec4899' },
  { id: '#04912', customer: 'Abram Bergson',   product: 'Eco Bookshelf',     status: 'pending', qty: 22, unit: 1750, total: 75900, color:'#8b5cf6' },
  { id: '#04913', customer: 'Phillip Mango',   product: 'Green Leaf Desk',   status: 'refunded',qty: 24, unit: 1950, total: 19500, color:'#10b981' },
  { id: '#04914', customer: 'Nora Whitfield',  product: 'Oak Stand Lamp',    status: 'success', qty: 8,  unit: 890,  total: 7120,  color:'#3b82f6' },
  { id: '#04915', customer: 'Kenji Watanabe',  product: 'Linen Throw Rug',   status: 'pending', qty: 15, unit: 420,  total: 6300,  color:'#f26b1f' },
  { id: '#04916', customer: 'Priya Raman',     product: 'Walnut Side Table', status: 'success', qty: 30, unit: 1200, total: 36000, color:'#06b6d4' },
];

const TransactionsTable = () => {
  const [selected, setSelected] = React.useState(new Set());
  const [sortKey, setSortKey] = React.useState('id');
  const [sortDir, setSortDir] = React.useState('asc');
  const [query, setQuery] = React.useState('');
  const [menuOpen, setMenuOpen] = React.useState(null);

  const toggle = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    if (selected.size === TRANSACTIONS.length) setSelected(new Set());
    else setSelected(new Set(TRANSACTIONS.map(t=>t.id)));
  };

  const sorted = React.useMemo(() => {
    const filtered = TRANSACTIONS.filter(t =>
      !query || t.customer.toLowerCase().includes(query.toLowerCase())
        || t.product.toLowerCase().includes(query.toLowerCase())
        || t.id.includes(query)
    );
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [sortKey, sortDir, query]);

  const sortBy = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const arrow = (key) => {
    if (sortKey !== key) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const fmt = (n) => '$' + n.toLocaleString();

  return (
    <div className="card table-card">
      <div className="table-header">
        <div className="card-title">
          RECENT TRANSACTIONS <span className="info-icon">i</span>
        </div>
        <div className="table-tools">
          <div className="table-search">
            <Icon name="search" size={12}/>
            <input placeholder="Search transactions..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <button className="btn btn-primary">
            <Icon name="plus" size={12}/>
            Add Transaction
          </button>
          <button className="row-actions" style={{width:34, height:34}}><Icon name="more"/></button>
        </div>
      </div>
      <div className="table-inner">
      <table>
        <thead>
          <tr>
            <th style={{width: 44}}>
              <span className={`checkbox ${selected.size === TRANSACTIONS.length ? 'checked' : ''}`} onClick={toggleAll}/>
            </th>
            <th className={sortKey==='id'?'sorted':''} onClick={()=>sortBy('id')}>ID {arrow('id')}</th>
            <th className={sortKey==='customer'?'sorted':''} onClick={()=>sortBy('customer')}>CUSTOMER {arrow('customer')}</th>
            <th className={sortKey==='product'?'sorted':''} onClick={()=>sortBy('product')}>PRODUCT {arrow('product')}</th>
            <th className={sortKey==='status'?'sorted':''} onClick={()=>sortBy('status')}>STATUS {arrow('status')}</th>
            <th className={sortKey==='qty'?'sorted':''} onClick={()=>sortBy('qty')}>QTY {arrow('qty')}</th>
            <th className={sortKey==='unit'?'sorted':''} onClick={()=>sortBy('unit')}>UNIT PRICE {arrow('unit')}</th>
            <th className={sortKey==='total'?'sorted':''} onClick={()=>sortBy('total')}>TOTAL REVENUE {arrow('total')}</th>
            <th style={{width: 80}}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(t => (
            <tr key={t.id}>
              <td><span className={`checkbox ${selected.has(t.id) ? 'checked' : ''}`} onClick={()=>toggle(t.id)}/></td>
              <td className="mono">{t.id}</td>
              <td>
                <div className="customer-cell">
                  <div className="customer-avatar" style={{background:t.color}}>{t.customer.split(' ').map(n=>n[0]).join('')}</div>
                  {t.customer}
                </div>
              </td>
              <td>{t.product}</td>
              <td><span className={`status-pill ${t.status}`}>{t.status}</span></td>
              <td className="num">{t.qty}</td>
              <td className="num">{fmt(t.unit)}</td>
              <td className="num" style={{fontWeight:600}}>{fmt(t.total)}</td>
              <td>
                <div className="dropdown">
                  <button className="row-actions" onClick={()=>setMenuOpen(menuOpen===t.id?null:t.id)}>
                    <Icon name="more"/>
                  </button>
                  {menuOpen === t.id && (
                    <div className="dropdown-menu">
                      <button className="dropdown-item"><Icon name="eye" size={12}/> View details</button>
                      <button className="dropdown-item"><Icon name="edit" size={12}/> Edit</button>
                      <button className="dropdown-item"><Icon name="download" size={12}/> Export</button>
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
    </div>
  );
};

// Page-level header controls
const OverviewHeader = () => {
  const [period, setPeriod] = React.useState('Daily');
  const [periodOpen, setPeriodOpen] = React.useState(false);

  return (
    <div className="page-header">
      <h1 className="page-title">Welcome back, Salung</h1>
      <div className="page-actions">
        <div className="split-control">
          <div className="dropdown">
            <button onClick={()=>setPeriodOpen(!periodOpen)}>
              {period} <Icon name="caret" size={10}/>
            </button>
            {periodOpen && (
              <div className="dropdown-menu">
                {['Daily','Weekly','Monthly','Yearly'].map(p => (
                  <button key={p} className={`dropdown-item ${period===p?'active':''}`} onClick={()=>{setPeriod(p); setPeriodOpen(false);}}>{p}</button>
                ))}
              </div>
            )}
          </div>
          <span className="divider"/>
          <button><Icon name="calendar" size={12}/> 6 Nov 2025</button>
        </div>
        <button className="btn btn-primary" style={{height:34}}><Icon name="export" size={12}/> Export CSV</button>
      </div>
    </div>
  );
};

const OverviewPage = () => (
  <>
    <OverviewHeader />
    <KpiRow />
    <div className="charts-row">
      <PixelChart />
      <RevenueBreakdown />
    </div>
    <TransactionsTable />
  </>
);

Object.assign(window, { OverviewPage });
