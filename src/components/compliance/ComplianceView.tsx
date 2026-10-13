import React, { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShieldAlert,
  Building,
} from 'lucide-react';
import { Company, ComplianceEvent, AuditLogEntry } from '../../types';
import { getStateRules } from '../../lib/complianceRules';

interface ComplianceViewProps {
  company: Company;
  complianceEvents: ComplianceEvent[];
  onUpdateComplianceEvents: (events: ComplianceEvent[]) => void;
  onAddAuditLog: (entry: AuditLogEntry) => void;
}

export const ComplianceView: React.FC<ComplianceViewProps> = ({
  company,
  complianceEvents,
  onUpdateComplianceEvents,
  onAddAuditLog,
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedState, setSelectedState] = useState(company.state);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newType, setNewType] = useState<ComplianceEvent['type']>('state_filing');
  const [newCost, setNewCost] = useState<number>(0);
  const [newDesc, setNewDesc] = useState('');

  const stateRules = getStateRules(selectedState);

  // Mark event complete
  const handleToggleComplete = (eventId: string) => {
    const updated = complianceEvents.map((e) => {
      if (e.id === eventId) {
        const nextCompleted = !e.completed;
        return {
          ...e,
          completed: nextCompleted,
          completed_date: nextCompleted ? new Date().toISOString().slice(0, 10) : undefined,
        };
      }
      return e;
    });

    onUpdateComplianceEvents(updated);

    const target = complianceEvents.find((e) => e.id === eventId);
    if (target) {
      onAddAuditLog({
        id: `aud_${Date.now()}`,
        company_id: company.id,
        timestamp: new Date().toISOString(),
        action: 'compliance.status_updated',
        actor: 'Alex Mercer',
        details: `Updated compliance event "${target.title}" to ${!target.completed ? 'COMPLETED' : 'PENDING'}.`,
      });
    }
  };

  // Add custom event
  const handleAddEvent = () => {
    if (!newTitle.trim()) return;

    const newEv: ComplianceEvent = {
      id: `comp_${Date.now()}`,
      company_id: company.id,
      type: newType,
      title: newTitle.trim(),
      description: newDesc.trim() || 'Scheduled regulatory filing',
      due_date: newDate,
      completed: false,
      estimated_cost: newCost,
    };

    onUpdateComplianceEvents([...complianceEvents, newEv]);
    setIsAddEventOpen(false);
    setNewTitle('');
    setNewDesc('');
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const getEventsForDay = (day: number) => {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return complianceEvents.filter((e) => e.due_date === formatted);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Corporate Compliance & State Filing Calendar
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated reminders for Secretary of State franchise taxes, annual reports, and registered agent deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* State Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800 text-xs text-slate-300">
            <Building className="w-3.5 h-3.5 text-indigo-400" />
            <span>State:</span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-transparent font-semibold text-white focus:outline-none cursor-pointer"
            >
              {['DE', 'CA', 'WY', 'TX', 'FL', 'NY', 'WA'].map((st) => (
                <option key={st} value={st} className="bg-slate-900 text-white">
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-2.5 py-1 rounded ${viewMode === 'calendar' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Month Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              List View
            </button>
          </div>

          <button
            onClick={() => setIsAddEventOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* State Mandate Callout Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Mandatory Legal Deadlines for {selectedState} {company.entity_type}s
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Official Secretary of State Rules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stateRules.map((rule) => (
            <div key={rule.id} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-xs">{rule.title}</span>
                <span className="font-mono text-emerald-400 text-xs">
                  {rule.estimatedCost > 0 ? `$${rule.estimatedCost}` : 'No Fee'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {rule.description}
              </p>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-amber-400/90 font-mono">
                  Penalty: {rule.penaltyWarning.substring(0, 45)}...
                </span>
                <a
                  href={rule.filingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 text-[11px] font-medium"
                >
                  Filing Portal <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main View: Calendar or List */}
      {viewMode === 'calendar' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          {/* Calendar Month Navigation */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">
              {monthNames[month]} {year}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 pb-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty_${idx}`} className="h-24 bg-slate-950/20 rounded border border-slate-800/40" />;
              }

              const dayEvents = getEventsForDay(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={`day_${day}`}
                  className={`h-24 p-2 rounded border flex flex-col justify-between overflow-hidden transition-colors ${
                    isToday
                      ? 'bg-slate-950/90 border-indigo-500/60 ring-1 ring-indigo-500/30'
                      : 'bg-slate-950/40 border-slate-800/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-mono font-medium ${isToday ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto">
                    {dayEvents.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => handleToggleComplete(ev.id)}
                        className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate block transition-colors ${
                          ev.completed
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                        title={ev.title}
                      >
                        {ev.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Due Date</th>
                  <th className="py-3 px-4 font-semibold">Event Title</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold text-right">Fee</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {complianceEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-850 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {ev.due_date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{ev.title}</div>
                      <div className="text-[11px] text-slate-400">{ev.description}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 uppercase">
                      {ev.type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">
                      {ev.estimated_cost && ev.estimated_cost > 0 ? `$${ev.estimated_cost}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {ev.completed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                          <AlertCircle className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {ev.filing_url && (
                        <a
                          href={ev.filing_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 rounded border border-slate-700 text-xs inline-flex items-center gap-1"
                        >
                          Portal <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        onClick={() => handleToggleComplete(ev.id)}
                        className={`px-2.5 py-1 text-xs rounded font-medium ${
                          ev.completed
                            ? 'bg-slate-800 text-slate-400 hover:text-white'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}
                      >
                        {ev.completed ? 'Reopen' : 'Mark Done'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Compliance Event Modal */}
      {isAddEventOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add Corporate Compliance Event</h3>
              <button onClick={() => setIsAddEventOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Delaware Annual Franchise Tax"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estimated Cost ($)</label>
                  <input
                    type="number"
                    value={newCost}
                    onChange={(e) => setNewCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                >
                  <option value="state_filing">State Filing</option>
                  <option value="tax_payment">Tax Payment</option>
                  <option value="internal_governance">Internal Governance Resolution</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="Instructions or portal notes"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsAddEventOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded"
              >
                Schedule Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
