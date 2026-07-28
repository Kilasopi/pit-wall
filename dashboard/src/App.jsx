import { useEffect, useState } from 'react';

function App() {
  const [state, setState] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4000');
    ws.onmessage = (e) => setState(JSON.parse(e.data));
    return () => ws.close();
  }, []);

  return (
    <div className="p-6 font-mono">
      <h1 className="text-xl mb-4">Pit Wall</h1>
      {state ? (
        <pre>{JSON.stringify(state, null, 2)}</pre>
      ) : (
        <p>Waiting for telemetry…</p>
      )}
    </div>
  );
}

export default App;