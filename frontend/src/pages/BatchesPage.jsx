import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Package,
  Plus,
  RefreshCw,
  CalendarClock,
  AlertTriangle,
  X,
  Pencil,
  Trash2,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  getBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  getMedicines,
  getSuppliers,
} from '../api/services';
import { useAuth } from '../context/AuthContext';

const defaultFormData = {
  medicineId: '',
  batchNumber: '',
  manufacturingDate: '',
  expiryDate: '',
  quantity: '',
  purchasePrice: '',
  supplierId: '',
  supplierName: '',
  invoiceReference: '',
};

export default function BatchesPage() {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(['ADMIN', 'STORE_MANAGER']);

  const [batches, setBatches] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  const [formError, setFormError] = useState('');
  const [pageMessage, setPageMessage] = useState({ type: '', text: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    fetchPageData();
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      document.body.style.overflow = '';
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isModalOpen && !submitting && !isDeleteLoading) {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isModalOpen, submitting, isDeleteLoading]);

  const showPageMessage = (type, text) => {
    setPageMessage({ type, text });
    window.clearTimeout(showPageMessage.timeoutId);
    showPageMessage.timeoutId = window.setTimeout(() => {
      setPageMessage({ type: '', text: '' });
    }, 3500);
  };

  const fetchPageData = async () => {
    try {
      setLoading(true);
      setPageMessage({ type: '', text: '' });

      const [batchRes, medicineRes, supplierRes] = await Promise.all([
        getBatches(),
        getMedicines({ page: 0, size: 200 }),
        getSuppliers({ page: 0, size: 200 }),
      ]);

      const batchData = batchRes.data?.data?.content || batchRes.data?.data || [];
      const medicineData = medicineRes.data?.data?.content || medicineRes.data?.data || [];
      const supplierData = supplierRes.data?.data?.content || supplierRes.data?.data || [];

      setBatches(Array.isArray(batchData) ? batchData : []);
      setMedicines(Array.isArray(medicineData) ? medicineData : []);
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
    } catch (err) {
      console.error('Failed to load batches page:', err);
      showPageMessage('error', err?.response?.data?.message || 'Failed to load batches page.');
    } finally {
      setLoading(false);
    }
  };

  const medicineMap = useMemo(() => {
    const map = {};

    medicines.forEach((medicine) => {
      const possibleIds = [medicine._id, medicine.id, medicine.medicineId].filter(Boolean);
      const medicineName =
        medicine.name ||
        medicine.medicineName ||
        medicine.genericName ||
        medicine.productName ||
        'Unknown Medicine';

      possibleIds.forEach((id) => {
        map[String(id)] = medicineName;
      });
    });

    return map;
  }, [medicines]);

  const supplierOptions = useMemo(() => {
    return suppliers.map((supplier) => {
      const id = supplier?._id || supplier?.id || supplier?.supplierId || '';
      const name = supplier?.name || supplier?.supplierName || 'Unknown Supplier';
      return {
        id: String(id),
        name,
      };
    });
  }, [suppliers]);

  const supplierMapById = useMemo(() => {
    const map = {};
    supplierOptions.forEach((supplier) => {
      map[supplier.id] = supplier.name;
    });
    return map;
  }, [supplierOptions]);

  const supplierMapByName = useMemo(() => {
    const map = {};
    supplierOptions.forEach((supplier) => {
      map[supplier.name.toLowerCase()] = supplier.id;
    });
    return map;
  }, [supplierOptions]);

  const getMedicineLabel = (medicineId) => {
    if (!medicineId) return 'Unknown Medicine';
    return medicineMap[String(medicineId)] || String(medicineId);
  };

  const getBatchId = (batch) => batch?.id || batch?._id || '';

  const getDaysLeft = (expiryDate) => {
    if (!expiryDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);
    if (Number.isNaN(expiry.getTime())) return null;
    expiry.setHours(0, 0, 0, 0);

    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  const getBatchStatusMeta = (expiryDate) => {
    const daysLeft = getDaysLeft(expiryDate);

    if (daysLeft !== null && daysLeft < 0) {
      return {
        key: 'EXPIRED',
        label: 'Expired',
        color: '#e53e3e',
        bg: 'var(--bg-card, #ffffff)5f5',
        border: '#fed7d7',
        subText: `${Math.abs(daysLeft)} day(s) overdue`,
      };
    }

    if (daysLeft !== null && daysLeft <= 30) {
      return {
        key: 'NEAR_EXPIRY',
        label: 'Near Expiry',
        color: '#d69e2e',
        bg: 'var(--bg-card, #ffffff)af0',
        border: '#f6e05e',
        subText: `${daysLeft} day(s) left`,
      };
    }

    return {
      key: 'SAFE',
      label: 'Safe',
      color: '#38a169',
      bg: '#f0fff4',
      border: '#9ae6b4',
      subText: daysLeft === null ? 'No expiry info' : `${daysLeft} day(s) left`,
    };
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-CA');
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '₹0.00';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return String(value);
    return `₹${numeric.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setFormError('');
    setEditingBatch(null);
  };

  const openAddModal = () => {
    if (!canManage) return;
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (batch) => {
    if (!canManage) return;

    const existingSupplierName = batch?.supplierName || '';
    const existingSupplierId =
      String(batch?.supplierId || '') ||
      supplierMapByName[String(existingSupplierName).toLowerCase()] ||
      '';

    setEditingBatch(batch);
    setFormError('');
    setFormData({
      medicineId: batch?.medicineId || '',
      batchNumber: batch?.batchNumber || '',
      manufacturingDate: normalizeDateForInput(batch?.manufacturingDate),
      expiryDate: normalizeDateForInput(batch?.expiryDate),
      quantity: batch?.quantity ?? '',
      purchasePrice: batch?.purchasePrice ?? '',
      supplierId: existingSupplierId,
      supplierName: existingSupplierName,
      invoiceReference: batch?.invoiceReference || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting || isDeleteLoading) return;
    setIsModalOpen(false);
    resetForm();
  };

  const normalizeDateForInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value).slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'supplierId') {
      setFormData((prev) => ({
        ...prev,
        supplierId: value,
        supplierName: supplierMapById[value] || '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.medicineId) return 'Please select a medicine.';
    if (!formData.batchNumber.trim()) return 'Batch number is required.';
    if (!formData.manufacturingDate) return 'Manufacturing date is required.';
    if (!formData.expiryDate) return 'Expiry date is required.';

    if (formData.quantity === '' || Number(formData.quantity) <= 0) {
      return 'Quantity must be greater than 0.';
    }

    if (formData.purchasePrice === '' || Number(formData.purchasePrice) < 0) {
      return 'Purchase price must be 0 or more.';
    }

    if (!formData.supplierId) return 'Please select a supplier.';
    if (!formData.supplierName.trim()) return 'Selected supplier is invalid.';
    if (!formData.invoiceReference.trim()) return 'Invoice reference is required.';

    const mfg = new Date(formData.manufacturingDate);
    const exp = new Date(formData.expiryDate);

    if (Number.isNaN(mfg.getTime()) || Number.isNaN(exp.getTime())) {
      return 'Please enter valid dates.';
    }

    if (mfg > exp) {
      return 'Expiry date must be after manufacturing date.';
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canManage) {
      setFormError("You're not allowed to manage batches.");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const payload = {
        medicineId: formData.medicineId,
        batchNumber: formData.batchNumber.trim(),
        manufacturingDate: formData.manufacturingDate,
        expiryDate: formData.expiryDate,
        quantity: Number(formData.quantity),
        purchasePrice: Number(formData.purchasePrice),
        supplierId: formData.supplierId,
        supplierName: formData.supplierName.trim(),
        invoiceReference: formData.invoiceReference.trim(),
      };

      if (editingBatch) {
        await updateBatch(getBatchId(editingBatch), payload);
        showPageMessage('success', 'Batch updated successfully.');
      } else {
        await createBatch(payload);
        showPageMessage('success', 'Batch created successfully.');
      }

      closeModal();
      await fetchPageData();
    } catch (err) {
      console.error('Save batch failed:', err);
      setFormError(err?.response?.data?.message || 'Failed to save batch.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBatch = async (batch) => {
    if (!canManage) return;

    const batchId = getBatchId(batch);
    if (!batchId) {
      showPageMessage('error', 'Invalid batch selected.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete batch "${batch.batchNumber || 'N/A'}"?`
    );

    if (!confirmed) return;

    try {
      setIsDeleteLoading(true);
      await deleteBatch(batchId);
      showPageMessage('success', 'Batch deleted successfully.');
      await fetchPageData();
    } catch (err) {
      console.error('Delete batch failed:', err);
      showPageMessage('error', err?.response?.data?.message || 'Failed to delete batch.');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const totalBatches = batches.length;

  const nearExpiryCount = batches.filter((batch) => {
    const days = getDaysLeft(batch.expiryDate);
    return days !== null && days >= 0 && days <= 30;
  }).length;

  const expiredCount = batches.filter((batch) => {
    const days = getDaysLeft(batch.expiryDate);
    return days !== null && days < 0;
  }).length;

  const safeCount = batches.filter((batch) => {
    const days = getDaysLeft(batch.expiryDate);
    return days === null || days > 30;
  }).length;

  const filteredBatches = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return batches.filter((batch) => {
      const status = getBatchStatusMeta(batch.expiryDate).key;

      const matchesFilter =
        statusFilter === 'ALL' ||
        (statusFilter === 'SAFE' && status === 'SAFE') ||
        (statusFilter === 'NEAR_EXPIRY' && status === 'NEAR_EXPIRY') ||
        (statusFilter === 'EXPIRED' && status === 'EXPIRED');

      if (!matchesFilter) return false;

      if (!term) return true;

      const haystack = [
        batch.batchNumber,
        getMedicineLabel(batch.medicineId),
        batch.supplierName,
        batch.invoiceReference,
        batch.quantity,
        formatDate(batch.manufacturingDate),
        formatDate(batch.expiryDate),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [batches, searchTerm, statusFilter, medicineMap]);

  const modalTitle = editingBatch ? 'Edit Batch' : 'Add New Batch';
  const modalSubtitle = editingBatch
    ? 'Update batch, supplier and expiry details'
    : 'Select a real supplier and enter batch details';

  const modalMarkup = isModalOpen ? (
    <div
      onClick={closeModal}
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
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '760px',
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
        <div style={modalHeaderStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: '22px', color: '#1a202c', fontWeight: 800 }}>
              {modalTitle}
            </h3>
            <p style={{ marginTop: '6px', color: '#718096', fontSize: '14px' }}>
              {modalSubtitle}
            </p>
          </div>

          <button
            onClick={closeModal}
            type="button"
            style={closeButtonStyle}
            disabled={submitting || isDeleteLoading}
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              padding: '22px 24px',
              overflowY: 'auto',
              flex: 1,
            }}
          >
            {formError && <div style={errorBoxStyle}>{formError}</div>}

            <div style={formGridStyle}>
              <div>
                <label style={labelStyle}>Medicine</label>
                <select
                  name="medicineId"
                  value={formData.medicineId}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                >
                  <option value="">Select medicine</option>
                  {medicines.map((medicine) => {
                    const optionId = medicine._id || medicine.id || medicine.medicineId;
                    const optionLabel =
                      medicine.name ||
                      medicine.medicineName ||
                      medicine.genericName ||
                      medicine.productName ||
                      'Unknown Medicine';

                    return (
                      <option key={optionId} value={optionId}>
                        {optionLabel}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Batch Number</label>
                <input
                  name="batchNumber"
                  value={formData.batchNumber}
                  onChange={handleChange}
                  placeholder="Enter batch number"
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Manufacturing Date</label>
                <input
                  type="date"
                  name="manufacturingDate"
                  value={formData.manufacturingDate}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Expiry Date</label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Quantity</label>
                <input
                  type="number"
                  min="1"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="Enter quantity"
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Purchase Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  placeholder="Enter purchase price"
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Supplier</label>
                <select
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                >
                  <option value="">Select supplier</option>
                  {supplierOptions.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Invoice Reference</label>
                <input
                  name="invoiceReference"
                  value={formData.invoiceReference}
                  onChange={handleChange}
                  placeholder="Enter invoice reference"
                  style={inputStyle}
                  required
                />
              </div>
            </div>
          </div>

          <div style={modalFooterStyle}>
            <button
              type="button"
              className="btn-secondary"
              onClick={closeModal}
              style={{ minWidth: '90px' }}
              disabled={submitting || isDeleteLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ minWidth: '140px' }}
              disabled={submitting || isDeleteLoading}
            >
              {submitting ? (editingBatch ? 'Updating...' : 'Saving...') : editingBatch ? 'Update Batch' : 'Save Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            gap: '16px',
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
              <Package size={28} color="#2d3a8c" /> Batches & Expiry
            </h1>
            <p style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
              Track medicine batches, expiry dates and supplier references
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn-secondary"
              onClick={fetchPageData}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}
            >
              <RefreshCw size={16} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>

            {canManage && (
              <button
                className="btn-primary"
                onClick={openAddModal}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
              >
                <Plus size={16} />
                Add Batch
              </button>
            )}
          </div>
        </div>

        {pageMessage.text && (
          <div
            style={{
              marginBottom: '18px',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              border: `1px solid ${pageMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              background: pageMessage.type === 'success' ? '#f0fdf4' : 'var(--bg-card, #ffffff)1f2',
              color: pageMessage.type === 'success' ? '#166534' : '#b91c1c',
            }}
          >
            {pageMessage.text}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <SummaryCard
            title="Total Batches"
            value={totalBatches}
            icon={<Package size={22} color="#2d3a8c" />}
            valueColor="#1a202c"
          />
          <SummaryCard
            title="Safe"
            value={safeCount}
            icon={<ShieldCheck size={22} color="#38a169" />}
            valueColor="#38a169"
          />
          <SummaryCard
            title="Near Expiry"
            value={nearExpiryCount}
            icon={<CalendarClock size={22} color="#d69e2e" />}
            valueColor="#d69e2e"
          />
          <SummaryCard
            title="Expired"
            value={expiredCount}
            icon={<AlertTriangle size={22} color="#e53e3e" />}
            valueColor="#e53e3e"
          />
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1a202c' }}>Batch List</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#718096' }}>
                View all inventory batches with expiry tracking
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid #d9e2ec',
                  borderRadius: '12px',
                  padding: '0 12px',
                  background: 'var(--bg-card, var(--bg-card, #ffffff)fff)',
                  minWidth: '260px',
                }}
              >
                <Search size={16} color="var(--text-muted, #64748b)" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search batch, medicine, supplier..."
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: '14px',
                    background: 'transparent',
                    color: '#1a202c',
                    padding: '11px 0',
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '11px 14px',
                  border: '1px solid #d9e2ec',
                  borderRadius: '12px',
                  background: 'var(--bg-card, var(--bg-card, #ffffff)fff)',
                  fontSize: '14px',
                  color: '#1a202c',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Status</option>
                <option value="SAFE">Safe</option>
                <option value="NEAR_EXPIRY">Near Expiry</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
              Loading batches...
            </div>
          ) : filteredBatches.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Package size={42} color="#cbd5e0" />
              <h3 style={{ marginTop: '12px', color: '#4a5568' }}>No matching batches found</h3>
              <p style={{ color: '#718096', fontSize: '14px' }}>
                Try changing the search or filter, or add a new batch.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card-soft, #f8fafc)' }}>
                    <th style={thStyle}>Batch No</th>
                    <th style={thStyle}>Medicine</th>
                    <th style={thStyle}>Qty</th>
                    <th style={thStyle}>Purchase Price</th>
                    <th style={thStyle}>Manufactured</th>
                    <th style={thStyle}>Expiry</th>
                    <th style={thStyle}>Supplier</th>
                    <th style={thStyle}>Invoice Ref</th>
                    <th style={thStyle}>Status</th>
                    {canManage && <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((batch) => {
                    const batchId = getBatchId(batch);
                    const statusMeta = getBatchStatusMeta(batch.expiryDate);

                    return (
                      <tr key={batchId} style={{ borderTop: '1px solid #edf2f7' }}>
                        <td style={tdStyle}>{batch.batchNumber || 'N/A'}</td>
                        <td style={tdStyle}>{getMedicineLabel(batch.medicineId)}</td>
                        <td style={tdStyle}>{batch.quantity ?? 0}</td>
                        <td style={tdStyle}>{formatCurrency(batch.purchasePrice)}</td>
                        <td style={tdStyle}>{formatDate(batch.manufacturingDate)}</td>
                        <td style={tdStyle}>{formatDate(batch.expiryDate)}</td>
                        <td style={tdStyle}>{batch.supplierName || 'N/A'}</td>
                        <td style={tdStyle}>{batch.invoiceReference || 'N/A'}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px 10px',
                                borderRadius: '999px',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: statusMeta.color,
                                background: statusMeta.bg,
                                border: `1px solid ${statusMeta.border}`,
                                width: 'fit-content',
                              }}
                            >
                              {statusMeta.label}
                            </span>
                            <span style={{ fontSize: '11px', color: '#718096' }}>{statusMeta.subText}</span>
                          </div>
                        </td>

                        {canManage && (
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => openEditModal(batch)}
                                title="Edit Batch"
                                style={iconActionButtonStyle}
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteBatch(batch)}
                                title="Delete Batch"
                                disabled={isDeleteLoading}
                                style={{
                                  ...iconActionButtonStyle,
                                  color: '#e53e3e',
                                  background: 'var(--bg-card, #ffffff)5f5',
                                  borderColor: '#fed7d7',
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {typeof document !== 'undefined' && createPortal(modalMarkup, document.body)}
    </>
  );
}

function SummaryCard({ title, value, icon, valueColor }) {
  return (
    <div className="card" style={{ padding: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>{title}</p>
          <h2 style={{ margin: '8px 0 0', fontSize: '28px', color: valueColor }}>{value}</h2>
        </div>
        {icon}
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '14px 20px',
  fontSize: '13px',
  fontWeight: 700,
  color: '#4a5568',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '16px 20px',
  fontSize: '14px',
  color: '#1a202c',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
};

const modalHeaderStyle = {
  padding: '20px 24px',
  borderBottom: '1px solid #edf2f7',
  background: 'linear-gradient(180deg, var(--bg-card, var(--bg-card, #ffffff)fff) 0%, #fafbff 100%)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '16px',
  flexShrink: 0,
};

const closeButtonStyle = {
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

const modalFooterStyle = {
  padding: '18px 24px',
  borderTop: '1px solid #edf2f7',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  background: '#fbfcfe',
  flexShrink: 0,
};

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '16px',
};

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '13px',
  fontWeight: 600,
  color: '#4a5568',
};

const inputStyle = {
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

const iconActionButtonStyle = {
  width: '34px',
  height: '34px',
  borderRadius: '10px',
  border: '1px solid #dbe5f0',
  background: 'var(--bg-card-soft, #f8fafc)',
  color: '#2d3a8c',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};