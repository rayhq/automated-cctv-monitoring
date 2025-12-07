import React from "react";

const EventsPage = () => {
  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-in]">
      <h1 className="text-2xl font-semibold text-white">All Events</h1>
      <p className="text-slate-400 mb-2">
        Detailed history of all detected security events.
      </p>

      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700">
        <p className="text-slate-300">
          Events table will come here (separate from dashboard).
        </p>
      </div>
    </div>
  );
};

export default EventsPage;
