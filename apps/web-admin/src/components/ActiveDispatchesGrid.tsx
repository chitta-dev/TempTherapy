import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Search, 
  Phone, 
  MapPin, 
  Clock, 
  RotateCcw,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  ShieldCheck,
  User
} from 'lucide-react';
import { Appointment, TherapistProfile } from '../../../../packages/shared/src/index';
import { Pagination } from './Pagination';
import { TableSortHeader } from './TableSortHeader';

export interface ActiveDispatchesGridProps {
  appointments: Appointment[];
  therapists: TherapistProfile[];
  onRefresh: () => void;
  onSettlePayment: (appointmentId: string, mode: 'CASH' | 'UPI') => void;
  onResetPayment?: (appointmentId: string) => void;
}

export const ActiveDispatchesGrid: React.FC<ActiveDispatchesGridProps> = ({
  appointments,
  therapists,
  onRefresh,
  onSettlePayment,
  onResetPayment
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [therapistFilter, setTherapistFilter] = useState('ALL');

  // Sort States
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View Mode: Table Grid vs Cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

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
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
    setTherapistFilter('ALL');
    setCurrentPage(1);
  };

  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'ALL' || paymentFilter !== 'ALL' || therapistFilter !== 'ALL';

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt: any) => {
      const patientName = apt.patient?.fullName || '';
      const patientPhone = apt.patient?.phoneNumber || apt.patient?.phone || '';
      const therapistName = apt.therapist?.user?.fullName || '';
      const address = apt.request?.addressLine || apt.request?.address?.addressLine || '';
      const aptId = apt.id || '';
      const categoryName = apt.request?.category?.name || '';

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          patientName.toLowerCase().includes(q) ||
          patientPhone.toLowerCase().includes(q) ||
          therapistName.toLowerCase().includes(q) ||
          address.toLowerCase().includes(q) ||
          aptId.toLowerCase().includes(q) ||
          categoryName.toLowerCase().includes(q);

        if (!match) return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL') {
        const status = apt.status || 'ASSIGNED';
        if (status !== statusFilter) return false;
      }

      // Payment Filter
      if (paymentFilter !== 'ALL') {
        const paymentStatus = apt.paymentStatus || 'PENDING';
        if (paymentStatus !== paymentFilter) return false;
      }

      // Therapist Filter
      if (therapistFilter !== 'ALL') {
        const tId = apt.therapistId || apt.therapist?.id || apt.therapist?.userId;
        if (tId !== therapistFilter) return false;
      }

      return true;
    });
  }, [appointments, searchQuery, statusFilter, paymentFilter, therapistFilter]);

  // Sorted Appointments
  const sortedAppointments = useMemo(() => {
    const list = [...filteredAppointments];
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
      } else if (sortField === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
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
  }, [filteredAppointments, sortField, sortDirection]);

  // Paginated Appointments
  const totalPages = Math.max(1, Math.ceil(sortedAppointments.length / pageSize));
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAppointments.slice(start, start + pageSize);
  }, [sortedAppointments, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Active Dispatches & Operations</span>
            <span className="text-xs bg-teal-50 text-teal-800 font-bold px-2.5 py-0.5 rounded-full border border-teal-200">
              {appointments.length} Total Visits
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor live home visit statuses, therapist transit, clinical completion, and fee collection in Rupees (₹).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-white text-teal-800 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table Grid View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'cards' ? 'bg-white text-teal-800 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={onRefresh} 
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-2 rounded-xl transition shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Dispatches</span>
          </button>
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
              placeholder="Search patient, therapist, address, ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          {/* Visit Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="ALL">All Visit Statuses</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="EN_ROUTE">En Route</option>
            <option value="ARRIVED">Arrived</option>
            <option value="IN_SESSION">In Session</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PENDING">Pending Collection</option>
            <option value="SETTLED">Paid & Settled</option>
          </select>

          {/* Therapist Filter */}
          {therapists.length > 0 && (
            <select
              value={therapistFilter}
              onChange={(e) => {
                setTherapistFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="ALL">All Therapists</option>
              {therapists.map(t => (
                <option key={t.id} value={t.id}>
                  {t.user?.fullName || t.licenseNumber}
                </option>
              ))}
            </select>
          )}

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
          Showing <span className="font-bold text-slate-800">{sortedAppointments.length}</span> matching dispatches
        </div>
      </div>

      {/* Main Grid View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80">
                  <TableSortHeader
                    label="Dispatch #"
                    field="id"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableSortHeader
                    label="Patient & Address"
                    field="patientName"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableSortHeader
                    label="Assigned Therapist"
                    field="therapistName"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableSortHeader
                    label="Visit Status"
                    field="status"
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
                    label="Payment Status"
                    field="paymentStatus"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="p-4 text-right text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Front-Desk Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
                        <p className="font-bold text-slate-800 text-base">
                          {isFiltered ? 'No matching dispatches found' : 'No Dispatches Scheduled Yet'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {isFiltered
                            ? 'Try adjusting or clearing your filters to see more appointments.'
                            : 'Triage incoming requests from the Pending Queue or take direct patient phone bookings.'}
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
                  paginatedAppointments.map((apt: any) => {
                    const patientName = apt.patient?.fullName || 'Patient';
                    const therapistName = apt.therapist?.user?.fullName || 'Dr. Sarah Jenkins, PT';
                    const categoryName = apt.request?.category?.name || 'Orthopedic Rehabilitation';
                    const totalFee = apt.totalFee || apt.totalAmount || 850;
                    const paymentStatus = apt.paymentStatus || 'PENDING';
                    const status = apt.status || 'ASSIGNED';
                    const address = apt.request?.addressLine || apt.request?.address?.addressLine || 'Indiranagar, Bengaluru';

                    return (
                      <tr key={apt.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4 font-mono font-bold text-[11px] text-slate-600 whitespace-nowrap">
                          #{apt.id}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{patientName}</div>
                          <div className="text-slate-500 text-[11px]">{apt.patient?.phoneNumber || apt.patient?.phone || '—'}</div>
                          <div className="text-slate-400 text-[10px] flex items-center space-x-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate max-w-[200px]">{address}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{therapistName}</div>
                          <div className="text-slate-400 text-[10px] font-mono">
                            Lic: {apt.therapist?.licenseNumber || 'PT-IND-9204'}
                          </div>
                          <div className="text-teal-700 font-bold text-[10px] mt-0.5">
                            Discharge OTP: 8844
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full border ${
                            status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            status === 'IN_SESSION' ? 'bg-blue-50 text-blue-800 border-blue-300 animate-pulse' :
                            status === 'ARRIVED' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                            status === 'EN_ROUTE' ? 'bg-indigo-50 text-indigo-800 border-indigo-300' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 font-black text-slate-900 text-sm">
                          ₹{totalFee}.00
                        </td>
                        <td className="p-4">
                          <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            paymentStatus === 'SETTLED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {paymentStatus}
                          </span>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          {paymentStatus === 'SETTLED' ? (
                            <div className="inline-flex items-center space-x-1.5">
                              <span className="inline-flex items-center text-emerald-700 font-bold text-xs">
                                <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                                <span>Paid ({apt.paymentMode || 'CASH'})</span>
                              </span>
                              {onResetPayment && (
                                <button
                                  onClick={() => onResetPayment(apt.id)}
                                  className="text-[10px] font-semibold text-slate-400 hover:text-amber-700 hover:bg-amber-50 px-1.5 py-0.5 rounded border border-slate-200 transition"
                                  title="Reset status to Pending"
                                >
                                  Undo
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-1.5">
                              <button
                                onClick={() => onSettlePayment(apt.id, 'CASH')}
                                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-1 px-2.5 rounded-lg text-xs transition shadow-xs"
                                title="Collect Cash from patient"
                              >
                                💵 Cash
                              </button>
                              <button
                                onClick={() => onSettlePayment(apt.id, 'UPI')}
                                className="bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold py-1 px-2.5 rounded-lg text-xs transition shadow-xs"
                                title="Collect UPI payment"
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
            totalItems={sortedAppointments.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="dispatches"
          />
        </div>
      ) : (
        /* Detailed Cards View with Pagination */
        <div className="space-y-4">
          <div className="space-y-4">
            {paginatedAppointments.map((apt: any) => {
              const patientName = apt.patient?.fullName || 'Patient';
              const therapistName = apt.therapist?.user?.fullName || 'Dr. Sarah Jenkins, PT';
              const categoryName = apt.request?.category?.name || 'Orthopedic Rehabilitation';
              const totalFee = apt.totalFee || apt.totalAmount || 850;
              const paymentStatus = apt.paymentStatus || 'PENDING';
              const status = apt.status || 'ASSIGNED';

              return (
                <div key={apt.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-teal-300 transition space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/70">
                        #{apt.id}
                      </span>
                      <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/80">
                        {categoryName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${
                        status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                        status === 'IN_SESSION' ? 'bg-blue-50 text-blue-800 border-blue-300 animate-pulse' :
                        status === 'ARRIVED' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {status.replace('_', ' ')}
                      </span>
                      <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${
                        paymentStatus === 'SETTLED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>
                        ₹{totalFee}.00 • {paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Patient Information</span>
                      <p className="font-bold text-slate-900 text-sm">{patientName}</p>
                      <p className="text-slate-500">{apt.patient?.phoneNumber || apt.patient?.phone || '+91 98765 43210'}</p>
                      <p className="text-slate-500">{apt.request?.addressLine || apt.request?.address?.addressLine || 'Indiranagar, Bengaluru'}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Assigned Therapist</span>
                      <p className="font-bold text-slate-900 text-sm">{therapistName}</p>
                      <p className="text-slate-500">License: {apt.therapist?.licenseNumber || 'PT-IND-9204'}</p>
                      <p className="text-teal-700 font-bold">Fixed Discharge OTP: 8844</p>
                    </div>

                    {/* DeskBoy Payment Collection Box */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                      <span className="text-slate-500 font-bold uppercase text-[10px] block">Front-Desk Payment Settlement</span>
                      {paymentStatus === 'SETTLED' ? (
                        <div className="flex items-center justify-between text-emerald-700 font-bold text-xs">
                          <div className="flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Paid & Settled (₹{totalFee}.00 via {apt.paymentMode || 'CASH'})</span>
                          </div>
                          {onResetPayment && (
                            <button
                              onClick={() => onResetPayment(apt.id)}
                              className="text-[10px] font-semibold text-slate-400 hover:text-amber-700 hover:bg-amber-50 px-2 py-0.5 rounded border border-slate-200 transition shrink-0 ml-2"
                              title="Reset status to Pending"
                            >
                              Mark Pending
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] text-amber-800 font-medium">Payment of ₹{totalFee}.00 is pending collection:</p>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onSettlePayment(apt.id, 'CASH')}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2 rounded-lg text-xs transition shadow-xs text-center"
                            >
                              💵 Collect Cash
                            </button>
                            <button
                              onClick={() => onSettlePayment(apt.id, 'UPI')}
                              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-1.5 px-2 rounded-lg text-xs transition shadow-xs text-center"
                            >
                              📱 Collect UPI
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedAppointments.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="dispatches"
            />
          </div>
        </div>
      )}
    </div>
  );
};
