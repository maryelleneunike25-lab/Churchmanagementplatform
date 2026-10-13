import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  X, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { parseLocalDate, getAge } from '../../../lib/age';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
];

const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export interface ModernDatePickerProps {
  value?: string; // Format: 'YYYY-MM-DD'
  onChange: (val: string) => void;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  showAge?: boolean;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return `${d.getDate()} ${MONTH_SHORT_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ModernDatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  minYear = 1920,
  maxYear = 2040,
  disabled = false,
  className = '',
  inputClassName = '',
  showAge = false,
}: ModernDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Initialize view year and month based on value or today
  const today = useMemo(() => new Date(), []);
  const initialDate = useMemo(() => {
    if (value) {
      const d = parseLocalDate(value);
      if (d) return d;
    }
    return today;
  }, [value, today]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth() + 1); // 1-12

  // Sync view when opening
  useEffect(() => {
    if (isOpen) {
      if (value) {
        const d = parseLocalDate(value);
        if (d) {
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth() + 1);
          return;
        }
      }
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth() + 1);
    }
  }, [isOpen, value, today]);

  // Generate Year options
  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [minYear, maxYear]);

  // Days in current viewMonth & viewYear
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth, 0).getDate();
  }, [viewYear, viewMonth]);

  // First day of viewMonth (0 = Sunday, 1 = Monday, ...)
  const startDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth - 1, 1).getDay();
  }, [viewYear, viewMonth]);

  const daysGrid = useMemo(() => {
    const cells: { day: number; dateStr: string; isCurrentMonth: boolean; isSunday: boolean }[] = [];
    
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(viewYear, viewMonth - 1, i);
      const dateStr = `${viewYear}-${pad2(viewMonth)}-${pad2(i)}`;
      cells.push({
        day: i,
        dateStr,
        isCurrentMonth: true,
        isSunday: d.getDay() === 0,
      });
    }
    return cells;
  }, [viewYear, viewMonth, daysInMonth]);

  const handleSelectDay = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleQuickToday = () => {
    const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
    onChange(todayStr);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const age = showAge && value ? getAge(value) : -1;

  return (
    <div className={`relative inline-block w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(true)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm transition-all text-left shadow-2xs hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer ${inputClassName}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarIcon size={16} className={value ? "text-blue-600 flex-shrink-0" : "text-gray-400 flex-shrink-0"} />
          <span className={`truncate font-medium ${value ? "text-gray-900" : "text-gray-400"}`}>
            {value ? formatDateDisplay(value) : placeholder}
          </span>
          {age >= 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 flex-shrink-0">
              {age} thn
            </span>
          )}
        </div>

        {value && !disabled ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            title="Hapus tanggal"
            className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={14} />
          </span>
        ) : (
          <span className="text-[11px] text-gray-400 font-bold bg-gray-50 border border-gray-100 rounded-md px-1.5 py-0.5">
            PILIH
          </span>
        )}
      </button>

      {/* Floating Modern Modal / Popover */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150 select-none"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={18} className="text-blue-200" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Pilih Tanggal</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Selected date preview banner */}
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-2xl font-black tracking-tight">
                    {value ? formatDateDisplay(value) : 'Pilih Tanggal'}
                  </p>
                  <p className="text-xs text-blue-200 font-medium mt-0.5">
                    {value && parseLocalDate(value) 
                      ? parseLocalDate(value)!.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                      : 'Geser tahun & bulan dengan mudah di bawah'}
                  </p>
                </div>
                {age >= 0 && (
                  <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-extrabold text-white border border-white/20">
                    Usia {age} Tahun
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Year Navigation with Slider & Quick Jump */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-1">
                  {/* Jump -10 Years */}
                  <button
                    type="button"
                    onClick={() => setViewYear(y => Math.max(minYear, y - 10))}
                    title="-10 Tahun"
                    className="p-1.5 rounded-xl bg-white text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer text-xs font-bold flex items-center"
                  >
                    <ChevronsLeft size={15} />
                    <span className="text-[10px] hidden sm:inline ml-0.5">10</span>
                  </button>

                  {/* Jump -1 Year */}
                  <button
                    type="button"
                    onClick={() => setViewYear(y => Math.max(minYear, y - 1))}
                    title="-1 Tahun"
                    className="p-1.5 rounded-xl bg-white text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {/* Year Dropdown */}
                  <div className="flex items-center gap-1.5 px-2">
                    <span className="text-xs font-bold text-slate-500">Tahun</span>
                    <select
                      value={viewYear}
                      onChange={e => setViewYear(Number(e.target.value))}
                      className="bg-white border border-blue-200 text-blue-900 rounded-xl px-2.5 py-1 text-base font-black focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-2xs"
                    >
                      {yearOptions.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Jump +1 Year */}
                  <button
                    type="button"
                    onClick={() => setViewYear(y => Math.min(maxYear, y + 1))}
                    title="+1 Tahun"
                    className="p-1.5 rounded-xl bg-white text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>

                  {/* Jump +10 Years */}
                  <button
                    type="button"
                    onClick={() => setViewYear(y => Math.min(maxYear, y + 10))}
                    title="+10 Tahun"
                    className="p-1.5 rounded-xl bg-white text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer text-xs font-bold flex items-center"
                  >
                    <span className="text-[10px] hidden sm:inline mr-0.5">10</span>
                    <ChevronsRight size={15} />
                  </button>
                </div>

                {/* Smooth Year Slider */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1 px-1">
                    <span>{minYear}</span>
                    <span className="text-blue-700 font-black text-xs bg-blue-100/60 px-2 py-0.5 rounded-md">
                      Geser Tahun: {viewYear}
                    </span>
                    <span>{maxYear}</span>
                  </div>
                  <input
                    type="range"
                    min={minYear}
                    max={maxYear}
                    value={viewYear}
                    onChange={e => setViewYear(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-all"
                  />
                </div>
              </div>

              {/* Month Selector Pills */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">Pilih Bulan</span>
                  <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-lg">
                    {MONTH_NAMES_ID[viewMonth - 1]} {viewYear}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {MONTH_SHORT_ID.map((mName, idx) => {
                    const mNum = idx + 1;
                    const isSelected = viewMonth === mNum;
                    return (
                      <button
                        key={mNum}
                        type="button"
                        onClick={() => setViewMonth(mNum)}
                        className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs font-black ring-2 ring-blue-300'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                        }`}
                      >
                        {mName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="pt-1 border-t border-slate-100">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 mb-1.5">
                  {DAY_NAMES_ID.map((name, i) => (
                    <span key={name} className={i === 0 ? "text-rose-500 font-extrabold" : ""}>
                      {name}
                    </span>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells before month start */}
                  {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="h-9" />
                  ))}

                  {/* Month days */}
                  {daysGrid.map(d => {
                    const isSelected = value === d.dateStr;
                    const isToday = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}` === d.dateStr;

                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        onClick={() => handleSelectDay(d.dateStr)}
                        className={`h-9 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm font-black scale-105 ring-2 ring-blue-400/40 z-10'
                            : isToday
                            ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                            : d.isSunday
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {d.day}
                        {isToday && !isSelected && (
                          <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleQuickToday}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={13} className="text-amber-500" /> Hari Ini
                </button>

                <div className="flex items-center gap-2">
                  {value && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
