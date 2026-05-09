import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Plus,
  RefreshCw,
  Pill,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  ShieldCheck,
  IndianRupee,
} from 'lucide-react';
import {
  getMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} from '../api/services';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZES = [10, 20, 50];

const defaultFormData = {
  medicineName: '',
  brandName: '',
  category: '',
  sku: '',
  unitPrice: '',
  purchasePrice: '',
  minimumStockLevel: 20,
};

const getStockStatus = (stock, reorderLevel) => {
  const qty = Number(stock || 0);
  const min = Number(reorderLevel || 0);

  if (qty <= 0) {
    return {
      label: 'OUT OF STOCK',
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
    };
  }

  if (qty <= min) {
    return {
      label: 'LOW STOCK',
      color: '#d97706',
      bg: 'var(--bg-card, #ffffff)7ed',
      border: '#fed7aa',
    };
  }

  return {
    label: 'IN STOCK',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  };
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
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
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

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.56)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          background: 'var(--bg-card, var(--bg-card, #ffffff)fff)',
          borderRadius: '20px',
          boxShadow: '0 30px 80px rgba(2, 6, 23, 0.35)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #edf2f7',
            background: 'linear-gradient(180deg, var(--bg-card, var(--bg-card, #ffffff)fff) 0%, #fafbff 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: '800',
                color: '#1a202c',
                letterSpacing: '-0.3px',
              }}
            >
              {title}
            </h2>
          </div>

          <button onClick={onClose} type="button" style={closeBtnStyle}>
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            padding: '22px 24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function MedicinePage() {
  const { hasAnyRole } = useAuth();

  const canView = hasAnyRole(['ADMIN', 'STORE_MANAGER', 'PHARMACIST']);
  const canManage = hasAnyRole(['ADMIN', 'STORE_MANAGER']);

  const [allMedicines, setAllMedicines] = useState([]);
  const [visibleMedicines, setVisibleMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [toast, setToast] = useState(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [editingMedicine, setEditingMedicine] = useState(null);
  const [viewingMedicine, setViewingMedicine] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);

  const showToast = (type, message) => setToast({ type, message });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      setSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchMedicines = useCallback(async () => {
    if (!canView) {
      setAllMedicines([]);
      setVisibleMedicines([]);
      setLoading(false);
      setError("You're not eligible to access this page.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await getMedicines({
        page: 0,
        size: 1000,
      });

      const responseBody = res?.data;
      const pageData = responseBody?.data;

      let medicines = [];
      if (Array.isArray(pageData?.content)) {
        medicines = pageData.content;
      } else if (Array.isArray(pageData)) {
        medicines = pageData;
      }

      setAllMedicines(Array.isArray(medicines) ? medicines : []);
    } catch (err) {
      console.error('Fetch medicines error:', err);
      setError(err?.response?.data?.message || 'Failed to fetch medicines from server.');
      setAllMedicines([]);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(allMedicines.map((m) => String(m?.category || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return ['ALL', ...values];
  }, [allMedicines]);

  const filteredMedicines = useMemo(() => {
    return allMedicines.filter((med) => {
      const stockQty = Number(med?.stockQuantity ?? 0);
      const minLevel = Number(med?.minimumStockLevel ?? 20);

      const matchesSearch =
        !search ||
        [
          med?.medicineName,
          med?.brandName,
          med?.sku,
          med?.category,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(search.toLowerCase())
          );

      const matchesCategory =
        categoryFilter === 'ALL' || String(med?.category || '') === categoryFilter;

      const matchesStock =
        stockFilter === 'ALL' ||
        (stockFilter === 'IN_STOCK' && stockQty > minLevel) ||
        (stockFilter === 'LOW_STOCK' && stockQty > 0 && stockQty <= minLevel) ||
        (stockFilter === 'OUT_OF_STOCK' && stockQty <= 0);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [allMedicines, search, categoryFilter, stockFilter]);

  useEffect(() => {
    const calculatedTotalPages = Math.max(1, Math.ceil(filteredMedicines.length / pageSize));
    const safePage = Math.min(page, calculatedTotalPages - 1);
    const start = safePage * pageSize;
    const end = start + pageSize;

    if (safePage !== page) {
      setPage(safePage);
    }

    setVisibleMedicines(filteredMedicines.slice(start, end));
    setTotalElements(filteredMedicines.length);
    setTotalPages(calculatedTotalPages);
  }, [filteredMedicines, page, pageSize]);

  const totalStockValue = useMemo(() => {
    return allMedicines.reduce((sum, med) => {
      const qty = Number(med?.stockQuantity ?? 0);
      const price = Number(med?.purchasePrice ?? 0);
      return sum + qty * price;
    }, 0);
  }, [allMedicines]);

  const lowStockCount = useMemo(() => {
    return allMedicines.filter((med) => {
      const qty = Number(med?.stockQuantity ?? 0);
      const min = Number(med?.minimumStockLevel ?? 20);
      return qty > 0 && qty <= min;
    }).length;
  }, [allMedicines]);

  const outOfStockCount = useMemo(() => {
    return allMedicines.filter((med) => Number(med?.stockQuantity ?? 0) <= 0).length;
  }, [allMedicines]);

  const inStockCount = useMemo(() => {
    return allMedicines.filter((med) => {
      const qty = Number(med?.stockQuantity ?? 0);
      const min = Number(med?.minimumStockLevel ?? 20);
      return qty > min;
    }).length;
  }, [allMedicines]);

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingMedicine(null);
    setFormError('');
  };

  const closeFormModal = () => {
    if (formLoading) return;
    setIsFormModalOpen(false);
    resetForm();
  };

  const openAddModal = () => {
    if (!canManage) return;
    resetForm();
    setIsFormModalOpen(true);
  };

  const handleEdit = (med) => {
    if (!canManage) return;

    setEditingMedicine(med);
    setFormError('');
    setFormData({
      medicineName: med?.medicineName || '',
      brandName: med?.brandName || '',
      category: med?.category || '',
      sku: med?.sku || '',
      unitPrice: med?.unitPrice ?? '',
      purchasePrice: med?.purchasePrice ?? '',
      minimumStockLevel: med?.minimumStockLevel ?? 20,
    });
    setIsFormModalOpen(true);
  };

  const handleView = (med) => {
    setViewingMedicine(med);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!canManage) {
      showToast('error', "You're not allowed to delete medicines.");
      return;
    }

    const confirmed = window.confirm('Delete this medicine?');
    if (!confirmed) return;

    try {
      await deleteMedicine(id);
      showToast('success', 'Medicine deleted successfully.');
      await fetchMedicines();
    } catch (err) {
      console.error('Delete medicine error:', err);
      showToast('error', err?.response?.data?.message || 'Failed to delete medicine.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'unitPrice' ||
        name === 'purchasePrice' ||
        name === 'minimumStockLevel'
          ? value === ''
            ? ''
            : Number(value)
          : value,
    }));
  };

  const validateForm = () => {
    if (!formData.medicineName.trim()) return 'Medicine name is required.';
    if (!formData.brandName.trim()) return 'Brand name is required.';
    if (!formData.sku.trim()) return 'SKU / Product Code is required.';

    if (Number(formData.purchasePrice) < 0) {
      return 'Purchase price cannot be negative.';
    }
    if (Number(formData.unitPrice) < 0) {
      return 'Selling price cannot be negative.';
    }
    if (Number(formData.minimumStockLevel) < 0) {
      return 'Minimum stock level cannot be negative.';
    }

    if (Number(formData.unitPrice) < Number(formData.purchasePrice)) {
      return 'Selling price should not be less than purchase price.';
    }

    const duplicateSku = allMedicines.find(
      (med) =>
        String(med?.sku || '').trim().toLowerCase() ===
          formData.sku.trim().toLowerCase() &&
        med.id !== editingMedicine?.id
    );

    if (duplicateSku) return 'This SKU / Product Code already exists.';

    return '';
  };

  const handleSaveMedicine = async (e) => {
    e.preventDefault();

    if (!canManage) {
      setFormError("You're not allowed to manage medicines.");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormLoading(true);
    setFormError('');

    const payload = {
      medicineName: formData.medicineName.trim(),
      brandName: formData.brandName.trim(),
      category: formData.category.trim(),
      sku: formData.sku.trim(),
      unitPrice: Number(formData.unitPrice || 0),
      purchasePrice: Number(formData.purchasePrice || 0),
      minimumStockLevel: Number(formData.minimumStockLevel || 0),
    };

    try {
      if (editingMedicine) {
        await updateMedicine(editingMedicine.id, payload);
        showToast('success', 'Medicine updated successfully.');
      } else {
        await createMedicine(payload);
        showToast('success', 'Medicine created successfully.');
      }

      closeFormModal();
      await fetchMedicines();
    } catch (err) {
      console.error('Save medicine error:', err);
      setFormError(err?.response?.data?.message || 'Failed to save medicine.');
    } finally {
      setFormLoading(false);
    }
  };

  const renderPageButtons = () => {
    const buttons = [];
    const start = Math.max(0, page - 2);
    const end = Math.min(totalPages - 1, page + 2);

    for (let i = start; i <= end; i += 1) {
      buttons.push(
        <button
          key={i}
          type="button"
          className={`page-btn${i === page ? ' active' : ''}`}
          onClick={() => setPage(i)}
        >
          {i + 1}
        </button>
      );
    }

    return buttons;
  };

  if (!canView) {
    return (
      <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
        <h2 style={{ margin: 0, color: 'var(--text-main, #1f2937)' }}>Access Restricted</h2>
        <p style={{ marginTop: '10px', color: 'var(--text-muted, #64748b)' }}>
          You&apos;re not eligible to access this page.
        </p>
      </div>
    );
  }

  return (
    <>
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

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
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
                letterSpacing: '-0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: 0,
              }}
            >
              <Pill size={28} color="#2d3a8c" /> Medicines
            </h1>
            <p style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
              {totalElements > 0
                ? `${totalElements} medicines available after filters`
                : 'Manage your medicine inventory'}
            </p>
            {error && (
              <span
                style={{
                  fontSize: '12px',
                  color: '#e63946',
                  background: '#feeae9',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  marginTop: '8px',
                  display: 'inline-block',
                }}
              >
                ⚠️ {error}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={fetchMedicines}>
              <RefreshCw size={14} /> Refresh
            </button>

            {canManage && (
              <button className="btn-primary" onClick={openAddModal}>
                <Plus size={16} /> Add Medicine
              </button>
            )}
          </div>
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
            title="Total Medicines"
            value={formatNumber(allMedicines.length)}
            sub="All medicines in inventory"
            icon={Package}
            color="#2d3a8c"
          />
          <StatCard
            title="In Stock"
            value={formatNumber(inStockCount)}
            sub="Above minimum stock level"
            icon={ShieldCheck}
            color="#16a34a"
          />
          <StatCard
            title="Low Stock"
            value={formatNumber(lowStockCount)}
            sub="Needs replenishment soon"
            icon={AlertTriangle}
            color="#d97706"
          />
          <StatCard
            title="Stock Value"
            value={formatCurrency(totalStockValue)}
            sub={`Out of stock: ${formatNumber(outOfStockCount)}`}
            icon={IndianRupee}
            color="#7c3aed"
          />
        </div>

        <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(240px, 1fr) 180px 180px 140px',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div className="search-bar" style={{ minWidth: '220px' }}>
              <Search size={15} color="#a0aec0" />
              <input
                type="text"
                placeholder="Search by medicine, brand, SKU, or category..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              style={filterSelectStyle}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setPage(0);
              }}
              style={filterSelectStyle}
            >
              <option value="ALL">All Stock Status</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              style={filterSelectStyle}
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} per page
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <div style={{ overflow: 'auto' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div
                    className="spinner"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderColor: 'rgba(45,58,140,0.3)',
                      borderTopColor: '#2d3a8c',
                    }}
                  />
                </div>
                <p style={{ color: '#718096', marginTop: '14px', fontSize: '14px' }}>
                  Loading medicines...
                </p>
              </div>
            ) : visibleMedicines.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <Pill size={40} color="#c1c9e0" />
                <p
                  style={{
                    color: '#718096',
                    marginTop: '14px',
                    fontSize: '15px',
                    fontWeight: '500',
                  }}
                >
                  No medicines found
                </p>
                <p style={{ color: '#a0aec0', fontSize: '13px', marginTop: '4px' }}>
                  Try changing search or filter values
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Medicine Name</th>
                    <th>Brand Name</th>
                    <th>Category</th>
                    <th>SKU / Product Code</th>
                    <th>Purchase Price (₹)</th>
                    <th>Selling Price (₹)</th>
                    <th>Current Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMedicines.map((med, idx) => {
                    const stock = Number(med?.stockQuantity ?? 0);
                    const st = getStockStatus(stock, med?.minimumStockLevel || 20);

                    return (
                      <tr key={med.id || idx}>
                        <td style={{ color: '#a0aec0', fontWeight: '500' }}>
                          {page * pageSize + idx + 1}
                        </td>
                        <td>
                          <div style={{ fontWeight: '600', color: '#1a202c' }}>
                            {med.medicineName}
                          </div>
                        </td>
                        <td style={{ color: '#4a5568' }}>{med.brandName || '—'}</td>
                        <td>
                          <span className="pill pill-blue" style={{ fontSize: '11px' }}>
                            {med.category || '—'}
                          </span>
                        </td>
                        <td style={{ color: '#4a5568', fontStyle: 'italic' }}>
                          {med.sku || '—'}
                        </td>
                        <td style={{ fontWeight: '500' }}>
                          {formatCurrency(med.purchasePrice || 0)}
                        </td>
                        <td style={{ color: '#2d3a8c', fontWeight: '700' }}>
                          {formatCurrency(med.unitPrice || 0)}
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: '700',
                              color: st.color,
                            }}
                          >
                            {formatNumber(stock)}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '5px 10px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: '700',
                              color: st.color,
                              background: st.bg,
                              border: `1px solid ${st.border}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button onClick={() => handleView(med)} style={viewBtnStyle}>
                              <Eye size={14} /> View
                            </button>

                            {canManage && (
                              <>
                                <button onClick={() => handleEdit(med)} style={editBtnStyle}>
                                  <Pencil size={14} /> Edit
                                </button>
                                <button onClick={() => handleDelete(med.id)} style={deleteBtnStyle}>
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
            )}
          </div>

          {!loading && visibleMedicines.length > 0 && (
            <div
              style={{
                padding: '16px 22px',
                borderTop: '1px solid #f0f2f8',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '13px', color: '#718096' }}>
                Showing {page * pageSize + 1}–
                {Math.min((page + 1) * pageSize, totalElements)} of {totalElements} medicines
              </span>

              <div className="pagination">
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft size={14} />
                </button>
                {renderPageButtons()}
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={isFormModalOpen}
        title={editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
        onClose={closeFormModal}
        width="720px"
      >
        <form onSubmit={handleSaveMedicine}>
          {formError && <div style={errorBoxStyle}>{formError}</div>}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}
          >
            <div>
              <label style={labelStyle}>Medicine Name *</label>
              <input
                type="text"
                name="medicineName"
                value={formData.medicineName}
                onChange={handleInputChange}
                style={modalInputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Brand Name *</label>
              <input
                type="text"
                name="brandName"
                value={formData.brandName}
                onChange={handleInputChange}
                style={modalInputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                style={modalInputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>SKU / Product Code *</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                style={modalInputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Purchase Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleInputChange}
                style={modalInputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Selling Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                name="unitPrice"
                value={formData.unitPrice}
                onChange={handleInputChange}
                style={modalInputStyle}
                required
              />
            </div>

            <div style={{ gridColumn: '1 / span 2', maxWidth: 'calc(50% - 8px)' }}>
              <label style={labelStyle}>Minimum Stock Level</label>
              <input
                type="number"
                name="minimumStockLevel"
                value={formData.minimumStockLevel}
                onChange={handleInputChange}
                style={modalInputStyle}
              />
            </div>
          </div>

          <div
            style={{
              paddingTop: '18px',
              marginTop: '20px',
              borderTop: '1px solid #edf2f7',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={closeFormModal}
              style={{ minWidth: '90px' }}
              disabled={formLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={formLoading}
              style={{ minWidth: '150px' }}
            >
              {formLoading
                ? editingMedicine
                  ? 'Updating...'
                  : 'Creating...'
                : editingMedicine
                ? 'Update Medicine'
                : 'Save Medicine'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isViewModalOpen}
        title="Medicine Details"
        onClose={() => setIsViewModalOpen(false)}
        width="620px"
      >
        {viewingMedicine && (
          <div style={{ display: 'grid', gap: '18px' }}>
            <div style={detailGrid}>
              <DetailBlock label="Medicine Name" value={viewingMedicine.medicineName} />
              <DetailBlock label="Brand Name" value={viewingMedicine.brandName} />
              <DetailBlock label="Category" value={viewingMedicine.category || '—'} />
              <DetailBlock label="SKU / Product Code" value={viewingMedicine.sku || '—'} />
              <DetailBlock
                label="Purchase Price"
                value={formatCurrency(viewingMedicine.purchasePrice || 0)}
              />
              <DetailBlock
                label="Selling Price"
                value={formatCurrency(viewingMedicine.unitPrice || 0)}
              />
              <DetailBlock
                label="Current Stock"
                value={formatNumber(viewingMedicine.stockQuantity ?? 0)}
              />
              <DetailBlock
                label="Minimum Stock Level"
                value={formatNumber(viewingMedicine.minimumStockLevel ?? 20)}
              />
            </div>

            <div
              style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: '16px',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 800, marginBottom: '8px' }}>
                Stock Status
              </div>
              {(() => {
                const status = getStockStatus(
                  viewingMedicine.stockQuantity ?? 0,
                  viewingMedicine.minimumStockLevel ?? 20
                );
                return (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: status.color,
                      background: status.bg,
                      border: `1px solid ${status.border}`,
                    }}
                  >
                    {status.label}
                  </span>
                );
              })()}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function DetailBlock({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: '4px', fontSize: '15px', color: 'var(--text-main, #111827)', fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}

const detailGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '16px',
};

const filterSelectStyle = {
  border: '1.5px solid #e2e8f0',
  background: '#f7f8fc',
  borderRadius: '10px',
  padding: '8px 14px',
  fontSize: '13px',
  color: '#2d3748',
  outline: 'none',
  cursor: 'pointer',
};

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '13px',
  fontWeight: '600',
  color: '#4a5568',
};

const modalInputStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid #d9e2ec',
  borderRadius: '12px',
  fontSize: '14px',
  outline: 'none',
  background: 'var(--bg-card-soft, #f8fafc)',
  color: '#1a202c',
  boxSizing: 'border-box',
};

const closeBtnStyle = {
  border: '1px solid #e2e8f0',
  background: 'var(--bg-card-soft, #f8fafc)',
  borderRadius: '10px',
  width: '38px',
  height: '38px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--text-muted, #64748b)',
  flexShrink: 0,
};

const errorBoxStyle = {
  color: '#e63946',
  background: 'var(--bg-card, #ffffff)1f2',
  border: '1px solid #ffd5db',
  padding: '12px 14px',
  borderRadius: '10px',
  marginBottom: '18px',
  fontSize: '13px',
  fontWeight: '500',
};

const viewBtnStyle = {
  padding: '6px 10px',
  background: '#eef2ff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  color: '#2d3a8c',
  fontSize: '12px',
  fontWeight: '600',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
};

const editBtnStyle = {
  padding: '6px 10px',
  background: '#edfdf3',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  color: '#15803d',
  fontSize: '12px',
  fontWeight: '600',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
};

const deleteBtnStyle = {
  padding: '6px 10px',
  background: '#ffecec',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  color: '#e63946',
  fontSize: '12px',
  fontWeight: '600',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
};