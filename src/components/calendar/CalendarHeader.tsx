import React from 'react';
import { CalendarView } from '../../hooks/useCalendarLogic';
import { Calendar, Grid3x3, List } from 'lucide-react';

interface CalendarHeaderProps {
  viewMode: CalendarView;
  onViewModeChange: (mode: CalendarView) => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  const viewButtons: { mode: CalendarView; icon: React.ReactNode; label: string }[] = [
    { mode: 'day', icon: <List size={18} />, label: 'Giorno' },
    { mode: 'week', icon: <Calendar size={18} />, label: 'Settimana' },
    { mode: 'month', icon: <Grid3x3 size={18} />, label: 'Mese' },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {viewButtons.map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`px-3 sm:px-4 py-2 rounded-md font-semibold transition-colors flex items-center gap-2 touch-manipulation ${
              viewMode === mode
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CalendarHeader;
