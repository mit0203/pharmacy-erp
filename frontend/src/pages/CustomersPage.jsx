import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  X,
  Pencil,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getSalesOrders,
} from '../api/services';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZES = [10, 20, 50];

const defaultForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  status: 'ACTIVE',
};

function formatCurrency(value) {
  const num = Number(value || 0);
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function normalizeCustomerName(customer) {
  return customer?.name || customer?.customerName || '';
}

function normalizeCustomerPhone(customer) {
  return customer?.phone || customer?.contactNumber || '';
}

function Modal({ open, title, onClose, children, width = '700px' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted || !open) return null;

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

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <Icon size={16} color="var(--text-muted, #64748b)" style={{ marginTop: '2px' }} />
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 700 }}>
          {label}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-main, #111827)', fontWeight: 600 }}>
          {value || '-'}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, color = '#2d3a8c' }) {
  return (
    <div
      className="card"
      style={{
        padding: '18px',
        borderRadius: '18px',
        minHeight: '118px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted, #64748b)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.45px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: '10px',
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--text-main, #111827)',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            {value}
          </div>
          {sub ? (
            <div
              style={{
                marginTop: '7px',
                fontSize: '12px',
                color: 'var(--text-soft, #94a3b8)',
                lineHeight: 1.5,
              }}
            >
              {sub}
            </div>
          ) : null}
        </div>

        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: `${color}12`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} color={color} />
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { hasAnyRole } = useAuth();

  const canView = hasAnyRole(['ADMIN', 'STORE_MANAGER', 'PHARMACIST']);
  const canManage = hasAnyRole(['ADMIN', 'STORE_MANAGER']);

  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dueFilter, setDueFilter] = useState('ALL');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [formError, setFormError] = useState('');

  const showToast = (type, message) => setToast({ type, message });

  const fetchCustomers = useCallback(async () => {
    if (!canView) {
      setCustomers([]);
      setLoading(false);
      setError("You're not eligible to access this page.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await getCustomers({
        page,
        size: pageSize,
        search: search.trim() || undefined,
      });

      const data = res?.data?.data;
      const list = Array.isArray(data) ? data : data?.content || [];

      setCustomers(list);
      setTotalElements(data?.totalElements ?? list.length ?? 0);
      setTotalPages(data?.totalPages ?? (list.length > 0 ? 1 : 0));
    } catch (e) {
      console.error(e);
      setCustomers([]);
      setTotalElements(0);
      setTotalPages(0);
      setError(e?.response?.data?.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [canView, page, pageSize, search]);

  const fetchSalesOrders = useCallback(async () => {
    if (!canView) return;

    setSalesLoading(true);
    try {
      const res = await getSalesOrders({
        page: 0,
        size: 500,
      });
      const data = res?.data?.data;
      const list = Array.isArray(data) ? data : data?.content || [];
      setSalesOrders(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to load sales for customer analytics:', e);
      setSalesOrders([]);
    } finally {
      setSalesLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      setSearch(searchInput.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchSalesOrders();
  }, [fetchSalesOrders]);

  const customerSalesMap = useMemo(() => {
    const map = {};

    salesOrders.forEach((order) => {
      const customerId = order?.customerId;
      if (!customerId) return;

      if (!map[customerId]) {
        map[customerId] = {
          totalOrders: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalDue: 0,
          lastOrderDate: null,
        };
      }

      const totalAmount = Number(order?.totalAmount || 0);
      const amountDue = Number(order?.amountDue || 0);
      const amountPaid = Math.max(totalAmount - amountDue, 0);

      map[customerId].totalOrders += 1;
      map[customerId].totalAmount += totalAmount;
      map[customerId].totalPaid += amountPaid;
      map[customerId].totalDue += amountDue;

      const orderDate = order?.orderDate || order?.createdAt;
      if (
        orderDate &&
        (!map[customerId].lastOrderDate ||
          new Date(orderDate) > new Date(map[customerId].lastOrderDate))
      ) {
        map[customerId].lastOrderDate = orderDate;
      }
    });

    return map;
  }, [salesOrders]);

  const enhancedCustomers = useMemo(() => {
    return customers.map((customer) => {
      const stats = customerSalesMap[customer.id] || {
        totalOrders: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0,
        lastOrderDate: null,
      };

      return {
        ...customer,
        salesStats: stats,
      };
    });
  }, [customers, customerSalesMap]);

  const filteredCustomers = useMemo(() => {
    return enhancedCustomers.filter((customer) => {
      const statusOk =
        statusFilter === 'ALL' || (customer?.status || 'ACTIVE') === statusFilter;

      const dueValue = Number(customer?.salesStats?.totalDue || 0);
      const dueOk =
        dueFilter === 'ALL' ||
        (dueFilter === 'WITH_DUE' && dueValue > 0) ||
        (dueFilter === 'NO_DUE' && dueValue <= 0);

      return statusOk && dueOk;
    });
  }, [enhancedCustomers, statusFilter, dueFilter]);

  const totalCustomersCount = totalElements;
  const activeCustomersCount = enhancedCustomers.filter(
    (c) => (c?.status || 'ACTIVE') === 'ACTIVE'
  ).length;
  const inactiveCustomersCount = enhancedCustomers.filter(
    (c) => (c?.status || 'ACTIVE') === 'INACTIVE'
  ).length;
  const outstandingTotal = enhancedCustomers.reduce(
    (sum, c) => sum + Number(c?.salesStats?.totalDue || 0),
    0
  );

  const topCustomer = useMemo(() => {
    if (!enhancedCustomers.length) return null;
    return [...enhancedCustomers].sort(
      (a, b) =>
        Number(b?.salesStats?.totalAmount || 0) -
        Number(a?.salesStats?.totalAmount || 0)
    )[0];
  }, [enhancedCustomers]);

  const openCreateModal = () => {
    if (!canManage) return;
    setEditingCustomer(null);
    setFormData(defaultForm);
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (customer) => {
    if (!canManage) return;

    setEditingCustomer(customer);
    setFormData({
      name: customer?.name || customer?.customerName || '',
      phone: customer?.phone || customer?.contactNumber || '',
      email: customer?.email || '',
      address: customer?.address || '',
      status: customer?.status || 'ACTIVE',
    });
    setFormError('');
    setShowFormModal(true);
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Customer name is required.';
    if (!formData.phone.trim()) return 'Phone number is required.';
    if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
      return 'Phone number must be 10 digits.';
    }

    if (formData.email.trim()) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
      if (!emailOk) return 'Please enter a valid email address.';
    }

    const duplicatePhone = customers.find(
      (customer) =>
        normalizeCustomerPhone(customer) === formData.phone.trim() &&
        customer.id !== editingCustomer?.id
    );

    if (duplicatePhone) return 'This phone number already exists.';

    const duplicateEmail = formData.email.trim()
      ? customers.find(
          (customer) =>
            String(customer?.email || '').trim().toLowerCase() ===
              formData.email.trim().toLowerCase() &&
            customer.id !== editingCustomer?.id
        )
      : null;

    if (duplicateEmail) return 'This email already exists.';

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canManage) {
      setFormError("You're not allowed to manage customers.");
      return;
    }

    const validation = validateForm();
    if (validation) {
      setFormError(validation);
      return;
    }

    setSubmitting(true);
    setFormError('');

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      address: formData.address.trim(),
      status: formData.status,
    };

    try {
      if (editingCustomer?.id) {
        await updateCustomer(editingCustomer.id, payload);
        showToast('success', 'Customer updated successfully.');
      } else {
        await createCustomer(payload);
        showToast('success', 'Customer created successfully.');
      }

      setShowFormModal(false);
      setEditingCustomer(null);
      setFormData(defaultForm);
      setPage(0);
      await fetchCustomers();
      await fetchSalesOrders();
    } catch (e2) {
      console.error(e2);
      setFormError(
        e2?.response?.data?.message || 'Create or update customer failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canManage) {
      showToast('error', "You're not allowed to delete customers.");
      return;
    }

    if (!selectedCustomer?.id) return;

    setSubmitting(true);

    try {
      await deleteCustomer(selectedCustomer.id);
      showToast('success', 'Customer deleted successfully.');
      setShowDeleteModal(false);
      setSelectedCustomer(null);

      if (filteredCustomers.length === 1 && page > 0) {
        setPage((prev) => prev - 1);
      } else {
        await fetchCustomers();
        await fetchSalesOrders();
      }
    } catch (e) {
      console.error(e);
      showToast(
        'error',
        e?.response?.data?.message || 'Delete customer failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) {
    return (
      <div
        className="card"
        style={{
          padding: '28px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ margin: 0, color: 'var(--text-main, #1f2937)' }}>Access Restricted</h2>
        <p style={{ marginTop: '10px', color: 'var(--text-muted, #64748b)' }}>
          You're not eligible to access this page.
        </p>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '18px',
            right: '18px',
            zIndex: 10000,
            color: 'var(--bg-card, #ffffff)',
            padding: '12px 16px',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.22)',
            fontSize: '14px',
            fontWeight: 700,
            maxWidth: '360px',
            background: toast.type === 'error' ? '#dc2626' : '#16a34a',
          }}
        >
          {toast.message}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: '800',
              color: '#1a202c',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: 0,
            }}
          >
            <Users size={28} color="#2d3a8c" /> Customers
          </h1>
          <p style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
            Manage customer records, contact details and sales relationships.
          </p>
        </div>

        {canManage && (
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add Customer
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '18px',
        }}
      >
        <StatCard
          title="Total Customers"
          value={formatNumber(totalCustomersCount)}
          sub="All customer records"
          icon={Users}
          color="#2d3a8c"
        />
        <StatCard
          title="Active Customers"
          value={formatNumber(activeCustomersCount)}
          sub={`Inactive: ${formatNumber(inactiveCustomersCount)}`}
          icon={ShieldCheck}
          color="#16a34a"
        />
        <StatCard
          title="Outstanding Due"
          value={formatCurrency(outstandingTotal)}
          sub="Due from visible page customers"
          icon={Wallet}
          color="#dc2626"
        />
        <StatCard
          title="Top Customer"
          value={topCustomer ? normalizeCustomerName(topCustomer) : '-'}
          sub={
            topCustomer
              ? `Sales: ${formatCurrency(topCustomer?.salesStats?.totalAmount)}`
              : 'No sales data yet'
          }
          icon={ShoppingCart}
          color="#7c3aed"
        />
      </div>

      <div
        className="card"
        style={{
          padding: '16px',
          marginBottom: '18px',
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1fr) 180px 180px 130px auto',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={16} color="var(--text-soft, #94a3b8)" />
          <input
            type="text"
            placeholder="Search customers by name, phone, email..."
            className="input-field"
            style={{ flex: 1 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <select
          className="input-field"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          style={{ width: '100%' }}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>

        <select
          className="input-field"
          value={dueFilter}
          onChange={(e) => {
            setDueFilter(e.target.value);
            setPage(0);
          }}
          style={{ width: '100%' }}
        >
          <option value="ALL">All Due Status</option>
          <option value="WITH_DUE">With Due</option>
          <option value="NO_DUE">No Due</option>
        </select>

        <select
          className="input-field"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          style={{ width: '100%' }}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>

        <button className="btn-secondary" onClick={() => { fetchCustomers(); fetchSalesOrders(); }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: '18px',
            padding: '14px 16px',
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#b91c1c',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#718096' }}>
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: '44px', textAlign: 'center' }}>
            <Users size={46} color="#c1c9e0" />
            <h3 style={{ color: '#718096', marginTop: '14px', fontWeight: '700' }}>
              {search || statusFilter !== 'ALL' || dueFilter !== 'ALL'
                ? 'No matching customers found'
                : 'No customers found'}
            </h3>
            <p style={{ color: '#a0aec0', fontSize: '13px', marginTop: '6px' }}>
              {search || statusFilter !== 'ALL' || dueFilter !== 'ALL'
                ? 'Try changing search or filter values.'
                : 'Add your first customer to get started.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: '1280px',
                borderCollapse: 'separate',
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr style={{ background: 'var(--bg-card-soft, #f8fafc)' }}>
                  <th style={th}>Name</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Email</th>
                  <th style={th}>Address</th>
                  <th style={th}>Orders</th>
                  <th style={th}>Sales</th>
                  <th style={th}>Paid</th>
                  <th style={th}>Due</th>
                  <th style={th}>Status</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const stats = customer?.salesStats || {};
                  const dueValue = Number(stats.totalDue || 0);

                  return (
                    <tr key={customer.id}>
                      <td style={tdStrong}>{normalizeCustomerName(customer) || '-'}</td>
                      <td style={td}>{normalizeCustomerPhone(customer) || '-'}</td>
                      <td style={td}>{customer?.email || '-'}</td>
                      <td style={td}>{customer?.address || '-'}</td>
                      <td style={td}>{formatNumber(stats.totalOrders || 0)}</td>
                      <td style={td}>{formatCurrency(stats.totalAmount || 0)}</td>
                      <td style={td}>{formatCurrency(stats.totalPaid || 0)}</td>
                      <td style={{ ...td, color: dueValue > 0 ? '#b91c1c' : '#166534', fontWeight: 700 }}>
                        {formatCurrency(dueValue)}
                      </td>
                      <td style={td}>
                        <span
                          style={{
                            padding: '5px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            color: 'var(--bg-card, #ffffff)',
                            fontWeight: 700,
                            background:
                              customer?.status === 'INACTIVE' ? '#dc2626' : '#16a34a',
                          }}
                        >
                          {customer?.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            className="btn-secondary"
                            style={smallBtn}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowViewModal(true);
                            }}
                          >
                            <Eye size={14} /> View
                          </button>

                          {canManage && (
                            <>
                              <button
                                className="btn-secondary"
                                style={smallBtn}
                                onClick={() => openEditModal(customer)}
                              >
                                <Pencil size={14} /> Edit
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ ...smallBtn, color: '#dc2626' }}
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setShowDeleteModal(true);
                                }}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredCustomers.length > 0 && (
          <div
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              borderTop: '1px solid #eef2f7',
            }}
          >
            <div style={{ fontSize: '13px', color: '#718096' }}>
              Showing <strong>{filteredCustomers.length}</strong> records on page{' '}
              <strong>{page + 1}</strong> of <strong>{totalPages || 1}</strong> • Total{' '}
              <strong>{totalElements}</strong>
              {salesLoading ? ' • Updating sales analytics...' : ''}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn-secondary"
                disabled={page === 0}
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                type="button"
              >
                <ChevronLeft size={16} />
              </button>

              <span
                style={{
                  fontSize: '13px',
                  color: '#4a5568',
                  minWidth: '120px',
                  textAlign: 'center',
                }}
              >
                Page {page + 1}{totalPages > 0 ? ` of ${totalPages}` : ''}
              </span>

              <button
                className="btn-secondary"
                disabled={totalPages === 0 || page >= totalPages - 1}
                onClick={() => setPage((prev) => prev + 1)}
                type="button"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={showFormModal}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        onClose={() => !submitting && setShowFormModal(false)}
      >
        <form onSubmit={handleSubmit}>
          <div style={grid}>
            <div>
              <label style={label}>Name</label>
              <input
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={label}>Phone</label>
              <input
                className="input-field"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                  }))
                }
                style={{ width: '100%' }}
                maxLength={10}
              />
            </div>

            <div>
              <label style={label}>Email</label>
              <input
                className="input-field"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={label}>Status</label>
              <select
                className="input-field"
                value={formData.status}
                onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                style={{ width: '100%' }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Address</label>
              <textarea
                className="input-field"
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                style={{ width: '100%', resize: 'vertical', paddingTop: '12px' }}
              />
            </div>
          </div>

          {formError && <div style={errorBox}>{formError}</div>}

          <div style={footer}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowFormModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting
                ? 'Saving...'
                : editingCustomer
                ? 'Update Customer'
                : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showViewModal}
        title="Customer Details"
        onClose={() => setShowViewModal(false)}
        width="620px"
      >
        {selectedCustomer && (
          <div style={{ display: 'grid', gap: '18px' }}>
            <div style={{ display: 'grid', gap: '14px' }}>
              <DetailRow
                icon={Users}
                label="Customer Name"
                value={normalizeCustomerName(selectedCustomer)}
              />
              <DetailRow
                icon={Phone}
                label="Phone"
                value={normalizeCustomerPhone(selectedCustomer)}
              />
              <DetailRow icon={Mail} label="Email" value={selectedCustomer?.email} />
              <DetailRow icon={MapPin} label="Address" value={selectedCustomer?.address} />
              <DetailRow
                icon={Users}
                label="Status"
                value={selectedCustomer?.status || 'ACTIVE'}
              />
            </div>

            <div
              style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '14px',
              }}
            >
              <DetailRow
                icon={ShoppingCart}
                label="Total Orders"
                value={formatNumber(selectedCustomer?.salesStats?.totalOrders || 0)}
              />
              <DetailRow
                icon={IndianRupee}
                label="Total Sales"
                value={formatCurrency(selectedCustomer?.salesStats?.totalAmount || 0)}
              />
              <DetailRow
                icon={ShieldCheck}
                label="Total Paid"
                value={formatCurrency(selectedCustomer?.salesStats?.totalPaid || 0)}
              />
              <DetailRow
                icon={AlertTriangle}
                label="Outstanding Due"
                value={formatCurrency(selectedCustomer?.salesStats?.totalDue || 0)}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showDeleteModal}
        title="Delete Customer"
        onClose={() => !submitting && setShowDeleteModal(false)}
        width="520px"
      >
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: 'var(--text-muted, #475569)',
            lineHeight: 1.6,
          }}
        >
          Are you sure you want to delete{' '}
          <strong>
            {selectedCustomer?.name || selectedCustomer?.customerName || 'this customer'}
          </strong>
          ?
        </p>

        <p
          style={{
            marginTop: '10px',
            fontSize: '12px',
            color: 'var(--text-soft, #94a3b8)',
            lineHeight: 1.6,
          }}
        >
          If this customer is linked to sales orders, backend may block deletion.
        </p>

        <div style={footer}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleDelete}
            disabled={submitting}
            style={{ background: '#dc2626', borderColor: '#dc2626' }}
          >
            {submitting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

const th = {
  textAlign: 'left',
  padding: '14px 16px',
  fontSize: '12px',
  fontWeight: 800,
  color: 'var(--text-muted, #64748b)',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  borderBottom: '1px solid #e2e8f0',
  whiteSpace: 'nowrap',
};

const td = {
  padding: '16px',
  fontSize: '14px',
  color: 'var(--text-main, #1f2937)',
  borderBottom: '1px solid var(--bg-card-soft, #f1f5f9)',
  verticalAlign: 'middle',
};

const tdStrong = {
  ...td,
  fontWeight: 700,
};

const smallBtn = {
  padding: '6px 10px',
  fontSize: '12px',
};

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '14px',
};

const label = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 800,
  color: 'var(--text-muted, #64748b)',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};

const footer = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
  marginTop: '20px',
  paddingTop: '16px',
  borderTop: '1px solid #e5e7eb',
};

const errorBox = {
  marginTop: '14px',
  padding: '12px 14px',
  borderRadius: '12px',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#b91c1c',
  fontSize: '13px',
  fontWeight: 600,
};