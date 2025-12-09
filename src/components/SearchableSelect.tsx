import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

export interface SearchableOption {
  id: string;
  label: string;
  secondaryLabel?: string;
  metadata?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  noOptionsMessage?: string;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Cerca...',
  label,
  required = false,
  disabled = false,
  noOptionsMessage = 'Nessun risultato trovato',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 150);

  // Filtra le opzioni in base al termine di ricerca
  const filteredOptions = options.filter((option) => {
    const searchLower = debouncedSearchTerm.toLowerCase();
    return (
      option.label.toLowerCase().includes(searchLower) ||
      option.secondaryLabel?.toLowerCase().includes(searchLower) ||
      option.metadata?.toLowerCase().includes(searchLower)
    );
  });

  // Trova l'opzione selezionata
  const selectedOption = options.find((opt) => opt.id === value);

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index quando cambiano le opzioni filtrate
  useEffect(() => {
    setHighlightedIndex(0);
  }, [debouncedSearchTerm]);

  // Scroll automatico per l'opzione evidenziata
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label} {required && '*'}
        </label>
      )}
      <div ref={containerRef} className="relative">
        {/* Input Container */}
        <div
          className={`relative flex items-center ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              ref={inputRef}
              type="text"
              value={isOpen ? searchTerm : selectedOption?.label || ''}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              onClick={(e) => {
                e.stopPropagation();
                if (!isOpen) setIsOpen(true);
              }}
              placeholder={
                selectedOption ? selectedOption.label : placeholder
              }
              className="input pl-10 pr-20"
              disabled={disabled}
              required={required && !value}
              readOnly={!isOpen}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {value && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  tabIndex={-1}
                >
                  <X size={16} className="text-gray-400" />
                </button>
              )}
              <ChevronDown
                size={18}
                className={`text-gray-400 transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Dropdown List */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {noOptionsMessage}
              </div>
            ) : (
              <ul ref={listRef} className="py-1">
                {filteredOptions.map((option, index) => (
                  <li
                    key={option.id}
                    onClick={() => handleSelect(option.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-4 py-2 cursor-pointer transition-colors ${
                      index === highlightedIndex
                        ? 'bg-primary-50 text-primary-900'
                        : 'hover:bg-gray-50'
                    } ${value === option.id ? 'bg-primary-100' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {option.label}
                        </div>
                        {option.secondaryLabel && (
                          <div className="text-xs text-gray-500 truncate">
                            {option.secondaryLabel}
                          </div>
                        )}
                      </div>
                      {option.metadata && (
                        <div className="ml-2 text-xs text-gray-400 whitespace-nowrap">
                          {option.metadata}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableSelect;
