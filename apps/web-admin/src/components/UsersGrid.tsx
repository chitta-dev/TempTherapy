import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  PlusCircle, 
  Mail, 
  MessageSquare, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  RotateCcw,
  Shield,
  UserCheck
} from 'lucide-react';
import { Pagination } from './Pagination';
import { TableSortHeader } from './TableSortHeader';

export interface UserItem {
  id: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  role: string;
  isActivated?: boolean;
  passwordHash?: string;
  createdAt: string;
}

export interface UsersGridProps {
  users: UserItem[];
  isAdmin: boolean;
  onOpenCreateUser: () => void;
  onOpenEditUser: (user: UserItem) => void;
  onDeleteUser: (userId: string, userName: string) => void;
  onResendActivation: (userId: string, email: string, name: string, role?: string, phone?: string) => void;
}

export const UsersGrid: React.FC<UsersGridProps> = ({
  users,
  isAdmin,
  onOpenCreateUser,
  onOpenEditUser,
  onDeleteUser,
  onResendActivation
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Sort States
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  const isFiltered = searchQuery.trim() !== '' || roleFilter !== 'ALL' || statusFilter !== 'ALL';

  // Filtered and Sorted Users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search query across name, email, phone, ID
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = user.fullName?.toLowerCase().includes(q);
        const matchEmail = user.email?.toLowerCase().includes(q);
        const matchPhone = user.phoneNumber?.toLowerCase().includes(q);
        const matchId = user.id?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchId) {
          return false;
        }
      }

      // Role filter
      if (roleFilter !== 'ALL') {
        if (user.role?.toLowerCase() !== roleFilter.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'ACTIVE' && !user.isActivated) return false;
      if (statusFilter === 'PENDING' && user.isActivated) return false;

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const sortedUsers = useMemo(() => {
    const list = [...filteredUsers];
    list.sort((a, b) => {
      let aVal: any = a[sortField as keyof UserItem] ?? '';
      let bVal: any = b[sortField as keyof UserItem] ?? '';

      if (sortField === 'createdAt') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredUsers, sortField, sortDirection]);

  // Paginated Data
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Header with Title and Create Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Staff & User Management</span>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
              {users.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin console with sorting, filtering, and paging to manage staff, deskboys, clinicians, and registered patients.
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={onOpenCreateUser}
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center space-x-1.5 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create New User</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Global Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="ALL">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Dispatcher">DeskBoy (Dispatcher)</option>
            <option value="Therapist">Therapist</option>
            <option value="Patient">Patient</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="PENDING">Pending Only</option>
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
          Showing <span className="font-bold text-slate-800">{sortedUsers.length}</span> matching users
        </div>
      </div>

      {/* Users Data Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80">
                <TableSortHeader
                  label="User Details"
                  field="fullName"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <TableSortHeader
                  label="Role Permission"
                  field="role"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <TableSortHeader
                  label="Contact Phone"
                  field="phoneNumber"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <TableSortHeader
                  label="Account Status"
                  field="isActivated"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
                <TableSortHeader
                  label="Created Date"
                  field="createdAt"
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
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Users className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-800">No users found</p>
                      <p className="text-xs text-slate-400">
                        {isFiltered ? 'Try clearing or changing your search filters.' : 'No users have been registered yet.'}
                      </p>
                      {isFiltered && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{u.fullName}</div>
                      {u.email ? (
                        <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                      ) : (
                        <div className="text-slate-400 italic text-[11px]">No email (Optional)</div>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono">ID: {u.id}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        u.role === 'Admin' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                        u.role === 'Dispatcher' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                        u.role === 'Therapist' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {u.role === 'Dispatcher' ? '🚴 DeskBoy (Dispatcher)' : u.role}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{u.phoneNumber || '—'}</td>
                    <td className="p-4">
                      {u.isActivated ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {u.role === 'Patient' ? (
                            <>
                              <MessageSquare className="w-3 h-3 mr-1 text-amber-600" /> Pending First Login & Details
                            </>
                          ) : (
                            <>
                              <Mail className="w-3 h-3 mr-1 text-amber-600" /> Pending Activation
                            </>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      {/* If Patient: Welcome SMS button */}
                      {u.role === 'Patient' ? (
                        <button
                          onClick={() => onResendActivation(u.id, u.email || '', u.fullName, u.role, u.phoneNumber)}
                          className="text-teal-600 hover:text-teal-800 p-1.5 rounded-lg hover:bg-teal-50 transition"
                          title="Send Welcome SMS / Mobile Login Notice"
                        >
                          <MessageSquare className="w-4 h-4 inline" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onResendActivation(u.id, u.email || '', u.fullName, u.role, u.phoneNumber)}
                          className="text-amber-600 hover:text-amber-800 p-1.5 rounded-lg hover:bg-amber-50 transition"
                          title={u.role === 'Therapist' ? "Resend Welcome Email (Mobile Login & 30-Day Biometrics)" : "Resend Activation / Password Reset Email"}
                        >
                          <Mail className="w-4 h-4 inline" />
                        </button>
                      )}
                      <button
                        onClick={() => onOpenEditUser(u)}
                        className="text-indigo-600 hover:text-indigo-800 p-1.5 rounded-lg hover:bg-indigo-50 transition"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4 inline" />
                      </button>
                      {u.id !== 'usr_admin' && (
                        <button
                          onClick={() => onDeleteUser(u.id, u.fullName)}
                          className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedUsers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="users"
        />
      </div>
    </div>
  );
};
