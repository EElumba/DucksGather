import { useState } from "react";
import LoginButton from "./components/LoginButton";
import EventList from "./components/EventList";
import SearchBar from "./components/SearchBar"

function App() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <>
      <header>
        <h1>Welcome to Ducks Gather</h1>
        <nav aria-label="Main navigation">
          <LoginButton />
          <SearchBar
          searchTerm = {searchTerm}
          onSearchChange={setSearchTerm}
          />
        </nav>
      </header>

      <main>
        <EventList />
      </main>
    </>
  );
}

export default App;
