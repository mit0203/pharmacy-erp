import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Truck,
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
  BadgeIndianRupee,
  ChevronLeft,
  ChevronRight,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  ShoppingCart,
  IndianRupee,
} from 'lucide-react';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchaseOrders,
} from '../api/services';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZES = [10, 20, 50];

const defaultForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  gstNumber: '',
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

function normalizeSupplierName(supplier) {
  return supplier?.name || supplier?.supplierName || '';
}

function normalizeSupplierPhone(supplier) {
  return supplier?.phone || supplier?.contactNumber || '';
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

export default function SuppliersPage() {
  const { hasAnyRole } = useAuth();

  const canView = hasAnyRole(['ADMIN', 'STORE_MANAGER']);
  const canManage = hasAnyRole(['ADMIN', 'STORE_MANAGER']);

  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
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

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [formError, setFormError] = useState('');

  const showToast = (type, message) => setToast({ type, message });

  const fetchSuppliers = useCallback(async () => {
    if (!canView) {
      setSuppliers([]);
      setLoading(false);
      setError("You're not eligible to access this page.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await getSuppliers({
        page,
        size: pageSize,
        search: search.trim() || undefined,
      });

      const data = res?.data?.data;
      const list = Array.isArray(data) ? data : data?.content || [];

      setSuppliers(list);
      setTotalElements(data?.totalElements ?? list.length ?? 0);
      setTotalPages(data?.totalPages ?? (list.length > 0 ? 1 : 0));
    } catch (e) {
      console.error(e);
      setSuppliers([]);
      setTotalElements(0);
      setTotalPages(0);
      setError(e?.response?.data?.message || 'Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  }, [canView, page, pageSize, search]);

  const fetchPurchaseOrders = useCallback(async () => {
    if (!canView) return;

    setPurchaseLoading(true);
    try {
      const res = await getPurchaseOrders({
        page: 0,
        size: 500,
      });
      const data = res?.data?.data;
      const list = Array.isArray(data) ? data : data?.content || [];
      setPurchaseOrders(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to load purchases for supplier analytics:', e);
      setPurchaseOrders([]);
    } finally {
      setPurchaseLoading(false);
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
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const supplierPurchaseMap = useMemo(() => {
    const map = {};

    purchaseOrders.forEach((order) => {
      const supplierId = order?.supplierId;
      if (!supplierId) return;

      if (!map[supplierId]) {
        map[supplierId] = {
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

      map[supplierId].totalOrders += 1;
      map[supplierId].totalAmount += totalAmount;
      map[supplierId].totalPaid += amountPaid;
      map[supplierId].totalDue += amountDue;

      const orderDate = order?.orderDate || order?.createdAt;
      if (
        orderDate &&
        (!map[supplierId].lastOrderDate ||
          new Date(orderDate) > new Date(map[supplierId].lastOrderDate))
      ) {
        map[supplierId].lastOrderDate = orderDate;
      }
    });

    return map;
  }, [purchaseOrders]);

  const enhancedSuppliers = useMemo(() => {
    return suppliers.map((supplier) => {
      const stats = supplierPurchaseMap[supplier.id] || {
        totalOrders: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0,
        lastOrderDate: null,
      };

      return {
        ...supplier,
        purchaseStats: stats,
      };
    });
  }, [suppliers, supplierPurchaseMap]);

  const filteredSuppliers = useMemo(() => {
    return enhancedSuppliers.filter((supplier) => {
      const statusOk =
        statusFilter === 'ALL' || (supplier?.status || 'ACTIVE') === statusFilter;

      const dueValue = Number(supplier?.purchaseStats?.totalDue || 0);
      const dueOk =
        dueFilter === 'ALL' ||
        (dueFilter === 'WITH_DUE' && dueValue > 0) ||
        (dueFilter === 'NO_DUE' && dueValue <= 0);

      return statusOk && dueOk;
    });
  }, [enhancedSuppliers, statusFilter, dueFilter]);

  const totalSuppliersCount = totalElements;
  const activeSuppliersCount = enhancedSuppliers.filter(
    (s) => (s?.status || 'ACTIVE') === 'ACTIVE'
  ).length;
  const inactiveSuppliersCount = enhancedSuppliers.filter(
    (s) => (s?.status || 'ACTIVE') === 'INACTIVE'
  ).length;
  const outstandingTotal = enhancedSuppliers.reduce(
    (sum, s) => sum + Number(s?.purchaseStats?.totalDue || 0),
    0
  );

  const topSupplier = useMemo(() => {
    if (!enhancedSuppliers.length) return null;
    return [...enhancedSuppliers].sort(
      (a, b) =>
        Number(b?.purchaseStats?.totalAmount || 0) -
        Number(a?.purchaseStats?.totalAmount || 0)
    )[0];
  }, [enhancedSuppliers]);

  const openCreateModal = () => {
    if (!canManage) return;
    setEditingSupplier(null);
    setFormData(defaultForm);
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (supplier) => {
    if (!canManage) return;

    setEditingSupplier(supplier);
    setFormData({
      name: supplier?.name || supplier?.supplierName || '',
      phone: supplier?.phone || supplier?.contactNumber || '',
      email: supplier?.email || '',
      address: supplier?.address || '',
      gstNumber: supplier?.gstNumber || '',
      status: supplier?.status || 'ACTIVE',
    });
    setFormError('');
    setShowFormModal(true);
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Supplier name is required.';
    if (!formData.phone.trim()) return 'Phone number is required.';
    if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
      return 'Phone number must be 10 digits.';
    }
    if (!formData.gstNumber.trim()) return 'GST Number is required.';

    const gstValue = formData.gstNumber.trim().toUpperCase();
    if (gstValue.length !== 15) {
      return 'GST Number must be 15 characters.';
    }

    if (formData.email.trim()) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
      if (!emailOk) return 'Please enter a valid email address.';
    }

    const duplicatePhone = suppliers.find(
      (supplier) =>
        normalizeSupplierPhone(supplier) === formData.phone.trim() &&
        supplier.id !== editingSupplier?.id
    );

    if (duplicatePhone) return 'This phone number already exists.';

    const duplicateEmail = formData.email.trim()
      ? suppliers.find(
          (supplier) =>
            String(supplier?.email || '').trim().toLowerCase() ===
              formData.email.trim().toLowerCase() &&
            supplier.id !== editingSupplier?.id
        )
      : null;

    if (duplicateEmail) return 'This email already exists.';

    const duplicateGst = suppliers.find(
      (supplier) =>
        String(supplier?.gstNumber || '').trim().toUpperCase() === gstValue &&
        supplier.id !== editingSupplier?.id
    );

    if (duplicateGst) return 'This GST Number already exists.';

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canManage) {
      setFormError("You're not allowed to manage suppliers.");
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
      gstNumber: formData.gstNumber.trim().toUpperCase(),
      status: formData.status,
    };

    try {
      if (editingSupplier?.id) {
        await updateSupplier(editingSupplier.id, payload);
        showToast('success', 'Supplier updated successfully.');
      } else {
        await createSupplier(payload);
        showToast('success', 'Supplier created successfully.');
      }

      setShowFormModal(false);
      setEditingSupplier(null);
      setFormData(defaultForm);
      setPage(0);
      await fetchSuppliers();
      await fetchPurchaseOrders();
    } catch (e2) {
      console.error(e2);
      setFormError(
        e2?.response?.data?.message || 'Create or update supplier failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canManage) {
      showToast('error', "You're not allowed to delete suppliers.");
      return;
    }

    if (!selectedSupplier?.id) return;

    setSubmitting(true);

    try {
      await deleteSupplier(selectedSupplier.id);
      showToast('success', 'Supplier deleted successfully.');
      setShowDeleteModal(false);
      setSelectedSupplier(null);

      if (filteredSuppliers.length === 1 && page > 0) {
        setPage((prev) => prev - 1);
      } else {
        await fetchSuppliers();
        await fetchPurchaseOrders();
      }
    } catch (e) {
      console.error(e);
      showToast(
        'error',
        e?.response?.data?.message || 'Delete supplier failed.'
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
            <Truck size={28} color="#2d3a8c" /> Suppliers
          </h1>
          <p style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
            Manage supplier records, contact details and purchase relationships.
          </p>
        </div>

        {canManage && (
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add Supplier
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
          title="Total Suppliers"
          value={formatNumber(totalSuppliersCount)}
          sub="All supplier records"
          icon={Truck}
          color="#2d3a8c"
        />
        <StatCard
          title="Active Suppliers"
          value={formatNumber(activeSuppliersCount)}
          sub={`Inactive: ${formatNumber(inactiveSuppliersCount)}`}
          icon={ShieldCheck}
          color="#16a34a"
        />
        <StatCard
          title="Outstanding Due"
          value={formatCurrency(outstandingTotal)}
          sub="Due from visible page suppliers"
          icon={Wallet}
          color="#dc2626"
        />
        <StatCard
          title="Top Supplier"
          value={topSupplier ? normalizeSupplierName(topSupplier) : '-'}
          sub={
            topSupplier
              ? `Purchase: ${formatCurrency(topSupplier?.purchaseStats?.totalAmount)}`
              : 'No purchase data yet'
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
            placeholder="Search suppliers by name, phone, GST, email..."
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

        <button className="btn-secondary" onClick={() => { fetchSuppliers(); fetchPurchaseOrders(); }}>
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
            Loading suppliers...
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div style={{ padding: '44px', textAlign: 'center' }}>
            <Truck size={46} color="#c1c9e0" />
            <h3 style={{ color: '#718096', marginTop: '14px', fontWeight: '700' }}>
              {search || statusFilter !== 'ALL' || dueFilter !== 'ALL'
                ? 'No matching suppliers found'
                : 'No suppliers found'}
            </h3>
            <p style={{ color: '#a0aec0', fontSize: '13px', marginTop: '6px' }}>
              {search || statusFilter !== 'ALL' || dueFilter !== 'ALL'
                ? 'Try changing search or filter values.'
                : 'Add your first supplier to get started.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: '1380px',
                borderCollapse: 'separate',
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr style={{ background: 'var(--bg-card-soft, #f8fafc)' }}>
                  <th style={th}>Name</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Email</th>
                  <th style={th}>GST</th>
                  <th style={th}>Orders</th>
                  <th style={th}>Purchases</th>
                  <th style={th}>Paid</th>
                  <th style={th}>Due</th>
                  <th style={th}>Status</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => {
                  const stats = supplier?.purchaseStats || {};
                  const dueValue = Number(stats.totalDue || 0);

                  return (
                    <tr key={supplier.id}>
                      <td style={tdStrong}>{normalizeSupplierName(supplier) || '-'}</td>
                      <td style={td}>{normalizeSupplierPhone(supplier) || '-'}</td>
                      <td style={td}>{supplier?.email || '-'}</td>
                      <td style={td}>{supplier?.gstNumber || '-'}</td>
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
                              supplier?.status === 'INACTIVE' ? '#dc2626' : '#16a34a',
                          }}
                        >
                          {supplier?.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            className="btn-secondary"
                            style={smallBtn}
                            onClick={() => {
                              setSelectedSupplier(supplier);
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
                                onClick={() => openEditModal(supplier)}
                              >
                                <Pencil size={14} /> Edit
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ ...smallBtn, color: '#dc2626' }}
                                onClick={() => {
                                  setSelectedSupplier(supplier);
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

        {!loading && filteredSuppliers.length > 0 && (
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
              Showing <strong>{filteredSuppliers.length}</strong> records on page{' '}
              <strong>{page + 1}</strong> of <strong>{totalPages || 1}</strong> • Total{' '}
              <strong>{totalElements}</strong>
              {purchaseLoading ? ' • Updating purchase analytics...' : ''}
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
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
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
              <label style={label}>GST Number</label>
              <input
                className="input-field"
                value={formData.gstNumber}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    gstNumber: e.target.value.toUpperCase(),
                  }))
                }
                style={{ width: '100%' }}
                maxLength={15}
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
                : editingSupplier
                ? 'Update Supplier'
                : 'Create Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showViewModal}
        title="Supplier Details"
        onClose={() => setShowViewModal(false)}
        width="620px"
      >
        {selectedSupplier && (
          <div style={{ display: 'grid', gap: '18px' }}>
            <div style={{ display: 'grid', gap: '14px' }}>
              <DetailRow
                icon={Truck}
                label="Supplier Name"
                value={normalizeSupplierName(selectedSupplier)}
              />
              <DetailRow
                icon={Phone}
                label="Phone"
                value={normalizeSupplierPhone(selectedSupplier)}
              />
              <DetailRow icon={Mail} label="Email" value={selectedSupplier?.email} />
              <DetailRow
                icon={BadgeIndianRupee}
                label="GST Number"
                value={selectedSupplier?.gstNumber}
              />
              <DetailRow icon={MapPin} label="Address" value={selectedSupplier?.address} />
              <DetailRow
                icon={Truck}
                label="Status"
                value={selectedSupplier?.status || 'ACTIVE'}
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
                value={formatNumber(selectedSupplier?.purchaseStats?.totalOrders || 0)}
              />
              <DetailRow
                icon={IndianRupee}
                label="Total Purchases"
                value={formatCurrency(selectedSupplier?.purchaseStats?.totalAmount || 0)}
              />
              <DetailRow
                icon={ShieldCheck}
                label="Total Paid"
                value={formatCurrency(selectedSupplier?.purchaseStats?.totalPaid || 0)}
              />
              <DetailRow
                icon={AlertTriangle}
                label="Outstanding Due"
                value={formatCurrency(selectedSupplier?.purchaseStats?.totalDue || 0)}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showDeleteModal}
        title="Delete Supplier"
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
            {selectedSupplier?.name || selectedSupplier?.supplierName || 'this supplier'}
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
          If this supplier is linked to purchase orders, backend may block deletion.
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