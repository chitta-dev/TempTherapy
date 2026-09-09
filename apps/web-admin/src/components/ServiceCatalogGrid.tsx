import React, { useState, useMemo } from 'react';
import { 
  Tag, 
  Search, 
  PlusCircle, 
  Clock, 
  IndianRupee, 
  Edit, 
  RotateCcw,
  LayoutGrid,
  List,
  Stethoscope
} from 'lucide-react';
import { Pagination } from './Pagination';
import { TableSortHeader } from './TableSortHeader';

export interface CategoryItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  estimatedDurationMinutes: number;
  iconName: string;
}

export interface ServiceCatalogGridProps {
  categories: CategoryItem[];
  isAdmin: boolean;
  onOpenCreateCategory: () => void;
  onOpenEditCategory: (category: CategoryItem) => void;
}

export const ServiceCatalogGrid: React.FC<ServiceCatalogGridProps> = ({
  categories,
  isAdmin,
  onOpenCreateCategory,
  onOpenEditCategory
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [durationFilter, setDurationFilter] = useState('ALL');
  const [priceFilter, setPriceFilter] = useState('ALL');

  // Sort States
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View Mode: Table Grid vs Card Grid
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
    setDurationFilter('ALL');
    setPriceFilter('ALL');
    setCurrentPage(1);
  };

  const isFiltered = searchQuery.trim() !== '' || durationFilter !== 'ALL' || priceFilter !== 'ALL';

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      // Search query across name, description, ID
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = cat.name?.toLowerCase().includes(q);
        const matchDesc = cat.description?.toLowerCase().includes(q);
        const matchId = cat.id?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchId) {
          return false;
        }
      }

      // Duration filter
      if (durationFilter === 'SHORT' && cat.estimatedDurationMinutes > 45) return false;
      if (durationFilter === 'MEDIUM' && (cat.estimatedDurationMinutes < 45 || cat.estimatedDurationMinutes > 60)) return false;
      if (durationFilter === 'LONG' && cat.estimatedDurationMinutes <= 60) return false;

      // Price filter
      if (priceFilter === 'UNDER_800' && cat.basePrice >= 800) return false;
      if (priceFilter === '800_900' && (cat.basePrice < 800 || cat.basePrice > 900)) return false;
      if (priceFilter === 'ABOVE_900' && cat.basePrice <= 900) return false;

      return true;
    });
  }, [categories, searchQuery, durationFilter, priceFilter]);

  // Sorted Categories
  const sortedCategories = useMemo(() => {
    const list = [...filteredCategories];
    list.sort((a, b) => {
      let aVal: any = a[sortField as keyof CategoryItem] ?? '';
      let bVal: any = b[sortField as keyof CategoryItem] ?? '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredCategories, sortField, sortDirection]);

  // Paginated Data
  const totalPages = Math.max(1, Math.ceil(sortedCategories.length / pageSize));
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCategories.slice(start, start + pageSize);
  }, [sortedCategories, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Header with Title and Create Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Service Catalog & Pricing (₹ INR)</span>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              {categories.length} Categories
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure clinical therapy specializations, standard visit durations, and base session fees in Rupees.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'cards' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {isAdmin && (
            <button 
              onClick={onOpenCreateCategory}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center space-x-1.5 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add Therapy Category</span>
            </button>
          )}
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
              placeholder="Search category name, description, ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          {/* Duration Filter */}
          <select
            value={durationFilter}
            onChange={(e) => {
              setDurationFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="ALL">All Durations</option>
            <option value="SHORT">Up to 45 Mins</option>
            <option value="MEDIUM">45 – 60 Mins</option>
            <option value="LONG">&gt; 60 Mins</option>
          </select>

          {/* Price Filter */}
          <select
            value={priceFilter}
            onChange={(e) => {
              setPriceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="ALL">All Price Tiers</option>
            <option value="UNDER_800">Under ₹800</option>
            <option value="800_900">₹800 – ₹900</option>
            <option value="ABOVE_900">Above ₹900</option>
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
          Showing <span className="font-bold text-slate-800">{sortedCategories.length}</span> matching categories
        </div>
      </div>

      {/* Main Grid View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80">
                  <TableSortHeader
                    label="Code / ID"
                    field="id"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableSortHeader
                    label="Therapy Specialization"
                    field="name"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableSortHeader
                    label="Est. Duration"
                    field="estimatedDurationMinutes"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableSortHeader
                    label="Base Fee (₹ INR)"
                    field="basePrice"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="p-4 text-right text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Tag className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="font-bold text-slate-800">No categories found</p>
                        <p className="text-xs text-slate-400">
                          {isFiltered ? 'Try clearing or changing your search filters.' : 'No service catalog categories configured.'}
                        </p>
                        {isFiltered && (
                          <button
                            onClick={handleResetFilters}
                            className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-800 underline"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCategories.map(cat => (
                    <tr key={cat.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4 font-mono font-bold text-[11px] text-slate-500">
                        {cat.id}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                          <span>{cat.name}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                          {cat.description || 'Targeted in-home physiotherapy session.'}
                        </p>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">
                        <div className="inline-flex items-center space-x-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{cat.estimatedDurationMinutes} mins</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-base font-black text-emerald-700">
                          ₹{cat.basePrice}.00
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => onOpenEditCategory(cat)}
                          className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 px-3 py-1.5 rounded-lg transition"
                        >
                          Edit Pricing & Duration
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedCategories.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="categories"
          />
        </div>
      ) : (
        /* Card Grid View with Pagination */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedCategories.map(cat => (
              <div key={cat.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-emerald-400 transition space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{cat.id}</span>
                    <h3 className="text-base font-black text-slate-900 mt-0.5">{cat.name}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">
                    🩺
                  </div>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2">{cat.description || 'Targeted in-home physiotherapy session.'}</p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Base Price (INR)</span>
                    <span className="text-base font-black text-emerald-700">₹{cat.basePrice}.00</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Duration</span>
                    <span className="font-bold text-slate-700">⏱ {cat.estimatedDurationMinutes} mins</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => onOpenEditCategory(cat)}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                  >
                    Edit Price & Duration
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedCategories.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="categories"
            />
          </div>
        </div>
      )}
    </div>
  );
};
