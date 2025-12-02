import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { listEvents } from '../api/client';

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
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: all 0.2s;

  &:focus {
    outline: none;
    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
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

const ResultsList = styled.div`
  margin-top: 0.5rem;
  margin-left: 2.5rem;
  max-height: 300px;
  overflow-y: auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
`;



const ResultButton = styled.button`
  width: 100%;
  padding: 0.8rem 1rem;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 1px solid #eee;
  font-size: 1rem;
  cursor: pointer;

  &:hover,
  &:focus {
    background-color: #f0f0f0;
    outline: none;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const SearchBar = ({ initialValue = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const resultsRef = useRef([]);
  const navigate = useNavigate();

  useEffect(() => setSearchTerm(initialValue), [initialValue]);

  // Debounced API call
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setFocusedIndex(-1);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await listEvents({
          page: 1,
          page_size: 10,
          q: searchTerm.trim(),
        });
        const items = Array.isArray(response?.items) ? response.items : [];
        setResults(items);
        setFocusedIndex(-1);
      } catch (err) {
        console.error('Error fetching search results:', err);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchTerm('');
      setResults([]);
      setFocusedIndex(-1);
    } else if (e.key === 'Tab' && results.length) {
      // Tab moves focus into the list
      e.preventDefault();
      setFocusedIndex(0);
      resultsRef.current[0]?.focus();
    }
  };

  const handleResultKeyDown = (e, index) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % results.length;
      setFocusedIndex(nextIndex);
      resultsRef.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + results.length) % results.length;
      setFocusedIndex(prevIndex);
      resultsRef.current[prevIndex]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/events/${results[index].event_id}`);
    }
  };

  const handleEventSelect = (event) => {
    navigate(`/events/${event.event_id}`);
  };

  return (
    <SearchContainer>
      
      {/* <SearchIcon>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </SearchIcon> */}
      

      <SearchInput
        type="text"
        placeholder="Search for events, clubs, or activities..."
        value={searchTerm}
        onChange={handleChange}
        onKeyDown={handleInputKeyDown}
        aria-label="Search events, clubs, or activities. Press Tab to enter the results list. Use Up and Down arrow keys to navigate. Press Enter or Space to select a result."
        aria-describedby="search-instructions"
      />

      {results.length > 0 && (
        <>
          <div id="search-instructions" style={{ position: 'absolute', left: '-9999px' }}>
            Press Tab to enter the results list. Use Up and Down arrow keys to navigate. Press Enter or Space to select a result.
          </div>

          <ResultsList role="listbox" aria-label="Search results">
            {results.map((event, index) => (
              <ResultButton
                key={event.event_id}
                ref={(el) => resultsRef.current[index] = el}
                role="option"
                aria-selected={focusedIndex === index}
                onClick={() => handleEventSelect(event)}
                onKeyDown={(e) => handleResultKeyDown(e, index)}
                tabIndex={focusedIndex === index ? 0 : -1}
              >
                {event.title}
              </ResultButton>
            ))}
          </ResultsList>
        </>
      )}
    </SearchContainer>
  );
};

export default SearchBar;
