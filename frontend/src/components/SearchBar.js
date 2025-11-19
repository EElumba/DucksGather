import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const SearchContainer = styled.div`
  width: 100%;
  max-width: 600px;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1.2rem 1.5rem;
  padding-left: 3rem;
  border: none;
  border-radius: 30px;
  background: white;
  font-size: 1.1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;

  &:focus {
    outline: none;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);
  }

  &::placeholder {
    color: #666;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1.2rem;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  display: flex;
  align-items: center;
  pointer-events: none;
`;

const SearchBar = ({
  // Optional initial value so parent can control/reset the search text
  initialValue = '',
  // Called every time the search text changes (for live filtering)
  onSearchChange,
  // Called when user explicitly submits the search via keyboard (Enter)
  onSearchSubmit,
  // Called when the search is cleared (e.g., Escape key)
  onClear,
}) => {
  // Local state to track the current text in the input
  const [searchTerm, setSearchTerm] = useState(initialValue);

  // Keep local state in sync if parent changes initialValue
  useEffect(() => {
    setSearchTerm(initialValue);
  }, [initialValue]);

  // Handle text changes for every keystroke
  const handleChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Notify parent on each change so it can update filters/EventList
    if (typeof onSearchChange === 'function') {
      onSearchChange(value);
    }
  };

  // Handle keyboard interactions for accessibility and quick navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // Enter: treat as an explicit search submit
      if (typeof onSearchSubmit === 'function') {
        onSearchSubmit(searchTerm);
      }
    }

    if (e.key === 'Escape') {
      // Escape: clear the search text and notify parent
      setSearchTerm('');

      if (typeof onSearchChange === 'function') {
        onSearchChange('');
      }

      if (typeof onClear === 'function') {
        onClear();
      }
    }
  };

  return (
    <SearchContainer>
      <SearchIcon>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </SearchIcon>
      <SearchInput
        type="text"
        placeholder="Search for events, clubs, or activities..."
        value={searchTerm}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        // aria-label helps screen readers describe the purpose of this input
        aria-label="Search events, clubs, or activities"
      />
    </SearchContainer>
  );
};

export default SearchBar;