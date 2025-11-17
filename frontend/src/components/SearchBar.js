import React, { useState } from 'react';
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

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
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
        onChange={handleSearch}
      />
    </SearchContainer>
  );
};

export default SearchBar;