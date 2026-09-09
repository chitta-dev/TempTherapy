import React, { useState, useMemo } from 'react';
import { 
  AlertCircle, 
  Search, 
  Phone, 
  MapPin, 
  Clock, 
  Activity, 
  RotateCcw,
  LayoutGrid,
  List,
  CheckCircle2,
  Zap,
  ArrowRight
} from 'lucide-react';
import { ServiceRequest } from '../../../../packages/shared/src/index';
import { Pagination } from './Pagination';
import { TableSortHeader } from './TableSortHeader';
import { CategoryItem } from './ServiceCatalogGrid';

export interface PendingTriageGridProps {
  requests: ServiceRequest[];
  categories: CategoryItem[];
  onRefresh: () => void;
  onDispatchClinician: (request: ServiceRequest) => void;
}

export const PendingTriageGrid: React.FC<PendingTriageGridProps> = ({
  requests,
  categories,
  onRefresh,
  onDispatchClinician
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Sort States
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View Mode: Table Grid vs Card Grid
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const pendingRequests = useMemo(() => {
    return requests.filter(r => r.status === 'REQUEST_SUBMITTED' || (r.status as any) === 'PENDING_TRIAGE');
  }, [requests]);

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
    setUrgencyFilter('ALL');
    setCategoryFilter('ALL');
    setCurrentPage(1);
  };

  const isFiltered = searchQuery.trim() !== '' || urgencyFilter !== 'ALL' || categoryFilter !== 'ALL';

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return pendingRequests.filter(req => {
      const patientName = req.patient?.fullName || '';
      const patientPhone = (req.patient as any)?.phoneNumber || (req.patient as any)?.phone || '';
      const address = (req as any).addressLine || req.address?.addressLine || '';
      const complaint = (req as any).chiefComplaint || req.conditionDescription || '';
      const targetArea = (req as any).targetArea || (Array.isArray(req.painAreas) ? req.painAreas.join(' ') : '');
      const reqId = req.id || '';

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          patientName.toLowerCase().includes(q) ||
          patientPhone.toLowerCase().includes(q) ||
          address.toLowerCase().includes(q) ||
          complaint.toLowerCase().includes(q) ||
          targetArea.toLowerCase().includes(q) ||
          reqId.toLowerCase().includes(q);

        if (!match) return false;
      }

      // Urgency Filter
      if (urgencyFilter === 'URGENT' && req.urgency !== 'URGENT') return false;
      if (urgencyFilter === 'NORMAL' && req.urgency === 'URGENT') return false;

      // Category Filter
      if (categoryFilter !== 'ALL') {
        const catId = req.categoryId || req.category?.id;
        if (catId !== categoryFilter) return false;
      }

      return true;
    });
  }, [pendingRequests, searchQuery, urgencyFilter, categoryFilter]);

  // Sorted Requests
  const sortedRequests = useMemo(() => {
    const list = [...filteredRequests];
    list.sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      if (sortField === 'id') {
        aVal = a.id || '';
        bVal = b.id || '';
      } else if (sortField === 'patientName') {
        aVal = a.patient?.fullName || '';
        bVal = b.patient?.fullName || '';
      } else if (sortField === 'categoryName') {
        aVal = a.category?.name || '';
        bVal = b.category?.name || '';
      } else if (sortField === 'urgency') {
        aVal = a.urgency === 'URGENT' ? 1 : 0;
        bVal = b.urgency === 'URGENT' ? 1 : 0;
      } else if (sortField === 'createdAt') {
        aVal = new Date(a.createdAt || 0).getTime();
        bVal = new Date(b.createdAt || 0).getTime();
      } else if (sortField === 'basePrice') {
        aVal = (a.category as any)?.basePrice || 850;
        bVal = (b.category as any)?.basePrice || 850;
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
  }, [filteredRequests, sortField, sortDirection]);

  // Paginated Requests
  const totalPages = Math.max(1, Math.ceil(sortedRequests.length / pageSize));
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRequests.slice(start, start + pageSize);
  }, [sortedRequests, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Pending Triage & Patient Requests</span>
            <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
              {pendingRequests.length} Pending
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review incoming clinical therapy requests, triage urgency, and assign certified clinicians.
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
            <span>Refresh Queue</span>
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
              placeholder="Search by patient, phone, complaint, address, ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => {
              setUrgencyFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="ALL">All Urgencies</option>
            <option value="URGENT">🚨 Urgent Only</option>
            <option value="NORMAL">Standard Visit</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Reset Filters Button */}
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
          Showing <span className="font-bold text-slate-800">{sortedRequests.length}</span> matching requests
        </div>
      </div>

      {/* Main Grid View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80">
                  <TableSortHeader
                    label="Request ID"
                    field="id"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableSortHeader
                    label="Patient Information"
                    field="patientName"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableSortHeader
                    label="Therapy Category"
                    field="categoryName"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableSortHeader
                    label="Urgency"
                    field="urgency"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="p-4 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Clinical Complaint & Address
                  </th>
                  <TableSortHeader
                    label="Base Fee"
                    field="basePrice"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableSortHeader
                    label="Received At"
                    field="createdAt"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="p-4 text-right text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <CheckCircle2 className="w-10 h-10 text-teal-600 mx-auto" />
                        <p className="font-bold text-slate-800 text-base">
                          {isFiltered ? 'No matching requests' : 'Dispatch Queue is Clear'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {isFiltered 
                            ? 'No incoming triage requests match your active filters.'
                            : 'All incoming patient requests have been scheduled and assigned to clinicians.'}
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
                  paginatedRequests.map(req => {
                    const categoryName = req.category?.name || 'Orthopedic & Spine Care';
                    const patientName = req.patient?.fullName || 'Patient';
                    const patientPhone = (req.patient as any)?.phoneNumber || (req.patient as any)?.phone || '+91 98765 43210';
                    const address = (req as any).addressLine || req.address?.addressLine || 'Home visit location';
                    const timeSlot = (req as any).preferredTimeSlot || req.preferredTimeWindow || '10:00 AM';
                    const painFocus = Array.isArray(req.painAreas) && req.painAreas.length > 0 
                      ? req.painAreas.join(', ') 
                      : ((req as any).targetArea || 'Evaluation');
                    const condition = (req as any).chiefComplaint || req.conditionDescription || 'Needs clinical evaluation and targeted therapy.';
                    const price = (req.category as any)?.basePrice || 850;

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4">
                          <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200 font-semibold">
                            {req.id}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{patientName}</div>
                          <div className="text-slate-500 flex items-center space-x-1 mt-0.5 text-[11px]">
                            <Phone className="w-3 h-3 text-teal-600" />
                            <span>{patientPhone}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            {categoryName}
                          </span>
                        </td>
                        <td className="p-4">
                          {req.urgency === 'URGENT' ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                              🚨 URGENT
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Standard
                            </span>
                          )}
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="font-semibold text-slate-800 line-clamp-1">Focus: {painFocus}</div>
                          <div className="text-slate-500 text-[11px] italic line-clamp-1">"{condition}"</div>
                          <div className="text-slate-400 text-[10px] flex items-center space-x-1 mt-1">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate">{address}</span>
                          </div>
                        </td>
                        <td className="p-4 font-black text-teal-800 text-sm">
                          ₹{price}.00
                        </td>
                        <td className="p-4 text-slate-400 font-mono text-[11px]">
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => onDispatchClinician(req)}
                            className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center space-x-1"
                          >
                            <span>Dispatch Clinician</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
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
            totalItems={sortedRequests.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="requests"
          />
        </div>
      ) : (
        /* Cards View with Pagination */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedRequests.map(req => {
              const categoryName = req.category?.name || 'Orthopedic & Spine Care';
              const patientName = req.patient?.fullName || 'Patient';
              const patientPhone = (req.patient as any)?.phoneNumber || (req.patient as any)?.phone || '+91 98765 43210';
              const address = (req as any).addressLine || req.address?.addressLine || '742 Evergreen Terrace, New Delhi';
              const timeSlot = (req as any).preferredTimeSlot || req.preferredTimeWindow || '10:00 AM';
              const painFocus = Array.isArray(req.painAreas) && req.painAreas.length > 0 
                ? req.painAreas.join(', ') 
                : ((req as any).targetArea || 'Evaluation');
              const condition = (req as any).chiefComplaint || req.conditionDescription || 'Needs clinical evaluation and targeted therapy.';
              const price = (req.category as any)?.basePrice || 850;

              return (
                <div key={req.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-teal-400 transition-all duration-200 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/80">
                          {categoryName}
                        </span>
                        {req.urgency === 'URGENT' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                            🚨 URGENT
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-1.5">{patientName}</h3>
                      <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5 font-medium">
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        <span>{patientPhone}</span>
                      </p>
                    </div>
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200/60 font-semibold">
                      {req.id}
                    </span>
                  </div>

                  <div className="bg-slate-50/80 p-3.5 rounded-xl text-xs space-y-2 text-slate-700 border border-slate-100">
                    <p className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="font-medium text-slate-800">{address}</span>
                    </p>
                    <p className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-medium text-slate-800">{timeSlot}</span>
                    </p>
                    <p className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="font-bold text-teal-900">Focus: {painFocus}</span>
                    </p>
                    <p className="text-slate-500 italic mt-1 border-t border-slate-200/50 pt-1.5">
                      "{condition}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Base Session Fee</span>
                      <span className="text-base font-black text-teal-800">₹{price}.00</span>
                    </div>
                    <button
                      onClick={() => onDispatchClinician(req)}
                      className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
                    >
                      <span>Dispatch Clinician ➔</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedRequests.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="requests"
            />
          </div>
        </div>
      )}
    </div>
  );
};
