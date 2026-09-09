import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Search, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RotateCcw,
  DollarSign,
  TrendingUp,
  Receipt,
  Wallet,
  Calendar
} from 'lucide-react';
import { Appointment } from '../../../../packages/shared/src/index';
import { Pagination } from './Pagination';
import { TableSortHeader } from './TableSortHeader';

export interface PaymentsGridProps {
  appointments: Appointment[];
  onRefresh: () => void;
  onSettlePayment: (appointmentId: string, mode: 'CASH' | 'UPI') => void;
}

export const PaymentsGrid: React.FC<PaymentsGridProps> = ({
  appointments,
  onRefresh,
  onSettlePayment
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState('ALL');

  // Sort States
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Financial KPIs
  const financialStats = useMemo(() => {
    let collectedAmount = 0;
    let pendingAmount = 0;
    let settledCount = 0;
    let pendingCount = 0;

    appointments.forEach((apt: any) => {
      const fee = apt.totalFee || apt.totalAmount || 850;
      const isSettled = apt.paymentStatus === 'SETTLED';

      if (isSettled) {
        collectedAmount += fee;
        settledCount++;
      } else {
        pendingAmount += fee;
        pendingCount++;
      }
    });

    const totalCount = appointments.length;
    const settlementRate = totalCount > 0 ? Math.round((settledCount / totalCount) * 100) : 0;

    return {
      collectedAmount,
      pendingAmount,
      settledCount,
      pendingCount,
      totalCount,
      settlementRate
    };
  }, [appointments]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setPaymentStatusFilter('ALL');
    setPaymentModeFilter('ALL');
    setCurrentPage(1);
  };

  const isFiltered = searchQuery.trim() !== '' || paymentStatusFilter !== 'ALL' || paymentModeFilter !== 'ALL';

  // Filtered Appointments
  const filteredPayments = useMemo(() => {
    return appointments.filter((apt: any) => {
      const patientName = apt.patient?.fullName || '';
      const patientPhone = apt.patient?.phoneNumber || apt.patient?.phone || '';
      const therapistName = apt.therapist?.user?.fullName || '';
      const aptId = apt.id || '';
      const mode = apt.paymentMode || '';
      const categoryName = apt.request?.category?.name || '';

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          patientName.toLowerCase().includes(q) ||
          patientPhone.toLowerCase().includes(q) ||
          therapistName.toLowerCase().includes(q) ||
          aptId.toLowerCase().includes(q) ||
          mode.toLowerCase().includes(q) ||
          categoryName.toLowerCase().includes(q);

        if (!match) return false;
      }

      // Payment Status Filter
      if (paymentStatusFilter !== 'ALL') {
        const status = apt.paymentStatus || 'PENDING';
        if (status !== paymentStatusFilter) return false;
      }

      // Payment Mode Filter
      if (paymentModeFilter !== 'ALL') {
        const pMode = (apt.paymentMode || 'CASH').toUpperCase();
        if (!pMode.includes(paymentModeFilter.toUpperCase())) return false;
      }

      return true;
    });
  }, [appointments, searchQuery, paymentStatusFilter, paymentModeFilter]);

  // Sorted Payments
  const sortedPayments = useMemo(() => {
    const list = [...filteredPayments];
    list.sort((a: any, b: any) => {
      let aVal: any = '';
      let bVal: any = '';

      if (sortField === 'id') {
        aVal = a.id || '';
        bVal = b.id || '';
      } else if (sortField === 'patientName') {
        aVal = a.patient?.fullName || '';
        bVal = b.patient?.fullName || '';
      } else if (sortField === 'therapistName') {
        aVal = a.therapist?.user?.fullName || '';
        bVal = b.therapist?.user?.fullName || '';
      } else if (sortField === 'categoryName') {
        aVal = a.request?.category?.name || '';
        bVal = b.request?.category?.name || '';
      } else if (sortField === 'paymentMode') {
        aVal = a.paymentMode || 'CASH';
        bVal = b.paymentMode || 'CASH';
      } else if (sortField === 'paymentStatus') {
        aVal = a.paymentStatus || 'PENDING';
        bVal = b.paymentStatus || 'PENDING';
      } else if (sortField === 'totalFee') {
        aVal = a.totalFee || a.totalAmount || 850;
        bVal = b.totalFee || b.totalAmount || 850;
      } else if (sortField === 'createdAt') {
        aVal = new Date(a.createdAt || a.scheduledStart || 0).getTime();
        bVal = new Date(b.createdAt || b.scheduledStart || 0).getTime();
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredPayments, sortField, sortDirection]);

  // Paginated Payments
  const totalPages = Math.max(1, Math.ceil(sortedPayments.length / pageSize));
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPayments.slice(start, start + pageSize);
  }, [sortedPayments, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Payments & Financial Settlement</span>
            <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              ₹ INR Ledger
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit patient therapy receipts, manage cash/UPI collection, and monitor settlement cash flow.
          </p>
        </div>

        <button 
          onClick={onRefresh} 
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-2 rounded-xl transition shadow-xs shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Total Revenue Collected
            </span>
            <span className="text-xl font-black text-emerald-700">
              ₹{financialStats.collectedAmount.toLocaleString()}.00
            </span>
            <span className="text-[11px] text-slate-500 block font-medium">
              {financialStats.settledCount} invoices paid
            </span>
          </div>
        </div>

        {/* Pending Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Pending Collection
            </span>
            <span className="text-xl font-black text-amber-700">
              ₹{financialStats.pendingAmount.toLocaleString()}.00
            </span>
            <span className="text-[11px] text-slate-500 block font-medium">
              {financialStats.pendingCount} awaiting cash/UPI
            </span>
          </div>
        </div>

        {/* Settlement Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Settlement Rate
            </span>
            <span className="text-xl font-black text-teal-800">
              {financialStats.settlementRate}%
            </span>
            <span className="text-[11px] text-slate-500 block font-medium">
              Payment realization rate
            </span>
          </div>
        </div>

        {/* Total Invoices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Total Invoices
            </span>
            <span className="text-xl font-black text-slate-900">
              {financialStats.totalCount}
            </span>
            <span className="text-[11px] text-slate-500 block font-medium">
              Across all home visits
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice #, patient, clinician, mode..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          {/* Payment Status Filter */}
          <select
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="ALL">All Settlement Statuses</option>
            <option value="SETTLED">✓ Settled & Paid</option>
            <option value="PENDING">⏳ Pending Collection</option>
          </select>

          {/* Payment Mode Filter */}
          <select
            value={paymentModeFilter}
            onChange={(e) => {
              setPaymentModeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card / Online</option>
          </select>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl border border-slate-200 transition"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Filter Count Badge */}
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{sortedPayments.length}</span> matching records
        </div>
      </div>

      {/* Main Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80">
                <TableSortHeader
                  label="Invoice / Ref"
                  field="id"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <TableSortHeader
                  label="Patient Name & Phone"
                  field="patientName"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <TableSortHeader
                  label="Attending Clinician"
                  field="therapistName"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <TableSortHeader
                  label="Therapy Service"
                  field="categoryName"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <TableSortHeader
                  label="Payment Mode"
                  field="paymentMode"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <TableSortHeader
                  label="Total Fee (₹)"
                  field="totalFee"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <TableSortHeader
                  label="Settlement Status"
                  field="paymentStatus"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <th className="p-4 text-right text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  DeskBoy Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <CreditCard className="w-10 h-10 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-800 text-base">
                        {isFiltered ? 'No matching payment records' : 'No Payment Records Yet'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {isFiltered
                          ? 'Try clearing or changing your filters to see more payment records.'
                          : 'Payment transactions will appear here once patient appointments are created.'}
                      </p>
                      {isFiltered && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 text-xs font-bold text-teal-600 hover:text-teal-800 underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((apt: any) => {
                  const patientName = apt.patient?.fullName || 'Patient';
                  const patientPhone = apt.patient?.phoneNumber || apt.patient?.phone || '—';
                  const therapistName = apt.therapist?.user?.fullName || 'Dr. Sarah Jenkins, PT';
                  const categoryName = apt.request?.category?.name || 'Orthopedic Rehabilitation';
                  const totalFee = apt.totalFee || apt.totalAmount || 850;
                  const paymentStatus = apt.paymentStatus || 'PENDING';
                  const mode = apt.paymentMode || 'CASH';

                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4 font-mono font-bold text-[11px] text-slate-600 whitespace-nowrap">
                        #{apt.id}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{patientName}</div>
                        <div className="text-slate-500 text-[11px]">{patientPhone}</div>
                      </td>
                      <td className="p-4 font-medium text-slate-800">
                        {therapistName}
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          {categoryName}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {mode}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-base font-black text-slate-900">
                          ₹{totalFee}.00
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                          paymentStatus === 'SETTLED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {paymentStatus === 'SETTLED' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              <span>SETTLED</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 mr-1 text-amber-600" />
                              <span>PENDING</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        {paymentStatus === 'SETTLED' ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            <span>Paid</span>
                          </span>
                        ) : (
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => onSettlePayment(apt.id, 'CASH')}
                              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-1.5 px-2.5 rounded-lg text-xs transition shadow-xs"
                              title="Record cash collection"
                            >
                              💵 Cash
                            </button>
                            <button
                              onClick={() => onSettlePayment(apt.id, 'UPI')}
                              className="bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold py-1.5 px-2.5 rounded-lg text-xs transition shadow-xs"
                              title="Record UPI collection"
                            >
                              📱 UPI
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedPayments.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="payment records"
        />
      </div>
    </div>
  );
};
