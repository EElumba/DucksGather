import { useState } from "react";
import LoginButton from "./components/LoginButton";
import EventList from "./components/EventList";

function App() {
  const [user, setUser] = useState(null);

  return (
    <>
      <header>
        <h1>Welcome to Ducks Gather</h1>
        <nav aria-label="Main navigation">
          <LoginButton />
        </nav>
      </header>

      <main>
        <EventList />
      </main>
    </>
  );
}

export default App;
