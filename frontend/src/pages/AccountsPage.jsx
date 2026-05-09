import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Plus,
  RefreshCw,
  Search,
  Wallet,
  Landmark,
  Receipt,
  ArrowDownLeft,
  FileDown,
  Filter,
  Eye,
  Pencil,
  Trash2,
  X,
  Activity,
  CalendarDays,
  IndianRupee,
  ArrowUpRight,
  BarChart3,
  FileSpreadsheet,
  FolderTree,
  ShieldCheck,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getLedgerEntries,
  getLedgerEntriesByAccount,
  createLedgerEntry,
} from '../api/services';
import { useAuth } from '../context/AuthContext';

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
const ENTRY_TYPES = [
  'PURCHASE',
  'SALES',
  'PURCHASE_PAYMENT',
  'SALES_RECEIPT',
  'ADJUSTMENT',
  'OPENING_BALANCE',
];

const DATE_PRESETS = [
  { key: 'ALL', label: 'All Time' },
  { key: 'TODAY', label: 'Today' },
  { key: 'THIS_MONTH', label: 'This Month' },
  { key: 'THIS_QUARTER', label: 'This Quarter' },
  { key: 'THIS_YEAR', label: 'This Year' },
  { key: 'CUSTOM', label: 'Custom' },
];

const defaultAccountForm = {
  accountCode: '',
  accountName: '',
  accountType: 'ASSET',
  parentAccountId: '',
  openingBalance: '',
  active: true,
};

const getDefaultEntryForm = () => ({
  transactionDate: new Date().toISOString().slice(0, 16),
  referenceType: 'MANUAL_ENTRY',
  referenceId: '',
  description: '',
  debitAccountId: '',
  creditAccountId: '',
  amount: '',
  entryType: 'ADJUSTMENT',
});

const fieldLabelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 800,
  color: 'var(--text-muted, #64748b)',
  marginBottom: '8px',
  letterSpacing: '0.2px',
};

function parseApiError(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

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

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function friendlyType(value) {
  return String(value || '-').replaceAll('_', ' ');
}

function amountColor(value) {
  const num = Number(value || 0);
  if (num > 0) return '#166534';
  if (num < 0) return '#b91c1c';
  return 'var(--text-main, #0f172a)';
}

function getAccountTypeStyle(type) {
  const value = String(type || '').toUpperCase();
  switch (value) {
    case 'ASSET':
      return { bg: '#eff6ff', color: '#1d4ed8' };
    case 'LIABILITY':
      return { bg: '#fee2e2', color: '#b91c1c' };
    case 'EQUITY':
      return { bg: '#ede9fe', color: '#6d28d9' };
    case 'INCOME':
      return { bg: '#dcfce7', color: '#166534' };
    case 'EXPENSE':
      return { bg: '#fef3c7', color: '#92400e' };
    default:
      return { bg: '#e2e8f0', color: 'var(--text-muted, #334155)' };
  }
}

function TypePill({ text }) {
  const style = getAccountTypeStyle(text);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 800,
        color: style.color,
        background: style.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {friendlyType(text)}
    </span>
  );
}

function StatusPill({ active }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 800,
        color: active ? '#166534' : '#991b1b',
        background: active ? '#dcfce7' : '#fee2e2',
        whiteSpace: 'nowrap',
      }}
    >
      {active ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
}

function StatCard({ title, value, sub, icon, color = '#2d3a8c' }) {
  const IconComponent = icon;

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
              fontSize: '24px',
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
          <IconComponent size={21} color={color} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--text-muted, #64748b)',
      }}
    >
      <div
        style={{
          width: '58px',
          height: '58px',
          borderRadius: '18px',
          background: '#eef2ff',
          color: '#2d3a8c',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px',
        }}
      >
        <BookOpen size={24} />
      </div>
      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
        {title}
      </div>
      <div style={{ fontSize: '13px', marginTop: '6px' }}>{subtitle}</div>
    </div>
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
        fontWeight: 800,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function Modal({ open, title, onClose, children, width = '760px' }) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 16px',
        overflowY: 'auto',
        zIndex: 99999,
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: width,
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(15, 23, 42, 0.25)',
          margin: '0 auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '18px',
            borderBottom: '1px solid #e5e7eb',
            background: 'var(--bg-table-row, #fbfdff)',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--text-main, #1f2937)',
            }}
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'var(--bg-card-soft, #f1f5f9)',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted, #334155)',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '18px' }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

function DataTable({
  title,
  subtitle,
  columns,
  rows,
  emptyTitle,
  emptySubtitle,
  headerAction,
  rowKey,
  getRowStyle,
}) {
  return (
    <div className="card" style={{ borderRadius: '22px', overflow: 'hidden' }}>
      <div
        style={{
          padding: '18px 20px',
          borderBottom: '1px solid #eef2f7',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
        }}
      >
        <div>
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
          {subtitle ? (
            <div
              style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        {headerAction}
      </div>

      {!rows.length ? (
        <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              minWidth: '980px',
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
                  key={rowKey ? rowKey(row, rowIndex) : row.id || `row-${rowIndex}`}
                  style={
                    getRowStyle
                      ? getRowStyle(row, rowIndex)
                      : {
                          background: rowIndex % 2 === 0 ? 'var(--bg-card, var(--bg-card, #ffffff)fff)' : 'var(--bg-table-row, #fbfdff)',
                        }
                  }
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
                      {column.render
                        ? column.render(row, rowIndex)
                        : row[column.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function exportAccountsPdf({
  summary,
  accounts,
  ledgerRows,
  filters,
  selectedAccount,
  statementSummary,
}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const left = 14;
  const right = 14;

  doc.setFillColor(27, 45, 125);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Sygnus Biotech ERP', 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Accounts & Ledger Statement', 14, 22);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 14, 28);

  doc.setFillColor(245, 247, 251);
  doc.roundedRect(12, 40, 186, 22, 4, 4, 'F');
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('Financial Overview', 18, 53);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const filterText = [
    `Account Search: ${filters.accountSearch || 'All'}`,
    `Ledger Search: ${filters.ledgerSearch || 'All'}`,
    `Type: ${filters.accountType || 'All'}`,
    `Entry: ${filters.entryType || 'All'}`,
    `Account: ${selectedAccount?.accountName || 'All accounts'}`,
    `Period: ${filters.periodLabel || 'All Time'}`,
  ].join(' • ');

  const wrapped = doc.splitTextToSize(filterText, 170);
  doc.text(wrapped, 18, 59);

  autoTable(doc, {
    startY: 72,
    head: [['Metric', 'Value']],
    body: [
      ['Total Accounts', formatNumber(summary.totalAccounts)],
      ['Active Accounts', formatNumber(summary.activeAccounts)],
      ['Asset Balance', formatCurrencyPdf(summary.assetTotal)],
      ['Liability Balance', formatCurrencyPdf(summary.liabilityTotal)],
      ['Income Balance', formatCurrencyPdf(summary.incomeTotal)],
      ['Expense Balance', formatCurrencyPdf(summary.expenseTotal)],
      ['Debit Total', formatCurrencyPdf(summary.debitTotal)],
      ['Credit Total', formatCurrencyPdf(summary.creditTotal)],
      ['Ledger Entries', formatNumber(summary.ledgerCount)],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [45, 58, 140],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.6,
      textColor: [31, 41, 55],
      cellPadding: 3.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    margin: { left, right },
  });

  if (selectedAccount && statementSummary) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Selected Account Statement', 'Value']],
      body: [
        ['Account', `${selectedAccount.accountCode} - ${selectedAccount.accountName}`],
        ['Opening Balance', formatCurrencyPdf(statementSummary.openingBalance)],
        ['Debit Movement', formatCurrencyPdf(statementSummary.debitTotal)],
        ['Credit Movement', formatCurrencyPdf(statementSummary.creditTotal)],
        ['Net Movement', formatCurrencyPdf(statementSummary.netMovement)],
        ['Current Balance', formatCurrencyPdf(statementSummary.currentBalance)],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [22, 163, 74],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 7.8,
        textColor: [31, 41, 55],
        cellPadding: 2.8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      styles: {
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
      },
      margin: { left, right },
    });
  }

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [[
      'Code',
      'Account',
      'Parent',
      'Type',
      'Status',
      'Opening Balance',
      'Current Balance',
    ]],
    body: accounts.map((item) => [
      item.accountCode || '-',
      item.accountName || '-',
      item.parentAccountName || '-',
      friendlyType(item.accountType),
      item.active ? 'ACTIVE' : 'INACTIVE',
      formatCurrencyPdf(item.openingBalance),
      formatCurrencyPdf(item.currentBalance),
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [14, 116, 144],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 7.8,
      textColor: [31, 41, 55],
      cellPadding: 2.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    margin: { left, right },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [[
      'Date',
      'Entry Type',
      'Reference',
      'Debit Account',
      'Credit Account',
      'Amount',
      'Description',
    ]],
    body: ledgerRows.map((item) => [
      formatDateTime(item.transactionDate),
      friendlyType(item.entryType),
      item.referenceId || item.referenceType || '-',
      item.debitAccountName || '-',
      item.creditAccountName || '-',
      formatCurrencyPdf(item.amount),
      item.description || '-',
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [124, 58, 237],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.1,
    },
    bodyStyles: {
      fontSize: 7.1,
      textColor: [31, 41, 55],
      cellPadding: 2.6,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    margin: { left, right },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 287, 196, 287);
    doc.setFontSize(9);
    doc.setTextColor(120, 132, 158);
    doc.text('Sygnus Biotech ERP • Accounts export', 14, 292);
    doc.text(`Page ${i} of ${pageCount}`, 180, 292);
  }

  doc.save('accounts-ledger-statement.pdf');
}

function exportStatementPdf({ selectedAccount, statementRows, statementSummary }) {
  const doc = new jsPDF('p', 'mm', 'a4');

  doc.setFillColor(27, 45, 125);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Account Statement', 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 14, 23);

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${selectedAccount.accountCode} - ${selectedAccount.accountName}`, 14, 42);

  autoTable(doc, {
    startY: 48,
    head: [['Metric', 'Value']],
    body: [
      ['Opening Balance', formatCurrencyPdf(statementSummary.openingBalance)],
      ['Debit Movement', formatCurrencyPdf(statementSummary.debitTotal)],
      ['Credit Movement', formatCurrencyPdf(statementSummary.creditTotal)],
      ['Net Movement', formatCurrencyPdf(statementSummary.netMovement)],
      ['Current Balance', formatCurrencyPdf(statementSummary.currentBalance)],
      ['Entries', formatNumber(statementSummary.entryCount)],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [31, 41, 55],
      cellPadding: 3,
    },
    margin: { left: 14, right: 14 },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [[
      'Date',
      'Entry Type',
      'Reference',
      'Debit',
      'Credit',
      'Amount',
      'Description',
    ]],
    body: statementRows.map((row) => [
      formatDateTime(row.transactionDate),
      friendlyType(row.entryType),
      row.referenceId || row.referenceType || '-',
      row.debitAccountName || '-',
      row.creditAccountName || '-',
      formatCurrencyPdf(row.amount),
      row.description || '-',
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [45, 58, 140],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.1,
      cellPadding: 2.5,
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`statement-${selectedAccount.accountCode || 'account'}.pdf`);
}

export default function AccountsPage() {
  const { hasAnyRole } = useAuth();

  const canView = hasAnyRole(['ADMIN']);
  const canManage = hasAnyRole(['ADMIN']);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const [accounts, setAccounts] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [accountLedgerEntries, setAccountLedgerEntries] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('ALL');

  const [accountSearchInput, setAccountSearchInput] = useState('');
  const [ledgerSearchInput, setLedgerSearchInput] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('ALL');
  const [entryTypeFilter, setEntryTypeFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLedgerDetailModal, setShowLedgerDetailModal] = useState(false);

  const [editingAccount, setEditingAccount] = useState(null);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [viewingLedgerRow, setViewingLedgerRow] = useState(null);

  const [accountForm, setAccountForm] = useState(defaultAccountForm);
  const [entryForm, setEntryForm] = useState(getDefaultEntryForm());
  const [formError, setFormError] = useState('');

  const ledgerSectionRef = useRef(null);

  const showToast = (type, message) => setToast({ type, message });

  const closeAccountModal = () => {
    if (submitting) return;
    setShowAccountModal(false);
    setEditingAccount(null);
    setFormError('');
    setAccountForm(defaultAccountForm);
  };

  const closeLedgerModal = () => {
    if (submitting) return;
    setShowLedgerModal(false);
    setFormError('');
    setEntryForm(getDefaultEntryForm());
  };

  const closeDeleteModal = () => {
    if (submitting) return;
    setShowDeleteModal(false);
    setAccountToDelete(null);
  };

  const closeLedgerDetailModal = () => {
    setShowLedgerDetailModal(false);
    setViewingLedgerRow(null);
  };

  const fetchAccounts = useCallback(async () => {
    const res = await getAccounts({ page: 0, size: 300, search: undefined });
    const data = res?.data?.data;
    const list = Array.isArray(data) ? data : data?.content || [];
    setAccounts(list);
    return list;
  }, []);

  const fetchLedgerEntries = useCallback(async () => {
    const res = await getLedgerEntries({ page: 0, size: 500, search: undefined });
    const data = res?.data?.data;
    const list = Array.isArray(data) ? data : data?.content || [];
    setLedgerEntries(list);
    return list;
  }, []);

  const fetchAccountLedger = useCallback(async (accountId) => {
    if (!accountId || accountId === 'ALL') {
      setAccountLedgerEntries([]);
      return [];
    }

    const res = await getLedgerEntriesByAccount(accountId, {
      page: 0,
      size: 300,
    });
    const data = res?.data?.data;
    const list = Array.isArray(data) ? data : data?.content || [];
    setAccountLedgerEntries(list);
    return list;
  }, []);

  const refreshData = useCallback(async () => {
    if (!canView) {
      setAccounts([]);
      setLedgerEntries([]);
      setAccountLedgerEntries([]);
      setLoading(false);
      setError("You're not eligible to access this page.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      await Promise.all([fetchAccounts(), fetchLedgerEntries()]);

      if (selectedAccountId !== 'ALL') {
        await fetchAccountLedger(selectedAccountId);
      }
    } catch (err) {
      console.error(err);
      setError(parseApiError(err, 'Failed to load accounts data.'));
    } finally {
      setLoading(false);
    }
  }, [canView, fetchAccountLedger, fetchAccounts, fetchLedgerEntries, selectedAccountId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAccountSearch(accountSearchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [accountSearchInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLedgerSearch(ledgerSearchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [ledgerSearchInput]);

  useEffect(() => {
    if (selectedAccountId === 'ALL') {
      setAccountLedgerEntries([]);
      return;
    }

    fetchAccountLedger(selectedAccountId).catch((err) => {
      console.error(err);
      showToast('error', parseApiError(err, 'Failed to load account statement.'));
    });
  }, [selectedAccountId, fetchAccountLedger]);

  const applyDatePreset = (preset) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    if (preset === 'ALL') {
      setDatePreset('ALL');
      setFromDate('');
      setToDate('');
      return;
    }

    if (preset === 'TODAY') {
      const value = `${yyyy}-${mm}-${dd}`;
      setDatePreset('TODAY');
      setFromDate(value);
      setToDate(value);
      return;
    }

    if (preset === 'THIS_MONTH') {
      setDatePreset('THIS_MONTH');
      setFromDate(`${yyyy}-${mm}-01`);
      setToDate(`${yyyy}-${mm}-${dd}`);
      return;
    }

    if (preset === 'THIS_QUARTER') {
      const month = today.getMonth();
      const quarterStartMonth = month - (month % 3);
      const qMonth = String(quarterStartMonth + 1).padStart(2, '0');
      setDatePreset('THIS_QUARTER');
      setFromDate(`${yyyy}-${qMonth}-01`);
      setToDate(`${yyyy}-${mm}-${dd}`);
      return;
    }

    if (preset === 'THIS_YEAR') {
      setDatePreset('THIS_YEAR');
      setFromDate(`${yyyy}-01-01`);
      setToDate(`${yyyy}-${mm}-${dd}`);
      return;
    }

    setDatePreset('CUSTOM');
  };

  const accountMap = useMemo(() => {
    const map = {};
    accounts.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [accounts]);

  const enrichedAccounts = useMemo(() => {
    return accounts.map((item) => ({
      ...item,
      parentAccountName: item.parentAccountId
        ? accountMap[item.parentAccountId]?.accountName || '-'
        : '-',
      parentAccountCode: item.parentAccountId
        ? accountMap[item.parentAccountId]?.accountCode || '-'
        : '-',
    }));
  }, [accounts, accountMap]);

  const selectedAccount = useMemo(
    () => enrichedAccounts.find((item) => item.id === selectedAccountId) || null,
    [enrichedAccounts, selectedAccountId]
  );

  const filteredAccounts = useMemo(() => {
    return enrichedAccounts.filter((item) => {
      const matchesSearch =
        !accountSearch ||
        [
          item.accountCode,
          item.accountName,
          item.accountType,
          item.parentAccountName,
          item.parentAccountCode,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(accountSearch.toLowerCase())
          );

      const matchesType =
        accountTypeFilter === 'ALL' || item.accountType === accountTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [enrichedAccounts, accountSearch, accountTypeFilter]);

  const baseLedgerRows = useMemo(() => {
    const rows = selectedAccountId === 'ALL' ? ledgerEntries : accountLedgerEntries;

    return [...rows].sort(
      (a, b) =>
        new Date(b.transactionDate || b.createdAt || 0) -
        new Date(a.transactionDate || a.createdAt || 0)
    );
  }, [selectedAccountId, ledgerEntries, accountLedgerEntries]);

  const filteredLedgerRows = useMemo(() => {
    return baseLedgerRows.filter((item) => {
      const rowDate = item.transactionDate ? new Date(item.transactionDate) : null;

      const matchesEntryType =
        entryTypeFilter === 'ALL' || item.entryType === entryTypeFilter;

      const matchesSearch =
        !ledgerSearch ||
        [
          item.referenceType,
          item.referenceId,
          item.description,
          item.debitAccountName,
          item.creditAccountName,
          item.entryType,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(ledgerSearch.toLowerCase())
          );

      let matchesDate = true;

      if (fromDate && rowDate) {
        const from = new Date(`${fromDate}T00:00:00`);
        if (rowDate < from) matchesDate = false;
      }

      if (toDate && rowDate) {
        const to = new Date(`${toDate}T23:59:59`);
        if (rowDate > to) matchesDate = false;
      }

      return matchesEntryType && matchesSearch && matchesDate;
    });
  }, [baseLedgerRows, entryTypeFilter, fromDate, ledgerSearch, toDate]);

  const summary = useMemo(() => {
    const getTypeTotal = (type) =>
      filteredAccounts
        .filter((item) => item.accountType === type)
        .reduce((sum, item) => sum + Number(item.currentBalance || 0), 0);

    const debitTotal = filteredLedgerRows.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
    const creditTotal = filteredLedgerRows.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    return {
      totalAccounts: filteredAccounts.length,
      activeAccounts: filteredAccounts.filter((item) => item.active).length,
      assetTotal: getTypeTotal('ASSET'),
      liabilityTotal: getTypeTotal('LIABILITY'),
      incomeTotal: getTypeTotal('INCOME'),
      expenseTotal: getTypeTotal('EXPENSE'),
      ledgerCount: filteredLedgerRows.length,
      ledgerTotal: filteredLedgerRows.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
      debitTotal,
      creditTotal,
      netPosition: getTypeTotal('ASSET') - getTypeTotal('LIABILITY'),
      profitLoss: getTypeTotal('INCOME') - getTypeTotal('EXPENSE'),
    };
  }, [filteredAccounts, filteredLedgerRows]);

  const accountBreakdown = useMemo(() => {
    return ACCOUNT_TYPES.map((type) => ({
      type,
      count: filteredAccounts.filter((item) => item.accountType === type).length,
      total: filteredAccounts
        .filter((item) => item.accountType === type)
        .reduce((sum, item) => sum + Number(item.currentBalance || 0), 0),
    }));
  }, [filteredAccounts]);

  const selectedAccountStatementSummary = useMemo(() => {
    if (!selectedAccount) return null;

    const rows = filteredLedgerRows;

    const debitTotal = rows.reduce((sum, row) => {
      return row.debitAccountId === selectedAccount.id
        ? sum + Number(row.amount || 0)
        : sum;
    }, 0);

    const creditTotal = rows.reduce((sum, row) => {
      return row.creditAccountId === selectedAccount.id
        ? sum + Number(row.amount || 0)
        : sum;
    }, 0);

    return {
      openingBalance: Number(selectedAccount.openingBalance || 0),
      currentBalance: Number(selectedAccount.currentBalance || 0),
      debitTotal,
      creditTotal,
      netMovement: debitTotal - creditTotal,
      entryCount: rows.length,
    };
  }, [filteredLedgerRows, selectedAccount]);

  const filterSummaryText = useMemo(() => {
    const parts = [];

    if (accountSearch) parts.push(`Account search: "${accountSearch}"`);
    if (ledgerSearch) parts.push(`Ledger search: "${ledgerSearch}"`);
    if (accountTypeFilter !== 'ALL') parts.push(`Type: ${friendlyType(accountTypeFilter)}`);
    if (entryTypeFilter !== 'ALL') parts.push(`Entry: ${friendlyType(entryTypeFilter)}`);
    if (selectedAccount) parts.push(`Statement: ${selectedAccount.accountCode}`);
    if (fromDate || toDate) {
      parts.push(`Date: ${fromDate || '...'} to ${toDate || '...'}`);
    }
    return parts.length ? parts.join(' • ') : 'Showing all accounts and ledger entries';
  }, [accountSearch, ledgerSearch, accountTypeFilter, entryTypeFilter, selectedAccount, fromDate, toDate]);

  const trialBalanceRows = useMemo(() => {
    return filteredAccounts
      .map((item) => {
        const balance = Number(item.currentBalance || 0);
        return {
          id: item.id,
          accountCode: item.accountCode,
          accountName: item.accountName,
          accountType: item.accountType,
          debit: balance > 0 ? balance : 0,
          credit: balance < 0 ? Math.abs(balance) : 0,
        };
      })
      .filter((item) => item.debit > 0 || item.credit > 0);
  }, [filteredAccounts]);

  const trialBalanceTotals = useMemo(() => {
    return trialBalanceRows.reduce(
      (acc, row) => {
        acc.debit += Number(row.debit || 0);
        acc.credit += Number(row.credit || 0);
        return acc;
      },
      { debit: 0, credit: 0 }
    );
  }, [trialBalanceRows]);

  const openCreateAccount = () => {
    setEditingAccount(null);
    setFormError('');
    setAccountForm(defaultAccountForm);
    setShowAccountModal(true);
  };

  const openEditAccount = (account) => {
    setEditingAccount(account);
    setFormError('');
    setAccountForm({
      accountCode: account.accountCode || '',
      accountName: account.accountName || '',
      accountType: account.accountType || 'ASSET',
      parentAccountId: account.parentAccountId || '',
      openingBalance: account.openingBalance ?? '',
      active: account.active ?? true,
    });
    setShowAccountModal(true);
  };

  const generateManualReferenceId = () => {
    return `JV-${Date.now().toString().slice(-6)}`;
  };

  const openCreateLedger = () => {
    setFormError('');
    setEntryForm({
      ...getDefaultEntryForm(),
      referenceId: generateManualReferenceId(),
      debitAccountId:
        selectedAccountId !== 'ALL' && selectedAccount?.active
          ? selectedAccountId
          : '',
    });
    setShowLedgerModal(true);
  };

  const handleViewAccount = async (row) => {
    try {
      setStatementLoading(true);
      setSelectedAccountId(row.id);
      await fetchAccountLedger(row.id);

      setTimeout(() => {
        ledgerSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 120);

      showToast('success', `Showing statement for ${row.accountCode} - ${row.accountName}`);
    } catch (err) {
      console.error(err);
      showToast('error', parseApiError(err, 'Failed to load account statement.'));
    } finally {
      setStatementLoading(false);
    }
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!accountForm.accountCode.trim() || !accountForm.accountName.trim()) {
      setFormError('Account code and account name are required.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        accountCode: accountForm.accountCode.trim(),
        accountName: accountForm.accountName.trim(),
        accountType: accountForm.accountType,
        parentAccountId: accountForm.parentAccountId || null,
        openingBalance:
          accountForm.openingBalance === ''
            ? 0
            : Number(accountForm.openingBalance || 0),
        active: Boolean(accountForm.active),
      };

      if (editingAccount?.id) {
        await updateAccount(editingAccount.id, payload);
        showToast('success', 'Account updated successfully.');
      } else {
        await createAccount(payload);
        showToast('success', 'Account created successfully.');
      }

      closeAccountModal();
      await refreshData();
    } catch (err) {
      console.error(err);
      setFormError(parseApiError(err, 'Failed to save account.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLedger = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!entryForm.debitAccountId || !entryForm.creditAccountId) {
      setFormError('Please select both debit and credit accounts.');
      return;
    }

    if (entryForm.debitAccountId === entryForm.creditAccountId) {
      setFormError('Debit and credit accounts must be different.');
      return;
    }

    if (!Number(entryForm.amount) || Number(entryForm.amount) <= 0) {
      setFormError('Amount must be greater than 0.');
      return;
    }

    try {
      setSubmitting(true);

      const referenceType = entryForm.referenceType.trim() || 'MANUAL_ENTRY';
      const referenceId = entryForm.referenceId.trim() || generateManualReferenceId();

      await createLedgerEntry({
        transactionDate: new Date(entryForm.transactionDate).toISOString(),
        referenceType,
        referenceId,
        description: entryForm.description.trim() || null,
        debitAccountId: entryForm.debitAccountId,
        creditAccountId: entryForm.creditAccountId,
        amount: Number(entryForm.amount),
        entryType: entryForm.entryType,
      });

      closeLedgerModal();
      showToast('success', 'Ledger entry created successfully.');
      await refreshData();
    } catch (err) {
      console.error(err);
      setFormError(parseApiError(err, 'Failed to create ledger entry.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete?.id) return;

    try {
      setSubmitting(true);
      await deleteAccount(accountToDelete.id);

      if (selectedAccountId === accountToDelete.id) {
        setSelectedAccountId('ALL');
      }

      closeDeleteModal();
      showToast('success', 'Account deleted successfully.');
      await refreshData();
    } catch (err) {
      console.error(err);
      showToast('error', parseApiError(err, 'Failed to delete account.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAccountStatus = async (account) => {
    try {
      setSubmitting(true);
      await updateAccount(account.id, {
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        parentAccountId: account.parentAccountId || null,
        openingBalance: Number(account.openingBalance || 0),
        active: !Boolean(account.active),
      });
      showToast('success', `Account ${account.active ? 'deactivated' : 'activated'} successfully.`);
      await refreshData();
    } catch (err) {
      console.error(err);
      showToast('error', parseApiError(err, 'Failed to update account status.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      setDownloading(true);

      exportAccountsPdf({
        summary,
        accounts: filteredAccounts,
        ledgerRows: filteredLedgerRows,
        filters: {
          accountSearch,
          ledgerSearch,
          accountType: accountTypeFilter === 'ALL' ? '' : accountTypeFilter,
          entryType: entryTypeFilter === 'ALL' ? '' : entryTypeFilter,
          periodLabel: filterSummaryText,
        },
        selectedAccount,
        statementSummary: selectedAccountStatementSummary,
      });

      showToast('success', 'Accounts statement exported successfully.');
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to export accounts statement.');
    } finally {
      setDownloading(false);
    }
  };

  const handleExportSelectedStatement = () => {
    if (!selectedAccount || !selectedAccountStatementSummary) return;

    try {
      exportStatementPdf({
        selectedAccount,
        statementRows: filteredLedgerRows,
        statementSummary: selectedAccountStatementSummary,
      });
      showToast('success', 'Selected account statement exported successfully.');
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to export selected statement.');
    }
  };

  const accountColumns = [
    {
      key: 'accountCode',
      label: 'Account Code',
      render: (row) => (
        <span style={{ fontWeight: 800 }}>{row.accountCode || '-'}</span>
      ),
    },
    {
      key: 'accountName',
      label: 'Account Name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700 }}>{row.accountName || '-'}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '3px' }}>
            Created {formatDateTime(row.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'parent',
      label: 'Parent',
      render: (row) =>
        row.parentAccountId ? (
          <div>
            <div style={{ fontWeight: 700 }}>{row.parentAccountName || '-'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '3px' }}>
              {row.parentAccountCode || '-'}
            </div>
          </div>
        ) : (
          <span style={{ color: 'var(--text-soft, #94a3b8)' }}>No Parent</span>
        ),
    },
    {
      key: 'accountType',
      label: 'Type',
      render: (row) => <TypePill text={row.accountType} />,
    },
    {
      key: 'openingBalance',
      label: 'Opening Balance',
      render: (row) => formatCurrency(row.openingBalance),
    },
    {
      key: 'currentBalance',
      label: 'Current Balance',
      render: (row) => (
        <span style={{ fontWeight: 800, color: amountColor(row.currentBalance) }}>
          {formatCurrency(row.currentBalance)}
        </span>
      ),
    },
    {
      key: 'active',
      label: 'Status',
      render: (row) => <StatusPill active={Boolean(row.active)} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              background: selectedAccountId === row.id ? '#e8edff' : undefined,
              borderColor: selectedAccountId === row.id ? '#c7d2fe' : undefined,
              fontWeight: selectedAccountId === row.id ? 800 : 600,
            }}
            onClick={() => handleViewAccount(row)}
            disabled={statementLoading}
          >
            <Eye size={14} /> {selectedAccountId === row.id ? 'Viewing' : 'View'}
          </button>

          {canManage ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '8px 12px', fontSize: '12px' }}
                onClick={() => openEditAccount(row)}
              >
                <Pencil size={14} /> Edit
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: row.active ? '#92400e' : '#166534',
                  borderColor: row.active ? '#fed7aa' : '#bbf7d0',
                  background: row.active ? 'var(--bg-card, #ffffff)7ed' : '#f0fdf4',
                }}
                onClick={() => handleToggleAccountStatus(row)}
                disabled={submitting}
              >
                <ShieldCheck size={14} /> {row.active ? 'Deactivate' : 'Activate'}
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#b91c1c',
                  borderColor: '#fecaca',
                  background: 'var(--bg-card, #ffffff)5f5',
                }}
                onClick={() => {
                  setAccountToDelete(row);
                  setShowDeleteModal(true);
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  const ledgerColumns = [
    {
      key: 'transactionDate',
      label: 'Date',
      render: (row) => formatDateTime(row.transactionDate),
    },
    {
      key: 'entryType',
      label: 'Entry Type',
      render: (row) => <TypePill text={row.entryType} />,
    },
    {
      key: 'reference',
      label: 'Reference',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700 }}>{row.referenceId || '-'}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '3px' }}>
            {row.referenceType || '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'debitAccountName',
      label: 'Debit Account',
      render: (row) => row.debitAccountName || '-',
    },
    {
      key: 'creditAccountName',
      label: 'Credit Account',
      render: (row) => row.creditAccountName || '-',
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => (
        <span style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (row) => (
        <div style={{ maxWidth: '250px', lineHeight: 1.5 }}>
          {row.description || '-'}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '8px 12px', fontSize: '12px' }}
          onClick={() => {
            setViewingLedgerRow(row);
            setShowLedgerDetailModal(true);
          }}
        >
          <Eye size={14} /> View
        </button>
      ),
    },
  ];

  const trialBalanceColumns = [
    {
      key: 'accountCode',
      label: 'Code',
      render: (row) => <span style={{ fontWeight: 800 }}>{row.accountCode}</span>,
    },
    {
      key: 'accountName',
      label: 'Account',
      render: (row) => row.accountName,
    },
    {
      key: 'accountType',
      label: 'Type',
      render: (row) => <TypePill text={row.accountType} />,
    },
    {
      key: 'debit',
      label: 'Debit',
      render: (row) => (
        <span style={{ fontWeight: 800, color: amountColor(row.debit) }}>
          {row.debit > 0 ? formatCurrency(row.debit) : '-'}
        </span>
      ),
    },
    {
      key: 'credit',
      label: 'Credit',
      render: (row) => (
        <span style={{ fontWeight: 800, color: amountColor(-row.credit) }}>
          {row.credit > 0 ? formatCurrency(row.credit) : '-'}
        </span>
      ),
    },
  ];

  const journalPreview = useMemo(() => {
    const debitAccount = accounts.find((item) => item.id === entryForm.debitAccountId);
    const creditAccount = accounts.find((item) => item.id === entryForm.creditAccountId);

    return {
      debitAccount,
      creditAccount,
      amount: Number(entryForm.amount || 0),
    };
  }, [accounts, entryForm.debitAccountId, entryForm.creditAccountId, entryForm.amount]);

  if (!canView) {
    return (
      <div className="card" style={{ padding: '28px' }}>
        <h2
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 800,
            color: 'var(--text-main, #0f172a)',
          }}
        >
          Accounts & Ledger
        </h2>
        <p style={{ marginTop: '10px', color: 'var(--text-muted, #64748b)' }}>
          You're not eligible to access this page.
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '10px' }}>
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
            <BookOpen size={30} color="#2d3a8c" /> Accounts & Ledger
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-muted, #64748b)',
              marginTop: '8px',
              lineHeight: 1.6,
              maxWidth: '860px',
            }}
          >
            Manage the chart of accounts, create journal-style ledger entries,
            monitor balances, review statements, analyze trial balance and export professional reports.
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
          Finance Workspace
        </div>
      </div>

      {toast ? (
        <div
          style={{
            marginBottom: '16px',
            padding: '14px 16px',
            borderRadius: '16px',
            background: toast.type === 'error' ? 'var(--bg-card, #ffffff)1f2' : '#f0fdf4',
            color: toast.type === 'error' ? '#be123c' : '#166534',
            border: `1px solid ${
              toast.type === 'error' ? '#fecdd3' : '#bbf7d0'
            }`,
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          {toast.message}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginBottom: '16px',
            padding: '14px 16px',
            borderRadius: '16px',
            background: 'var(--bg-card, #ffffff)7ed',
            color: '#9a3412',
            border: '1px solid #fed7aa',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        className="card"
        style={{
          padding: '18px',
          borderRadius: '22px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={fieldLabelStyle}>Account Search</label>
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
                value={accountSearchInput}
                onChange={(e) => setAccountSearchInput(e.target.value)}
                placeholder="Search account code, name, parent"
                style={{
                  paddingLeft: '40px',
                  height: '48px',
                  borderRadius: '14px',
                }}
              />
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle}>Ledger Search</label>
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
                value={ledgerSearchInput}
                onChange={(e) => setLedgerSearchInput(e.target.value)}
                placeholder="Search reference, description, accounts"
                style={{
                  paddingLeft: '40px',
                  height: '48px',
                  borderRadius: '14px',
                }}
              />
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle}>Account Type</label>
            <select
              className="input-field"
              value={accountTypeFilter}
              onChange={(e) => setAccountTypeFilter(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                paddingLeft: '14px',
              }}
            >
              <option value="ALL">All Types</option>
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {friendlyType(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={fieldLabelStyle}>Ledger Entry Type</label>
            <select
              className="input-field"
              value={entryTypeFilter}
              onChange={(e) => setEntryTypeFilter(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                paddingLeft: '14px',
              }}
            >
              <option value="ALL">All Entries</option>
              {ENTRY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {friendlyType(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={fieldLabelStyle}>Statement Account</label>
            <select
              className="input-field"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                paddingLeft: '14px',
              }}
            >
              <option value="ALL">All Accounts</option>
              {enrichedAccounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.accountCode} - {item.accountName}
                </option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={fieldLabelStyle}>Date Range</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {DATE_PRESETS.map((preset) => (
                <FilterChip
                  key={preset.key}
                  active={datePreset === preset.key}
                  onClick={() => applyDatePreset(preset.key)}
                >
                  {preset.label}
                </FilterChip>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    className="input-field"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setDatePreset('CUSTOM');
                    }}
                    style={{
                      height: '48px',
                      borderRadius: '14px',
                      paddingLeft: '14px',
                      paddingRight: '40px',
                    }}
                  />
                  <CalendarDays
                    size={14}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted, #64748b)',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    className="input-field"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setDatePreset('CUSTOM');
                    }}
                    style={{
                      height: '48px',
                      borderRadius: '14px',
                      paddingLeft: '14px',
                      paddingRight: '40px',
                    }}
                  />
                  <CalendarDays
                    size={14}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted, #64748b)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: '14px',
            padding: '12px 14px',
            borderRadius: '14px',
            background: 'var(--bg-card-soft, #f8fafc)',
            color: 'var(--text-muted, #475569)',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
            fontWeight: 700,
            lineHeight: 1.7,
          }}
        >
          {filterSummaryText}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            marginTop: '16px',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={refreshData}
              disabled={loading}
            >
              <RefreshCw size={16} /> {loading ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleExport}
              disabled={downloading || loading}
            >
              <FileDown size={16} /> {downloading ? 'Exporting...' : 'Export PDF'}
            </button>

            {selectedAccount ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleExportSelectedStatement}
                disabled={loading || statementLoading}
              >
                <FileSpreadsheet size={16} /> Export Statement
              </button>
            ) : null}

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setAccountSearchInput('');
                setLedgerSearchInput('');
                setAccountSearch('');
                setLedgerSearch('');
                setAccountTypeFilter('ALL');
                setEntryTypeFilter('ALL');
                setFromDate('');
                setToDate('');
                setDatePreset('ALL');
                setSelectedAccountId('ALL');
              }}
            >
              <Filter size={16} /> Clear Filters
            </button>
          </div>

          {canManage ? (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={openCreateLedger}
              >
                <Receipt size={16} /> New Ledger Entry
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={openCreateAccount}
              >
                <Plus size={16} /> New Account
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <StatCard
          title="Total Accounts"
          value={loading ? '...' : formatNumber(summary.totalAccounts)}
          sub={`${formatNumber(summary.activeAccounts)} active in chart of accounts`}
          icon={Wallet}
          color="#2d3a8c"
        />
        <StatCard
          title="Assets"
          value={loading ? '...' : formatCurrency(summary.assetTotal)}
          sub="Current balance across asset accounts"
          icon={Landmark}
          color="#2563eb"
        />
        <StatCard
          title="Liabilities"
          value={loading ? '...' : formatCurrency(summary.liabilityTotal)}
          sub="Current balance across liability accounts"
          icon={ArrowDownLeft}
          color="#dc2626"
        />
        <StatCard
          title="Debit Total"
          value={loading ? '...' : formatCurrency(summary.debitTotal)}
          sub="Visible ledger debit amount"
          icon={ArrowUpRight}
          color="#16a34a"
        />
        <StatCard
          title="Credit Total"
          value={loading ? '...' : formatCurrency(summary.creditTotal)}
          sub="Visible ledger credit amount"
          icon={ArrowDownLeft}
          color="#d97706"
        />
        <StatCard
          title="Profit / Loss"
          value={loading ? '...' : formatCurrency(summary.profitLoss)}
          sub="Income balance minus expense balance"
          icon={BarChart3}
          color="#7c3aed"
        />
      </div>

      {selectedAccount && selectedAccountStatementSummary ? (
        <div
          className="card"
          style={{
            padding: '18px',
            borderRadius: '22px',
            marginBottom: '20px',
            background: 'linear-gradient(135deg, #f8fbff 0%, #eef2ff 100%)',
            border: '1px solid #dbeafe',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase' }}>
                Selected Account Statement Summary
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>
                {selectedAccount.accountCode} - {selectedAccount.accountName}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
                Parent: {selectedAccount.parentAccountCode !== '-' ? `${selectedAccount.parentAccountCode} - ${selectedAccount.parentAccountName}` : 'No Parent'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <TypePill text={selectedAccount.accountType} />
              <StatusPill active={Boolean(selectedAccount.active)} />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              marginTop: '16px',
            }}
          >
            <MiniInfoCard label="Opening Balance" value={formatCurrency(selectedAccountStatementSummary.openingBalance)} />
            <MiniInfoCard label="Debit Movement" value={formatCurrency(selectedAccountStatementSummary.debitTotal)} valueColor="#166534" />
            <MiniInfoCard label="Credit Movement" value={formatCurrency(selectedAccountStatementSummary.creditTotal)} valueColor="#b45309" />
            <MiniInfoCard label="Net Movement" value={formatCurrency(selectedAccountStatementSummary.netMovement)} valueColor={amountColor(selectedAccountStatementSummary.netMovement)} />
            <MiniInfoCard label="Current Balance" value={formatCurrency(selectedAccountStatementSummary.currentBalance)} valueColor={amountColor(selectedAccountStatementSummary.currentBalance)} />
            <MiniInfoCard label="Statement Entries" value={formatNumber(selectedAccountStatementSummary.entryCount)} />
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.45fr 1fr',
          gap: '18px',
          marginBottom: '20px',
        }}
      >
        <DataTable
          title="Chart of Accounts"
          subtitle={`${formatNumber(filteredAccounts.length)} account(s) shown`}
          columns={accountColumns}
          rows={filteredAccounts}
          emptyTitle="No accounts found"
          emptySubtitle="Try changing filters or create a new account."
          rowKey={(row) => row.id}
          getRowStyle={(row, rowIndex) => ({
            background:
              selectedAccountId === row.id
                ? '#eef2ff'
                : rowIndex % 2 === 0
                ? 'var(--bg-card, var(--bg-card, #ffffff)fff)'
                : 'var(--bg-table-row, #fbfdff)',
            boxShadow:
              selectedAccountId === row.id
                ? 'inset 3px 0 0 #4f46e5'
                : 'none',
          })}
          headerAction={
            selectedAccount ? (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#2d3a8c',
                    background: '#eef2ff',
                    borderRadius: '999px',
                    padding: '8px 12px',
                  }}
                >
                  Viewing: {selectedAccount.accountCode} - {selectedAccount.accountName}
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '12px' }}
                  onClick={() => setSelectedAccountId('ALL')}
                >
                  Reset View
                </button>
              </div>
            ) : null
          }
        />

        <div className="card" style={{ borderRadius: '22px', overflow: 'hidden' }}>
          <div
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid #eef2f7',
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
              Balance by Account Type
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
              Financial grouping from the current chart of accounts
            </div>
          </div>

          <div style={{ padding: '18px' }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              {accountBreakdown.map((item) => (
                <div
                  key={item.type}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    background: 'var(--bg-table-row, #fbfdff)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <TypePill text={item.type} />
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted, #64748b)',
                        fontWeight: 700,
                      }}
                    >
                      {formatNumber(item.count)} account(s)
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: '10px',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: amountColor(item.total),
                    }}
                  >
                    {formatCurrency(item.total)}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                borderRadius: '18px',
                background: 'var(--bg-card-soft, #f8fafc)',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase' }}>
                Quick Financial Health
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 700 }}>Net Position</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: amountColor(summary.netPosition), marginTop: '4px' }}>
                    {formatCurrency(summary.netPosition)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 700 }}>Profit / Loss</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: amountColor(summary.profitLoss), marginTop: '4px' }}>
                    {formatCurrency(summary.profitLoss)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <DataTable
          title="Trial Balance"
          subtitle="Client-side trial balance view based on current balances"
          columns={trialBalanceColumns}
          rows={trialBalanceRows}
          emptyTitle="No trial balance rows"
          emptySubtitle="No balances available for the current account filters."
          headerAction={
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#166534',
                  fontWeight: 800,
                  background: '#ecfdf5',
                  padding: '8px 12px',
                  borderRadius: '999px',
                }}
              >
                Total Debit: {formatCurrency(trialBalanceTotals.debit)}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#b45309',
                  fontWeight: 800,
                  background: 'var(--bg-card, #ffffff)7ed',
                  padding: '8px 12px',
                  borderRadius: '999px',
                }}
              >
                Total Credit: {formatCurrency(trialBalanceTotals.credit)}
              </div>
            </div>
          }
          rowKey={(row) => row.id}
        />
      </div>

      <div ref={ledgerSectionRef}>
        <DataTable
          title={
            selectedAccount
              ? `Account Statement${statementLoading ? ' • Loading...' : ''}`
              : 'Ledger Entries'
          }
          subtitle={
            selectedAccount
              ? 'Statement for the selected account'
              : 'Recent accounting entries across all accounts'
          }
          columns={ledgerColumns}
          rows={filteredLedgerRows}
          emptyTitle="No ledger entries found"
          emptySubtitle="Create a ledger entry or change your filters."
          headerAction={
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              {selectedAccount ? (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#2d3a8c',
                    fontWeight: 800,
                    background: '#eef2ff',
                    padding: '8px 12px',
                    borderRadius: '999px',
                  }}
                >
                  {selectedAccount.accountCode} • {selectedAccount.accountName}
                </div>
              ) : null}
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted, #64748b)',
                  fontWeight: 800,
                }}
              >
                {formatNumber(filteredLedgerRows.length)} row(s)
              </div>
            </div>
          }
        />
      </div>

      <Modal
        open={showAccountModal}
        title={editingAccount ? 'Edit Account' : 'Create Account'}
        onClose={closeAccountModal}
      >
        <form onSubmit={handleSaveAccount}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            <div>
              <label style={fieldLabelStyle}>Account Code</label>
              <input
                className="input-field"
                value={accountForm.accountCode}
                onChange={(e) =>
                  setAccountForm((prev) => ({
                    ...prev,
                    accountCode: e.target.value,
                  }))
                }
                placeholder="CASH"
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  paddingLeft: '14px',
                }}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>Account Name</label>
              <input
                className="input-field"
                value={accountForm.accountName}
                onChange={(e) =>
                  setAccountForm((prev) => ({
                    ...prev,
                    accountName: e.target.value,
                  }))
                }
                placeholder="Cash in Hand"
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  paddingLeft: '14px',
                }}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>Account Type</label>
              <select
                className="input-field"
                value={accountForm.accountType}
                onChange={(e) =>
                  setAccountForm((prev) => ({
                    ...prev,
                    accountType: e.target.value,
                  }))
                }
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  paddingLeft: '14px',
                }}
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {friendlyType(type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={fieldLabelStyle}>Parent Account (Optional)</label>
              <select
                className="input-field"
                value={accountForm.parentAccountId}
                onChange={(e) =>
                  setAccountForm((prev) => ({
                    ...prev,
                    parentAccountId: e.target.value,
                  }))
                }
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  paddingLeft: '14px',
                }}
              >
                <option value="">No Parent</option>
                {enrichedAccounts
                  .filter((item) => item.id !== editingAccount?.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.accountCode} - {item.accountName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label style={fieldLabelStyle}>Opening Balance</label>
              <input
                type="number"
                className="input-field"
                value={accountForm.openingBalance}
                onChange={(e) =>
                  setAccountForm((prev) => ({
                    ...prev,
                    openingBalance: e.target.value,
                  }))
                }
                placeholder="0"
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  paddingLeft: '14px',
                }}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>Status</label>
              <select
                className="input-field"
                value={accountForm.active ? 'true' : 'false'}
                onChange={(e) =>
                  setAccountForm((prev) => ({
                    ...prev,
                    active: e.target.value === 'true',
                  }))
                }
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  paddingLeft: '14px',
                }}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          {formError ? (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'var(--bg-card, #ffffff)1f2',
                color: '#be123c',
                border: '1px solid #fecdd3',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              {formError}
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '18px',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={closeAccountModal}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting
                ? 'Saving...'
                : editingAccount
                ? 'Update Account'
                : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showLedgerModal}
        title="Create Ledger Entry"
        onClose={closeLedgerModal}
      >
        <form onSubmit={handleCreateLedger}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            <div>
              <label style={fieldLabelStyle}>Transaction Date</label>
              <input
                type="datetime-local"
                className="input-field"
                value={entryForm.transactionDate}
                onChange={(e) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    transactionDate: e.target.value,
                  }))
                }
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  paddingLeft: '14px',
                }}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>Entry Type</label>
              <select
                className="input-field"
                value={entryForm.entryType}
                onChange={(e) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    entryType: e.target.value,
                  }))
                }
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  paddingLeft: '14px',
                }}
              >
                {ENTRY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {friendlyType(type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={fieldLabelStyle}>Reference Type</label>
              <input
                className="input-field"
                value={entryForm.referenceType}
                onChange={(e) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    referenceType: e.target.value,
                  }))
                }
                placeholder="MANUAL_ENTRY"
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  paddingLeft: '14px',
                }}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>Reference ID</label>
              <input
                className="input-field"
                value={entryForm.referenceId}
                onChange={(e) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    referenceId: e.target.value,
                  }))
                }
                placeholder="JV-0001"
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  paddingLeft: '14px',
                }}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>Debit Account</label>
              <select
                className="input-field"
                value={entryForm.debitAccountId}
                onChange={(e) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    debitAccountId: e.target.value,
                  }))
                }
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  paddingLeft: '14px',
                }}
              >
                <option value="">Select debit account</option>
                {accounts
                  .filter((item) => item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.accountCode} - {item.accountName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label style={fieldLabelStyle}>Credit Account</label>
              <select
                className="input-field"
                value={entryForm.creditAccountId}
                onChange={(e) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    creditAccountId: e.target.value,
                  }))
                }
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  paddingLeft: '14px',
                }}
              >
                <option value="">Select credit account</option>
                {accounts
                  .filter((item) => item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.accountCode} - {item.accountName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label style={fieldLabelStyle}>Amount</label>
              <div style={{ position: 'relative' }}>
                <IndianRupee
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted, #64748b)',
                  }}
                />
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={entryForm.amount}
                  onChange={(e) =>
                    setEntryForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  style={{
                    height: '48px',
                    borderRadius: '14px',
                    paddingLeft: '36px',
                  }}
                />
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabelStyle}>Description</label>
              <textarea
                className="input-field"
                value={entryForm.description}
                onChange={(e) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Narration for the entry"
                rows={4}
                style={{
                  paddingLeft: '14px',
                  minHeight: '110px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '14px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              background: 'var(--bg-card-soft, #f8fafc)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
              Journal Preview
            </div>
            <div style={{ marginTop: '10px', display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#166534' }}>
                  Debit: {journalPreview.debitAccount ? `${journalPreview.debitAccount.accountCode} - ${journalPreview.debitAccount.accountName}` : 'Not selected'}
                </span>
                <span style={{ fontWeight: 800 }}>{formatCurrency(journalPreview.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#b45309' }}>
                  Credit: {journalPreview.creditAccount ? `${journalPreview.creditAccount.accountCode} - ${journalPreview.creditAccount.accountName}` : 'Not selected'}
                </span>
                <span style={{ fontWeight: 800 }}>{formatCurrency(journalPreview.amount)}</span>
              </div>
            </div>
          </div>

          {formError ? (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'var(--bg-card, #ffffff)1f2',
                color: '#be123c',
                border: '1px solid #fecdd3',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              {formError}
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '18px',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={closeLedgerModal}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Create Entry'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showLedgerDetailModal}
        title="Ledger Entry Details"
        onClose={closeLedgerDetailModal}
        width="700px"
      >
        {viewingLedgerRow ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'var(--bg-card-soft, #f8fafc)',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
                <DetailItem label="Transaction Date" value={formatDateTime(viewingLedgerRow.transactionDate)} />
                <DetailItem label="Entry Type" value={friendlyType(viewingLedgerRow.entryType)} />
                <DetailItem label="Reference Type" value={viewingLedgerRow.referenceType || '-'} />
                <DetailItem label="Reference ID" value={viewingLedgerRow.referenceId || '-'} />
                <DetailItem label="Debit Account" value={viewingLedgerRow.debitAccountName || '-'} />
                <DetailItem label="Credit Account" value={viewingLedgerRow.creditAccountName || '-'} />
                <DetailItem label="Amount" value={formatCurrency(viewingLedgerRow.amount)} />
                <DetailItem label="Created At" value={formatDateTime(viewingLedgerRow.createdAt)} />
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'var(--bg-card, var(--bg-card, #ffffff)fff)',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
                Journal View
              </div>
              <div style={{ marginTop: '10px', display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#166534', fontWeight: 700 }}>
                    Debit: {viewingLedgerRow.debitAccountName || '-'}
                  </span>
                  <span style={{ fontWeight: 800 }}>{formatCurrency(viewingLedgerRow.amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#b45309', fontWeight: 700 }}>
                    Credit: {viewingLedgerRow.creditAccountName || '-'}
                  </span>
                  <span style={{ fontWeight: 800 }}>{formatCurrency(viewingLedgerRow.amount)}</span>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'var(--bg-card, var(--bg-card, #ffffff)fff)',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
                Description
              </div>
              <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-muted, #334155)', lineHeight: 1.7 }}>
                {viewingLedgerRow.description || 'No description provided.'}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={showDeleteModal}
        title="Delete Account"
        onClose={closeDeleteModal}
        width="520px"
      >
        <div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted, #475569)', lineHeight: 1.7 }}>
            Are you sure you want to delete
            <span style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              {' '}
              {accountToDelete?.accountCode} - {accountToDelete?.accountName}
            </span>
            ?
          </p>

          <div
            style={{
              marginTop: '12px',
              padding: '12px 14px',
              borderRadius: '14px',
              background: 'var(--bg-card, #ffffff)7ed',
              color: '#9a3412',
              border: '1px solid #fed7aa',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            Note: the backend will block deletion if ledger entries are already
            linked to this account. Deactivate is usually safer than delete.
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '18px',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={closeDeleteModal}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDeleteAccount}
              disabled={submitting}
              style={{
                color: '#b91c1c',
                borderColor: '#fecaca',
                background: 'var(--bg-card, #ffffff)5f5',
              }}
            >
              {submitting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MiniInfoCard({ label, value, valueColor = 'var(--text-main, #0f172a)' }) {
  return (
    <div
      style={{
        padding: '14px',
        borderRadius: '16px',
        background: 'var(--bg-card, var(--bg-card, #ffffff)fff)',
        border: '1px solid #dbeafe',
      }}
    >
      <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: '17px', fontWeight: 800, color: valueColor, marginTop: '6px' }}>
        {value}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '14px', color: 'var(--text-main, #0f172a)', fontWeight: 700, marginTop: '5px' }}>
        {value}
      </div>
    </div>
  );
}