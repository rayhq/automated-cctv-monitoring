import React from "react";

const SettingsPage = () => {
  return (
    <div className="space-y-4 animate-[fadeIn_0.5s_ease-in]">
      <h1 className="text-2xl font-semibold text-white">System Settings</h1>
      <p className="text-slate-400">
        Configuration options for alerts, retention and integration (demo view).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/90 border border-slate-800/70 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-2">
            Alert Sensitivity
          </h2>
          <p className="text-sm text-slate-400 mb-3">
            Controls how aggressive the suspicious activity detection is.
          </p>
          <p className="text-sm text-slate-300">
            Current: <span className="font-semibold">Medium</span> (demo)
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/70 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-2">
            Event Retention
          </h2>
          <p className="text-sm text-slate-400 mb-3">
            How long event logs are retained in the database.
          </p>
          <p className="text-sm text-slate-300">
            Current: <span className="font-semibold">30 days</span> (demo)
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
