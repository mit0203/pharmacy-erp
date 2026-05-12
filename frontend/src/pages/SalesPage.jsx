import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  TrendingUp,
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
  Minus,
  Filter,
  ChevronsUpDown,
  Check,
  PackageCheck,
  Pencil,
  Download,
  RotateCcw,
} from 'lucide-react';

import {
  getSalesOrders,
  getSaleById,
  createSale,
  updateSale,
  confirmSale,
  dispatchSale,
  completeSale,
  generateSaleInvoice,
  downloadSaleInvoicePdf,
  updateSalePayment,
  deleteSale,
  getCustomers,
  getMedicines,
  returnSale,
} from '../api/services';

import { useAuth } from '../context/AuthContext';

const PAGE_SIZES = [10, 20, 50];
const PAYMENT_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID'];
const STATUS_FILTERS = ['ALL', 'DRAFT', 'CONFIRMED', 'DISPATCHED', 'COMPLETED'];

const defaultFormData = {
  customerId: '',
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
  s === 'COMPLETED'
    ? 'success'
    : s === 'DISPATCHED'
      ? 'info'
      : s === 'CONFIRMED'
        ? 'warning'
        : s === 'DRAFT'
          ? 'gray'
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

const getMedicineDefaultSalePrice = (medicine) => {
  if (!medicine) return '';
  if (medicine.salePrice != null && medicine.salePrice !== '') return Number(medicine.salePrice);
  if (medicine.sellingPrice != null && medicine.sellingPrice !== '') return Number(medicine.sellingPrice);
  if (medicine.mrp != null && medicine.mrp !== '') return Number(medicine.mrp);
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
  const data = response?.data?.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data)) return data;
  return [];
};

const normalizePagedMeta = (response) => {
  const data = response?.data?.data;
  return {
    totalElements: data?.totalElements ?? (Array.isArray(data) ? data.length : 0),
    totalPages: data?.totalPages ?? (Array.isArray(data) ? 1 : 0),
  };
};

const getApiErrorMessage = (error, fallback = 'Something went wrong.') => {
  const data = error?.response?.data;

  if (typeof data === 'string') return data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (data?.detail) return data.detail;

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors
      .map((item) => item?.defaultMessage || item?.message || String(item))
      .join('\n');
  }

  if (data && typeof data === 'object') {
    const firstStringValue = Object.values(data).find((value) => typeof value === 'string' && value.trim());
    if (firstStringValue) return firstStringValue;
  }

  return error?.message || fallback;
};

const getSuccessMessage = (response, fallback) =>
  response?.data?.message || fallback;


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

export default function SalesPage() {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(['ADMIN', 'STORE_MANAGER']);

  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [medicines, setMedicines] = useState([]);

  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [listError, setListError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');

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
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [formData, setFormData] = useState(defaultFormData);
  const [formError, setFormError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState(null);

  const [selectedSale, setSelectedSale] = useState(null);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [saleToReturn, setSaleToReturn] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    paymentStatus: 'UNPAID',
    amountPaid: '',
  });
  const [paymentError, setPaymentError] = useState('');

  const [returnForm, setReturnForm] = useState({
    reason: '',
    items: [],
  });
  const [returnError, setReturnError] = useState('');

  const customerMap = useMemo(() => {
    const m = {};
    customers.forEach((c) => {
      m[String(c.id)] = c;
    });
    return m;
  }, [customers]);

  const medicineMap = useMemo(() => {
    const m = {};
    medicines.forEach((med) => {
      m[String(med.id)] = med;
    });
    return m;
  }, [medicines]);

  const getCustomerName = (id) =>
    customerMap[String(id)]?.name || customerMap[String(id)]?.customerName || id || '-';

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === String(formData.customerId)) || null,
    [customers, formData.customerId]
  );

  const usedMedicineIds = useMemo(
    () => formData.items.map((item) => item.medicineId).filter(Boolean),
    [formData.items]
  );

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const statusOk = statusFilter === 'ALL' || sale.status === statusFilter;
      const paymentOk = paymentFilter === 'ALL' || sale.paymentStatus === paymentFilter;
      const customerOk =
        customerFilter === 'ALL' || String(sale.customerId) === String(customerFilter);
      return statusOk && paymentOk && customerOk;
    });
  }, [sales, statusFilter, paymentFilter, customerFilter]);

  const paymentTotalAmount = Number(selectedSale?.totalAmount || 0);
  const existingPaidAmount = Number(selectedSale?.amountPaid || 0);
  const currentPaymentInput = Number(paymentForm.amountPaid || 0);

  const paymentOptions =
    existingPaidAmount > 0
      ? ['PARTIALLY_PAID', 'PAID']
      : ['UNPAID', 'PARTIALLY_PAID', 'PAID'];

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setListError('');

    try {
      const res = await getSalesOrders({ page, size: pageSize, search });
      const list = normalizePagedList(res);
      const meta = normalizePagedMeta(res);

      setSales(list);
      setTotalElements(meta.totalElements);
      setTotalPages(meta.totalPages);
    } catch (e) {
      console.error(e);
      setSales([]);
      setTotalElements(0);
      setTotalPages(0);
      setListError(getApiErrorMessage(e, 'Failed to load sales orders.'));
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
        const [c, m] = await Promise.all([
          getCustomers({ page: 0, size: 500 }),
          getMedicines({ page: 0, size: 1000 }),
        ]);

        setCustomers(normalizePagedList(c));
        setMedicines(normalizePagedList(m));
      } catch (e) {
        console.error(e);
        showToast('error', 'Failed to load customers or medicines.');
      }
    })();
  }, [showToast]);

  const resetCreateForm = () => {
    setFormData(defaultFormData);
    setFormError('');
    setIsEditMode(false);
    setEditingSaleId(null);
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
    setSelectedSale(null);
  };

  const closePaymentModal = () => {
    if (submitting) return;
    setShowPaymentModal(false);
    setPaymentError('');
    setSelectedSale(null);
    setPaymentForm({
      paymentStatus: 'UNPAID',
      amountPaid: '',
    });
  };

  const closeReturnModal = () => {
    if (submitting) return;
    setShowReturnModal(false);
    setSaleToReturn(null);
    setReturnError('');
    setReturnForm({
      reason: '',
      items: [],
    });
  };

  const closeDeleteModal = () => {
    if (rowActionId.startsWith('delete-')) return;
    setShowDeleteModal(false);
    setSaleToDelete(null);
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
              ? getMedicineDefaultSalePrice(medicine)
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
    const totals = formData.items.reduce(
      (acc, item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const discountPercent = Number(item.discountPercent || 0);
        const gstPercentage = Number(item.gstPercentage || 0);

        const baseAmount = quantity * unitPrice;
        const discountAmount = (baseAmount * discountPercent) / 100;
        const taxableValue = Math.max(baseAmount - discountAmount, 0);
        const gstAmount = (taxableValue * gstPercentage) / 100;

        acc.subtotal += taxableValue;
        acc.gstTotal += gstAmount;
        acc.itemCount += quantity;
        acc.stockMovementQty += quantity + Number(item.freeQuantity || 0);
        return acc;
      },
      { subtotal: 0, gstTotal: 0, itemCount: 0, stockMovementQty: 0 }
    );

    return {
      ...totals,
      total: totals.subtotal + totals.gstTotal,
    };
  }, [formData]);

  const validateCreateForm = () => {
    if (!formData.customerId) return 'Please select a customer.';
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

      const selectedMedicine = medicineMap[String(item.medicineId)];
      const stockQuantity = Number(selectedMedicine?.stockQuantity ?? 0);
      const requiredStockQty = Number(item.quantity || 0) + Number(item.freeQuantity || 0);

      if (
        selectedMedicine &&
        requiredStockQty > stockQuantity &&
        !isEditMode
      ) {
        return `Requested quantity exceeds stock for item ${i + 1}. Required: ${requiredStockQty}, available: ${stockQuantity}.`;
      }
    }

    return '';
  };

  const buildSalePayload = () => ({
    customerId: formData.customerId,
    notes: formData.notes?.trim() || '',
    dueDate: formData.dueDate ? formData.dueDate + "T00:00:00" : null,
    lrNumber: formData.lrNumber?.trim() || '',
    transport: formData.transport?.trim() || '',
    placeOfSupply: formData.placeOfSupply?.trim() || '',
    reverseCharge: formData.reverseCharge || false,
    termsAndConditions: formData.termsAndConditions?.trim() || '',
    items: formData.items.map((item) => ({
      medicineId: item.medicineId,
      batchNumber: item.batchNumber || null,
      expiryDate: item.expiryDate ? item.expiryDate + "T00:00:00" : null,
      quantity: Number(item.quantity),
      freeQuantity: Number(item.freeQuantity || 0),
      unitPrice: Number(item.unitPrice),
      mrp: item.mrp ? Number(item.mrp) : null,
      pack: item.pack || null,
      hsn: item.hsn || null,
      discountPercent: Number(item.discountPercent || 0),
      gstPercentage: Number(item.gstPercentage || 0),
    })),
  });

  const handleCreateOrUpdateSale = async (e) => {
    e.preventDefault();

    const validationMessage = validateCreateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      showToast('error', validationMessage);
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload = buildSalePayload();

      if (isEditMode && editingSaleId) {
        await updateSale(editingSaleId, payload);
        showToast('success', 'Sales order updated successfully.');
      } else {
        await createSale(payload);
        showToast('success', 'Sales order created successfully.');
      }

      setShowCreateModal(false);
      resetCreateForm();
      setPage(0);
      await fetchData();
    } catch (e2) {
      console.error(e2);
      const message = getApiErrorMessage(
        e2,
        isEditMode ? 'Failed to update sales order.' : 'Failed to create sales order.'
      );
      setFormError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSale = async (saleId) => {
    setShowViewModal(true);
    setDetailsLoading(true);
    setSelectedSale(null);

    try {
      const res = await getSaleById(saleId);
      setSelectedSale(res?.data?.data || null);
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to load sales details.'));
      setShowViewModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const refreshVisibleSaleIfOpen = async (saleId) => {
    if (!selectedSale?.id || String(selectedSale.id) !== String(saleId)) return;
    try {
      const res = await getSaleById(saleId);
      setSelectedSale(res?.data?.data || null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditSale = async (sale) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to edit sales orders.');
      return;
    }

    if (sale.status !== 'DRAFT') {
      showToast('error', 'Only draft sales orders can be edited.');
      return;
    }

    setDetailsLoading(true);

    try {
      const res = await getSaleById(sale.id);
      const saleData = res?.data?.data;

      if (!saleData) {
        showToast('error', 'Sale details not found.');
        return;
      }

      setFormData({
        customerId: saleData.customerId || '',
        notes: saleData.notes || '',
        dueDate: saleData.dueDate ? saleData.dueDate.split('T')[0] : '',
        lrNumber: saleData.lrNumber || '',
        transport: saleData.transport || '',
        placeOfSupply: saleData.placeOfSupply || '',
        reverseCharge: saleData.reverseCharge || false,
        termsAndConditions: saleData.termsAndConditions || '',
        items:
          saleData.items?.length > 0
            ? saleData.items.map((item) => ({
                medicineId: item.medicineId || '',
                batchNumber: item.batchNumber || '',
                expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
                quantity: item.quantity ?? 1,
                freeQuantity: item.freeQuantity ?? 0,
                unitPrice: item.unitPrice ?? '',
                mrp: item.mrp ?? '',
                pack: item.pack ?? '',
                hsn: item.hsn ?? '',
                discountPercent: item.discountPercent ?? 0,
                gstPercentage: item.gstPercentage ?? 0,
              }))
            : defaultFormData.items,
      });

      setIsEditMode(true);
      setEditingSaleId(sale.id);
      setFormError('');
      setShowCreateModal(true);
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to load sales order for edit.'));
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleConfirmSale = async (sale) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to confirm sales orders.');
      return;
    }

    if (sale.status !== 'DRAFT') {
      showToast('error', 'Only draft sales orders can be confirmed.');
      return;
    }

    setRowActionId(`confirm-${sale.id}`);
    try {
      await confirmSale(sale.id);
      showToast('success', `Sales order ${sale.orderNumber || ''} confirmed successfully.`);
      await fetchData();
      await refreshVisibleSaleIfOpen(sale.id);
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to confirm sales order.'));
    } finally {
      setRowActionId('');
    }
  };

  const handleDispatchSale = async (sale) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to dispatch sales orders.');
      return;
    }

    if (sale.status !== 'CONFIRMED') {
      showToast('error', 'Only confirmed sales orders can be dispatched.');
      return;
    }

    setRowActionId(`dispatch-${sale.id}`);
    try {
      await dispatchSale(sale.id);
      showToast('success', `Sales order ${sale.orderNumber || ''} dispatched successfully.`);
      await fetchData();
      await refreshVisibleSaleIfOpen(sale.id);
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to dispatch sales order.'));
    } finally {
      setRowActionId('');
    }
  };

  const handleCompleteSale = async (sale) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to complete sales orders.');
      return;
    }

    if (sale.status !== 'DISPATCHED') {
      showToast('error', 'Only dispatched sales orders can be completed.');
      return;
    }

    setRowActionId(`complete-${sale.id}`);
    try {
      await completeSale(sale.id);
      showToast('success', `Sales order ${sale.orderNumber || ''} completed successfully.`);
      await fetchData();
      await refreshVisibleSaleIfOpen(sale.id);
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to complete sales order.'));
    } finally {
      setRowActionId('');
    }
  };

  const handleGenerateInvoice = async (sale) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to generate invoices.');
      return;
    }

    if (sale.invoiceNumber) {
      showToast('error', 'Invoice has already been generated for this sales order.');
      return;
    }

    if (sale.status !== 'COMPLETED') {
      showToast('error', 'Invoice can only be generated after the sales order is completed.');
      return;
    }

    setRowActionId(`invoice-${sale.id}`);
    try {
      await generateSaleInvoice(sale.id);
      showToast('success', `Invoice generated for ${sale.orderNumber || 'sales order'}.`);
      await fetchData();
      await refreshVisibleSaleIfOpen(sale.id);
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to generate invoice.'));
    } finally {
      setRowActionId('');
    }
  };

  const handleDownloadInvoicePdf = async (sale) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to download invoices.');
      return;
    }

    if (!sale.invoiceNumber) {
      showToast('error', 'Generate invoice first before downloading PDF.');
      return;
    }

    setRowActionId(`download-${sale.id}`);
    try {
      const response = await downloadSaleInvoicePdf(sale.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${sale.invoiceNumber || sale.orderNumber || 'sales-invoice'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
      showToast('success', 'Invoice PDF downloaded successfully.');
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to download invoice PDF.'));
    } finally {
      setRowActionId('');
    }
  };


  const openReturnModal = async (sale) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to return sales orders.');
      return;
    }

    if (sale.status !== 'COMPLETED') {
      showToast('error', 'Only completed sales orders can be returned.');
      return;
    }

    if (Number(sale.totalAmount || 0) <= 0) {
      showToast('error', 'This sales order is already fully returned.');
      return;
    }

    setReturnError('');
    setSaleToReturn(sale);
    setShowReturnModal(true);
    setDetailsLoading(true);

    try {
      const res = await getSaleById(sale.id);
      const details = res?.data?.data || sale;

      const itemMap = new Map();
      (details.items || []).forEach((item) => {
        const medicineId = item.medicineId;
        if (!medicineId) return;
        const qty = Number(item.quantity || 0);
        if (qty <= 0) return;
        const existing = itemMap.get(String(medicineId));
        if (existing) {
          existing.availableQuantity += qty;
        } else {
          itemMap.set(String(medicineId), {
            medicineId,
            availableQuantity: qty,
            returnQuantity: 0,
            unitPrice: Number(item.unitPrice || 0),
            gstPercentage: Number(item.gstPercentage || 0),
          });
        }
      });

      setSaleToReturn(details);
      setReturnForm({ reason: '', items: Array.from(itemMap.values()) });
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to load sales return details.'));
      setShowReturnModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateReturnQty = (index, value) => {
    setReturnForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, returnQuantity: value } : item
      ),
    }));
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!saleToReturn?.id) return;

    if (Number(saleToReturn.totalAmount || 0) <= 0) {
      setReturnError('This sales order is already fully returned.');
      showToast('error', 'This sales order is already fully returned.');
      return;
    }

    const selectedItems = returnForm.items
      .map((item) => ({ medicineId: item.medicineId, quantity: Number(item.returnQuantity || 0) }))
      .filter((item) => item.quantity > 0);

    if (!selectedItems.length) {
      setReturnError('Please enter return quantity for at least one item.');
      showToast('error', 'Please enter return quantity for at least one item.');
      return;
    }

    for (const item of returnForm.items) {
      const returnQty = Number(item.returnQuantity || 0);
      const availableQty = Number(item.availableQuantity || 0);
      if (returnQty < 0) {
        setReturnError('Return quantity cannot be negative.');
        showToast('error', 'Return quantity cannot be negative.');
      return;
      }
      if (returnQty > availableQty) {
        const message = `Return quantity cannot be greater than available quantity. Max allowed: ${availableQty}.`;
        setReturnError(message);
        showToast('error', message);
        return;
      }
    }

    setSubmitting(true);
    setReturnError('');
    setRowActionId(`return-${saleToReturn.id}`);

    try {
      await returnSale(saleToReturn.id, {
        reason: returnForm.reason?.trim() || 'Sales returned',
        items: selectedItems,
      });
      showToast('success', 'Sales return completed successfully.');
      closeReturnModal();
      await fetchData();
      await refreshVisibleSaleIfOpen(saleToReturn.id);
    } catch (e2) {
      console.error(e2);
      const message = getApiErrorMessage(e2, 'Failed to process sales return.');
      setReturnError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
      setRowActionId('');
    }
  };

  const openPaymentModal = (sale) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to update payment.');
      return;
    }

    if (!sale.invoiceNumber) {
      showToast('error', 'Generate invoice first before updating payment.');
      return;
    }

    if (sale.paymentStatus === 'PAID') {
      showToast('error', 'Payment is already completed for this sales order.');
      return;
    }

    setSelectedSale(sale);
    setPaymentError('');
    setPaymentForm({
      paymentStatus: sale.paymentStatus || 'UNPAID',
      amountPaid: sale.amountPaid != null ? String(sale.amountPaid) : '',
    });
    setShowPaymentModal(true);
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!selectedSale?.id) return;

    setSubmitting(true);
    setPaymentError('');

    try {
      const totalAmount = Number(selectedSale?.totalAmount || 0);
      const alreadyPaid = Number(selectedSale?.amountPaid || 0);
      let paidAmount = Number(paymentForm.amountPaid || 0);

      if (paymentForm.paymentStatus === 'PAID') {
        paidAmount = totalAmount;
      }

      if (paymentForm.paymentStatus === 'PARTIALLY_PAID') {
        if (!paidAmount || paidAmount <= 0) {
          setPaymentError('Please enter a valid paid amount.');
          setSubmitting(false);
          return;
        }

        if (paidAmount >= totalAmount) {
          setPaymentError('Partial payment must be less than total amount.');
          setSubmitting(false);
          return;
        }

        if (paidAmount < alreadyPaid) {
          setPaymentError('Amount paid cannot be less than already recorded amount.');
          setSubmitting(false);
          return;
        }
      }

      if (paymentForm.paymentStatus === 'UNPAID') {
        if (alreadyPaid > 0) {
          setPaymentError('Cannot mark unpaid after payment has already been recorded.');
          setSubmitting(false);
          return;
        }
        paidAmount = 0;
      }

      const payload = {
        paymentStatus: paymentForm.paymentStatus,
        amountPaid: paidAmount,
      };

      await updateSalePayment(selectedSale.id, payload);

      showToast('success', 'Payment updated successfully.');
      closePaymentModal();
      await fetchData();
      await refreshVisibleSaleIfOpen(selectedSale.id);
    } catch (e2) {
      console.error(e2);
      const message = getApiErrorMessage(e2, 'Failed to update payment.');
      setPaymentError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSale = (sale) => {
    if (!canManage) {
      showToast('error', 'You are not allowed to delete sales orders.');
      return;
    }

    if (sale.status !== 'DRAFT') {
      showToast('error', 'Only draft sales orders can be deleted.');
      return;
    }

    setSaleToDelete(sale);
    setShowDeleteModal(true);
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;

    setRowActionId(`delete-${saleToDelete.id}`);

    try {
      await deleteSale(saleToDelete.id);
      showToast('success', 'Sales order deleted successfully.');
      const targetPage = sales.length === 1 && page > 0 ? page - 1 : page;
      setShowDeleteModal(false);
      setSaleToDelete(null);

      if (targetPage !== page) {
        setPage(targetPage);
      } else {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
      showToast('error', getApiErrorMessage(e, 'Failed to delete sales order.'));
    } finally {
      setRowActionId('');
    }
  };

  const canEdit = (sale) => canManage && sale.status === 'DRAFT';
  const canConfirm = (sale) => canManage && sale.status === 'DRAFT';
  const canDispatch = (sale) => canManage && sale.status === 'CONFIRMED';
  const canComplete = (sale) => canManage && sale.status === 'DISPATCHED';
  const canGenerateInvoice = (sale) =>
    canManage && sale.status === 'COMPLETED' && !sale.invoiceNumber;
  const canDownloadPdf = (sale) => canManage && !!sale.invoiceNumber;
  const canReturn = (sale) => canManage && sale.status === 'COMPLETED' && Number(sale.totalAmount || 0) > 0;
  const canUpdatePayment = (sale) =>
    canManage && !!sale.invoiceNumber && sale.paymentStatus !== 'PAID';
  const canDelete = (sale) => canManage && sale.status === 'DRAFT';

  const isRowActionLoading = (saleId) =>
    rowActionId === `confirm-${saleId}` ||
    rowActionId === `dispatch-${saleId}` ||
    rowActionId === `complete-${saleId}` ||
    rowActionId === `invoice-${saleId}` ||
    rowActionId === `download-${saleId}` ||
    rowActionId === `return-${saleId}` ||
    rowActionId === `delete-${saleId}`;

  const isLastPage =
    totalPages > 0 ? page >= totalPages - 1 : sales.length < pageSize;

  return (
    <div>
      {toast && (
        <div
          style={{
            ...toastStyle,
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
            <TrendingUp size={28} color="#2d3a8c" /> Sales Orders
          </h1>
          <p style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
            Manage customer sales orders, workflow, invoices, and payment status.
          </p>
        </div>

        {canManage && (
          <button className="btn-primary" onClick={openCreateModal} type="button">
            <Plus size={16} /> New Sale
          </button>
        )}
      </div>

      <div
        className="card"
        style={{
          marginBottom: '18px',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns:
            'minmax(280px, 1fr) minmax(170px, 190px) minmax(170px, 190px) minmax(190px, 220px) auto',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <div className="search-bar" style={{ minWidth: '280px' }}>
          <Search size={15} color="var(--text-soft, #94a3b8)" />
          <input
            type="text"
            placeholder="Search by order number, customer, invoice..."
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
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="input-field"
          style={{ width: '100%', height: '42px' }}
        >
          <option value="ALL">All Payments</option>
          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatPaymentStatusLabel(status)}
            </option>
          ))}
        </select>

        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="input-field"
          style={{ width: '100%', height: '42px' }}
        >
          <option value="ALL">All Customers</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name || customer.customerName || customer.id}
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
          icon={<TrendingUp size={18} color="#2d3a8c" />}
        />
        <StatCard
          title="Visible Orders"
          value={filteredSales.length}
          icon={<Filter size={18} color="#2563eb" />}
        />
        <StatCard
          title="Completed"
          value={filteredSales.filter((item) => item.status === 'COMPLETED').length}
          icon={<PackageCheck size={18} color="#16a34a" />}
        />
        <StatCard
          title="Unpaid"
          value={filteredSales.filter((item) => item.paymentStatus === 'UNPAID').length}
          icon={<Wallet size={18} color="#dc2626" />}
        />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading && !initialLoadDone ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#718096' }}>
            Loading sales orders...
          </div>
        ) : filteredSales.length === 0 ? (
          <div style={{ padding: '44px', textAlign: 'center' }}>
            <TrendingUp size={46} color="#c1c9e0" />
            <h3 style={{ color: '#718096', marginTop: '14px', fontWeight: '700' }}>
              No sales orders found
            </h3>
            <p style={{ color: '#a0aec0', fontSize: '13px', marginTop: '6px' }}>
              Try changing search or filters, or create your first sales order.
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: '1660px',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                }}
              >
                <thead>
                  <tr style={{ background: 'var(--bg-card-soft, #f8fafc)' }}>
                    <th style={tableHeadStyle}>Order No.</th>
                    <th style={tableHeadStyle}>Customer</th>
                    <th style={tableHeadStyle}>Order Date</th>
                    <th style={tableHeadStyle}>Status</th>
                    <th style={tableHeadStyle}>Payment</th>
                    <th style={tableHeadStyle}>Invoice</th>
                    <th style={tableHeadStyle}>Total</th>
                    <th style={{ ...tableHeadStyle, minWidth: '700px' }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSales.map((sale) => {
                    const actionLoading = isRowActionLoading(sale.id);

                    return (
                      <tr key={sale.id}>
                        <td style={{ ...tableCellStyle, fontWeight: 700 }}>
                          {sale.orderNumber || '-'}
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
                            {getCustomerName(sale.customerId)}
                          </div>
                        </td>

                        <td style={tableCellStyle}>
                          {formatDate(sale.orderDate || sale.createdAt)}
                        </td>

                        <td style={tableCellStyle}>
                          <Pill type={getStatusType(sale.status)}>
                            {sale.status || '-'}
                          </Pill>
                        </td>

                        <td style={tableCellStyle}>
                          <Pill type={getPaymentType(sale.paymentStatus)}>
                            {formatPaymentStatusLabel(sale.paymentStatus)}
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
                            title={sale.invoiceNumber || '-'}
                          >
                            {sale.invoiceNumber || '-'}
                          </div>
                        </td>

                        <td style={{ ...tableCellStyle, fontWeight: 700 }}>
                          {formatCurrency(sale.totalAmount)}
                        </td>

                        <td style={tableCellStyle}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              className="btn-secondary"
                              style={smallBtnStyle}
                              type="button"
                              onClick={() => handleViewSale(sale.id)}
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
                                    opacity: canEdit(sale) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => handleEditSale(sale)}
                                  disabled={!canEdit(sale) || actionLoading}
                                  title={canEdit(sale) ? 'Edit sales order' : 'Only draft orders can be edited'}
                                >
                                  <Pencil size={14} /> Edit
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    opacity: canConfirm(sale) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => handleConfirmSale(sale)}
                                  disabled={!canConfirm(sale) || actionLoading}
                                  title={canConfirm(sale) ? 'Confirm sales order' : 'Only draft orders can be confirmed'}
                                >
                                  <CheckCircle2 size={14} /> Confirm
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    opacity: canDispatch(sale) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => handleDispatchSale(sale)}
                                  disabled={!canDispatch(sale) || actionLoading}
                                  title={canDispatch(sale) ? 'Dispatch sales order' : 'Only confirmed orders can be dispatched'}
                                >
                                  <Truck size={14} /> Dispatch
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    opacity: canComplete(sale) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => handleCompleteSale(sale)}
                                  disabled={!canComplete(sale) || actionLoading}
                                  title={canComplete(sale) ? 'Complete sales order' : 'Only dispatched orders can be completed'}
                                >
                                  <PackageCheck size={14} /> Complete
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    opacity: canGenerateInvoice(sale) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => handleGenerateInvoice(sale)}
                                  disabled={!canGenerateInvoice(sale) || actionLoading}
                                  title={
                                    sale.invoiceNumber
                                      ? 'Invoice already generated'
                                      : sale.status !== 'COMPLETED'
                                        ? 'Invoice can be generated only after completion'
                                        : 'Generate invoice'
                                  }
                                >
                                  <FileText size={14} /> Invoice
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    opacity: canDownloadPdf(sale) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => handleDownloadInvoicePdf(sale)}
                                  disabled={!canDownloadPdf(sale) || actionLoading}
                                  title={sale.invoiceNumber ? 'Download invoice PDF' : 'Generate invoice first'}
                                >
                                  <Download size={14} /> Download PDF
                                </button>



                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    color: '#9333ea',
                                    opacity: canReturn(sale) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => openReturnModal(sale)}
                                  disabled={!canReturn(sale) || actionLoading}
                                  title={
                                    Number(sale.totalAmount || 0) <= 0
                                      ? 'This sales order is already fully returned'
                                      : sale.status === 'COMPLETED'
                                        ? 'Return sold items from customer'
                                        : 'Only completed sales orders can be returned'
                                  }
                                >
                                  <RotateCcw size={14} /> Return
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    opacity: canUpdatePayment(sale) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => openPaymentModal(sale)}
                                  disabled={!canUpdatePayment(sale) || actionLoading}
                                  title={
                                    !sale.invoiceNumber
                                      ? 'Generate invoice first'
                                      : sale.paymentStatus === 'PAID'
                                        ? 'Payment already completed'
                                        : 'Update payment status'
                                  }
                                >
                                  <Wallet size={14} /> Payment
                                </button>

                                <button
                                  className="btn-secondary"
                                  style={{
                                    ...smallBtnStyle,
                                    color: '#dc2626',
                                    opacity: canDelete(sale) ? 1 : 0.55,
                                  }}
                                  type="button"
                                  onClick={() => handleDeleteSale(sale)}
                                  disabled={!canDelete(sale) || actionLoading}
                                  title={canDelete(sale) ? 'Delete sales order' : 'Only draft orders can be deleted'}
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
                Showing <strong>{filteredSales.length}</strong> visible orders on page{' '}
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

      <Modal
        open={showCreateModal}
        title={isEditMode ? 'Edit Sales Order' : 'Create Sales Order'}
        onClose={closeCreateModal}
        width="1100px"
      >
        <form onSubmit={handleCreateOrUpdateSale}>
          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Customer</label>
              <select
                className="input-field"
                value={formData.customerId}
                onChange={(e) => setFormData((prev) => ({ ...prev, customerId: e.target.value }))}
                style={fullInputStyle}
                required
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name || customer.customerName || customer.id}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                className="input-field"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                style={{ ...fullInputStyle, resize: 'vertical', paddingTop: '12px' }}
                placeholder="Optional notes"
              />
            </div>

            <div>
              <label style={labelStyle}>Due Date</label>
              <input
                className="input-field"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                style={fullInputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>LR Number</label>
              <input
                className="input-field"
                type="text"
                value={formData.lrNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, lrNumber: e.target.value }))}
                style={fullInputStyle}
                placeholder="Lorry Receipt No."
              />
            </div>

            <div>
              <label style={labelStyle}>Transport</label>
              <input
                className="input-field"
                type="text"
                value={formData.transport}
                onChange={(e) => setFormData((prev) => ({ ...prev, transport: e.target.value }))}
                style={fullInputStyle}
                placeholder="Transporter Name"
              />
            </div>

            <div>
              <label style={labelStyle}>Place of Supply</label>
              <input
                className="input-field"
                type="text"
                value={formData.placeOfSupply}
                onChange={(e) => setFormData((prev) => ({ ...prev, placeOfSupply: e.target.value }))}
                style={fullInputStyle}
                placeholder="State / Location"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '100%', paddingTop: '20px' }}>
              <input
                type="checkbox"
                id="reverseCharge"
                checked={formData.reverseCharge}
                onChange={(e) => setFormData((prev) => ({ ...prev, reverseCharge: e.target.checked }))}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="reverseCharge" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>Reverse Charge</label>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Terms and Conditions</label>
              <textarea
                className="input-field"
                rows={2}
                value={formData.termsAndConditions}
                onChange={(e) => setFormData((prev) => ({ ...prev, termsAndConditions: e.target.value }))}
                style={{ ...fullInputStyle, resize: 'vertical', paddingTop: '12px' }}
                placeholder="Optional terms"
              />
            </div>
          </div>

          {selectedCustomer && (
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
                CUSTOMER DETAILS
              </div>
              <div style={customerMetaGridStyle}>
                <CustomerMeta label="Name" value={selectedCustomer.name || selectedCustomer.customerName || '-'} />
                <CustomerMeta label="Phone" value={selectedCustomer.phone || selectedCustomer.contactNumber || '-'} />
                <CustomerMeta label="Email" value={selectedCustomer.email || '-'} />
                <CustomerMeta label="Address" value={selectedCustomer.address || '-'} />
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
                const stockQuantity = selectedMedicine?.stockQuantity ?? null;

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
                          gridTemplateColumns: 'minmax(280px, 2fr) repeat(4, 1fr) auto',
                          gap: '12px',
                          alignItems: 'end',
                        }}
                      >
                        <div style={{ gridColumn: 'span 1' }}>
                          <label style={labelStyle}>Medicine</label>
                          <SearchableMedicineSelect
                            medicines={medicines}
                            value={item.medicineId}
                            onChange={(medicineId, medicine) => handleMedicineSelect(index, medicineId, medicine)}
                            usedMedicineIds={usedMedicineIds}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Batch No. (Auto)</label>
                          <input
                            className="input-field"
                            type="text"
                            value={item.batchNumber}
                            onChange={(e) => updateItemField(index, 'batchNumber', e.target.value)}
                            style={{ ...fullInputStyle, backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                            placeholder="FEFO Allocated"
                            readOnly
                            title="This will be automatically allocated using FEFO logic during confirmation."
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Expiry (Auto)</label>
                          <input
                            className="input-field"
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => updateItemField(index, 'expiryDate', e.target.value)}
                            style={{ ...fullInputStyle, backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                            readOnly
                            title="This will be automatically allocated using FEFO logic during confirmation."
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Pack</label>
                          <input
                            className="input-field"
                            type="text"
                            value={item.pack}
                            onChange={(e) => updateItemField(index, 'pack', e.target.value)}
                            style={fullInputStyle}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>HSN</label>
                          <input
                            className="input-field"
                            type="text"
                            value={item.hsn}
                            onChange={(e) => updateItemField(index, 'hsn', e.target.value)}
                            style={fullInputStyle}
                          />
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
                          display: 'grid',
                          gridTemplateColumns: 'repeat(6, 1fr)',
                          gap: '12px',
                          marginTop: '12px',
                          alignItems: 'end',
                        }}
                      >
                        <div>
                          <label style={labelStyle}>MRP</label>
                          <input
                            className="input-field"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.mrp}
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
                            value={item.quantity}
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
                            value={item.freeQuantity}
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
                            value={item.unitPrice}
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
                            value={item.discountPercent}
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
                            value={item.gstPercentage}
                            onChange={(e) => updateItemField(index, 'gstPercentage', e.target.value)}
                            style={fullInputStyle}
                          />
                        </div>
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
                        Stock:{' '}
                        <strong
                          style={{
                            color:
                              stockQuantity != null && Number(item.quantity || 0) > Number(stockQuantity)
                                ? '#dc2626'
                                : 'var(--text-main, #111827)',
                          }}
                        >
                          {stockQuantity != null ? stockQuantity : '-'}
                        </strong>
                      </span>
                      <span>
                        Line Total:{' '}
                        <strong style={{ color: 'var(--text-main, #111827)' }}>
                          {formatCurrency(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                        </strong>
                      </span>
                      <span>
                        GST:{' '}
                        <strong style={{ color: 'var(--text-main, #111827)' }}>
                          {formatCurrency(
                            ((Number(item.quantity || 0) * Number(item.unitPrice || 0)) *
                              Number(item.gstPercentage || 0)) /
                              100
                          )}
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
              {submitting
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Update Sales Order'
                  : 'Create Sales Order'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={showViewModal} title="Sales Order Details" onClose={closeViewModal} width="940px">
        {detailsLoading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#718096' }}>
            Loading details...
          </div>
        ) : !selectedSale ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#718096' }}>
            No sales details found.
          </div>
        ) : (
          <>
            <div style={detailsGridStyle}>
              <DetailItem label="Order Number" value={selectedSale.orderNumber || '-'} />
              <DetailItem label="Customer" value={getCustomerName(selectedSale.customerId)} />
              <DetailItem label="Order Date" value={formatDate(selectedSale.orderDate || selectedSale.createdAt)} />
              <DetailItem
                label="Status"
                value={
                  <Pill type={getStatusType(selectedSale.status)}>
                    {selectedSale.status || '-'}
                  </Pill>
                }
              />
              <DetailItem
                label="Payment"
                value={
                  <Pill type={getPaymentType(selectedSale.paymentStatus)}>
                    {formatPaymentStatusLabel(selectedSale.paymentStatus)}
                  </Pill>
                }
              />
              <DetailItem label="Invoice Number" value={selectedSale.invoiceNumber || '-'} />
              <DetailItem label="Due Date" value={formatDate(selectedSale.dueDate)} />
              <DetailItem label="LR Number" value={selectedSale.lrNumber || '-'} />
              <DetailItem label="Transport" value={selectedSale.transport || '-'} />
              <DetailItem label="Place of Supply" value={selectedSale.placeOfSupply || '-'} />
              <DetailItem label="Reverse Charge" value={selectedSale.reverseCharge ? 'Yes' : 'No'} />
            </div>

            <div style={{ marginTop: '18px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 800, color: 'var(--text-main, #1f2937)' }}>Items</h4>

              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    minWidth: '820px',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                  }}
                >
                  <thead>
                    <tr style={{ background: 'var(--bg-card-soft, #f8fafc)' }}>
                      <th style={tableHeadStyle}>Medicine</th>
                      <th style={tableHeadStyle}>Batch</th>
                      <th style={tableHeadStyle}>Expiry</th>
                      <th style={tableHeadStyle}>Pack</th>
                      <th style={tableHeadStyle}>HSN</th>
                      <th style={tableHeadStyle}>Qty</th>
                      <th style={tableHeadStyle}>Free</th>
                      <th style={tableHeadStyle}>Rate</th>
                      <th style={tableHeadStyle}>MRP</th>
                      <th style={tableHeadStyle}>Disc %</th>
                      <th style={tableHeadStyle}>GST %</th>
                      <th style={tableHeadStyle}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSale.items || []).map((item, index) => {
                      const medicine = medicineMap[String(item.medicineId)];
                      const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                      const gstAmount = (lineTotal * Number(item.gstPercentage || 0)) / 100;

                      return (
                        <tr key={`${item.medicineId || 'med'}-${index + 1}`}>
                          <td style={tableCellStyle}>
                            {item.medicineName || (medicine ? getMedicineLabel(medicine) : item.medicineId || '-')}
                          </td>
                          <td style={tableCellStyle}>{item.batchNumber || item.batchId || '-'}</td>
                          <td style={tableCellStyle}>{formatDate(item.expiryDate)}</td>
                          <td style={tableCellStyle}>{item.pack || '-'}</td>
                          <td style={tableCellStyle}>{item.hsn || '-'}</td>
                          <td style={tableCellStyle}>{item.quantity ?? '-'}</td>
                          <td style={tableCellStyle}>{item.freeQuantity ?? 0}</td>
                          <td style={tableCellStyle}>{formatCurrency(item.unitPrice)}</td>
                          <td style={tableCellStyle}>{formatCurrency(item.mrp)}</td>
                          <td style={tableCellStyle}>{Number(item.discountPercent || 0)}%</td>
                          <td style={tableCellStyle}>{Number(item.gstPercentage || 0)}%</td>
                          <td style={{ ...tableCellStyle, fontWeight: 700 }}>
                            {formatCurrency(item.lineTotal)}
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
                <strong>{formatCurrency(selectedSale.subtotalAmount ?? 0)}</strong>
              </div>
              <div style={totalsRowStyle}>
                <span>GST Amount</span>
                <strong>{formatCurrency(selectedSale.gstAmount ?? 0)}</strong>
              </div>
              <div style={totalsRowStyle}>
                <span>Total Amount</span>
                <strong>{formatCurrency(selectedSale.totalAmount ?? 0)}</strong>
              </div>
              <div style={totalsRowStyle}>
                <span>Amount Paid</span>
                <strong>{formatCurrency(selectedSale.amountPaid ?? 0)}</strong>
              </div>
              <div style={totalsRowStyle}>
                <span>Balance Due</span>
                <strong>
                  {formatCurrency(
                    Math.max(Number(selectedSale.totalAmount || 0) - Number(selectedSale.amountPaid || 0), 0)
                  )}
                </strong>
              </div>
            </div>

            {selectedSale.termsAndConditions && (
              <div style={{ marginTop: '16px' }}>
                <label style={labelStyle}>Terms and Conditions</label>
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
                  {selectedSale.termsAndConditions}
                </div>
              </div>
            )}

            {selectedSale.notes && (
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
                  {selectedSale.notes}
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


      <Modal open={showReturnModal} title="Sales Return" onClose={closeReturnModal} width="900px">
        {detailsLoading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#718096' }}>
            Loading return details...
          </div>
        ) : (
          <form onSubmit={handleSubmitReturn}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Sales Order</label>
              <div style={readonlyBoxStyle}>{saleToReturn?.orderNumber || '-'}</div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Return Reason</label>
              <textarea
                className="input-field"
                rows={3}
                value={returnForm.reason}
                onChange={(e) => setReturnForm((prev) => ({ ...prev, reason: e.target.value }))}
                style={{ ...fullInputStyle, resize: 'vertical', paddingTop: '12px' }}
                placeholder="Example: customer returned item, damaged product, wrong medicine..."
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card-soft, #f8fafc)' }}>
                    <th style={tableHeadStyle}>Medicine</th>
                    <th style={tableHeadStyle}>Available Qty</th>
                    <th style={tableHeadStyle}>Return Qty</th>
                    <th style={tableHeadStyle}>Unit Price</th>
                    <th style={tableHeadStyle}>GST %</th>
                  </tr>
                </thead>
                <tbody>
                  {(returnForm.items || []).map((item, index) => {
                    const medicine = medicineMap[String(item.medicineId)];
                    const availableQty = Number(item.availableQuantity || 0);
                    return (
                      <tr key={`${item.medicineId || 'return'}-${index + 1}`}>
                        <td style={tableCellStyle}>{medicine ? getMedicineLabel(medicine) : item.medicineId || '-'}</td>
                        <td style={tableCellStyle}>{availableQty}</td>
                        <td style={tableCellStyle}>
                          <input
                            className="input-field"
                            type="number"
                            min="0"
                            max={availableQty}
                            value={item.returnQuantity}
                            onChange={(e) => updateReturnQty(index, e.target.value)}
                            disabled={availableQty <= 0 || Number(saleToReturn?.totalAmount || 0) <= 0}
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

            <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '12px', background: '#faf5ff', border: '1px solid #e9d5ff', color: '#6b21a8', fontSize: '13px', fontWeight: 600, lineHeight: 1.5 }}>
              Sales return will restore stock to original batches and reduce total sale amount safely.
            </div>

            {returnError && <div style={errorBoxStyle}>{returnError}</div>}

            <div style={modalFooterStyle}>
              <button type="button" className="btn-secondary" onClick={closeReturnModal} disabled={submitting}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting || Number(saleToReturn?.totalAmount || 0) <= 0} style={{ background: '#9333ea', borderColor: '#9333ea' }}>
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
              <label style={labelStyle}>Sales Order</label>
              <div style={readonlyBoxStyle}>{selectedSale?.orderNumber || '-'}</div>
            </div>

            <div style={customerMetaGridStyle}>
              <CustomerMeta label="Invoice Number" value={selectedSale?.invoiceNumber || '-'} />
              <CustomerMeta label="Total Amount" value={formatCurrency(paymentTotalAmount)} />
              <CustomerMeta label="Amount Paid" value={formatCurrency(existingPaidAmount)} />
              <CustomerMeta label="Amount Due" value={formatCurrency(Math.max(paymentTotalAmount - existingPaidAmount, 0))} />
            </div>

            <div>
              <label style={labelStyle}>Payment Status</label>
              <select
                className="input-field"
                value={paymentForm.paymentStatus}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentStatus: e.target.value }))}
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
                  placeholder="Enter paid amount"
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

      <Modal open={showDeleteModal} title="Delete Sales Order" onClose={closeDeleteModal} width="520px">
        <div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted, #475569)', lineHeight: 1.6 }}>
            Are you sure you want to delete sales order{' '}
            <strong>{saleToDelete?.orderNumber || '-'}</strong>?
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
              onClick={confirmDeleteSale}
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

const CustomerMeta = ({ label, value }) => (
  <div>
    <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 700, marginBottom: '4px' }}>
      {label}
    </div>
    <div
      style={{
        fontSize: '14px',
        color: 'var(--text-main, #111827)',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      title={value || '-'}
    >
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

const customerMetaGridStyle = {
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
  padding: '12px 16px',
  borderRadius: '12px',
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.22)',
  fontSize: '14px',
  fontWeight: 700,
  maxWidth: '360px',
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
