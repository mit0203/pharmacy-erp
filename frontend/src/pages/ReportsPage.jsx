import { useEffect, useMemo, useState } from 'react';
import {
  BarChart2,
  TrendingUp,
  ShoppingCart,
  Package,
  Clock,
  Receipt,
  RefreshCw,
  CalendarDays,
  FileDown,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Layers3,
  IndianRupee,
  ShieldAlert,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getProfitLoss,
  getSalesReport,
  getPurchaseReport,
  getStockReport,
  getExpiryReport,
  getGstReport,
} from '../api/services';
import { useAuth } from '../context/AuthContext';

const REPORT_TYPES = [
  { key: 'overview', label: 'Overview', icon: Layers3 },
  { key: 'profit-loss', label: 'Profit & Loss', icon: TrendingUp },
  { key: 'sales', label: 'Sales Report', icon: BarChart2 },
  { key: 'purchases', label: 'Purchase Report', icon: ShoppingCart },
  { key: 'stock', label: 'Stock Report', icon: Package },
  { key: 'expiry', label: 'Expiry Report', icon: Clock },
  { key: 'gst', label: 'GST Report', icon: Receipt },
];

const todayStr = new Date().toISOString().split('T')[0];
const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50];

const fieldLabelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 800,
  color: 'var(--text-muted, #64748b)',
  marginBottom: '8px',
  letterSpacing: '0.2px',
};

function formatCurrency(value) {
  const num = Number(value || 0);
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCurrencyPdf(value) {
  const num = Number(value || 0);
  return `Rs. ${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB');
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function clampPercent(value) {
  return Math.max(6, Math.min(Number(value || 0), 100));
}

function getPaymentPillStyle(value, type = 'default') {
  const normalized = String(value || '').toUpperCase();

  if (normalized === 'PAID') return { color: '#166534', bg: '#dcfce7' };
  if (normalized === 'PARTIALLY_PAID' || normalized === 'PARTIALLY PAID') {
    return { color: '#92400e', bg: '#fef3c7' };
  }
  if (normalized === 'UNPAID') return { color: '#991b1b', bg: '#fee2e2' };

  if (type === 'purchase') return { color: '#1d4ed8', bg: '#dbeafe' };
  return { color: 'var(--text-muted, #334155)', bg: '#e2e8f0' };
}

function SummaryCard({ title, value, sub, icon: Icon, color = '#2d3a8c' }) {
  return (
    <div
      className="card"
      style={{
        padding: '20px',
        borderRadius: '20px',
        minHeight: '126px',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '14px',
          height: '100%',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: 'var(--text-muted, #64748b)',
              textTransform: 'uppercase',
              letterSpacing: '0.55px',
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--text-main, #0f172a)',
              marginTop: '10px',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            {value}
          </div>

          {sub ? (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-soft, #94a3b8)',
                marginTop: '8px',
                lineHeight: 1.5,
                wordBreak: 'break-word',
              }}
            >
              {sub}
            </div>
          ) : null}
        </div>

        <div
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '16px',
            background: `${color}12`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `inset 0 0 0 1px ${color}18`,
          }}
        >
          <Icon size={21} color={color} />
        </div>
      </div>
    </div>
  );
}

function MiniTrendChart({
  title,
  points = [],
  color = '#2d3a8c',
  emptyText = 'No trend data available.',
  formatter = formatCurrency,
}) {
  const max = Math.max(...points.map((point) => Number(point.value || 0)), 0);

  return (
    <div className="card" style={{ padding: '20px', borderRadius: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <Activity size={18} color={color} />
        <h3
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 800,
            color: 'var(--text-main, #0f172a)',
          }}
        >
          {title}
        </h3>
      </div>

      {!points.length ? (
        <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>{emptyText}</div>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {points.map((point, idx) => {
            const value = Number(point.value || 0);
            const percent = max > 0 ? (value / max) * 100 : 0;

            return (
              <div key={`${point.date || point.label || idx}-${value}`}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '7px',
                    gap: '12px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: 'var(--text-muted, #334155)',
                    }}
                  >
                    {point.label || formatDate(point.date)}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                    {formatter(value)}
                  </span>
                </div>

                <div
                  style={{
                    height: '10px',
                    borderRadius: '999px',
                    background: '#e2e8f0',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${clampPercent(percent)}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusPill({ label: text, color, bg }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        minHeight: '30px',
        padding: '6px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '0.2px',
        color,
        background: bg,
        whiteSpace: 'nowrap',
        border: '1px solid rgba(148, 163, 184, 0.12)',
      }}
    >
      {text}
    </span>
  );
}

function PresetButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
        background: active ? '#dbeafe' : 'var(--bg-card, #ffffff)',
        color: active ? '#1d4ed8' : 'var(--text-muted, #475569)',
        borderRadius: '999px',
        padding: '9px 14px',
        fontSize: '12px',
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: active ? '0 4px 12px rgba(29, 78, 216, 0.12)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </button>
  );
}

function DateInput({ label, value, onChange, disabled = false, min, max }) {
  return (
    <div>
      <label style={fieldLabelStyle}>{label}</label>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <input
          type="date"
          className="input-field"
          value={value}
          onChange={onChange}
          disabled={disabled}
          min={min}
          max={max}
          style={{
            width: '100%',
            paddingRight: '44px',
            height: '48px',
            borderRadius: '14px',
            background: disabled ? 'var(--bg-card-soft, #f8fafc)' : 'var(--bg-card, #ffffff)',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '24px',
            height: '24px',
            borderRadius: '8px',
            background: disabled ? 'var(--bg-card-soft, #f1f5f9)' : '#eef2ff',
            color: disabled ? 'var(--text-soft, #94a3b8)' : '#2d3a8c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.14)',
          }}
        >
          <CalendarDays size={14} />
        </div>
      </div>
    </div>
  );
}

function SearchInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={fieldLabelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-soft, #94a3b8)',
          }}
        />
        <input
          className="input-field"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: '100%',
            paddingLeft: '40px',
            height: '48px',
            borderRadius: '14px',
          }}
        />
      </div>
    </div>
  );
}

function SelectInput({ label, value, onChange, options = [] }) {
  return (
    <div>
      <label style={fieldLabelStyle}>{label}</label>
      <select
        className="input-field"
        value={value}
        onChange={onChange}
        style={{
          width: '100%',
          height: '48px',
          borderRadius: '14px',
          paddingLeft: '14px',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SortButton({ active, direction, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active ? '1px solid #93c5fd' : '1px solid #dbe5f0',
        background: active ? '#eff6ff' : 'var(--bg-card, #ffffff)',
        color: active ? '#1d4ed8' : 'var(--text-muted, #475569)',
        borderRadius: '12px',
        padding: '9px 12px',
        fontSize: '12px',
        fontWeight: 800,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <ArrowUpDown size={14} />
      {children}
      {active ? `(${direction === 'asc' ? 'Asc' : 'Desc'})` : ''}
    </button>
  );
}

function PaginationBar({
  page,
  pageSize,
  totalItems,
  onPrev,
  onNext,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        marginTop: '14px',
      }}
    >
      <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 800 }}>
        Page {page} of {totalPages} • {formatNumber(totalItems)} row(s)
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{
            height: '36px',
            borderRadius: '10px',
            border: '1px solid #dbe5f0',
            background: 'var(--bg-card, #ffffff)',
            padding: '0 10px',
            fontSize: '12px',
          }}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}/page
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '8px 10px', fontSize: '12px' }}
          onClick={onPrev}
          disabled={page <= 1}
        >
          <ChevronLeft size={14} /> Prev
        </button>

        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '8px 10px', fontSize: '12px' }}
          onClick={onNext}
          disabled={page >= totalPages}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function DataTable({
  title,
  columns,
  rows,
  emptyText = 'No records found.',
  footer,
}) {
  return (
    <div className="card" style={{ padding: '20px', borderRadius: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 800,
            color: 'var(--text-main, #0f172a)',
          }}
        >
          {title}
        </h3>
        <span
          style={{
            fontSize: '12px',
            color: 'var(--text-muted, #64748b)',
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          {formatNumber(rows.length)} row(s)
        </span>
      </div>

      {!rows.length ? (
        <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>{emptyText}</div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              minWidth: '920px',
            }}
          >
            <thead>
              <tr style={{ background: 'var(--bg-card-soft, #f8fafc)' }}>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    style={{
                      textAlign: 'left',
                      fontSize: '12px',
                      color: 'var(--text-muted, #475569)',
                      padding: '14px 12px',
                      borderBottom: '1px solid #e2e8f0',
                      whiteSpace: 'nowrap',
                      fontWeight: 800,
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={row.id || `${title}-${rowIndex}`}
                  style={{
                    borderBottom: '1px solid #eef2f7',
                    background: rowIndex % 2 === 0 ? 'var(--bg-card, var(--bg-card, #ffffff)fff)' : 'var(--bg-table-row, #fbfdff)',
                  }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        padding: '13px 12px',
                        fontSize: '13px',
                        color: 'var(--text-main, #0f172a)',
                        verticalAlign: 'top',
                        borderBottom:
                          rowIndex === rows.length - 1
                            ? 'none'
                            : '1px solid #eef2f7',
                      }}
                    >
                      {column.render ? column.render(row, rowIndex) : row[column.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {footer ? <div>{footer}</div> : null}
    </div>
  );
}

function loadImageAsDataURL(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function getRangeForPreset(key) {
  const today = new Date();
  const end = new Date(today);
  const start = new Date(today);

  if (key === 'today') {
    // same day
  } else if (key === 'last7') {
    start.setDate(today.getDate() - 6);
  } else if (key === 'thisMonth') {
    start.setDate(1);
  } else if (key === 'lastMonth') {
    start.setMonth(today.getMonth() - 1, 1);
    end.setMonth(today.getMonth(), 0);
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

function getUniqueOptions(rows, key, allLabel) {
  const values = Array.from(
    new Set(rows.map((row) => String(row?.[key] || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  return [{ value: 'ALL', label: allLabel }, ...values.map((item) => ({ value: item, label: item }))];
}

function sortRows(rows, sortConfig) {
  if (!sortConfig?.key) return rows;

  const { key, direction } = sortConfig;
  const cloned = [...rows];

  cloned.sort((a, b) => {
    const aVal = a?.[key];
    const bVal = b?.[key];

    const aNum = Number(aVal);
    const bNum = Number(bVal);
    const bothNumeric =
      !Number.isNaN(aNum) &&
      !Number.isNaN(bNum) &&
      aVal !== '' &&
      bVal !== '';

    let result = 0;

    if (bothNumeric) {
      result = aNum - bNum;
    } else {
      result = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    }

    return direction === 'asc' ? result : -result;
  });

  return cloned;
}

function paginateRows(rows, page, pageSize) {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

function FiltersCard({
  reportType,
  activePreset,
  setReportType,
  handlePresetChange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  expiryDays,
  setExpiryDays,
  setActivePreset,
  fetchReport,
  loading,
  handleDownloadPdf,
  downloadingPdf,
  reportData,
  tableSearch,
  setTableSearch,
  entityFilter,
  setEntityFilter,
  entityOptions,
  paymentFilter,
  setPaymentFilter,
  paymentOptions,
  sortConfig,
  setSortConfig,
}) {
  const needsDateRange = ['overview', 'sales', 'purchases', 'gst'].includes(reportType);
  const needsExpiryDays = reportType === 'expiry';
  const needsTableTools = ['sales', 'purchases', 'stock', 'expiry'].includes(reportType);

  const sortButtons =
    reportType === 'sales'
      ? [
          { key: 'totalAmount', label: 'Sort by Total' },
          { key: 'orderDate', label: 'Sort by Date' },
          { key: 'amountDue', label: 'Sort by Due' },
        ]
      : reportType === 'purchases'
      ? [
          { key: 'totalAmount', label: 'Sort by Total' },
          { key: 'orderDate', label: 'Sort by Date' },
          { key: 'amountDue', label: 'Sort by Due' },
        ]
      : reportType === 'stock'
      ? [
          { key: 'stockValue', label: 'Sort by Value' },
          { key: 'stockQuantity', label: 'Sort by Qty' },
          { key: 'medicineName', label: 'Sort by Name' },
        ]
      : reportType === 'expiry'
      ? [
          { key: 'daysToExpiry', label: 'Sort by Days' },
          { key: 'quantity', label: 'Sort by Qty' },
          { key: 'medicineName', label: 'Sort by Name' },
        ]
      : [];

  const setSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="card" style={{ padding: '18px', marginBottom: '20px', borderRadius: '22px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: needsDateRange || needsExpiryDays || needsTableTools ? '18px' : 0 }}>
        {REPORT_TYPES.map(({ key, label: reportLabel, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`report-tab ${reportType === key ? 'active' : ''}`}
            onClick={() => setReportType(key)}
            style={{
              borderRadius: '16px',
              padding: '12px 15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              minHeight: '48px',
              transition: 'all 0.2s ease',
            }}
          >
            <Icon size={16} /> {reportLabel}
          </button>
        ))}
      </div>

      {needsDateRange && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
          <PresetButton active={activePreset === 'today'} onClick={() => handlePresetChange('today')}>Today</PresetButton>
          <PresetButton active={activePreset === 'last7'} onClick={() => handlePresetChange('last7')}>Last 7 Days</PresetButton>
          <PresetButton active={activePreset === 'thisMonth'} onClick={() => handlePresetChange('thisMonth')}>This Month</PresetButton>
          <PresetButton active={activePreset === 'lastMonth'} onClick={() => handlePresetChange('lastMonth')}>Last Month</PresetButton>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: needsExpiryDays
            ? 'minmax(220px, 280px) minmax(170px, 220px) minmax(170px, 220px)'
            : 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          alignItems: 'end',
        }}
      >
        {needsDateRange ? (
          <>
            <DateInput
              label="Start Date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePreset('custom');
              }}
            />

            <DateInput
              label="End Date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePreset('custom');
              }}
            />
          </>
        ) : null}

        {needsExpiryDays ? (
          <div>
            <label style={fieldLabelStyle}>Expiry Days</label>
            <input
              type="number"
              className="input-field"
              value={expiryDays}
              min={1}
              onChange={(e) => setExpiryDays(Number(e.target.value) || 30)}
              style={{ width: '100%', height: '48px', borderRadius: '14px' }}
            />
          </div>
        ) : null}

        {!needsDateRange && !needsExpiryDays ? (
          <div
            style={{
              padding: '10px 6px',
              fontSize: '13px',
              color: 'var(--text-muted, #64748b)',
              lineHeight: 1.6,
              display: 'flex',
              alignItems: 'center',
              minHeight: '48px',
              marginBottom: '6px',
            }}
          >
            This report uses live business data and does not need extra filters.
          </div>
        ) : null}

        <button
          className="btn-secondary"
          onClick={fetchReport}
          disabled={loading}
          style={{
            justifyContent: 'center',
            minHeight: '48px',
            borderRadius: '14px',
            marginTop: !needsDateRange && !needsExpiryDays ? '8px' : '0',
          }}
        >
          <RefreshCw size={15} />
          {loading ? 'Loading...' : 'Generate'}
        </button>

        <button
          className="btn-primary"
          onClick={handleDownloadPdf}
          disabled={!reportData || downloadingPdf}
          style={{
            justifyContent: 'center',
            minHeight: '48px',
            borderRadius: '14px',
            marginTop: !needsDateRange && !needsExpiryDays ? '8px' : '0',
          }}
        >
          <FileDown size={15} />
          {downloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
        </button>
      </div>

      {needsTableTools ? (
        <>
          <div
            style={{
              marginTop: '18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            <SearchInput
              label="Table Search"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search table rows"
            />

            {entityOptions.length > 1 ? (
              <SelectInput
                label={
                  reportType === 'sales'
                    ? 'Customer Filter'
                    : reportType === 'purchases'
                    ? 'Supplier Filter'
                    : reportType === 'stock'
                    ? 'Category Filter'
                    : 'Supplier Filter'
                }
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                options={entityOptions}
              />
            ) : null}

            {paymentOptions.length > 1 ? (
              <SelectInput
                label="Payment Filter"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                options={paymentOptions}
              />
            ) : null}
          </div>

          {sortButtons.length ? (
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {sortButtons.map((item) => (
                <SortButton
                  key={item.key}
                  active={sortConfig.key === item.key}
                  direction={sortConfig.direction}
                  onClick={() => setSort(item.key)}
                >
                  {item.label}
                </SortButton>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function ReportsPage() {
  const { hasAnyRole } = useAuth();
  const canView = hasAnyRole(['ADMIN', 'STORE_MANAGER']);

  const [reportType, setReportType] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [activePreset, setActivePreset] = useState('today');

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [expiryDays, setExpiryDays] = useState(30);

  const [tableSearch, setTableSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const needsDateRange = ['overview', 'sales', 'purchases', 'gst'].includes(reportType);
  const needsExpiryDays = reportType === 'expiry';
  const currentReportLabel =
    REPORT_TYPES.find((r) => r.key === reportType)?.label || 'Report';

  const validateFilters = () => {
    setError('');

    if (needsDateRange) {
      if (!startDate || !endDate) {
        setError('Please select both start date and end date.');
        return false;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setError('End date cannot be before start date.');
        return false;
      }
    }

    if (needsExpiryDays && Number(expiryDays) < 1) {
      setError('Expiry days must be at least 1.');
      return false;
    }

    return true;
  };

  const fetchReport = async () => {
    if (!canView) return;
    if (!validateFilters()) return;

    setLoading(true);
    setError('');
    setReportData(null);

    try {
      let response;

      switch (reportType) {
        case 'overview': {
          const [profitLossRes, salesRes, purchaseRes, stockRes, expiryRes, gstRes] =
            await Promise.all([
              getProfitLoss(),
              getSalesReport({ startDate, endDate }),
              getPurchaseReport({ startDate, endDate }),
              getStockReport(),
              getExpiryReport({ days: expiryDays }),
              getGstReport({ startDate, endDate }),
            ]);

          response = {
            data: {
              data: {
                profitLoss: profitLossRes?.data?.data || null,
                sales: salesRes?.data?.data || null,
                purchases: purchaseRes?.data?.data || null,
                stock: stockRes?.data?.data || [],
                expiry: expiryRes?.data?.data || null,
                gst: gstRes?.data?.data || null,
              },
            },
          };
          break;
        }
        case 'profit-loss':
          response = await getProfitLoss();
          break;
        case 'sales':
          response = await getSalesReport({ startDate, endDate });
          break;
        case 'purchases':
          response = await getPurchaseReport({ startDate, endDate });
          break;
        case 'stock':
          response = await getStockReport();
          break;
        case 'expiry':
          response = await getExpiryReport({ days: expiryDays });
          break;
        case 'gst':
          response = await getGstReport({ startDate, endDate });
          break;
        default:
          response = await getProfitLoss();
      }

      setReportData(response?.data?.data ?? null);
      setPage(1);
      setTableSearch('');
      setEntityFilter('ALL');
      setPaymentFilter('ALL');
      setSortConfig({ key: '', direction: 'asc' });
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to generate report.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  useEffect(() => {
    setPage(1);
  }, [tableSearch, entityFilter, paymentFilter, sortConfig, reportType]);

  const overviewData = useMemo(() => {
    if (reportType !== 'overview' || !reportData) return null;
    return reportData;
  }, [reportType, reportData]);

  const salesRows = useMemo(() => {
    if (reportType === 'overview') return overviewData?.sales?.orders || [];
    return reportData?.orders || [];
  }, [reportData, reportType, overviewData]);

  const purchaseRows = useMemo(() => {
    if (reportType === 'overview') return overviewData?.purchases?.orders || [];
    return reportData?.orders || [];
  }, [reportData, reportType, overviewData]);

  const stockRows = useMemo(() => {
    if (reportType === 'overview') return Array.isArray(overviewData?.stock) ? overviewData.stock : [];
    return Array.isArray(reportData) ? reportData : [];
  }, [reportData, reportType, overviewData]);

  const expiringSoonRows = useMemo(() => {
    if (reportType === 'overview') return overviewData?.expiry?.expiringSoon || [];
    return reportData?.expiringSoon || [];
  }, [reportData, reportType, overviewData]);

  const expiredRows = useMemo(() => {
    if (reportType === 'overview') return overviewData?.expiry?.expired || [];
    return reportData?.expired || [];
  }, [reportData, reportType, overviewData]);

  const salesTrend = useMemo(() => {
    if (reportType === 'overview') return overviewData?.sales?.dailyTrend || [];
    return reportData?.dailyTrend || [];
  }, [reportData, reportType, overviewData]);

  const purchaseTrend = useMemo(() => {
    if (reportType === 'overview') return overviewData?.purchases?.dailyTrend || [];
    return reportData?.dailyTrend || [];
  }, [reportData, reportType, overviewData]);

  const stockInsights = useMemo(() => {
    if (!stockRows.length) {
      return { lowStockCount: 0, healthyCount: 0, totalValue: 0, outOfStockCount: 0 };
    }

    return {
      lowStockCount: stockRows.filter((item) => item.lowStock).length,
      healthyCount: stockRows.filter((item) => !item.lowStock).length,
      totalValue: stockRows.reduce(
        (sum, item) => sum + Number(item.stockValue || 0),
        0
      ),
      outOfStockCount: stockRows.filter((item) => Number(item.stockQuantity || 0) === 0).length,
    };
  }, [stockRows]);

  const detailedExpiryRows = useMemo(() => {
    const expiring = expiringSoonRows.map((row) => ({
      ...row,
      expiryType: 'EXPIRING_SOON',
    }));
    const expired = expiredRows.map((row) => ({
      ...row,
      expiryType: 'EXPIRED',
    }));
    return [...expiring, ...expired];
  }, [expiringSoonRows, expiredRows]);

  const entityOptions = useMemo(() => {
    if (reportType === 'sales') {
      return getUniqueOptions(salesRows, 'customerName', 'All Customers');
    }
    if (reportType === 'purchases') {
      return getUniqueOptions(purchaseRows, 'supplierName', 'All Suppliers');
    }
    if (reportType === 'stock') {
      return getUniqueOptions(stockRows, 'category', 'All Categories');
    }
    if (reportType === 'expiry') {
      return getUniqueOptions(detailedExpiryRows, 'supplierName', 'All Suppliers');
    }
    return [{ value: 'ALL', label: 'All' }];
  }, [reportType, salesRows, purchaseRows, stockRows, detailedExpiryRows]);

  const paymentOptions = useMemo(() => {
    if (reportType === 'sales') {
      return getUniqueOptions(salesRows, 'paymentStatus', 'All Payment Status');
    }
    if (reportType === 'purchases') {
      return getUniqueOptions(purchaseRows, 'paymentStatus', 'All Payment Status');
    }
    return [{ value: 'ALL', label: 'All' }];
  }, [reportType, salesRows, purchaseRows]);

  const filteredSalesRows = useMemo(() => {
    const rows = salesRows.filter((row) => {
      const matchesSearch =
        !tableSearch ||
        [
          row.orderNumber,
          row.invoiceNumber,
          row.customerName,
          row.paymentStatus,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(tableSearch.toLowerCase())
          );

      const matchesEntity =
        entityFilter === 'ALL' || String(row.customerName || '') === entityFilter;

      const matchesPayment =
        paymentFilter === 'ALL' || String(row.paymentStatus || '') === paymentFilter;

      return matchesSearch && matchesEntity && matchesPayment;
    });

    return sortRows(rows, sortConfig);
  }, [salesRows, tableSearch, entityFilter, paymentFilter, sortConfig]);

  const filteredPurchaseRows = useMemo(() => {
    const rows = purchaseRows.filter((row) => {
      const matchesSearch =
        !tableSearch ||
        [
          row.orderNumber,
          row.invoiceNumber,
          row.supplierName,
          row.paymentStatus,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(tableSearch.toLowerCase())
          );

      const matchesEntity =
        entityFilter === 'ALL' || String(row.supplierName || '') === entityFilter;

      const matchesPayment =
        paymentFilter === 'ALL' || String(row.paymentStatus || '') === paymentFilter;

      return matchesSearch && matchesEntity && matchesPayment;
    });

    return sortRows(rows, sortConfig);
  }, [purchaseRows, tableSearch, entityFilter, paymentFilter, sortConfig]);

  const filteredStockRows = useMemo(() => {
    const rows = stockRows.filter((row) => {
      const matchesSearch =
        !tableSearch ||
        [
          row.medicineName,
          row.sku,
          row.category,
          row.brandName,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(tableSearch.toLowerCase())
          );

      const matchesEntity =
        entityFilter === 'ALL' || String(row.category || '') === entityFilter;

      return matchesSearch && matchesEntity;
    });

    return sortRows(rows, sortConfig);
  }, [stockRows, tableSearch, entityFilter, sortConfig]);

  const filteredExpiryRows = useMemo(() => {
    const rows = detailedExpiryRows.filter((row) => {
      const matchesSearch =
        !tableSearch ||
        [
          row.medicineName,
          row.batchNumber,
          row.supplierName,
          row.statusLabel,
          row.expiryType,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(tableSearch.toLowerCase())
          );

      const matchesEntity =
        entityFilter === 'ALL' || String(row.supplierName || '') === entityFilter;

      return matchesSearch && matchesEntity;
    });

    return sortRows(rows, sortConfig);
  }, [detailedExpiryRows, tableSearch, entityFilter, sortConfig]);

  const pagedSalesRows = useMemo(
    () => paginateRows(filteredSalesRows, page, pageSize),
    [filteredSalesRows, page, pageSize]
  );
  const pagedPurchaseRows = useMemo(
    () => paginateRows(filteredPurchaseRows, page, pageSize),
    [filteredPurchaseRows, page, pageSize]
  );
  const pagedStockRows = useMemo(
    () => paginateRows(filteredStockRows, page, pageSize),
    [filteredStockRows, page, pageSize]
  );
  const pagedExpiryRows = useMemo(
    () => paginateRows(filteredExpiryRows, page, pageSize),
    [filteredExpiryRows, page, pageSize]
  );

  const supplierSummaryForPurchases = useMemo(() => {
    const grouped = filteredPurchaseRows.reduce((acc, row) => {
      const key = row.supplierName || 'Unknown Supplier';
      if (!acc[key]) {
        acc[key] = {
          id: key,
          supplierName: key,
          orderCount: 0,
          totalAmount: 0,
          totalGstAmount: 0,
          totalDue: 0,
        };
      }
      acc[key].orderCount += 1;
      acc[key].totalAmount += Number(row.totalAmount || 0);
      acc[key].totalGstAmount += Number(row.totalGstAmount || 0);
      acc[key].totalDue += Number(row.amountDue || 0);
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredPurchaseRows]);

  const customerSummaryForSales = useMemo(() => {
    const grouped = filteredSalesRows.reduce((acc, row) => {
      const key = row.customerName || 'Unknown Customer';
      if (!acc[key]) {
        acc[key] = {
          id: key,
          customerName: key,
          orderCount: 0,
          totalAmount: 0,
          totalGstAmount: 0,
          totalDue: 0,
        };
      }
      acc[key].orderCount += 1;
      acc[key].totalAmount += Number(row.totalAmount || 0);
      acc[key].totalGstAmount += Number(row.totalGstAmount || 0);
      acc[key].totalDue += Number(row.amountDue || 0);
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredSalesRows]);

  const stockCategorySummary = useMemo(() => {
    const grouped = filteredStockRows.reduce((acc, row) => {
      const key = row.category || 'Unknown Category';
      if (!acc[key]) {
        acc[key] = {
          id: key,
          category: key,
          medicineCount: 0,
          totalQty: 0,
          totalValue: 0,
          lowStockCount: 0,
        };
      }
      acc[key].medicineCount += 1;
      acc[key].totalQty += Number(row.stockQuantity || 0);
      acc[key].totalValue += Number(row.stockValue || 0);
      acc[key].lowStockCount += row.lowStock ? 1 : 0;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredStockRows]);

  const expiryBucketSummary = useMemo(() => {
    const buckets = {
      Expired: 0,
      '0-7 Days': 0,
      '8-15 Days': 0,
      '16-30 Days': 0,
      '31+ Days': 0,
    };

    filteredExpiryRows.forEach((row) => {
      const days = Number(row.daysToExpiry || 0);
      if (row.expiryType === 'EXPIRED' || days < 0) {
        buckets.Expired += 1;
      } else if (days <= 7) {
        buckets['0-7 Days'] += 1;
      } else if (days <= 15) {
        buckets['8-15 Days'] += 1;
      } else if (days <= 30) {
        buckets['16-30 Days'] += 1;
      } else {
        buckets['31+ Days'] += 1;
      }
    });

    return Object.entries(buckets).map(([label, value]) => ({ label, value }));
  }, [filteredExpiryRows]);

  const pdfTableRows = useMemo(() => {
    if (!reportData) return { head: [], body: [] };

    if (reportType === 'stock') {
      return {
        head: [['Medicine', 'SKU', 'Category', 'Qty', 'Min Level', 'Stock Value', 'Status']],
        body: filteredStockRows.map((item) => [
          item.medicineName || '-',
          item.sku || '-',
          item.category || '-',
          formatNumber(item.stockQuantity),
          formatNumber(item.minimumStockLevel),
          formatCurrencyPdf(item.stockValue),
          item.lowStock ? 'LOW STOCK' : 'HEALTHY',
        ]),
      };
    }

    if (reportType === 'expiry') {
      return {
        head: [['Type', 'Medicine', 'Batch', 'Expiry Date', 'Qty', 'Days', 'Supplier']],
        body: filteredExpiryRows.map((item) => [
          item.expiryType === 'EXPIRED' ? 'Expired' : 'Expiring Soon',
          item.medicineName || '-',
          item.batchNumber || '-',
          formatDate(item.expiryDate),
          formatNumber(item.quantity),
          item.daysToExpiry ?? '-',
          item.supplierName || '-',
        ]),
      };
    }

    if (reportType === 'profit-loss') {
      return {
        head: [['Metric', 'Value']],
        body: [
          ['Total Sales', formatCurrencyPdf(reportData.totalSales)],
          ['Total Purchases', formatCurrencyPdf(reportData.totalPurchases)],
          ['Net Profit / Loss', formatCurrencyPdf(reportData.profit)],
        ],
      };
    }

    if (reportType === 'sales') {
      return {
        head: [['Order No', 'Customer', 'Date', 'Payment', 'Amount', 'GST', 'Due']],
        body: filteredSalesRows.map((item) => [
          item.orderNumber || '-',
          item.customerName || '-',
          formatDateTime(item.orderDate),
          item.paymentStatus || '-',
          formatCurrencyPdf(item.totalAmount),
          formatCurrencyPdf(item.totalGstAmount),
          formatCurrencyPdf(item.amountDue),
        ]),
      };
    }

    if (reportType === 'purchases') {
      return {
        head: [['PO No', 'Supplier', 'Date', 'Payment', 'Amount', 'GST', 'Due']],
        body: filteredPurchaseRows.map((item) => [
          item.orderNumber || '-',
          item.supplierName || '-',
          formatDateTime(item.orderDate),
          item.paymentStatus || '-',
          formatCurrencyPdf(item.totalAmount),
          formatCurrencyPdf(item.totalGstAmount),
          formatCurrencyPdf(item.amountDue),
        ]),
      };
    }

    if (reportType === 'gst') {
      return {
        head: [['Metric', 'Value']],
        body: [
          ['Period', `${reportData.startDate || '-'} to ${reportData.endDate || '-'}`],
          ['Sales Taxable Amount', formatCurrencyPdf(reportData.totalSalesTaxableAmount)],
          ['Purchase Taxable Amount', formatCurrencyPdf(reportData.totalPurchaseTaxableAmount)],
          ['Sales GST', formatCurrencyPdf(reportData.totalSalesGST)],
          ['Purchase GST', formatCurrencyPdf(reportData.totalPurchaseGST)],
          ['Net GST Payable', formatCurrencyPdf(reportData.netGstPayable)],
        ],
      };
    }

    if (reportType === 'overview' && overviewData) {
      return {
        head: [['Metric', 'Value']],
        body: [
          ['Sales (Period)', formatCurrencyPdf(overviewData?.sales?.totalSales)],
          ['Purchases (Period)', formatCurrencyPdf(overviewData?.purchases?.totalPurchases)],
          ['Profit/Loss (All)', formatCurrencyPdf(overviewData?.profitLoss?.profit)],
          ['Low Stock Items', formatNumber((overviewData?.stock || []).filter((i) => i.lowStock).length)],
          ['Expiring Soon', formatNumber(overviewData?.expiry?.expiringSoonCount)],
          ['Expired', formatNumber(overviewData?.expiry?.expiredCount)],
          ['Net GST', formatCurrencyPdf(overviewData?.gst?.netGstPayable)],
        ],
      };
    }

    return { head: [], body: [] };
  }, [
    reportData,
    reportType,
    filteredStockRows,
    filteredExpiryRows,
    filteredSalesRows,
    filteredPurchaseRows,
    overviewData,
  ]);

  const handlePresetChange = (preset) => {
    const range = getRangeForPreset(preset);
    setActivePreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const handleDownloadPdf = async () => {
    if (!reportData) return;

    try {
      setDownloadingPdf(true);
      setError('');

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const left = 14;
      const right = 14;
      const contentWidth = pageWidth - left - right;
      const logoData = await loadImageAsDataURL('/logo.png');

      let currentY = 0;

      const drawMetricCard = (x, y, w, h, title, value, accentColor, subtitle) => {
        doc.setFillColor(250, 251, 253);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, w, h, 4, 4, 'FD');

        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.roundedRect(x, y, w, 4, 4, 4, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(String(title), x + 4, y + 10);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(17, 24, 39);
        doc.text(String(value), x + 4, y + 18);

        if (subtitle) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(120, 132, 158);
          doc.text(String(subtitle), x + 4, y + 25);
        }
      };

      const drawHeader = () => {
        doc.setFillColor(27, 45, 125);
        doc.rect(0, 0, pageWidth, 36, 'F');

        if (logoData) {
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(14, 8, 24, 20, 3, 3, 'F');
          doc.addImage(logoData, 'PNG', 16, 10, 20, 16);
        }

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('Sygnus Biotech ERP', logoData ? 44 : 14, 16);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Professional Business Report', logoData ? 44 : 14, 23);
        doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, logoData ? 44 : 14, 29);

        doc.setFillColor(245, 247, 251);
        doc.roundedRect(12, 42, 186, 22, 4, 4, 'F');

        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(currentReportLabel, 18, 54);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        let metaText = 'Business Summary Report';
        if (needsDateRange) {
          metaText = `Date Range: ${startDate} to ${endDate}`;
        } else if (needsExpiryDays) {
          metaText = `Expiry Window: Next ${expiryDays} day(s)`;
        }
        doc.text(metaText, 18, 60);

        currentY = 74;
      };

      const drawThreeCards = (cards) => {
        const cardGap = 6;
        const cardWidth = (contentWidth - cardGap * 2) / 3;

        cards.forEach((card, index) => {
          const x = left + index * (cardWidth + cardGap);
          drawMetricCard(x, currentY, cardWidth, 28, card.title, card.value, card.color, card.subtitle);
        });

        currentY += 36;
      };

      const drawSixCards = (cards) => {
        const cardGap = 6;
        const cardWidth = (contentWidth - cardGap * 2) / 3;

        const row1Y = currentY;
        const row2Y = currentY + 34;

        cards.slice(0, 3).forEach((card, index) => {
          const x = left + index * (cardWidth + cardGap);
          drawMetricCard(x, row1Y, cardWidth, 28, card.title, card.value, card.color, card.subtitle);
        });

        cards.slice(3, 6).forEach((card, index) => {
          const x = left + index * (cardWidth + cardGap);
          drawMetricCard(x, row2Y, cardWidth, 28, card.title, card.value, card.color, card.subtitle);
        });

        currentY += 74;
      };

      drawHeader();

      if (reportType === 'overview' && overviewData) {
        drawSixCards([
          {
            title: 'Sales',
            value: formatCurrencyPdf(overviewData?.sales?.totalSales),
            color: [22, 163, 74],
            subtitle: `${startDate} to ${endDate}`,
          },
          {
            title: 'Purchases',
            value: formatCurrencyPdf(overviewData?.purchases?.totalPurchases),
            color: [37, 99, 235],
            subtitle: `${startDate} to ${endDate}`,
          },
          {
            title: 'Profit/Loss',
            value: formatCurrencyPdf(overviewData?.profitLoss?.profit),
            color: [124, 58, 237],
            subtitle: 'Overall business result',
          },
          {
            title: 'Low Stock',
            value: formatNumber((overviewData?.stock || []).filter((i) => i.lowStock).length),
            color: [220, 38, 38],
            subtitle: 'Inventory attention',
          },
          {
            title: 'Expiring Soon',
            value: formatNumber(overviewData?.expiry?.expiringSoonCount),
            color: [245, 158, 11],
            subtitle: `${expiryDays} day window`,
          },
          {
            title: 'Net GST',
            value: formatCurrencyPdf(overviewData?.gst?.netGstPayable),
            color: [14, 116, 144],
            subtitle: 'Current GST position',
          },
        ]);
      } else if (reportType === 'profit-loss') {
        drawThreeCards([
          {
            title: 'Total Sales',
            value: formatCurrencyPdf(reportData.totalSales),
            color: [22, 163, 74],
            subtitle: 'Revenue generated',
          },
          {
            title: 'Total Purchases',
            value: formatCurrencyPdf(reportData.totalPurchases),
            color: [37, 99, 235],
            subtitle: 'Purchase expense',
          },
          {
            title: Number(reportData.profit || 0) < 0 ? 'Net Loss' : 'Net Profit',
            value: formatCurrencyPdf(reportData.profit),
            color: Number(reportData.profit || 0) < 0 ? [220, 38, 38] : [124, 58, 237],
            subtitle: 'Final business result',
          },
        ]);
      } else if (reportType === 'sales') {
        drawSixCards([
          {
            title: 'Total Sales',
            value: formatCurrencyPdf(reportData.totalSales),
            color: [22, 163, 74],
            subtitle: `${reportData.startDate || '-'} to ${reportData.endDate || '-'}`,
          },
          {
            title: 'Orders',
            value: formatNumber(reportData.numberOfOrders),
            color: [45, 58, 140],
            subtitle: 'Completed sales count',
          },
          {
            title: 'Average Order',
            value: formatCurrencyPdf(reportData.averageOrderValue),
            color: [245, 158, 11],
            subtitle: 'Average order value',
          },
          {
            title: 'GST Collected',
            value: formatCurrencyPdf(reportData.totalGstAmount),
            color: [124, 58, 237],
            subtitle: 'Tax from sales',
          },
          {
            title: 'Amount Paid',
            value: formatCurrencyPdf(reportData.totalAmountPaid),
            color: [22, 163, 74],
            subtitle: 'Received amount',
          },
          {
            title: 'Amount Due',
            value: formatCurrencyPdf(reportData.totalAmountDue),
            color: [220, 38, 38],
            subtitle: 'Outstanding amount',
          },
        ]);
      } else if (reportType === 'purchases') {
        drawSixCards([
          {
            title: 'Total Purchases',
            value: formatCurrencyPdf(reportData.totalPurchases),
            color: [37, 99, 235],
            subtitle: `${reportData.numberOfOrders || 0} order(s)`,
          },
          {
            title: 'Total GST',
            value: formatCurrencyPdf(reportData.totalGstAmount),
            color: [124, 58, 237],
            subtitle: 'Tax paid in range',
          },
          {
            title: 'Average PO Value',
            value: formatCurrencyPdf(reportData.averageOrderValue),
            color: [245, 158, 11],
            subtitle: `Top supplier: ${reportData.topSupplierName || '-'}`,
          },
          {
            title: 'Total Paid',
            value: formatCurrencyPdf(reportData.totalAmountPaid),
            color: [22, 163, 74],
            subtitle: 'Cleared amount',
          },
          {
            title: 'Total Due',
            value: formatCurrencyPdf(reportData.totalAmountDue),
            color: [220, 38, 38],
            subtitle: 'Outstanding amount',
          },
          {
            title: 'Orders',
            value: formatNumber(reportData.numberOfOrders),
            color: [45, 58, 140],
            subtitle: `${reportData.startDate || '-'} to ${reportData.endDate || '-'}`,
          },
        ]);
      } else if (reportType === 'stock') {
        drawSixCards([
          {
            title: 'Total Medicines',
            value: formatNumber(filteredStockRows.length),
            color: [45, 58, 140],
            subtitle: 'Active stock records',
          },
          {
            title: 'Low Stock Items',
            value: formatNumber(stockInsights.lowStockCount),
            color: [220, 38, 38],
            subtitle: `Healthy: ${formatNumber(stockInsights.healthyCount)}`,
          },
          {
            title: 'Stock Value',
            value: formatCurrencyPdf(stockInsights.totalValue),
            color: [22, 163, 74],
            subtitle: 'Based on selling price',
          },
          {
            title: 'Out of Stock',
            value: formatNumber(stockInsights.outOfStockCount),
            color: [220, 38, 38],
            subtitle: 'Zero quantity medicines',
          },
          {
            title: 'Healthy Items',
            value: formatNumber(stockInsights.healthyCount),
            color: [22, 163, 74],
            subtitle: 'Stock above threshold',
          },
          {
            title: 'Categories',
            value: formatNumber(stockCategorySummary.length),
            color: [124, 58, 237],
            subtitle: 'Visible categories',
          },
        ]);
      } else if (reportType === 'expiry') {
        drawSixCards([
          {
            title: 'Expiring Soon',
            value: formatNumber(reportData.expiringSoonCount),
            color: [245, 158, 11],
            subtitle: `Within next ${reportData.days || expiryDays} day(s)`,
          },
          {
            title: 'Expired',
            value: formatNumber(reportData.expiredCount),
            color: [220, 38, 38],
            subtitle: 'Immediate attention',
          },
          {
            title: 'Total Flagged',
            value: formatNumber(filteredExpiryRows.length),
            color: [45, 58, 140],
            subtitle: 'All risky batches',
          },
          {
            title: 'Window',
            value: `${reportData.days || expiryDays} Days`,
            color: [124, 58, 237],
            subtitle: 'Selected expiry filter',
          },
          {
            title: '0-7 Days',
            value: formatNumber(expiryBucketSummary.find((i) => i.label === '0-7 Days')?.value || 0),
            color: [22, 163, 74],
            subtitle: 'Urgent upcoming',
          },
          {
            title: 'Expired',
            value: formatNumber(expiryBucketSummary.find((i) => i.label === 'Expired')?.value || 0),
            color: [220, 38, 38],
            subtitle: 'Already overdue',
          },
        ]);
      } else if (reportType === 'gst') {
        drawSixCards([
          {
            title: 'Sales GST',
            value: formatCurrencyPdf(reportData.totalSalesGST),
            color: [22, 163, 74],
            subtitle: 'Output tax collected',
          },
          {
            title: 'Purchase GST',
            value: formatCurrencyPdf(reportData.totalPurchaseGST),
            color: [37, 99, 235],
            subtitle: 'Input tax paid',
          },
          {
            title: 'Net GST',
            value: formatCurrencyPdf(reportData.netGstPayable),
            color: [124, 58, 237],
            subtitle: 'Net payable amount',
          },
          {
            title: 'Sales Taxable',
            value: formatCurrencyPdf(reportData.totalSalesTaxableAmount),
            color: [45, 58, 140],
            subtitle: 'Taxable sales value',
          },
          {
            title: 'Purchase Taxable',
            value: formatCurrencyPdf(reportData.totalPurchaseTaxableAmount),
            color: [245, 158, 11],
            subtitle: 'Taxable purchase value',
          },
          {
            title: 'Period',
            value: `${reportData.startDate || '-'} to ${reportData.endDate || '-'}`,
            color: [14, 116, 144],
            subtitle: 'Selected date range',
          },
        ]);
      }

      if (pdfTableRows.head.length && pdfTableRows.body.length) {
        autoTable(doc, {
          startY: currentY,
          head: pdfTableRows.head,
          body: pdfTableRows.body,
          theme: 'grid',
          headStyles: {
            fillColor: [45, 58, 140],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [31, 41, 55],
            cellPadding: 3.1,
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          styles: {
            lineColor: [226, 232, 240],
            lineWidth: 0.15,
          },
          margin: { left: 14, right: 14 },
        });
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 287, 196, 287);
        doc.setFontSize(9);
        doc.setTextColor(120, 132, 158);
        doc.text('Sygnus Biotech ERP • Confidential Business Report', 14, 292);
        doc.text(`Page ${i} of ${pageCount}`, 180, 292);
      }

      doc.save(`${reportType}-report.pdf`);
    } catch (err) {
      console.error(err);
      setError('Failed to download PDF report.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (!canView) {
    return (
      <div
        className="card"
        style={{
          padding: '28px',
          textAlign: 'center',
          borderRadius: '20px',
        }}
      >
        <h2 style={{ margin: 0, color: 'var(--text-main, #1f2937)' }}>Access Restricted</h2>
        <p style={{ marginTop: '10px', color: 'var(--text-muted, #64748b)' }}>
          You&apos;re not eligible to access this page.
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '8px' }}>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '30px',
              fontWeight: '800',
              color: 'var(--text-main, #111827)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            <BarChart2 size={30} color="#2d3a8c" /> Reports
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-muted, #64748b)',
              marginTop: '8px',
              lineHeight: 1.6,
            }}
          >
            Generate detailed business reports with summaries, trends, analytics
            and exportable tables.
          </p>
        </div>

        <div
          style={{
            padding: '10px 14px',
            borderRadius: '16px',
            background: '#eef2ff',
            color: '#2d3a8c',
            fontSize: '12px',
            fontWeight: 800,
            alignSelf: 'center',
          }}
        >
          {currentReportLabel}
        </div>
      </div>

      <FiltersCard
        reportType={reportType}
        activePreset={activePreset}
        setReportType={setReportType}
        handlePresetChange={handlePresetChange}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        expiryDays={expiryDays}
        setExpiryDays={setExpiryDays}
        setActivePreset={setActivePreset}
        fetchReport={fetchReport}
        loading={loading}
        handleDownloadPdf={handleDownloadPdf}
        downloadingPdf={downloadingPdf}
        reportData={reportData}
        tableSearch={tableSearch}
        setTableSearch={setTableSearch}
        entityFilter={entityFilter}
        setEntityFilter={setEntityFilter}
        entityOptions={entityOptions}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        paymentOptions={paymentOptions}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
      />

      {error ? (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            padding: '14px 16px',
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#b91c1c',
            fontSize: '14px',
            fontWeight: 700,
            borderRadius: '16px',
          }}
        >
          {error}
        </div>
      ) : null}

      {reportType === 'overview' && overviewData ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <SummaryCard
              title="Sales (Period)"
              value={formatCurrency(overviewData?.sales?.totalSales)}
              sub={`${startDate} to ${endDate}`}
              icon={TrendingUp}
              color="#16a34a"
            />
            <SummaryCard
              title="Purchases (Period)"
              value={formatCurrency(overviewData?.purchases?.totalPurchases)}
              sub={`${startDate} to ${endDate}`}
              icon={ShoppingCart}
              color="#2563eb"
            />
            <SummaryCard
              title="Profit / Loss"
              value={formatCurrency(overviewData?.profitLoss?.profit)}
              sub="Overall finance snapshot"
              icon={BarChart2}
              color="#7c3aed"
            />
            <SummaryCard
              title="Low Stock Items"
              value={formatNumber((overviewData?.stock || []).filter((i) => i.lowStock).length)}
              sub="Needs inventory attention"
              icon={ShieldAlert}
              color="#dc2626"
            />
            <SummaryCard
              title="Expiring Soon"
              value={formatNumber(overviewData?.expiry?.expiringSoonCount)}
              sub={`${expiryDays} day expiry window`}
              icon={Clock}
              color="#f59e0b"
            />
            <SummaryCard
              title="Net GST"
              value={formatCurrency(overviewData?.gst?.netGstPayable)}
              sub="Sales GST minus Purchase GST"
              icon={Receipt}
              color="#0f766e"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <MiniTrendChart
              title="Sales Trend"
              points={(salesTrend || []).map((item) => ({
                date: item.date,
                value: item.value,
              }))}
              color="#16a34a"
            />

            <MiniTrendChart
              title="Purchase Trend"
              points={(purchaseTrend || []).map((item) => ({
                date: item.date,
                value: item.value,
              }))}
              color="#2563eb"
            />

            <MiniTrendChart
              title="Expiry Risk Buckets"
              points={expiryBucketSummary}
              color="#f59e0b"
              formatter={(value) => formatNumber(value)}
              emptyText="No expiry risk buckets available."
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <DataTable
              title="Top Customers"
              rows={customerSummaryForSales.slice(0, 5)}
              emptyText="No customer summary available."
              columns={[
                { key: 'customerName', label: 'Customer' },
                {
                  key: 'orderCount',
                  label: 'Orders',
                  render: (row) => formatNumber(row.orderCount),
                },
                {
                  key: 'totalAmount',
                  label: 'Total Sales',
                  render: (row) => formatCurrency(row.totalAmount),
                },
                {
                  key: 'totalDue',
                  label: 'Due',
                  render: (row) => formatCurrency(row.totalDue),
                },
              ]}
            />

            <DataTable
              title="Top Suppliers"
              rows={supplierSummaryForPurchases.slice(0, 5)}
              emptyText="No supplier summary available."
              columns={[
                { key: 'supplierName', label: 'Supplier' },
                {
                  key: 'orderCount',
                  label: 'Orders',
                  render: (row) => formatNumber(row.orderCount),
                },
                {
                  key: 'totalAmount',
                  label: 'Total Purchase',
                  render: (row) => formatCurrency(row.totalAmount),
                },
                {
                  key: 'totalDue',
                  label: 'Due',
                  render: (row) => formatCurrency(row.totalDue),
                },
              ]}
            />
          </div>
        </>
      ) : null}

      {reportType === 'profit-loss' && reportData ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <SummaryCard
              title="Total Sales"
              value={formatCurrency(reportData.totalSales)}
              icon={TrendingUp}
              color="#16a34a"
            />
            <SummaryCard
              title="Total Purchases"
              value={formatCurrency(reportData.totalPurchases)}
              icon={ShoppingCart}
              color="#2563eb"
            />
            <SummaryCard
              title={Number(reportData.profit || 0) < 0 ? 'Net Loss' : 'Net Profit'}
              value={formatCurrency(reportData.profit)}
              icon={Number(reportData.profit || 0) < 0 ? AlertTriangle : CheckCircle2}
              color={Number(reportData.profit || 0) < 0 ? '#dc2626' : '#7c3aed'}
            />
          </div>

          <DataTable
            title="Profit & Loss Summary"
            columns={[
              { key: 'metric', label: 'Metric' },
              { key: 'value', label: 'Value' },
            ]}
            rows={[
              { id: 1, metric: 'Total Sales', value: formatCurrency(reportData.totalSales) },
              { id: 2, metric: 'Total Purchases', value: formatCurrency(reportData.totalPurchases) },
              {
                id: 3,
                metric: Number(reportData.profit || 0) < 0 ? 'Net Loss' : 'Net Profit',
                value: formatCurrency(reportData.profit),
              },
            ]}
          />
        </>
      ) : null}

      {reportType === 'sales' && reportData ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <SummaryCard
              title="Total Sales"
              value={formatCurrency(reportData.totalSales)}
              sub={`${reportData.startDate} to ${reportData.endDate}`}
              icon={TrendingUp}
              color="#16a34a"
            />
            <SummaryCard
              title="Completed Orders"
              value={formatNumber(reportData.numberOfOrders)}
              sub="Within selected range"
              icon={BarChart2}
              color="#2d3a8c"
            />
            <SummaryCard
              title="Average Order Value"
              value={formatCurrency(reportData.averageOrderValue)}
              sub={`Top customer: ${reportData.topCustomerName || '-'}`}
              icon={Receipt}
              color="#f59e0b"
            />
            <SummaryCard
              title="Outstanding Due"
              value={formatCurrency(reportData.totalAmountDue)}
              sub={`Paid: ${formatCurrency(reportData.totalAmountPaid)}`}
              icon={AlertTriangle}
              color="#dc2626"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <MiniTrendChart
              title="Daily Sales Trend"
              points={salesTrend}
              color="#16a34a"
            />

            <DataTable
              title="Top Customers"
              rows={customerSummaryForSales.slice(0, 5)}
              emptyText="No customer insights available."
              columns={[
                { key: 'customerName', label: 'Customer' },
                {
                  key: 'orderCount',
                  label: 'Orders',
                  render: (row) => formatNumber(row.orderCount),
                },
                {
                  key: 'totalAmount',
                  label: 'Sales',
                  render: (row) => formatCurrency(row.totalAmount),
                },
                {
                  key: 'totalDue',
                  label: 'Due',
                  render: (row) => formatCurrency(row.totalDue),
                },
              ]}
            />
          </div>

          <DataTable
            title="Completed Sales Orders"
            rows={pagedSalesRows}
            emptyText="No completed sales orders found."
            columns={[
              { key: 'orderNumber', label: 'Order No.' },
              { key: 'invoiceNumber', label: 'Invoice No.' },
              { key: 'customerName', label: 'Customer' },
              {
                key: 'orderDate',
                label: 'Order Date',
                render: (row) => formatDateTime(row.orderDate),
              },
              {
                key: 'paymentStatus',
                label: 'Payment',
                render: (row) => {
                  const style = getPaymentPillStyle(row.paymentStatus);
                  return (
                    <StatusPill
                      label={row.paymentStatus || '-'}
                      color={style.color}
                      bg={style.bg}
                    />
                  );
                },
              },
              {
                key: 'totalAmount',
                label: 'Total',
                render: (row) => formatCurrency(row.totalAmount),
              },
              {
                key: 'totalGstAmount',
                label: 'GST',
                render: (row) => formatCurrency(row.totalGstAmount),
              },
              {
                key: 'amountDue',
                label: 'Due',
                render: (row) => formatCurrency(row.amountDue),
              },
            ]}
            footer={
              <PaginationBar
                page={page}
                pageSize={pageSize}
                totalItems={filteredSalesRows.length}
                onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
                onNext={() =>
                  setPage((prev) =>
                    prev < Math.ceil(filteredSalesRows.length / pageSize) ? prev + 1 : prev
                  )
                }
                onPageSizeChange={(value) => {
                  setPageSize(value);
                  setPage(1);
                }}
              />
            }
          />
        </>
      ) : null}

      {reportType === 'purchases' && reportData ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <SummaryCard
              title="Total Purchases"
              value={formatCurrency(reportData.totalPurchases)}
              sub={`${reportData.startDate} to ${reportData.endDate}`}
              icon={ShoppingCart}
              color="#2563eb"
            />
            <SummaryCard
              title="Orders"
              value={formatNumber(reportData.numberOfOrders)}
              sub="Within selected range"
              icon={BarChart2}
              color="#2d3a8c"
            />
            <SummaryCard
              title="Average PO Value"
              value={formatCurrency(reportData.averageOrderValue)}
              sub={`Top supplier: ${reportData.topSupplierName || '-'}`}
              icon={Receipt}
              color="#f59e0b"
            />
            <SummaryCard
              title="Outstanding Due"
              value={formatCurrency(reportData.totalAmountDue)}
              sub={`Paid: ${formatCurrency(reportData.totalAmountPaid)}`}
              icon={AlertTriangle}
              color="#dc2626"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <MiniTrendChart
              title="Daily Purchase Trend"
              points={purchaseTrend}
              color="#2563eb"
            />

            <DataTable
              title="Top Suppliers"
              rows={supplierSummaryForPurchases.slice(0, 5)}
              emptyText="No supplier insights available."
              columns={[
                { key: 'supplierName', label: 'Supplier' },
                {
                  key: 'orderCount',
                  label: 'Orders',
                  render: (row) => formatNumber(row.orderCount),
                },
                {
                  key: 'totalAmount',
                  label: 'Purchase',
                  render: (row) => formatCurrency(row.totalAmount),
                },
                {
                  key: 'totalDue',
                  label: 'Due',
                  render: (row) => formatCurrency(row.totalDue),
                },
              ]}
            />
          </div>

          <DataTable
            title="Purchase Orders"
            rows={pagedPurchaseRows}
            emptyText="No purchase orders found."
            columns={[
              { key: 'orderNumber', label: 'PO No.' },
              { key: 'invoiceNumber', label: 'Invoice No.' },
              { key: 'supplierName', label: 'Supplier' },
              {
                key: 'orderDate',
                label: 'Order Date',
                render: (row) => formatDateTime(row.orderDate),
              },
              {
                key: 'paymentStatus',
                label: 'Payment',
                render: (row) => {
                  const style = getPaymentPillStyle(row.paymentStatus, 'purchase');
                  return (
                    <StatusPill
                      label={row.paymentStatus || '-'}
                      color={style.color}
                      bg={style.bg}
                    />
                  );
                },
              },
              {
                key: 'totalAmount',
                label: 'Total',
                render: (row) => formatCurrency(row.totalAmount),
              },
              {
                key: 'totalGstAmount',
                label: 'GST',
                render: (row) => formatCurrency(row.totalGstAmount),
              },
              {
                key: 'amountDue',
                label: 'Due',
                render: (row) => formatCurrency(row.amountDue),
              },
            ]}
            footer={
              <PaginationBar
                page={page}
                pageSize={pageSize}
                totalItems={filteredPurchaseRows.length}
                onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
                onNext={() =>
                  setPage((prev) =>
                    prev < Math.ceil(filteredPurchaseRows.length / pageSize) ? prev + 1 : prev
                  )
                }
                onPageSizeChange={(value) => {
                  setPageSize(value);
                  setPage(1);
                }}
              />
            }
          />
        </>
      ) : null}

      {reportType === 'stock' && reportData ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <SummaryCard
              title="Total Medicines"
              value={formatNumber(stockRows.length)}
              sub="Current stock records"
              icon={Package}
              color="#2d3a8c"
            />
            <SummaryCard
              title="Low Stock"
              value={formatNumber(stockInsights.lowStockCount)}
              sub={`Healthy: ${formatNumber(stockInsights.healthyCount)}`}
              icon={AlertTriangle}
              color="#dc2626"
            />
            <SummaryCard
              title="Out of Stock"
              value={formatNumber(stockInsights.outOfStockCount)}
              sub="Zero quantity items"
              icon={ShieldAlert}
              color="#b91c1c"
            />
            <SummaryCard
              title="Stock Value"
              value={formatCurrency(stockInsights.totalValue)}
              sub="Based on current stock value"
              icon={IndianRupee}
              color="#16a34a"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <DataTable
              title="Category Summary"
              rows={stockCategorySummary.slice(0, 8)}
              emptyText="No category summary available."
              columns={[
                { key: 'category', label: 'Category' },
                {
                  key: 'medicineCount',
                  label: 'Medicines',
                  render: (row) => formatNumber(row.medicineCount),
                },
                {
                  key: 'totalQty',
                  label: 'Total Qty',
                  render: (row) => formatNumber(row.totalQty),
                },
                {
                  key: 'totalValue',
                  label: 'Value',
                  render: (row) => formatCurrency(row.totalValue),
                },
                {
                  key: 'lowStockCount',
                  label: 'Low Stock',
                  render: (row) => formatNumber(row.lowStockCount),
                },
              ]}
            />

            <MiniTrendChart
              title="Stock Value by Category"
              points={stockCategorySummary.slice(0, 6).map((item) => ({
                label: item.category,
                value: item.totalValue,
              }))}
              color="#16a34a"
            />
          </div>

          <DataTable
            title="Stock Report"
            rows={pagedStockRows}
            emptyText="No stock items found."
            columns={[
              { key: 'medicineName', label: 'Medicine' },
              { key: 'sku', label: 'SKU' },
              { key: 'category', label: 'Category' },
              { key: 'brandName', label: 'Brand' },
              {
                key: 'stockQuantity',
                label: 'Qty',
                render: (row) => formatNumber(row.stockQuantity),
              },
              {
                key: 'minimumStockLevel',
                label: 'Min Level',
                render: (row) => formatNumber(row.minimumStockLevel),
              },
              {
                key: 'unitPrice',
                label: 'Price',
                render: (row) => formatCurrency(row.unitPrice),
              },
              {
                key: 'stockValue',
                label: 'Stock Value',
                render: (row) => formatCurrency(row.stockValue),
              },
              {
                key: 'lowStock',
                label: 'Status',
                render: (row) =>
                  row.lowStock ? (
                    <StatusPill label="LOW STOCK" color="#991b1b" bg="#fee2e2" />
                  ) : (
                    <StatusPill label="HEALTHY" color="#166534" bg="#dcfce7" />
                  ),
              },
            ]}
            footer={
              <PaginationBar
                page={page}
                pageSize={pageSize}
                totalItems={filteredStockRows.length}
                onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
                onNext={() =>
                  setPage((prev) =>
                    prev < Math.ceil(filteredStockRows.length / pageSize) ? prev + 1 : prev
                  )
                }
                onPageSizeChange={(value) => {
                  setPageSize(value);
                  setPage(1);
                }}
              />
            }
          />
        </>
      ) : null}

      {reportType === 'expiry' && reportData ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <SummaryCard
              title="Expiring Soon"
              value={formatNumber(reportData.expiringSoonCount)}
              sub={`Within next ${reportData.days} days`}
              icon={Clock}
              color="#f59e0b"
            />
            <SummaryCard
              title="Expired Batches"
              value={formatNumber(reportData.expiredCount)}
              sub="Immediate attention needed"
              icon={AlertTriangle}
              color="#dc2626"
            />
            <SummaryCard
              title="Flagged Batches"
              value={formatNumber(filteredExpiryRows.length)}
              sub="Visible rows after filters"
              icon={ShieldAlert}
              color="#2d3a8c"
            />
            <SummaryCard
              title="Risk Window"
              value={`${reportData.days} Days`}
              sub="Selected expiry period"
              icon={CalendarDays}
              color="#7c3aed"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <MiniTrendChart
              title="Expiry Risk Buckets"
              points={expiryBucketSummary}
              color="#f59e0b"
              formatter={(value) => formatNumber(value)}
            />

            <DataTable
              title="Expiry Summary"
              rows={expiryBucketSummary}
              emptyText="No expiry summary available."
              columns={[
                { key: 'label', label: 'Bucket' },
                {
                  key: 'value',
                  label: 'Count',
                  render: (row) => formatNumber(row.value),
                },
              ]}
            />
          </div>

          <DataTable
            title="Expiry Report"
            rows={pagedExpiryRows}
            emptyText="No expiry batches found."
            columns={[
              {
                key: 'expiryType',
                label: 'Type',
                render: (row) =>
                  row.expiryType === 'EXPIRED' ? (
                    <StatusPill label="Expired" color="#991b1b" bg="#fee2e2" />
                  ) : (
                    <StatusPill label="Expiring Soon" color="#92400e" bg="#fef3c7" />
                  ),
              },
              { key: 'medicineName', label: 'Medicine' },
              { key: 'batchNumber', label: 'Batch No.' },
              {
                key: 'expiryDate',
                label: 'Expiry Date',
                render: (row) => formatDate(row.expiryDate),
              },
              {
                key: 'daysToExpiry',
                label: 'Days',
                render: (row) => formatNumber(row.daysToExpiry),
              },
              {
                key: 'quantity',
                label: 'Qty',
                render: (row) => formatNumber(row.quantity),
              },
              { key: 'supplierName', label: 'Supplier' },
            ]}
            footer={
              <PaginationBar
                page={page}
                pageSize={pageSize}
                totalItems={filteredExpiryRows.length}
                onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
                onNext={() =>
                  setPage((prev) =>
                    prev < Math.ceil(filteredExpiryRows.length / pageSize) ? prev + 1 : prev
                  )
                }
                onPageSizeChange={(value) => {
                  setPageSize(value);
                  setPage(1);
                }}
              />
            }
          />
        </>
      ) : null}

      {reportType === 'gst' && reportData ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <SummaryCard
              title="Sales GST"
              value={formatCurrency(reportData.totalSalesGST)}
              sub={`${reportData.startDate || '-'} to ${reportData.endDate || '-'}`}
              icon={Receipt}
              color="#16a34a"
            />
            <SummaryCard
              title="Purchase GST"
              value={formatCurrency(reportData.totalPurchaseGST)}
              sub="Input tax paid"
              icon={ShoppingCart}
              color="#2563eb"
            />
            <SummaryCard
              title="Net GST Payable"
              value={formatCurrency(reportData.netGstPayable)}
              sub="Sales GST minus Purchase GST"
              icon={BarChart2}
              color="#7c3aed"
            />
            <SummaryCard
              title="Taxable Sales"
              value={formatCurrency(reportData.totalSalesTaxableAmount)}
              sub="Total taxable sales amount"
              icon={TrendingUp}
              color="#0f766e"
            />
          </div>

          <DataTable
            title="GST Summary"
            columns={[
              { key: 'metric', label: 'Metric' },
              { key: 'value', label: 'Value' },
            ]}
            rows={[
              {
                id: 1,
                metric: 'Period',
                value: `${reportData.startDate || '-'} to ${reportData.endDate || '-'}`,
              },
              {
                id: 2,
                metric: 'Sales Taxable Amount',
                value: formatCurrency(reportData.totalSalesTaxableAmount),
              },
              {
                id: 3,
                metric: 'Purchase Taxable Amount',
                value: formatCurrency(reportData.totalPurchaseTaxableAmount),
              },
              {
                id: 4,
                metric: 'Sales GST',
                value: formatCurrency(reportData.totalSalesGST),
              },
              {
                id: 5,
                metric: 'Purchase GST',
                value: formatCurrency(reportData.totalPurchaseGST),
              },
              {
                id: 6,
                metric: 'Net GST Payable',
                value: formatCurrency(reportData.netGstPayable),
              },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}