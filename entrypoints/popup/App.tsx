export default function App() {
  const openDashboard = () => {
    browser.tabs.create({ url: browser.runtime.getURL('/dashboard.html') });
  };

  return (
    <div className="w-72 p-4">
      <h1 className="text-lg font-bold">X Growth Kit</h1>
      <p className="mt-1 text-sm text-muted">Today's progress will show here.</p>
      <button
        onClick={openDashboard}
        className="mt-4 w-full rounded-full bg-accent px-4 py-2 text-sm font-bold text-white hover:opacity-90"
      >
        Open dashboard
      </button>
    </div>
  );
}
