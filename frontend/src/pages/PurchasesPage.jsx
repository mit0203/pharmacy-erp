import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  Truck,
  FileText,
  Wallet,
  Trash2,
  Package,
  Minus,
  Download,
  Filter,
  ChevronsUpDown,
  Check,
  RotateCcw,
} from 'lucide-react';

import {
  getPurchaseOrders,
  getPurchaseById,
  createPurchase,
  approvePurchase,
  receivePurchase,
  generatePurchaseInvoice,
  updatePurchasePayment,
  deletePurchase,
  getSuppliers,
  getMedicines,
  downloadPurchaseInvoicePdf,
  returnPurchase,
} from '../api/services';

import { useAuth } from '../context/AuthContext';

const PAGE_SIZES = [10, 20, 50];
const STATUS_FILTERS = ['ALL', 'DRAFT', 'APPROVED', 'RECEIVED'];

const defaultFormData = {
  supplierId: '',
  supplierInvoiceNumber: '',
  notes: '',
  dueDate: '',
  lrNumber: '',
  transport: '',
  placeOfSupply: '',
  reverseCharge: false,
  termsAndConditions: '',
  items: [
    {
      medicineId: '',
      batchNumber: '',
      expiryDate: '',
      quantity: 1,
      freeQuantity: 0,
      unitPrice: '',
      mrp: '',
      pack: '',
      hsn: '',
      discountPercent: 0,
      gstPercentage: 0,
    },
  ],
};

const formatCurrency = (v) =>
  `₹${Number(v || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN');
};

const formatPaymentStatusLabel = (status) => {
  if (status === 'PARTIALLY_PAID') return 'PARTIAL';
  return status || '-';
};

const getStatusType = (s) =>
  s === 'RECEIVED'
    ? 'success'
    : s === 'APPROVED'
      ? 'info'
      : s === 'DRAFT'
        ? 'warning'
        : s === 'RETURNED'
          ? 'danger'
          : s === 'PARTIALLY_RETURNED'
            ? 'warning'
            : 'gray';

const getPaymentType = (s) =>
  s === 'PAID'
    ? 'success'
    : s === 'PARTIALLY_PAID'
      ? 'warning'
      : s === 'UNPAID'
        ? 'danger'
        : 'gray';

const getMedicineLabel = (medicine) =>
  medicine?.name ||
  medicine?.medicineName ||
  medicine?.brandName ||
  medicine?.genericName ||
  medicine?.sku ||
  'Unknown Medicine';

const getMedicineSecondaryText = (medicine) => {
  const parts = [];
  if (medicine?.sku) parts.push(`SKU: ${medicine.sku}`);
  if (medicine?.brandName) parts.push(`Brand: ${medicine.brandName}`);
  if (medicine?.genericName) parts.push(`Generic: ${medicine.genericName}`);
  if (medicine?.stockQuantity != null) parts.push(`Stock: ${medicine.stockQuantity}`);
  if (medicine?.unit) parts.push(`Unit: ${medicine.unit}`);
  return parts.join(' • ');
};

const getMedicineDefaultPurchasePrice = (medicine) => {
  if (!medicine) return '';
  if (medicine.purchasePrice != null && medicine.purchasePrice !== '') return Number(medicine.purchasePrice);
  if (medicine.costPrice != null && medicine.costPrice !== '') return Number(medicine.costPrice);
  if (medicine.unitPrice != null && medicine.unitPrice !== '') return Number(medicine.unitPrice);
  return '';
};

const getMedicineDefaultGst = (medicine) => {
  if (!medicine) return 0;
  if (medicine.gstPercentage != null && medicine.gstPercentage !== '') return Number(medicine.gstPercentage);
  if (medicine.taxPercentage != null && medicine.taxPercentage !== '') return Number(medicine.taxPercentage);
  return 0;
};

const normalizePagedList = (response) => {
  const data = response?.data?.data ?? response?.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data)) return data;
  return [];
};

const normalizePagedMeta = (response) => {
  const data = response?.data?.data ?? response?.data;
  return {
    totalElements: data?.totalElements ?? (Array.isArray(data) ? data.length : 0),
    totalPages: data?.totalPages ?? (Array.isArray(data) ? 1 : 0),
  };
};

const getApiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  const data = error?.response?.data;

  if (typeof data === 'string' && data.trim()) return data.trim();

  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
    if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
    if (typeof data.detail === 'string' && data.detail.trim()) return data.detail.trim();
    if (typeof data.title === 'string' && data.title.trim()) return data.title.trim();
  }

  if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim();
  return fallback;
};

const getBlobErrorMessage = async (error, fallback = 'Failed to download file.') => {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      if (!text) return fallback;
      try {
        const parsed = JSON.parse(text);
        return parsed?.message || parsed?.error || parsed?.detail || fallback;
      } catch {
        return text;
      }
    } catch {
      return fallback;
    }
  }

  return getApiErrorMessage(error, fallback);
};

const showValidationToast = (showToast, setError, message) => {
  setError(message);
  showToast('error', message);
};

const calculateItemAmounts = (item) => {
  const quantity = Number(item?.quantity || 0);
  const unitPrice = Number(item?.unitPrice || 0);
  const discountPercent = Number(item?.discountPercent || 0);
  const gstPercentage = Number(item?.gstPercentage || 0);
  const grossAmount = quantity * unitPrice;
  const discountAmount = (grossAmount * discountPercent) / 100;
  const taxableValue = grossAmount - discountAmount;
  const gstAmount = (taxableValue * gstPercentage) / 100;
  const lineTotal = taxableValue + gstAmount;
  return { taxableValue, gstAmount, lineTotal };
};

const Pill = ({ children, type }) => {
  const map = {
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#2563eb',
    gray: 'var(--text-muted, #64748b)',
  };

  return (
    <span
      style={{
        padding: '5px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        color: 'var(--bg-card, #ffffff)',
        fontWeight: 700,
        background: map[type] || map.gray,
      }}
    >
      {children}
    </span>
  );
};

function Modal({ open, title, onClose, children, width = '720px' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onEscape);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onEscape);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div style={modalOverlayStyle} onClick={onClose}>
      <div className="card" style={{ ...modalCardStyle, maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main, #1f2937)' }}>{title}</h3>
          <button type="button" onClick={onClose} style={iconBtnStyle}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '18px' }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

function SearchableMedicineSelect({
  medicines,
  value,
  onChange,
  disabled = false,
  usedMedicineIds = [],
}) {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedMedicine = useMemo(
    () => medicines.find((item) => String(item.id) === String(value)) || null,
    [medicines, value]
  );

  const filteredMedicines = useMemo(() => {
    const q = query.trim().toLowerCase();

    return medicines.filter((medicine) => {
      const matchesSearch =
        !q ||
        getMedicineLabel(medicine).toLowerCase().includes(q) ||
        String(medicine?.sku || '').toLowerCase().includes(q) ||
        String(medicine?.brandName || '').toLowerCase().includes(q) ||
        String(medicine?.genericName || '').toLowerCase().includes(q);

      const alreadyUsed =
        usedMedicineIds.map(String).includes(String(medicine.id)) &&
        String(medicine.id) !== String(value);

      return matchesSearch && !alreadyUsed;
    });
  }, [medicines, query, usedMedicineIds, value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          ...searchableTriggerStyle,
          opacity: disabled ? 0.7 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
          {selectedMedicine ? (
            <>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text-main, #111827)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {getMedicineLabel(selectedMedicine)}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted, #64748b)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {getMedicineSecondaryText(selectedMedicine) || 'Medicine selected'}
              </div>
            </>
          ) : (
            <span style={{ color: 'var(--text-soft, #94a3b8)', fontSize: '14px' }}>Search and select medicine</span>
          )}
        </div>
        <ChevronsUpDown size={16} color="var(--text-muted, #64748b)" />
      </button>

      {open && !disabled && (
        <div style={searchableDropdownStyle}>
          <div style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={searchInputWrapStyle}>
              <Search size={15} color="var(--text-soft, #94a3b8)" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, SKU, brand, generic..."
                style={searchInputStyle}
              />
            </div>
          </div>

          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {filteredMedicines.length === 0 ? (
              <div style={{ padding: '14px', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                No medicine found
              </div>
            ) : (
              filteredMedicines.map((medicine) => {
                const selected = String(medicine.id) === String(value);

                return (
                  <button
                    key={medicine.id}
                    type="button"
                    onClick={() => {
                      onChange(medicine.id, medicine);
                      setOpen(false);
                      setQuery('');
                    }}
                    style={{
                      ...searchableItemStyle,
                      background: selected ? '#eff6ff' : 'var(--bg-card, #ffffff)',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--text-main, #111827)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {getMedicineLabel(medicine)}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted, #64748b)',
                          marginTop: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {getMedicineSecondaryText(medicine)}
                      </div>
                    </div>
                    {selected && <Check size={15} color="#2563eb" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PurchasesPage() {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(['ADMIN', 'STORE_MANAGER']);

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);

  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [listError, setListError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [toast, setToast] = useState(null);
  const [rowActionId, setRowActionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const [formData, setFormData] = useState(defaultFormData);
  const [formError, setFormError] = useState('');

  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);
  const [purchaseToReturn, setPurchaseToReturn] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [returnError, setReturnError] = useState('');
  const [returnForm, setReturnForm] = useState({
    reason: '',
    items: [],
  });

  const [paymentForm, setPaymentForm] = useState({
    paymentStatus: 'UNPAID',
    amountPaid: '',
  });
  const [paymentError, setPaymentError] = useState('');

  const supplierMap = useMemo(() => {
    const m = {};
    suppliers.forEach((s) => {
      m[String(s.id)] = s;
    });
    return m;
  }, [suppliers]);

  const medicineMap = useMemo(() => {
    const m = {};
    medicines.forEach((med) => {
      m[String(med.id)] = med;
    });
    return m;
  }, [medicines]);

  const getSupplierName = (id) =>
    supplierMap[String(id)]?.name || supplierMap[String(id)]?.supplierName || id || '-';

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => String(s.id) === String(formData.supplierId)) || null,
    [suppliers, formData.supplierId]
  );

  const usedMedicineIds = useMemo(
    () => formData.items.map((item) => item.medicineId).filter(Boolean),
    [formData.items]
  );

  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase) => {
      const statusOk = statusFilter === 'ALL' || purchase.status === statusFilter;
      const supplierOk =
        supplierFilter === 'ALL' || String(purchase.supplierId) === String(supplierFilter);
      return statusOk && supplierOk;
    });
  }, [purchases, statusFilter, supplierFilter]);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      setSearch(searchInput.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setListError('');

    try {
      const res = await getPurchaseOrders({ page, size: pageSize, search });
      const list = normalizePagedList(res);
      const meta = normalizePagedMeta(res);

      setPurchases(list);
      setTotalElements(meta.totalElements);
      setTotalPages(meta.totalPages);
    } catch (e) {
      console.error(e);
      setPurchases([]);
      setTotalElements(0);
      setTotalPages(0);
      setListError(getApiErrorMessage(e, 'Failed to load purchase orders.'));
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    (async () => {
      try {
        const [s, m] = await Promise.all([
          getSuppliers({ page: 0, size: 200 }),
          getMedicines({ page: 0, size: 1000 }),
        ]);

        setSuppliers(normalizePagedList(s));
        setMedicines(normalizePagedList(m));
      } catch (e) {
        console.error(e);
        showToast('error', getApiErrorMessage(e, 'Failed to load suppliers or medicines.'));
      }
    })();
  }, [showToast]);

  const resetCreateForm = () => {
    setFormData(defaultFormData);
    setFormError('');
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (submitting) return;
    setShowCreateModal(false);
    resetCreateForm();
  };

  const closeViewModal = () => {
    if (detailsLoading) return;
    setShowViewModal(false);
    setSelectedPurchase(null);
  };

  const closePaymentModal = () => {
    if (submitting) return;
    setShowPaymentModal(false);
    setPaymentError('');
    setSelectedPurchase(null);
    setPaymentForm({
      paymentStatus: 'UNPAID',
      amountPaid: '',
    });
  };

  const closeDeleteModal = () => {
    if (rowActionId.startsWith('delete-')) return;
    setShowDeleteModal(false);
    setPurchaseToDelete(null);
  };

  const closeReturnModal = () => {
    if (submitting) return;
    setShowReturnModal(false);
    setPurchaseToReturn(null);
    setReturnError('');
    setReturnForm({
      reason: '',
      items: [],
    });
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          medicineId: '',
          batchNumber: '',
          expiryDate: '',
          quantity: 1,
          freeQuantity: 0,
          unitPrice: '',
          mrp: '',
          pack: '',
          hsn: '',
          discountPercent: 0,
          gstPercentage: 0,
        },
      ],
    }));
  };

  const removeItemRow = (index) => {
    setFormData((prev) => {
      if (prev.items.length === 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      };
    });
  };

  const updateItemField = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  };

  const handleMedicineSelect = (index, medicineId, medicine) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item;

        return {
          ...item,
          medicineId,
          mrp: medicine?.mrp ?? '',
          pack: medicine?.pack ?? '',
          hsn: medicine?.hsn ?? '',
          unitPrice:
            item.unitPrice === '' || Number(item.unitPrice) === 0
              ? getMedicineDefaultPurchasePrice(medicine)
              : item.unitPrice,
          gstPercentage:
            item.gstPercentage === '' || Number(item.gstPercentage) === 0
              ? getMedicineDefaultGst(medicine)
              : item.gstPercentage,
        };
      }),
    }));
  };

  const createTotals = useMemo(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + calculateItemAmounts(item).taxableValue, 0);
    const gstTotal = formData.items.reduce((sum, item) => sum + calculateItemAmounts(item).gstAmount, 0);

    return {
      subtotal,
      gstTotal,
      total: subtotal + gstTotal,
      itemCount: formData.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    };
  }, [formData]);

  const validateCreateForm = () => {
    if (!formData.supplierId) return 'Please select a supplier.';
    if (!formData.items.length) return 'Please add at least one item.';

    const seen = new Set();

    for (let i = 0; i < formData.items.length; i += 1) {
      const item = formData.items[i];

      if (!item.medicineId) return `Please select medicine for item ${i + 1}.`;

      if (seen.has(String(item.medicineId))) {
        return `Duplicate medicine selected in item ${i + 1}. Please use each medicine only once.`;
      }
      seen.add(String(item.medicineId));

      if (!Number(item.quantity) || Number(item.quantity) <= 0) {
        return `Quantity must be greater than 0 for item ${i + 1}.`;
      }

      if (item.unitPrice === '' || Number(item.unitPrice) <= 0) {
        return `Unit price must be greater than 0 for item ${i + 1}.`;
      }

      if (Number(item.freeQuantity || 0) < 0) {
        return `Free quantity cannot be negative for item ${i + 1}.`;
      }

      if (Number(item.discountPercent || 0) < 0 || Number(item.discountPercent || 0) > 100) {
        return `Discount must be between 0 and 100 for item ${i + 1}.`;
      }

      if (Number(item.gstPercentage || 0) < 0 || Number(item.gstPercentage || 0) > 100) {
        return `GST must be between 0 and 100 for item ${i + 1}.`;
      }
    }

    return '';
  };

  const handleCreatePurchase = async (e) => {
    e.preventDefault();

    const validationMessage = validateCreateForm();
    if (validationMessage) {
      showValidationToast(showToast, setFormError, validationMessage);
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        supplierId: formData.supplierId,
        supplierInvoiceNumber: formData.supplierInvoiceNumber?.trim() || '',
        notes: formData.notes?.trim() || '',
        dueDate: formData.dueDate ? formData.dueDate + "T00:00:00" : null,
        lrNumber: formData.lrNumber?.trim() || '',
        transport: formData.transport?.trim() || '',
        placeOfSupply: formData.placeOfSupply?.trim() || '',
        reverseCharge: formData.reverseCharge || false,
        termsAndConditions: formData.termsAndConditions?.trim() || '',
        items: formData.items.map((item) => ({
          medicineId: item.medicineId,
          batchNumber: item.batchNumber?.trim() || null,
          expiryDate: item.expiryDate?.trim() || null,
          quantity: Number(item.quantity),
          freeQuantity: Number(item.freeQuantity || 0),
          unitPrice: Number(item.unitPrice),
          mrp: item.mrp ? Number(item.mrp) : null,
          pack: item.pack || null,
          hsn: item.hsn || null,
          discountPercent: Number(item.discountPercent || 0),
          gstPercentage: Number(item.gstPercentage || 0),
        })),
      };

      await createPurchase(payload);
      showToast('success', 'Purchase order created successfully.');
      setShowCreateModal(false);
      resetCreateForm();
      if (page !== 0) {
        setPage(0);
      } else {
        await fetchData();
      }
    } catch (e2) {
      console.error(e2);
      const message = getApiErrorMessage(e2, 'Failed to create purchase order.');
      setFormError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewPurchase = async (purchaseId) => {
    setShowViewModal(true);
    setDetailsLoading(true);
    setSelectedPurchase(null);

    try {
      const res = await getPurchaseById(purchaseId);
      setSelectedPurchase(res?.data?.data || null);
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to load purchase details.'));
      setShowViewModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const refreshVisiblePurchaseIfOpen = async (purchaseId) => {
    if (!selectedPurchase?.id || String(selectedPurchase.id) !== String(purchaseId)) return;
    try {
      const res = await getPurchaseById(purchaseId);
      setSelectedPurchase(res?.data?.data || null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprovePurchase = async (purchase) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to approve purchase orders.');
      return;
    }

    if (purchase.status !== 'DRAFT') {
      showToast('error', 'Only draft purchase orders can be approved.');
      return;
    }

    setRowActionId(`approve-${purchase.id}`);
    try {
      await approvePurchase(purchase.id);
      showToast('success', `Purchase order ${purchase.orderNumber || ''} approved successfully.`);
      await fetchData();
      await refreshVisiblePurchaseIfOpen(purchase.id);
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to approve purchase order.'));
    } finally {
      setRowActionId('');
    }
  };

  const handleReceivePurchase = async (purchase) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to receive purchase orders.');
      return;
    }

    if (purchase.status !== 'APPROVED') {
      showToast('error', 'Only approved purchase orders can be received.');
      return;
    }

    setRowActionId(`receive-${purchase.id}`);
    try {
      await receivePurchase(purchase.id);
      showToast('success', `Purchase order ${purchase.orderNumber || ''} received successfully.`);
      await fetchData();
      await refreshVisiblePurchaseIfOpen(purchase.id);
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to receive purchase order.'));
    } finally {
      setRowActionId('');
    }
  };

  const handleGenerateInvoice = async (purchase) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to generate invoices.');
      return;
    }

    if (purchase.invoiceNumber) {
      showToast('error', 'Invoice has already been generated for this purchase order.');
      return;
    }

    if (purchase.status !== 'RECEIVED') {
      showToast('error', 'Invoice can only be generated after the purchase order is received.');
      return;
    }

    setRowActionId(`invoice-${purchase.id}`);
    try {
      await generatePurchaseInvoice(purchase.id);
      showToast('success', `Invoice generated for ${purchase.orderNumber || 'purchase order'}.`);
      await fetchData();
      await refreshVisiblePurchaseIfOpen(purchase.id);
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to generate invoice.'));
    } finally {
      setRowActionId('');
    }
  };

  const handleDownloadInvoicePdf = async (purchase) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to download invoices.');
      return;
    }

    if (!purchase.invoiceNumber) {
      showToast('error', 'Generate invoice first before downloading PDF.');
      return;
    }

    setRowActionId(`download-${purchase.id}`);
    try {
      const response = await downloadPurchaseInvoicePdf(purchase.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${purchase.invoiceNumber || purchase.orderNumber || 'purchase-invoice'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
      showToast('success', 'Invoice PDF downloaded successfully.');
    } catch (e) {
      console.error(e);
      showToast('error', await getBlobErrorMessage(e, 'Failed to download invoice PDF.'));
    } finally {
      setRowActionId('');
    }
  };

  const openReturnModal = async (purchase) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to return purchase orders.');
      return;
    }

    if (purchase.status !== 'RECEIVED') {
      showToast('error', 'Only received purchase orders can be returned.');
      return;
    }

    if (Number(purchase.totalAmount || 0) <= 0) {
      showToast('error', 'This purchase order is already fully returned.');
      return;
    }

    setReturnError('');
    setPurchaseToReturn(purchase);
    setShowReturnModal(true);
    setDetailsLoading(true);

    try {
      const res = await getPurchaseById(purchase.id);
      const details = res?.data?.data || purchase;

      const alreadyFullyReturned = Number(details.totalAmount || 0) <= 0;

      if (alreadyFullyReturned) {
        showValidationToast(showToast, setReturnError, 'This purchase order is already fully returned.');
      }

      setPurchaseToReturn(details);
      setReturnForm({
        reason: '',
        items: (details.items || []).map((item) => ({
          medicineId: item.medicineId,
          purchasedQuantity: alreadyFullyReturned ? 0 : Number(item.quantity || 0),
          returnQuantity: 0,
          unitPrice: Number(item.unitPrice || 0),
          gstPercentage: Number(item.gstPercentage || 0),
        })),
      });
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to load purchase return details.'));
      setShowReturnModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateReturnQty = (index, value) => {
    setReturnForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              returnQuantity: value,
            }
          : item
      ),
    }));
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();

    if (!purchaseToReturn?.id) return;

    if (Number(purchaseToReturn.totalAmount || 0) <= 0) {
      showValidationToast(showToast, setReturnError, 'This purchase order is already fully returned.');
      return;
    }

    const selectedItems = returnForm.items
      .map((item) => ({
        medicineId: item.medicineId,
        quantity: Number(item.returnQuantity || 0),
      }))
      .filter((item) => item.quantity > 0);

    if (!selectedItems.length) {
      showValidationToast(showToast, setReturnError, 'Please enter return quantity for at least one item.');
      return;
    }

    for (const item of returnForm.items) {
      const returnQty = Number(item.returnQuantity || 0);
      const purchasedQty = Number(item.purchasedQuantity || 0);

      if (returnQty < 0) {
        setReturnError('Return quantity cannot be negative.');
        return;
      }

      if (returnQty > purchasedQty) {
        setReturnError('Return quantity cannot be greater than purchased quantity.');
        return;
      }
    }

    setSubmitting(true);
    setReturnError('');
    setRowActionId(`return-${purchaseToReturn.id}`);

    try {
      const purchaseId = purchaseToReturn.id;

      await returnPurchase(purchaseId, {
        reason: returnForm.reason?.trim() || 'Purchase returned',
        items: selectedItems,
      });

      showToast('success', 'Purchase return completed successfully.');
      closeReturnModal();
      await fetchData();
      await refreshVisiblePurchaseIfOpen(purchaseId);
    } catch (e2) {
      console.error(e2);
      const message = getApiErrorMessage(e2, 'Failed to process purchase return.');
      setReturnError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
      setRowActionId('');
    }
  };
    const openPaymentModal = (purchase) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to update payment.');
      return;
    }

    if (!purchase.invoiceNumber) {
      showToast('error', 'Generate invoice first before updating payment.');
      return;
    }

    if (purchase.paymentStatus === 'PAID') {
      showToast('error', 'Payment is already completed for this purchase order.');
      return;
    }

    setSelectedPurchase(purchase);
    setPaymentError('');
    setPaymentForm({
      paymentStatus: purchase.paymentStatus || 'UNPAID',
      amountPaid: purchase.amountPaid != null ? String(purchase.amountPaid) : '0',
    });
    setShowPaymentModal(true);
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!selectedPurchase?.id) return;

    setSubmitting(true);
    setPaymentError('');

    try {
      const total = Number(selectedPurchase?.totalAmount || 0);
      const existingPaid = Number(selectedPurchase?.amountPaid || 0);
      let newAmount = Number(paymentForm.amountPaid || 0);

      if (paymentForm.paymentStatus === 'PAID') {
        newAmount = total;
      }

      if (paymentForm.paymentStatus === 'PARTIALLY_PAID') {
        if (newAmount <= 0) {
          showValidationToast(showToast, setPaymentError, 'Amount must be greater than 0.');
          setSubmitting(false);
          return;
        }

        if (newAmount >= total) {
          showValidationToast(showToast, setPaymentError, 'Use PAID if full amount is paid.');
          setSubmitting(false);
          return;
        }

        if (newAmount < existingPaid) {
          showValidationToast(showToast, setPaymentError, 'Cannot reduce already paid amount.');
          setSubmitting(false);
          return;
        }
      }

      if (paymentForm.paymentStatus === 'UNPAID') {
        if (existingPaid > 0) {
          showValidationToast(showToast, setPaymentError, 'Cannot mark unpaid after payment is already recorded.');
          setSubmitting(false);
          return;
        }
        newAmount = 0;
      }

      const purchaseId = selectedPurchase.id;

      await updatePurchasePayment(purchaseId, {
        paymentStatus: paymentForm.paymentStatus,
        amountPaid: newAmount,
      });

      showToast('success', 'Payment updated successfully.');
      closePaymentModal();
      await fetchData();
      await refreshVisiblePurchaseIfOpen(purchaseId);
    } catch (e2) {
      console.error(e2);
      const message = getApiErrorMessage(e2, 'Failed to update payment.');
      setPaymentError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePurchase = (purchase) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to delete purchase orders.');
      return;
    }

    if (purchase.status !== 'DRAFT') {
      showToast('error', 'Only draft purchase orders can be deleted.');
      return;
    }

    setPurchaseToDelete(purchase);
    setShowDeleteModal(true);
  };

  const confirmDeletePurchase = async () => {
    if (!purchaseToDelete) return;

    setRowActionId(`delete-${purchaseToDelete.id}`);

    try {
      await deletePurchase(purchaseToDelete.id);
      showToast('success', 'Purchase order deleted successfully.');
      const targetPage = purchases.length === 1 && page > 0 ? page - 1 : page;
      setShowDeleteModal(false);
      setPurchaseToDelete(null);

      if (targetPage !== page) {
        setPage(targetPage);
      } else {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to delete purchase order.'));
    } finally {
      setRowActionId('');
    }
  };

  const canApprove = (purchase) => canManage && purchase.status === 'DRAFT';
  const canReceive = (purchase) => canManage && purchase.status === 'APPROVED';
  const canGenerateInvoice = (purchase) =>
    canManage && purchase.status === 'RECEIVED' && !purchase.invoiceNumber;
  const canUpdatePayment = (purchase) =>
    canManage && !!purchase.invoiceNumber && purchase.paymentStatus !== 'PAID';
  const canReturn = (purchase) =>
    canManage &&
    purchase.status === 'RECEIVED' &&
    Number(purchase.totalAmount || 0) > 0;
  const canDelete = (purchase) => canManage && purchase.status === 'DRAFT';
  const canDownloadPdf = (purchase) => canManage && !!purchase.invoiceNumber;

  const isRowActionLoading = (purchaseId) =>
    rowActionId === `approve-${purchaseId}` ||
    rowActionId === `receive-${purchaseId}` ||
    rowActionId === `invoice-${purchaseId}` ||
    rowActionId === `download-${purchaseId}` ||
    rowActionId === `return-${purchaseId}` ||
    rowActionId === `delete-${purchaseId}`;

  const isLastPage =
    totalPages > 0 ? page >= totalPages - 1 : purchases.length < pageSize;

  const existingPaidAmount = Number(selectedPurchase?.amountPaid || 0);
  const paymentTotalAmount = Number(
    selectedPurchase?.grandTotal != null ? selectedPurchase.grandTotal : selectedPurchase?.totalAmount || 0
  );
  const paymentAmountPaid =
    paymentForm.paymentStatus === 'PAID'
      ? paymentTotalAmount
      : paymentForm.paymentStatus === 'UNPAID'
        ? 0
        : Number(paymentForm.amountPaid || 0);
  const paymentAmountDue = Math.max(paymentTotalAmount - paymentAmountPaid, 0);

  const paymentOptions =
    existingPaidAmount > 0
      ? ['PARTIALLY_PAID', 'PAID']
      : ['UNPAID', 'PARTIALLY_PAID', 'PAID'];

  return (
    <div>
      {toast && (
        <div
          role="alert"
          style={{
            ...toastStyle,
            background: toast.type === 'error' ? '#dc2626' : '#16a34a',
          }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>
            {toast.type === 'error' ? '⚠️' : '✅'}
          </span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} style={toastCloseBtnStyle}>
            <X size={14} />
          </button>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          marginBottom: '24px',
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
            }}
          >
            <ShoppingCart size={28} color="#2d3a8c" /> Purchase Orders
          </h1>
          <p style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
            Manage supplier purchase orders, approvals, receiving, invoices, payments, and returns.
          </p>
        </div>

        {canManage && (
          <button className="btn-primary" onClick={openCreateModal} type="button">
            <Plus size={16} /> New PO
          </button>
        )}
      </div>

      <div
        className="card"
        style={{
          marginBottom: '18px',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(170px, 190px) minmax(190px, 220px) auto',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <div className="search-bar" style={{ minWidth: '280px' }}>
          <Search size={15} color="var(--text-soft, #94a3b8)" />
          <input
            type="text"
            placeholder="Search by order number, supplier, invoice..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput('')} style={clearBtnStyle}>
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field"
          style={{ width: '100%', height: '42px' }}
        >
          {STATUS_FILTERS.map((status) => (
            <option key={status} value={status}>
              {status === 'ALL' ? 'All Statuses' : status}
            </option>
          ))}
        </select>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="input-field"
          style={{ width: '100%', height: '42px' }}
        >
          <option value="ALL">All Suppliers</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name || supplier.supplierName || supplier.id}
            </option>
          ))}
        </select>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <select
            value={pageSize}
            onChange={(e) => {
              setPage(0);
              setPageSize(Number(e.target.value));
            }}
            className="input-field"
            style={{ width: '120px', height: '42px', paddingRight: '28px' }}
            title="Rows per page"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>

          <button className="btn-secondary" onClick={fetchData} disabled={loading} type="button">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {listError && (
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
          {listError}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '18px',
        }}
      >
        <StatCard
          title="Total Orders"
          value={totalElements}
          icon={<ShoppingCart size={18} color="#2d3a8c" />}
        />
        <StatCard
          title="Visible Orders"
          value={filteredPurchases.length}
          icon={<Filter size={18} color="#2563eb" />}
        />
        <StatCard
          title="Received"
          value={filteredPurchases.filter((item) => item.status === 'RECEIVED').length}
          icon={<Package size={18} color="#16a34a" />}
        />
        <StatCard
          title="Unpaid"
          value={filteredPurchases.filter((item) => item.paymentStatus === 'UNPAID').length}
          icon={<Wallet size={18} color="#dc2626" />}
        />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading && !initialLoadDone ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#718096' }}>
            Loading purchase orders...
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div style={{ padding: '44px', textAlign: 'center' }}>
            <ShoppingCart size={46} color="#c1c9e0" />
            <h3 style={{ color: '#718096', marginTop: '14px', fontWeight: '700' }}>
              No purchase orders found
            </h3>
            <p style={{ color: '#a0aec0', fontSize: '13px', marginTop: '6px' }}>
              Try changing search or filters, or create your first purchase order.
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: '1480px',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                }}
              >
                <thead>
                  <tr style={{ background: 'var(--bg-card-soft, #f8fafc)' }}>
                    <th style={tableHeadStyle}>Order No.</th>
                    <th style={tableHeadStyle}>Supplier</th>
                    <th style={tableHeadStyle}>Order Date</th>
                    <th style={tableHeadStyle}>Status</th>
                    <th style={tableHeadStyle}>Payment</th>
                    <th style={tableHeadStyle}>Invoice</th>
                    <th style={tableHeadStyle}>Total</th>
                    <th style={{ ...tableHeadStyle, minWidth: '520px' }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPurchases.map((purchase) => {
                    const actionLoading = isRowActionLoading(purchase.id);

                    return (
                      <tr key={purchase.id}>
                        <td style={{ ...tableCellStyle, fontWeight: 700 }}>
                          {purchase.orderNumber || '-'}
                        </td>

                        <td style={tableCellStyle}>
                          <div
                            style={{
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {getSupplierName(purchase.supplierId)}
                          </div>
                        </td>

                        <td style={tableCellStyle}>
                          {formatDate(purchase.orderDate || purchase.createdAt)}
                        </td>

                        <td style={tableCellStyle}>
                          <Pill type={getStatusType(purchase.status)}>
                            {purchase.status || '-'}
                          </Pill>
                        </td>

                        <td style={tableCellStyle}>
                          <Pill type={getPaymentType(purchase.paymentStatus)}>
                            {formatPaymentStatusLabel(purchase.paymentStatus)}
                          </Pill>
                        </td>

                        <td style={tableCellStyle}>
                          <div
                            style={{
                              maxWidth: '260px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={purchase.invoiceNumber || '-'}
                          >
                            {purchase.invoiceNumber || '-'}
                          </div>
                        </td>

                        <td style={{ ...tableCellStyle, fontWeight: 700 }}>
                          {formatCurrency(purchase.totalAmount)}
                        </td>

                        <td style={tableCellStyle}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              className="btn-secondary"
                              style={smallBtnStyle}
                              type="button"
                              onClick={() => handleViewPurchase(purchase.id)}
                              disabled={actionLoading}
                            >
                              <Eye size={14} /> View
                            </button>

                            {canManage && (
                              <>
                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    opacity: canApprove(purchase) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => handleApprovePurchase(purchase)}
                                  disabled={!canApprove(purchase) || actionLoading}
                                  title={canApprove(purchase) ? 'Approve purchase order' : 'Only draft orders can be approved'}
                                >
                                  <CheckCircle2 size={14} /> Approve
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    opacity: canReceive(purchase) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => handleReceivePurchase(purchase)}
                                  disabled={!canReceive(purchase) || actionLoading}
                                  title={canReceive(purchase) ? 'Receive purchase order' : 'Only approved orders can be received'}
                                >
                                  <Truck size={14} /> Receive
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    opacity: canGenerateInvoice(purchase) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => handleGenerateInvoice(purchase)}
                                  disabled={!canGenerateInvoice(purchase) || actionLoading}
                                  title={
                                    purchase.invoiceNumber
                                      ? 'Invoice already generated'
                                      : purchase.status !== 'RECEIVED'
                                        ? 'Invoice can be generated only after receiving'
                                        : 'Generate invoice'
                                  }
                                >
                                  <FileText size={14} /> Invoice
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    opacity: canDownloadPdf(purchase) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => handleDownloadInvoicePdf(purchase)}
                                  disabled={!canDownloadPdf(purchase) || actionLoading}
                                  title={purchase.invoiceNumber ? 'Download invoice PDF' : 'Generate invoice first'}
                                >
                                  <Download size={14} /> Download PDF
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    color: '#9333ea',
                                    opacity: canReturn(purchase) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => openReturnModal(purchase)}
                                  disabled={!canReturn(purchase) || actionLoading}
                                  title={
                                    purchase.status !== 'RECEIVED'
                                      ? 'Only received purchase orders can be returned'
                                      : Number(purchase.totalAmount || 0) <= 0
                                        ? 'This purchase order is already fully returned'
                                        : 'Return purchased items to supplier'
                                  }
                                >
                                  <RotateCcw size={14} /> Return
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    opacity: canUpdatePayment(purchase) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => openPaymentModal(purchase)}
                                  disabled={!canUpdatePayment(purchase) || actionLoading}
                                  title={
                                    purchase.paymentStatus === 'PAID'
                                      ? 'Payment already completed'
                                      : purchase.invoiceNumber
                                        ? 'Update payment'
                                        : 'Generate invoice first'
                                  }
                                >
                                  <Wallet size={14} /> Payment
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    color: '#dc2626',
                                    opacity: canDelete(purchase) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => handleDeletePurchase(purchase)}
                                  disabled={!canDelete(purchase) || actionLoading}
                                  title={canDelete(purchase) ? 'Delete purchase order' : 'Only draft orders can be deleted'}
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
                Showing <strong>{filteredPurchases.length}</strong> visible orders on page{' '}
                <strong>{page + 1}</strong> of <strong>{totalPages || 1}</strong>
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
                  disabled={isLastPage}
                  onClick={() => setPage((prev) => prev + 1)}
                  type="button"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal open={showCreateModal} title="Create Purchase Order" onClose={closeCreateModal} width="1100px">
        <form onSubmit={handleCreatePurchase}>
          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Supplier</label>
              <select
                className="input-field"
                value={formData.supplierId}
                onChange={(e) => setFormData((prev) => ({ ...prev, supplierId: e.target.value }))}
                style={fullInputStyle}
                required
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name || supplier.supplierName || supplier.id}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={labelStyle}>Supplier Invoice Number</label>
              <input
                className="input-field"
                type="text"
                value={formData.supplierInvoiceNumber || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, supplierInvoiceNumber: e.target.value }))}
                style={fullInputStyle}
                placeholder="Optional"
              />
            </div>
            
            <div>
              <label style={labelStyle}>Due Date</label>
              <input
                className="input-field"
                type="date"
                value={formData.dueDate || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                style={fullInputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>LR Number</label>
              <input
                className="input-field"
                type="text"
                value={formData.lrNumber || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, lrNumber: e.target.value }))}
                style={fullInputStyle}
                placeholder="Optional"
              />
            </div>

            <div>
              <label style={labelStyle}>Transport</label>
              <input
                className="input-field"
                type="text"
                value={formData.transport || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, transport: e.target.value }))}
                style={fullInputStyle}
                placeholder="Optional"
              />
            </div>

            <div>
              <label style={labelStyle}>Place of Supply</label>
              <input
                className="input-field"
                type="text"
                value={formData.placeOfSupply || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, placeOfSupply: e.target.value }))}
                style={fullInputStyle}
                placeholder="Optional (State)"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginTop: '30px' }}>
              <input
                type="checkbox"
                id="reverseCharge"
                checked={formData.reverseCharge || false}
                onChange={(e) => setFormData((prev) => ({ ...prev, reverseCharge: e.target.checked }))}
                style={{ marginRight: '8px', width: '18px', height: '18px' }}
              />
              <label htmlFor="reverseCharge" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                Reverse Charge
              </label>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Terms and Conditions</label>
              <textarea
                className="input-field"
                rows={2}
                value={formData.termsAndConditions || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, termsAndConditions: e.target.value }))}
                style={{ ...fullInputStyle, resize: 'vertical', paddingTop: '12px' }}
                placeholder="Optional Terms and Conditions"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                className="input-field"
                rows={2}
                value={formData.notes || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                style={{ ...fullInputStyle, resize: 'vertical', paddingTop: '12px' }}
                placeholder="Optional internal notes"
              />
            </div>
          </div>

          {selectedSupplier && (
            <div
              className="card"
              style={{
                marginTop: '16px',
                padding: '14px',
                background: 'var(--bg-card-soft, #f8fafc)',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 800, marginBottom: '8px' }}>
                SUPPLIER DETAILS
              </div>
              <div style={supplierMetaGridStyle}>
                <SupplierMeta label="Name" value={selectedSupplier.name || selectedSupplier.supplierName || '-'} />
                <SupplierMeta label="Phone" value={selectedSupplier.phone || selectedSupplier.contactNumber || '-'} />
                <SupplierMeta label="GST" value={selectedSupplier.gstNumber || '-'} />
                <SupplierMeta label="Email" value={selectedSupplier.email || '-'} />
              </div>
            </div>
          )}

          <div style={{ marginTop: '18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #1f2937)' }}>Items</h4>
              <button type="button" className="btn-secondary" onClick={addItemRow}>
                <Plus size={15} /> Add Item
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {formData.items.map((item, index) => {
                const selectedMedicine = medicineMap[String(item.medicineId)];
                const itemAmounts = calculateItemAmounts(item);

                return (
                  <div
                    key={`item-${index + 1}`}
                    className="card"
                    style={{
                      padding: '14px',
                      border: '1px solid #e5e7eb',
                      background: '#fafcff',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(260px, 2fr) repeat(3, minmax(120px, 1fr)) auto',
                        gap: '10px',
                        alignItems: 'end',
                      }}
                    >
                      <div>
                        <label style={labelStyle}>Medicine</label>
                        <SearchableMedicineSelect
                          medicines={medicines}
                          value={item.medicineId}
                          onChange={(medicineId, medicine) => handleMedicineSelect(index, medicineId, medicine)}
                          usedMedicineIds={usedMedicineIds}
                        />
                      </div>

                      <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                        <div>
                          <label style={labelStyle}>Batch Number</label>
                          <input
                            className="input-field"
                            type="text"
                            value={item.batchNumber || ''}
                            onChange={(e) => updateItemField(index, 'batchNumber', e.target.value)}
                            style={fullInputStyle}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Expiry Date</label>
                          <input
                            className="input-field"
                            type="text"
                            value={item.expiryDate || ''}
                            onChange={(e) => updateItemField(index, 'expiryDate', e.target.value)}
                            style={fullInputStyle}
                            placeholder="MM/YYYY or dd/MM/yyyy"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Pack</label>
                          <input
                            className="input-field"
                            type="text"
                            value={item.pack || ''}
                            onChange={(e) => updateItemField(index, 'pack', e.target.value)}
                            style={fullInputStyle}
                            placeholder="e.g. 10x10"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>HSN</label>
                          <input
                            className="input-field"
                            type="text"
                            value={item.hsn || ''}
                            onChange={(e) => updateItemField(index, 'hsn', e.target.value)}
                            style={fullInputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>MRP</label>
                          <input
                            className="input-field"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.mrp || ''}
                            onChange={(e) => updateItemField(index, 'mrp', e.target.value)}
                            style={fullInputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Quantity</label>
                          <input
                            className="input-field"
                            type="number"
                            min="1"
                            value={item.quantity || ''}
                            onChange={(e) => updateItemField(index, 'quantity', e.target.value)}
                            style={fullInputStyle}
                            required
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Free Qty</label>
                          <input
                            className="input-field"
                            type="number"
                            min="0"
                            value={item.freeQuantity || ''}
                            onChange={(e) => updateItemField(index, 'freeQuantity', e.target.value)}
                            style={fullInputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Rate</label>
                          <input
                            className="input-field"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateItemField(index, 'unitPrice', e.target.value)}
                            style={fullInputStyle}
                            required
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Disc %</label>
                          <input
                            className="input-field"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discountPercent || ''}
                            onChange={(e) => updateItemField(index, 'discountPercent', e.target.value)}
                            style={fullInputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>GST %</label>
                          <input
                            className="input-field"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.gstPercentage || ''}
                            onChange={(e) => updateItemField(index, 'gstPercentage', e.target.value)}
                            style={fullInputStyle}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => removeItemRow(index)}
                        disabled={formData.items.length === 1}
                        style={{
                          ...smallBtnStyle,
                          height: '42px',
                          color: formData.items.length === 1 ? 'var(--text-soft, #94a3b8)' : '#dc2626',
                        }}
                      >
                        <Minus size={14} />
                      </button>
                    </div>

                    <div
                      style={{
                        marginTop: '10px',
                        fontSize: '13px',
                        color: 'var(--text-muted, #64748b)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>
                        Selected:{' '}
                        <strong style={{ color: 'var(--text-main, #111827)' }}>
                          {selectedMedicine ? getMedicineLabel(selectedMedicine) : 'None'}
                        </strong>
                      </span>
                      <span>
                        Taxable:{' '}
                        <strong style={{ color: 'var(--text-main, #111827)' }}>
                          {formatCurrency(itemAmounts.taxableValue)}
                        </strong>
                      </span>
                      <span>
                        GST:{' '}
                        <strong style={{ color: 'var(--text-main, #111827)' }}>
                          {formatCurrency(itemAmounts.gstAmount)}
                        </strong>
                      </span>
                      <span>
                        Line Total:{' '}
                        <strong style={{ color: 'var(--text-main, #111827)' }}>
                          {formatCurrency(itemAmounts.lineTotal)}
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="card"
            style={{
              marginTop: '18px',
              padding: '16px',
              background: 'var(--bg-card-soft, #f8fafc)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={totalsRowStyle}>
              <span>Total Quantity</span>
              <strong>{createTotals.itemCount}</strong>
            </div>
            <div style={totalsRowStyle}>
              <span>Subtotal</span>
              <strong>{formatCurrency(createTotals.subtotal)}</strong>
            </div>
            <div style={totalsRowStyle}>
              <span>Total GST</span>
              <strong>{formatCurrency(createTotals.gstTotal)}</strong>
            </div>
            <div style={{ ...totalsRowStyle, marginTop: '8px', fontSize: '16px' }}>
              <span>Grand Total</span>
              <strong>{formatCurrency(createTotals.total)}</strong>
            </div>
          </div>

          {formError && <div style={errorBoxStyle}>{formError}</div>}

          <div style={modalFooterStyle}>
            <button type="button" className="btn-secondary" onClick={closeCreateModal} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={showViewModal} title="Purchase Order Details" onClose={closeViewModal} width="940px">
        {detailsLoading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#718096' }}>
            Loading details...
          </div>
        ) : !selectedPurchase ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#718096' }}>
            No purchase details found.
          </div>
        ) : (
          <>
            <div style={detailsGridStyle}>
              <DetailItem label="Order Number" value={selectedPurchase.orderNumber || '-'} />
              <DetailItem label="Supplier" value={getSupplierName(selectedPurchase.supplierId)} />
              <DetailItem label="Order Date" value={formatDate(selectedPurchase.orderDate || selectedPurchase.createdAt)} />
              <DetailItem
                label="Status"
                value={
                  <Pill type={getStatusType(selectedPurchase.status)}>
                    {selectedPurchase.status || '-'}
                  </Pill>
                }
              />
              <DetailItem
                label="Payment"
                value={
                  <Pill type={getPaymentType(selectedPurchase.paymentStatus)}>
                    {formatPaymentStatusLabel(selectedPurchase.paymentStatus)}
                  </Pill>
                }
              />
              <DetailItem label="Invoice Number" value={selectedPurchase.invoiceNumber || '-'} />
            </div>

            <div style={{ marginTop: '18px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #1f2937)' }}>Items</h4>

              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    minWidth: '700px',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                  }}
                >
                  <thead>
                    <tr style={{ background: 'var(--bg-card-soft, #f8fafc)' }}>
                      <th style={tableHeadStyle}>Medicine</th>
                      <th style={tableHeadStyle}>Qty</th>
                      <th style={tableHeadStyle}>Unit Price</th>
                      <th style={tableHeadStyle}>GST %</th>
                      <th style={tableHeadStyle}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPurchase.items || []).map((item, index) => {
                      const medicine = medicineMap[String(item.medicineId)];
                      const lineTotal = Number(item.lineTotal ?? 0);

                      return (
                        <tr key={`${item.medicineId || 'med'}-${index + 1}`}>
                          <td style={tableCellStyle}>
                            {medicine ? getMedicineLabel(medicine) : item.medicineId || '-'}
                          </td>
                          <td style={tableCellStyle}>{item.quantity ?? '-'}</td>
                          <td style={tableCellStyle}>{formatCurrency(item.unitPrice)}</td>
                          <td style={tableCellStyle}>{Number(item.gstPercentage || 0)}%</td>
                          <td style={{ ...tableCellStyle, fontWeight: 700 }}>
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className="card"
              style={{
                marginTop: '18px',
                padding: '16px',
                background: 'var(--bg-card-soft, #f8fafc)',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={totalsRowStyle}>
                <span>Subtotal</span>
                <strong>{formatCurrency(selectedPurchase.subtotalAmount ?? 0)}</strong>
              </div>
              <div style={totalsRowStyle}>
                <span>GST Amount</span>
                <strong>{formatCurrency(selectedPurchase.gstAmount ?? 0)}</strong>
              </div>
              <div style={totalsRowStyle}>
                <span>Total Amount</span>
                <strong>
                  {formatCurrency(
                    selectedPurchase.grandTotal != null
                      ? selectedPurchase.grandTotal
                      : selectedPurchase.totalAmount ?? 0
                  )}
                </strong>
              </div>
              <div style={totalsRowStyle}>
                <span>Amount Paid</span>
                <strong>{formatCurrency(selectedPurchase.amountPaid ?? 0)}</strong>
              </div>
              <div style={totalsRowStyle}>
                <span>Balance Due</span>
                <strong>
                  {formatCurrency(
                    Math.max(
                      Number(
                        selectedPurchase.grandTotal != null
                          ? selectedPurchase.grandTotal
                          : selectedPurchase.totalAmount || 0
                      ) - Number(selectedPurchase.amountPaid || 0),
                      0
                    )
                  )}
                </strong>
              </div>
            </div>

            {selectedPurchase.notes && (
              <div style={{ marginTop: '16px' }}>
                <label style={labelStyle}>Notes</label>
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-card-soft, #f8fafc)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    color: '#374151',
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedPurchase.notes}
                </div>
              </div>
            )}

            <div style={modalFooterStyle}>
              <button type="button" className="btn-primary" onClick={closeViewModal}>
                Close
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={showReturnModal} title="Purchase Return" onClose={closeReturnModal} width="900px">
        {detailsLoading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#718096' }}>
            Loading return details...
          </div>
        ) : (
          <form onSubmit={handleSubmitReturn}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Purchase Order</label>
              <div style={readonlyBoxStyle}>{purchaseToReturn?.orderNumber || '-'}</div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Return Reason</label>
              <textarea
                className="input-field"
                rows={3}
                value={returnForm.reason}
                onChange={(e) =>
                  setReturnForm((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                style={{ ...fullInputStyle, resize: 'vertical', paddingTop: '12px' }}
                placeholder="Example: damaged items, wrong supply, expired stock..."
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: '760px',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                }}
              >
                <thead>
                  <tr style={{ background: 'var(--bg-card-soft, #f8fafc)' }}>
                    <th style={tableHeadStyle}>Medicine</th>
                    <th style={tableHeadStyle}>Purchased Qty</th>
                    <th style={tableHeadStyle}>Return Qty</th>
                    <th style={tableHeadStyle}>Unit Price</th>
                    <th style={tableHeadStyle}>GST %</th>
                  </tr>
                </thead>

                <tbody>
                  {(returnForm.items || []).map((item, index) => {
                    const medicine = medicineMap[String(item.medicineId)];

                    return (
                      <tr key={`${item.medicineId || 'return'}-${index + 1}`}>
                        <td style={tableCellStyle}>
                          {medicine ? getMedicineLabel(medicine) : item.medicineId || '-'}
                        </td>

                        <td style={tableCellStyle}>{item.purchasedQuantity}</td>

                        <td style={tableCellStyle}>
                          <input
                            className="input-field"
                            type="number"
                            min="0"
                            max={item.purchasedQuantity}
                            value={item.returnQuantity}
                            onChange={(e) => updateReturnQty(index, e.target.value)}
                            disabled={item.purchasedQuantity <= 0 || Number(purchaseToReturn?.totalAmount || 0) <= 0}
                            style={{ width: '120px' }}
                          />
                        </td>

                        <td style={tableCellStyle}>{formatCurrency(item.unitPrice)}</td>
                        <td style={tableCellStyle}>{Number(item.gstPercentage || 0)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
                color: '#6b21a8',
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              Purchase return will reduce stock from received purchase batches and record the return reason.
            </div>

            {returnError && <div style={errorBoxStyle}>{returnError}</div>}

            <div style={modalFooterStyle}>
              <button type="button" className="btn-secondary" onClick={closeReturnModal} disabled={submitting}>
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || Number(purchaseToReturn?.totalAmount || 0) <= 0}
                style={{
                  background: Number(purchaseToReturn?.totalAmount || 0) <= 0 ? 'var(--text-soft, #94a3b8)' : '#9333ea',
                  borderColor: Number(purchaseToReturn?.totalAmount || 0) <= 0 ? 'var(--text-soft, #94a3b8)' : '#9333ea',
                }}
              >
                {submitting ? 'Processing Return...' : 'Submit Return'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={showPaymentModal} title="Update Payment Status" onClose={closePaymentModal} width="620px">
        <form onSubmit={handleUpdatePayment}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Purchase Order</label>
              <div style={readonlyBoxStyle}>{selectedPurchase?.orderNumber || '-'}</div>
            </div>

            <div style={supplierMetaGridStyle}>
              <SupplierMeta label="Total Amount" value={formatCurrency(paymentTotalAmount)} />
              <SupplierMeta label="Amount Paid" value={formatCurrency(existingPaidAmount)} />
              <SupplierMeta label="Amount Due" value={formatCurrency(paymentAmountDue)} />
            </div>

            <div>
              <label style={labelStyle}>Payment Status</label>
              <select
                className="input-field"
                value={paymentForm.paymentStatus}
                onChange={(e) => {
                  const status = e.target.value;
                  setPaymentForm((prev) => ({
                    ...prev,
                    paymentStatus: status,
                    amountPaid:
                      status === 'PAID'
                        ? String(paymentTotalAmount)
                        : status === 'UNPAID'
                          ? '0'
                          : prev.amountPaid,
                  }));
                }}
                style={fullInputStyle}
                required
              >
                {paymentOptions.map((status) => (
                  <option
                    key={status}
                    value={status}
                    disabled={status === 'UNPAID' && existingPaidAmount > 0}
                  >
                    {formatPaymentStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            {paymentForm.paymentStatus === 'PARTIALLY_PAID' && (
              <div>
                <label style={labelStyle}>Amount Paid</label>
                <input
                  className="input-field"
                  type="number"
                  min={existingPaidAmount || 0}
                  step="0.01"
                  value={paymentForm.amountPaid}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, amountPaid: e.target.value }))}
                  style={fullInputStyle}
                  placeholder="Enter amount paid"
                />
              </div>
            )}

            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted, #64748b)',
                lineHeight: 1.5,
                background: 'var(--bg-card-soft, #f8fafc)',
                border: '1px solid #e5e7eb',
                padding: '10px 12px',
                borderRadius: '12px',
              }}
            >
              Partial payment is saved in backend. Amount cannot exceed total and cannot be reduced below already paid amount.
            </div>
          </div>

          {paymentError && <div style={errorBoxStyle}>{paymentError}</div>}

          <div style={modalFooterStyle}>
            <button type="button" className="btn-secondary" onClick={closePaymentModal} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Payment'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={showDeleteModal} title="Delete Purchase Order" onClose={closeDeleteModal} width="520px">
        <div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted, #475569)', lineHeight: 1.6 }}>
            Are you sure you want to delete purchase order{' '}
            <strong>{purchaseToDelete?.orderNumber || '-'}</strong>?
          </p>

          <p style={{ marginTop: '10px', fontSize: '13px', color: '#b91c1c', fontWeight: 600 }}>
            This action cannot be undone.
          </p>

          <div style={modalFooterStyle}>
            <button
              type="button"
              className="btn-secondary"
              onClick={closeDeleteModal}
              disabled={rowActionId.startsWith('delete-')}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={confirmDeletePurchase}
              disabled={rowActionId.startsWith('delete-')}
              style={{
                background: '#dc2626',
                borderColor: '#dc2626',
              }}
            >
              {rowActionId.startsWith('delete-') ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const StatCard = ({ title, value, icon }) => (
  <div className="card" style={{ padding: '14px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: '12px', color: '#718096' }}>{title}</div>
        <div style={{ fontSize: '18px', fontWeight: '700' }}>{value}</div>
      </div>
      {icon}
    </div>
  </div>
);

const DetailItem = ({ label, value }) => (
  <div
    className="card"
    style={{
      padding: '14px',
      border: '1px solid #e5e7eb',
      background: 'var(--bg-table-row, #fbfdff)',
    }}
  >
    <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginBottom: '6px', fontWeight: 700 }}>
      {label}
    </div>
    <div style={{ fontSize: '14px', color: 'var(--text-main, #111827)', fontWeight: 600 }}>
      {value}
    </div>
  </div>
);

const SupplierMeta = ({ label, value }) => (
  <div>
    <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 700, marginBottom: '4px' }}>
      {label}
    </div>
    <div style={{ fontSize: '14px', color: 'var(--text-main, #111827)', fontWeight: 600 }}>
      {value || '-'}
    </div>
  </div>
);

const clearBtnStyle = {
  border: 'none',
  background: 'none',
  cursor: 'pointer',
};

const smallBtnStyle = {
  padding: '6px 10px',
  fontSize: '12px',
};

const tableHeadStyle = {
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

const tableCellStyle = {
  padding: '16px',
  fontSize: '14px',
  color: 'var(--text-main, #1f2937)',
  borderBottom: '1px solid var(--bg-card-soft, #f1f5f9)',
  verticalAlign: 'middle',
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.55)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '32px 16px',
  overflowY: 'auto',
  zIndex: 9999,
};

const modalCardStyle = {
  width: '100%',
  margin: '0 auto',
  borderRadius: '20px',
  boxShadow: '0 30px 80px rgba(15, 23, 42, 0.25)',
  overflow: 'hidden',
};

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '18px',
  borderBottom: '1px solid #e5e7eb',
  background: 'var(--bg-table-row, #fbfdff)',
};

const iconBtnStyle = {
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
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 800,
  color: 'var(--text-muted, #64748b)',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};

const fullInputStyle = {
  width: '100%',
};

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '14px',
};

const modalFooterStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
  marginTop: '20px',
  paddingTop: '16px',
  borderTop: '1px solid #e5e7eb',
};

const totalsRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  fontSize: '14px',
  color: 'var(--text-muted, #334155)',
  marginBottom: '6px',
};

const detailsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px',
};

const supplierMetaGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '12px',
};

const readonlyBoxStyle = {
  minHeight: '42px',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  background: 'var(--bg-card-soft, #f8fafc)',
  padding: '10px 12px',
  display: 'flex',
  alignItems: 'center',
  color: 'var(--text-main, #111827)',
  fontSize: '14px',
  fontWeight: 600,
};

const errorBoxStyle = {
  marginTop: '14px',
  padding: '12px 14px',
  borderRadius: '12px',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#b91c1c',
  fontSize: '13px',
  fontWeight: 600,
};

const toastStyle = {
  position: 'fixed',
  top: '18px',
  right: '18px',
  zIndex: 10000,
  color: 'var(--bg-card, #ffffff)',
  padding: '12px 14px',
  borderRadius: '14px',
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.22)',
  fontSize: '14px',
  fontWeight: 700,
  maxWidth: '460px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  lineHeight: 1.45,
};

const toastCloseBtnStyle = {
  border: 'none',
  background: 'rgba(255,255,255,0.18)',
  color: 'var(--bg-card, #ffffff)',
  width: '24px',
  height: '24px',
  borderRadius: '8px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
};

const searchableTriggerStyle = {
  width: '100%',
  minHeight: '46px',
  border: '1px solid #d1d5db',
  borderRadius: '12px',
  background: 'var(--bg-card, #ffffff)',
  padding: '10px 12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
};

const searchableDropdownStyle = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  right: 0,
  zIndex: 40,
  border: '1px solid #e5e7eb',
  borderRadius: '14px',
  background: 'var(--bg-card, #ffffff)',
  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.16)',
  overflow: 'hidden',
};

const searchInputWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  border: '1px solid #d1d5db',
  borderRadius: '10px',
  padding: '0 10px',
  height: '40px',
  background: 'var(--bg-card, #ffffff)',
};

const searchInputStyle = {
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: '14px',
  color: 'var(--text-main, #111827)',
};

const searchableItemStyle = {
  width: '100%',
  border: 'none',
  borderBottom: '1px solid var(--bg-card-soft, #f1f5f9)',
  background: 'var(--bg-card, #ffffff)',
  padding: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  cursor: 'pointer',
};
