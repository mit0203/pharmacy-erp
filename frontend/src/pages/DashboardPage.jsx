import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Package,
  Clock,
  XCircle,
  Plus,
  BarChart3,
  Activity,
  RefreshCw,
  Wallet,
  CreditCard,
  CalendarRange,
  Pill,
} from 'lucide-react';
import { getDashboard, getMedicines, getBatches } from '../api/services';
import { useAuth } from '../context/AuthContext';

const PAGE_FETCH_SIZE = 200;
const FILTER_OPTIONS = [
  { key: 'TODAY', label: 'Today' },
  { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
  { key: 'LAST_30_DAYS', label: 'Last 30 Days' },
  { key: 'THIS_MONTH', label: 'This Month' },
  { key: 'THIS_YEAR', label: 'This Year' },
  { key: 'ALL', label: 'All Time' },
  { key: 'CUSTOM', label: 'Custom' },
];

const statusMeta = {
  OUT_OF_STOCK: { label: 'OUT OF STOCK', cls: 'pill-red', color: '#e74c3c' },
  LOW_STOCK: { label: 'LOW STOCK', cls: 'pill-orange', color: '#e67e22' },
  EXPIRED: { label: 'EXPIRED', cls: 'pill-red', color: '#c0392b' },
  NEAR_EXPIRY: { label: 'NEAR EXPIRY', cls: 'pill-yellow', color: '#d97706' },
};

const formatCurrency = (val) => {
  if (val == null) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatSignedCurrency = (val) => {
  const num = Number(val || 0);
  const abs = Math.abs(num);
  return `${num < 0 ? '-' : ''}${formatCurrency(abs)}`;
};

const formatNum = (val) => (val == null ? '0' : Number(val).toLocaleString('en-IN'));

function getItemId(item) {
  return item?.id || item?._id || item?.medicineId || item?.batchId || '';
}

function getMedicineName(med) {
  return med?.medicineName || med?.name || med?.genericName || med?.productName || 'Unknown Medicine';
}

function getDaysLeft(dateValue) {
  if (!dateValue) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function timeAgo(dateValue) {
  if (!dateValue) return 'Recently';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function getActivityColor(type) {
  switch (type) {
    case 'SALE_COMPLETED':
    case 'SALE_PAID':
    case 'SALE_INVOICED':
      return '#16a34a';
    case 'PURCHASE_RECEIVED':
    case 'PURCHASE_PAID':
    case 'PURCHASE_INVOICED':
      return '#2d3a8c';
    case 'SALE_CREATED':
    case 'PURCHASE_CREATED':
      return '#0ea5e9';
    case 'PURCHASE_APPROVED':
    case 'SALE_CONFIRMED':
      return '#9333ea';
    case 'SALE_DISPATCHED':
      return '#2563eb';
    default:
      return 'var(--text-muted, #64748b)';
  }
}

async function fetchAllPages(serviceFn) {
  const first = await serviceFn({ page: 0, size: PAGE_FETCH_SIZE });
  const firstData = first.data?.data;

  if (Array.isArray(firstData)) return firstData;
  if (!firstData || !Array.isArray(firstData.content)) return [];

  let all = [...firstData.content];
  const totalPages = firstData.totalPages || 1;

  if (totalPages > 1) {
    const requests = [];
    for (let page = 1; page < totalPages; page += 1) {
      requests.push(serviceFn({ page, size: PAGE_FETCH_SIZE }));
    }

    const responses = await Promise.all(requests);
    responses.forEach((res) => {
      const pageData = res.data?.data;
      if (pageData?.content && Array.isArray(pageData.content)) {
        all = all.concat(pageData.content);
      }
    });
  }

  return all;
}

function StatCard({ label, value, subLabel, icon: Icon, tone = 'default', trend, progress, onClick }) {
  const isPrimary = tone === 'primary';

  return (
    <div
      className={`stat-card${isPrimary ? ' primary' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', minHeight: '138px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ minWidth: 0 }}>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>

          {trend && (
            <div
              style={{
                marginTop: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '999px',
                background: isPrimary
                  ? 'rgba(255,255,255,0.16)'
                  : trend.type === 'up'
                    ? '#ecfdf3'
                    : 'var(--bg-card, #ffffff)4e5',
                color: isPrimary ? 'var(--bg-card, var(--bg-card, #ffffff)fff)' : trend.type === 'up' ? '#15803d' : '#b45309',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {trend.type === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trend.label}
            </div>
          )}
        </div>

        {Icon && (
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: isPrimary ? 'rgba(255,255,255,0.16)' : '#eef3ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={20} color={isPrimary ? 'var(--bg-card, var(--bg-card, #ffffff)fff)' : '#2d3a8c'} />
          </div>
        )}
      </div>

      {subLabel && (
        <p
          className="stat-sub"
          style={{
            fontSize: '12px',
            color: isPrimary ? 'rgba(255,255,255,0.8)' : '#718096',
            marginTop: '8px',
          }}
        >
          {subLabel}
        </p>
      )}

      {progress != null && (
        <div style={{ marginTop: '12px' }}>
          <div
            style={{
              height: '8px',
              borderRadius: '999px',
              background: isPrimary ? 'rgba(255,255,255,0.18)' : '#edf2f7',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(progress, 100)}%`,
                background: isPrimary ? 'var(--bg-card, var(--bg-card, #ffffff)fff)' : '#2d3a8c',
                borderRadius: '999px',
              }}
            />
          </div>
          <div
            style={{
              fontSize: '11px',
              marginTop: '6px',
              color: isPrimary ? 'rgba(255,255,255,0.82)' : '#718096',
            }}
          >
            Margin ratio: {progress}%
          </div>
        </div>
      )}
    </div>
  );
}

function MiniFinanceCard({ title, value, icon: Icon, tone, onClick }) {
  const accent = tone === 'green' ? '#16a34a' : '#dc2626';
  const bg = tone === 'green' ? '#effdf5' : 'var(--bg-card, #ffffff)1f2';
  const toneClass = tone === 'green' ? 'success' : 'danger';

  return (
    <div className="stat-card dashboard-mini-card" onClick={onClick} style={{ padding: '16px 18px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <div className={`dashboard-mini-title ${toneClass}`} style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', color: accent, marginBottom: '6px' }}>
            {title}
          </div>
          <div className="dashboard-mini-value" style={{ fontSize: '22px', fontWeight: 800 }}>{value}</div>
        </div>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} color={accent} />
        </div>
      </div>
    </div>
  );
}

function AlertSummaryCard({ title, count, color, bg, icon: Icon, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        textAlign: 'center',
        padding: '14px',
        background: bg,
        borderRadius: '14px',
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid rgba(226, 232, 240, 0.7)',
      }}
    >
      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          margin: '0 auto 10px',
          background: 'var(--bg-card, var(--bg-card, #ffffff)fff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 3px 8px rgba(15, 23, 42, 0.05)',
        }}
      >
        <Icon size={17} color={color} />
      </div>
      <div style={{ fontSize: '26px', fontWeight: 800, color }}>{formatNum(count)}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 700, marginTop: '4px' }}>{title}</div>
    </div>
  );
}

function ActivityItem({ title, time, dotColor, sub, amount, hideBorder = false }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px 0',
        borderBottom: hideBorder ? 'none' : '1px solid var(--bg-card-soft, #f1f5f9)',
      }}
    >
      <div
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '999px',
          background: `${dotColor}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px',
        }}
      >
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor }} />
      </div>

      <div style={{ minWidth: 0, width: '100%' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-main, #1f2937)', fontWeight: 600, lineHeight: 1.45 }}>{title}</div>
        {sub && <div style={{ fontSize: '11.5px', color: 'var(--text-soft, #94a3b8)', marginTop: '3px' }}>{sub}</div>}
        {amount != null && (
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #334155)', marginTop: '4px' }}>{formatCurrency(amount)}</div>
        )}
        <div style={{ fontSize: '11px', color: 'var(--text-soft, #94a3b8)', marginTop: '4px' }}>{time}</div>
      </div>
    </div>
  );
}

function ProgressBlock({ label, count, color, bg, percent, hideBorder = false }) {
  return (
    <div
      style={{
        paddingBottom: hideBorder ? 0 : '14px',
        marginBottom: hideBorder ? 0 : '14px',
        borderBottom: hideBorder ? 'none' : '1px solid var(--bg-card-soft, #f1f5f9)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted, #475569)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 800, color }}>{formatNum(count)}</span>
      </div>

      <div style={{ height: '8px', background: bg, borderRadius: '999px', marginTop: '8px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(percent, 100)}%`, background: color, borderRadius: '999px' }} />
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #eef2f7 25%, var(--bg-card-soft, #f8fafc) 50%, #eef2f7 75%)',
        backgroundSize: '200% 100%',
        borderRadius: '18px',
        height: '138px',
        animation: 'pulse 1.6s infinite',
      }}
    />
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active ? '1px solid #2d3a8c' : '1px solid #dbe5f0',
        background: active ? '#eef3ff' : 'var(--bg-card, var(--bg-card, #ffffff)fff)',
        color: active ? '#2d3a8c' : 'var(--text-muted, #475569)',
        borderRadius: '999px',
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function TrendChart({ data = [] }) {
  const hasData = Array.isArray(data) && data.length > 0;
  const maxValue = hasData
    ? Math.max(
        1,
        ...data.flatMap((item) => [Number(item?.sales || 0), Number(item?.purchases || 0), Math.abs(Number(item?.profit || 0))])
      )
    : 1;

  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 700 }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#16a34a', display: 'inline-block' }} /> Sales
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 700 }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#2d3a8c', display: 'inline-block' }} /> Purchases
        </div>
      </div>

      {!hasData ? (
        <div style={{ padding: '28px 0', textAlign: 'center', fontSize: '13px', color: 'var(--text-soft, #94a3b8)' }}>
          No trend data available for the selected period.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, minmax(70px, 1fr))`, gap: '12px', alignItems: 'end', minHeight: '250px' }}>
          {data.map((item, idx) => {
            const salesHeight = Math.max(8, (Number(item?.sales || 0) / maxValue) * 170);
            const purchasesHeight = Math.max(8, (Number(item?.purchases || 0) / maxValue) * 170);
            const profit = Number(item?.profit || 0);

            return (
              <div key={`${item?.label || 'bucket'}-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: profit >= 0 ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                  {profit >= 0 ? '+' : '-'}{formatCurrency(Math.abs(profit))}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '180px' }}>
                  <div title={`Sales: ${formatCurrency(item?.sales)}`} style={{ width: '22px', height: `${salesHeight}px`, borderRadius: '10px 10px 4px 4px', background: 'linear-gradient(180deg, #3ddc84, #16a34a)' }} />
                  <div title={`Purchases: ${formatCurrency(item?.purchases)}`} style={{ width: '22px', height: `${purchasesHeight}px`, borderRadius: '10px 10px 4px 4px', background: 'linear-gradient(180deg, #4b63ff, #2d3a8c)' }} />
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-main, #111827)', fontWeight: 700 }}>{item?.label || '-'}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-soft, #94a3b8)', marginTop: '2px' }}>S {formatCurrency(item?.sales)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-soft, #94a3b8)' }}>P {formatCurrency(item?.purchases)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopSellingTable({ items = [], onViewSales }) {
  return (
    <div>
      {items.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '13px', color: 'var(--text-soft, #94a3b8)' }}>
          No completed sales found for the selected period.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card-soft, #f8fafc)' }}>
                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Medicine</th>
                <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Qty Sold</th>
                <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={`${item?.medicineId || 'med'}-${idx}`} style={{ borderBottom: idx === items.length - 1 ? 'none' : '1px solid #edf2f7' }}>
                  <td style={{ padding: '14px', color: 'var(--text-main, #111827)', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '12px', background: '#eef3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pill size={16} color="#2d3a8c" />
                      </div>
                      <div>
                        <div>{item?.medicineName || 'Unknown Medicine'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-soft, #94a3b8)', marginTop: '2px' }}>ID: {item?.medicineId || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right', color: 'var(--text-main, #1f2937)', fontWeight: 700 }}>{formatNum(item?.quantitySold)}</td>
                  <td style={{ padding: '14px', textAlign: 'right', color: '#15803d', fontWeight: 800 }}>{formatCurrency(item?.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }} onClick={onViewSales}>
        <ShoppingCart size={14} /> View Sales Orders
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    preset: 'THIS_MONTH',
    startDate: '',
    endDate: '',
  });
  const [customDateInputs, setCustomDateInputs] = useState({ startDate: '', endDate: '' });
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchDashboardData = async (activeFilter = filter, keepStaticData = false) => {
    setLoading(true);
    setError('');

    try {
      const dashboardParams = {};
      if (activeFilter.preset && activeFilter.preset !== 'CUSTOM') {
        dashboardParams.preset = activeFilter.preset;
      }
      if (activeFilter.preset === 'CUSTOM' && activeFilter.startDate && activeFilter.endDate) {
        dashboardParams.startDate = activeFilter.startDate;
        dashboardParams.endDate = activeFilter.endDate;
      }

      const requests = [getDashboard(dashboardParams)];
      if (!keepStaticData) {
        requests.push(fetchAllPages(getMedicines), fetchAllPages(getBatches));
      }

      const results = await Promise.allSettled(requests);
      const dashboardResult = results[0];

      if (dashboardResult.status === 'fulfilled') {
        setDashboardData(dashboardResult.value.data?.data || dashboardResult.value.data || null);
      } else {
        setDashboardData(null);
      }

      if (!keepStaticData) {
        const medicinesResult = results[1];
        const batchesResult = results[2];

        if (medicinesResult?.status === 'fulfilled') {
          setMedicines(Array.isArray(medicinesResult.value) ? medicinesResult.value : []);
        } else {
          setMedicines([]);
        }

        if (batchesResult?.status === 'fulfilled') {
          setBatches(Array.isArray(batchesResult.value) ? batchesResult.value : []);
        } else {
          setBatches([]);
        }

        if (dashboardResult.status !== 'fulfilled' || medicinesResult?.status !== 'fulfilled' || batchesResult?.status !== 'fulfilled') {
          setError('Some dashboard sections are using fallback calculations.');
        }
      } else if (dashboardResult.status !== 'fulfilled') {
        setError('Dashboard analytics could not be loaded.');
      }
    } catch (err) {
      console.error('Dashboard load failed:', err);
      setDashboardData(null);
      if (!keepStaticData) {
        setMedicines([]);
        setBatches([]);
      }
      setError('Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(filter, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePresetChange = (preset) => {
    const nextFilter =
      preset === 'CUSTOM'
        ? { preset: 'CUSTOM', startDate: customDateInputs.startDate, endDate: customDateInputs.endDate }
        : { preset, startDate: '', endDate: '' };

    setFilter(nextFilter);

    if (preset !== 'CUSTOM') {
      fetchDashboardData(nextFilter, true);
    }
  };

  const handleApplyCustomRange = () => {
    if (!customDateInputs.startDate || !customDateInputs.endDate) {
      setError('Please select both custom start and end dates.');
      return;
    }

    const nextFilter = {
      preset: 'CUSTOM',
      startDate: customDateInputs.startDate,
      endDate: customDateInputs.endDate,
    };

    setFilter(nextFilter);
    fetchDashboardData(nextFilter, true);
  };

  const medicineById = useMemo(() => {
    const map = {};
    medicines.forEach((med) => {
      const ids = [med?.id, med?._id, med?.medicineId].filter(Boolean);
      ids.forEach((id) => {
        map[String(id)] = med;
      });
    });
    return map;
  }, [medicines]);

  const expiryWithin90Count = useMemo(
    () =>
      batches.filter((batch) => {
        const days = getDaysLeft(batch.expiryDate);
        return days !== null && days >= 0 && days <= 90;
      }).length,
    [batches]
  );

  const computedMetrics = useMemo(() => {
    const totalSales = Number(dashboardData?.totalSales || 0);
    const totalPurchases = Number(dashboardData?.totalPurchases || 0);
    const pendingReceivables = Number(dashboardData?.pendingReceivables || 0);
    const pendingPayables = Number(dashboardData?.pendingPayables || 0);

    const rawProfit = dashboardData?.profit != null ? Number(dashboardData.profit) : totalSales - totalPurchases;

    const lowStockCount = dashboardData?.lowStockCount != null
      ? Number(dashboardData.lowStockCount)
      : medicines.filter((med) => {
          const stock = Number(med.stockQuantity || 0);
          const min = Number(med.minimumStockLevel || 20);
          return stock > 0 && stock <= min;
        }).length;

    const outOfStockCount = dashboardData?.outOfStockCount != null
      ? Number(dashboardData.outOfStockCount)
      : medicines.filter((med) => Number(med.stockQuantity || 0) === 0).length;

    const nearExpiryCount = dashboardData?.nearExpiryCount != null
      ? Number(dashboardData.nearExpiryCount)
      : batches.filter((batch) => {
          const days = getDaysLeft(batch.expiryDate);
          return days !== null && days >= 0 && days <= 30;
        }).length;

    const expiredCount = dashboardData?.expiredCount != null
      ? Number(dashboardData.expiredCount)
      : batches.filter((batch) => {
          const days = getDaysLeft(batch.expiryDate);
          return days !== null && days < 0;
        }).length;

    return {
      totalSales,
      totalPurchases,
      profit: rawProfit,
      lowStockCount,
      outOfStockCount,
      nearExpiryCount,
      expiredCount,
      pendingReceivables,
      pendingPayables,
    };
  }, [dashboardData, medicines, batches]);

  const criticalInventory = useMemo(() => {
    const items = [];

    medicines.forEach((med) => {
      const stock = Number(med.stockQuantity || 0);
      const minStock = Number(med.minimumStockLevel || 20);
      const medId = String(getItemId(med));

      const relatedBatches = batches
        .filter((batch) => String(batch.medicineId || '') === medId)
        .sort((a, b) => {
          const aDate = new Date(a.expiryDate || a.updatedAt || a.createdAt || 0).getTime();
          const bDate = new Date(b.expiryDate || b.updatedAt || b.createdAt || 0).getTime();
          return aDate - bDate;
        });

      const expiredBatch = relatedBatches.find((batch) => {
        const days = getDaysLeft(batch.expiryDate);
        return days !== null && days < 0;
      });

      const nearExpiryBatch = relatedBatches.find((batch) => {
        const days = getDaysLeft(batch.expiryDate);
        return days !== null && days >= 0 && days <= 30;
      });

      let status = null;
      let batchLabel = relatedBatches[0]?.batchNumber ? `Batch: ${relatedBatches[0].batchNumber}` : 'No batch linked';

      if (stock === 0) {
        status = 'OUT_OF_STOCK';
      } else if (expiredBatch) {
        status = 'EXPIRED';
        batchLabel = `Batch: ${expiredBatch.batchNumber || 'N/A'}`;
      } else if (stock <= minStock) {
        status = 'LOW_STOCK';
      } else if (nearExpiryBatch) {
        status = 'NEAR_EXPIRY';
        batchLabel = `Batch: ${nearExpiryBatch.batchNumber || 'N/A'}`;
      }

      if (status) {
        items.push({ id: medId, name: getMedicineName(med), batch: batchLabel, stock, status });
      }
    });

    const order = { OUT_OF_STOCK: 1, EXPIRED: 2, LOW_STOCK: 3, NEAR_EXPIRY: 4 };

    return items
      .sort((a, b) => {
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [medicines, batches]);

  const fallbackInventoryActivityFeed = useMemo(() => {
    const items = [];
    const now = Date.now();

    batches.forEach((batch) => {
      const med = medicineById[String(batch.medicineId || '')];
      const medName = getMedicineName(med);
      const createdTimestamp = batch.createdAt;
      const days = getDaysLeft(batch.expiryDate);

      if (createdTimestamp) {
        items.push({
          key: `batch-added-${getItemId(batch)}`,
          entityKey: `batch-${getItemId(batch)}`,
          type: 'BATCH_ADDED',
          title: `Batch ${batch.batchNumber || 'N/A'} added for ${medName}`,
          sub: `${formatNum(batch.quantity || 0)} units • ${batch.supplierName || 'Supplier not set'}`,
          time: timeAgo(createdTimestamp),
          sortValue: new Date(createdTimestamp).getTime(),
          dotColor: '#2d3a8c',
          amount: null,
        });
      }

      if (days !== null && days < 0) {
        items.push({
          key: `expired-${getItemId(batch)}`,
          entityKey: `batch-${getItemId(batch)}`,
          type: 'EXPIRED',
          title: `${medName} batch ${batch.batchNumber || ''} is expired`,
          sub: `Expiry date: ${batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('en-CA') : 'N/A'}`,
          time: 'Expired',
          sortValue: new Date(batch.expiryDate || createdTimestamp || 0).getTime(),
          dotColor: '#dc2626',
          amount: null,
        });
      } else if (days !== null && days <= 30) {
        items.push({
          key: `near-expiry-${getItemId(batch)}`,
          entityKey: `batch-${getItemId(batch)}`,
          type: 'NEAR_EXPIRY',
          title: `${medName} batch ${batch.batchNumber || ''} is near expiry`,
          sub: `${days} day${days === 1 ? '' : 's'} remaining`,
          time: 'Expiry warning',
          sortValue: new Date(batch.expiryDate || createdTimestamp || 0).getTime(),
          dotColor: '#d97706',
          amount: null,
        });
      }
    });

    medicines.forEach((med) => {
      const stock = Number(med.stockQuantity || 0);
      const minStock = Number(med.minimumStockLevel || 20);
      const timestamp = med.updatedAt || med.createdAt;
      if (!timestamp) return;

      if (stock === 0) {
        items.push({
          key: `med-out-${getItemId(med)}`,
          entityKey: `med-${getItemId(med)}`,
          type: 'OUT_OF_STOCK',
          title: `${getMedicineName(med)} is out of stock`,
          sub: 'Current stock: 0',
          time: timeAgo(timestamp),
          sortValue: new Date(timestamp).getTime(),
          dotColor: '#dc2626',
          amount: null,
        });
      } else if (stock <= minStock) {
        items.push({
          key: `med-low-${getItemId(med)}`,
          entityKey: `med-${getItemId(med)}`,
          type: 'LOW_STOCK',
          title: `${getMedicineName(med)} is running low`,
          sub: `Current stock: ${stock} • Min level: ${minStock}`,
          time: timeAgo(timestamp),
          sortValue: new Date(timestamp).getTime(),
          dotColor: '#d97706',
          amount: null,
        });
      }
    });

    const typePriority = { EXPIRED: 1, OUT_OF_STOCK: 2, NEAR_EXPIRY: 3, LOW_STOCK: 4, BATCH_ADDED: 5 };
    const grouped = new Map();

    items.forEach((item) => {
      const existing = grouped.get(item.entityKey);
      if (!existing) {
        grouped.set(item.entityKey, item);
        return;
      }
      const samePriority = (typePriority[item.type] || 99) === (typePriority[existing.type] || 99);
      if ((typePriority[item.type] || 99) < (typePriority[existing.type] || 99)) {
        grouped.set(item.entityKey, item);
      } else if (samePriority && item.sortValue > existing.sortValue) {
        grouped.set(item.entityKey, item);
      }
    });

    return Array.from(grouped.values())
      .filter((item) => item.sortValue && item.sortValue <= now)
      .sort((a, b) => b.sortValue - a.sortValue)
      .slice(0, 6);
  }, [batches, medicines, medicineById]);

  const activityFeed = useMemo(() => {
    if (Array.isArray(dashboardData?.recentActivities) && dashboardData.recentActivities.length > 0) {
      return dashboardData.recentActivities.map((item, idx) => ({
        key: `recent-${idx}`,
        title: item.title || 'Business activity',
        sub: item.subtitle || '',
        time: timeAgo(item.activityTime),
        dotColor: getActivityColor(item.type),
        amount: item.amount ?? null,
      }));
    }
    return fallbackInventoryActivityFeed;
  }, [dashboardData, fallbackInventoryActivityFeed]);

  const trendData = useMemo(() => {
    if (Array.isArray(dashboardData?.trendData) && dashboardData.trendData.length > 0) {
      return dashboardData.trendData;
    }
    return [];
  }, [dashboardData]);

  const topSellingItems = useMemo(() => {
    const backendItems = Array.isArray(dashboardData?.topSellingMedicines) ? dashboardData.topSellingMedicines : [];
    return backendItems.map((item) => ({
      ...item,
      medicineName: item?.medicineName || getMedicineName(medicineById[String(item?.medicineId || '')]),
    }));
  }, [dashboardData, medicineById]);

  const d = computedMetrics;
  const isLoss = Number(d.profit || 0) < 0;
  const marginBase = Number(d.totalSales || 0);
  const marginPct = marginBase > 0 ? Math.round((Math.abs(Number(d.profit || 0)) / marginBase) * 100) : 0;
  const displayName = user?.username || user?.name || user?.email || '';
  const appliedRangeLabel = dashboardData?.rangeLabel || 'This Month';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main, #111827)', letterSpacing: '-0.5px', margin: 0 }}>
            Operational Overview
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted, #64748b)', marginTop: '6px' }}>
            Welcome back{displayName ? `, ${displayName}` : ''}. Here’s a live summary of sales, purchases, dues, and critical inventory activity.
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '10px', background: '#eef3ff', color: '#2d3a8c', border: '1px solid #d6e2ff', borderRadius: '999px', padding: '6px 12px', fontSize: '12px', fontWeight: 700 }}>
            <CalendarRange size={14} /> Active Period: {appliedRangeLabel}
          </div>

          {error && (
            <span style={{ fontSize: '12px', color: '#b45309', background: 'var(--bg-card, #ffffff)7ed', border: '1px solid #fed7aa', padding: '4px 10px', borderRadius: '999px', marginTop: '10px', display: 'inline-block', fontWeight: 600, marginLeft: '10px' }}>
              ⚠️ {error}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={() => fetchDashboardData(filter, true)}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn-primary" onClick={() => navigate('/sales')}>
            <Plus size={16} /> Create New Sale
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h2 className="card-title" style={{ marginBottom: '4px' }}>Dashboard Date Filter</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>Switch dashboard metrics, chart and top-selling medicines by time range</p>
          </div>
          <CalendarRange size={18} color="var(--text-muted, #64748b)" />
        </div>

        <div className="card-body" style={{ display: 'grid', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {FILTER_OPTIONS.map((option) => (
              <FilterChip key={option.key} active={filter.preset === option.key} onClick={() => handlePresetChange(option.key)}>
                {option.label}
              </FilterChip>
            ))}
          </div>

          {filter.preset === 'CUSTOM' && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'end' }}>
              <div style={{ minWidth: '180px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #475569)', marginBottom: '6px' }}>Start Date</label>
                <input
                  type="date"
                  value={customDateInputs.startDate}
                  onChange={(e) => setCustomDateInputs((prev) => ({ ...prev, startDate: e.target.value }))}
                  style={{ width: '100%', padding: '11px 12px', borderRadius: '12px', border: '1px solid #dbe5f0', outline: 'none' }}
                />
              </div>

              <div style={{ minWidth: '180px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #475569)', marginBottom: '6px' }}>End Date</label>
                <input
                  type="date"
                  value={customDateInputs.endDate}
                  onChange={(e) => setCustomDateInputs((prev) => ({ ...prev, endDate: e.target.value }))}
                  style={{ width: '100%', padding: '11px 12px', borderRadius: '12px', border: '1px solid #dbe5f0', outline: 'none' }}
                />
              </div>

              <button className="btn-primary" type="button" onClick={handleApplyCustomRange}>
                <CalendarRange size={14} /> Apply Range
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 220px', gap: '16px', marginBottom: '16px' }}>
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--bg-card, var(--bg-card, #ffffff)fff)', borderRadius: '18px', height: '360px' }} />
            <div style={{ background: 'var(--bg-card, var(--bg-card, #ffffff)fff)', borderRadius: '18px', height: '360px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px' }}>
            <div style={{ background: 'var(--bg-card, var(--bg-card, #ffffff)fff)', borderRadius: '18px', height: '420px' }} />
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ background: 'var(--bg-card, var(--bg-card, #ffffff)fff)', borderRadius: '18px', height: '200px' }} />
              <div style={{ background: 'var(--bg-card, var(--bg-card, #ffffff)fff)', borderRadius: '18px', height: '204px' }} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 220px', gap: '16px', marginBottom: '16px' }}>
            <StatCard label="Total Sales" value={formatCurrency(d.totalSales)} subLabel={`Completed sales in ${appliedRangeLabel.toLowerCase()}`} icon={TrendingUp} trend={{ type: 'up', label: 'Filtered analytics' }} onClick={() => navigate('/sales')} />
            <StatCard label="Total Purchases" value={formatCurrency(d.totalPurchases)} subLabel={`Received purchases in ${appliedRangeLabel.toLowerCase()}`} icon={ShoppingCart} trend={{ type: 'up', label: 'Filtered analytics' }} onClick={() => navigate('/purchases')} />
            <StatCard label={isLoss ? 'Net Loss' : 'Net Profit'} value={formatSignedCurrency(d.profit)} subLabel={isLoss ? 'Purchases are currently higher than sales' : 'Sales value exceeds purchase value'} icon={DollarSign} tone="primary" progress={marginPct} onClick={() => navigate('/reports')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <MiniFinanceCard title="Pending Receivables" value={formatCurrency(d.pendingReceivables)} icon={Wallet} tone="green" onClick={() => navigate('/accounts')} />
              <MiniFinanceCard title="Pending Payables" value={formatCurrency(d.pendingPayables)} icon={CreditCard} tone="red" onClick={() => navigate('/accounts')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h2 className="card-title">Sales vs Purchases Trend</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>Visual chart for the selected dashboard period</p>
                </div>
                <BarChart3 size={18} color="var(--text-muted, #64748b)" />
              </div>
              <div className="card-body" style={{ paddingTop: '8px' }}>
                <TrendChart data={trendData} />
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h2 className="card-title">Top Selling Medicines</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>Best-performing items based on completed sales</p>
                </div>
                <Pill size={18} color="var(--text-muted, #64748b)" />
              </div>
              <div className="card-body" style={{ paddingTop: '6px' }}>
                <TopSellingTable items={topSellingItems} onViewSales={() => navigate('/sales')} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px' }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                <div>
                  <h2 className="card-title" style={{ marginBottom: '4px' }}>Critical Inventory Health</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>Immediate stock and expiry risks across your medicines</p>
                </div>
                <Package size={18} color="var(--text-muted, #64748b)" />
              </div>

              <div className="card-body" style={{ paddingTop: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  <AlertSummaryCard title="Low Stock" count={d.lowStockCount} color="#d97706" bg="var(--bg-card, #ffffff)7ed" icon={AlertTriangle} onClick={() => navigate('/medicines')} />
                  <AlertSummaryCard title="Out of Stock" count={d.outOfStockCount} color="#dc2626" bg="var(--bg-card, #ffffff)1f2" icon={XCircle} onClick={() => navigate('/medicines')} />
                  <AlertSummaryCard title="Near Expiry" count={d.nearExpiryCount} color="#d97706" bg="var(--bg-card, #ffffff)beb" icon={Clock} onClick={() => navigate('/batches')} />
                  <AlertSummaryCard title="Expired" count={d.expiredCount} color="#dc2626" bg="#fef2f2" icon={Clock} onClick={() => navigate('/batches')} />
                </div>

                {criticalInventory.length === 0 ? (
                  <div style={{ padding: '20px 0 8px', textAlign: 'center', color: 'var(--text-soft, #94a3b8)', fontSize: '13px' }}>
                    No critical inventory alerts right now.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-card-soft, #f8fafc)' }}>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Medicine</th>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Batch</th>
                          <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Stock</th>
                          <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {criticalInventory.map((item, idx) => {
                          const meta = statusMeta[item.status] || statusMeta.LOW_STOCK;
                          return (
                            <tr key={item.id || idx} style={{ borderBottom: idx === criticalInventory.length - 1 ? 'none' : '1px solid #edf2f7' }}>
                              <td style={{ padding: '14px', color: 'var(--text-main, #1f2937)', fontWeight: 700 }}>{item.name}</td>
                              <td style={{ padding: '14px', color: 'var(--text-muted, #64748b)' }}>{item.batch}</td>
                              <td style={{ padding: '14px', color: 'var(--text-main, #1f2937)', fontWeight: 700, textAlign: 'right' }}>{formatNum(item.stock)}</td>
                              <td style={{ padding: '14px', textAlign: 'right' }}>
                                <span className={meta.cls} style={{ fontSize: '11px', fontWeight: 800, color: meta.color }}>{meta.label}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 className="card-title">Expiry Distribution</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>Risk visibility by expiry urgency</p>
                  </div>
                  <BarChart3 size={18} color="var(--text-muted, #64748b)" />
                </div>

                <div className="card-body" style={{ paddingTop: '8px' }}>
                  <ProgressBlock label="Expired (Total)" count={d.expiredCount} color="#dc2626" bg="#fee2e2" percent={Math.min((d.expiredCount / 150) * 100, 100)} />
                  <ProgressBlock label="Expiry < 30 Days" count={d.nearExpiryCount} color="#d97706" bg="#ffedd5" percent={Math.min((d.nearExpiryCount / 150) * 100, 100)} />
                  <ProgressBlock label="Expiry < 90 Days" count={expiryWithin90Count} color="#2d3a8c" bg="#e8f0ff" percent={Math.min((expiryWithin90Count / 150) * 100, 100)} hideBorder />

                  <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }} onClick={() => navigate('/reports')}>
                    <BarChart3 size={14} /> Generate Detailed Report
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 className="card-title">Recent Business Activity</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>Recent sales, purchases, invoices and payment updates</p>
                  </div>
                  <Activity size={16} color="var(--text-muted, #64748b)" />
                </div>

                <div className="card-body" style={{ paddingTop: '6px', paddingBottom: '10px' }}>
                  {activityFeed.length === 0 ? (
                    <div style={{ padding: '12px 0 2px', fontSize: '13px', color: 'var(--text-soft, #94a3b8)' }}>
                      No recent activity available from the current database records.
                    </div>
                  ) : (
                    activityFeed.map((item, idx) => (
                      <ActivityItem key={item.key} title={item.title} sub={item.sub} time={item.time} dotColor={item.dotColor} amount={item.amount} hideBorder={idx === activityFeed.length - 1} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <button
        onClick={() => navigate('/sales')}
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2d3a8c, #3d4fcf)',
          border: 'none',
          cursor: 'pointer',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 28px rgba(45,58,140,0.42)',
          zIndex: 30,
        }}
        title="Create Sale"
      >
        <Plus size={22} />
      </button>
    </div>
  );
}