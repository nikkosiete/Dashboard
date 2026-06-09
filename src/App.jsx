import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";
import "./hud.css";

const supabase = createClient(
  "https://efkpbpmcbkbcltapexvs.supabase.co",
  "sb_publishable_axcZxi0-ULgdttBWQjCA1Q_5u0FS0tg"
);

export default function App() {
  // Dashboard data
  const [dashboard, setDashboard] = useState([]);

  // Loading indicator
  const [loading, setLoading] = useState(false);

  // Dynamic filters
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-06-15");

  // Load dashboard from SQL function
  async function loadDashboard() {
    setLoading(true);

    const { data, error } = await supabase.rpc(
      "get_weekly_dashboard",
      {
        p_start_date: startDate,
        p_end_date: endDate,
      }
    );

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      setDashboard(data || []);
    }

    setLoading(false);
  }

  // Load when page opens
  useEffect(() => {
    loadDashboard();
  }, []);

  // CSV Upload
  async function handleUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      complete: async ({ data }) => {
        const { error } = await supabase
          .from("joblog")
          .insert(data);

        if (error) {
          console.error(error);
          alert(error.message);
          return;
        }

        alert("CSV Uploaded Successfully");

        loadDashboard();
      },
    });
  }

  // KPI Calculations
  const totalCompleted = dashboard.reduce(
    (sum, row) => sum + Number(row.completed_websites || 0),
    0
  );

  const totalWithinSLA = dashboard.reduce(
    (sum, row) => sum + Number(row.completed_within_sla || 0),
    0
  );

  const overallSLA =
    totalCompleted > 0
      ? (
          (totalWithinSLA / totalCompleted) *
          100
        ).toFixed(2)
      : "0.00";

  return (



    
    <div className="hud-panel rounded-xl p-6">
      <h1 className="text-cyan-400">Duda Weekly KPI Dashboard</h1>

      {/* Filters */}
      <div>
        <div>
          <label>Start Date</label>
          <br />
          <input
            type="date"
            value={startDate}
            onChange={(e) =>
              setStartDate(e.target.value)
            }
          />
        </div>

        <div>
          <label>End Date</label>
          <br />
          <input
            type="date"
            value={endDate}
            onChange={(e) =>
              setEndDate(e.target.value)
            }
          />
        </div>

        <button
          onClick={loadDashboard}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {/* CSV Upload */}
      <div>
        <input
          type="file"
          accept=".csv"
          onChange={handleUpload}
        />
      </div>

      {/* KPI Cards */}
      <div>
        <div style={cardStyle}>
          <h3>Total Completed</h3>
          <h1 className="text-5xl font-bold hud-glow">{totalCompleted}</h1>
        </div>

        <div style={cardStyle}>
          <h3>Completed Within SLA</h3>
          <h1>{totalWithinSLA}</h1>
        </div>

        <div style={cardStyle}>
          <h3>SLA Pass Rate</h3>
          <h1>{overallSLA}%</h1>
        </div>
      </div>

      {/* Weekly Table */}
      {loading ? (
        <h3>Loading...</h3>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={thStyle}>Week Start</th>
              <th style={thStyle}>Week End</th>
              <th style={thStyle}>Completed Websites</th>
              <th style={thStyle}>Completed Within SLA</th>
              <th style={thStyle}>SLA %</th>
            </tr>
          </thead>

          <tbody>
            {dashboard.map((row, index) => {
              const completed =
                Number(row.completed_websites) || 0;

              const withinSLA =
                Number(row.completed_within_sla) || 0;

              const sla =
                completed > 0
                  ? (
                      (withinSLA / completed) *
                      100
                    ).toFixed(2)
                  : "0.00";

              return (
                <tr key={index}>
                  <td >
                    {row.week_start}
                  </td>

                  <td style={tdStyle}>
                    {row.week_end}
                  </td>

                  <td style={tdStyle}>
                    {completed}
                  </td>

                  <td style={tdStyle}>
                    {withinSLA}
                  </td>

                  <td style={tdStyle}>
                    {sla}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Debug */}
      <div >
        <h3>Debug Data</h3>

        <pre>
          {JSON.stringify(
            dashboard,
            null,
            2
          )}
        </pre>
      </div>
    </div>



  );
}

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "20px",
  minWidth: "220px",
};

const thStyle = {
  border: "1px solid #ddd",
  padding: "10px",
  backgroundColor: "#f5f5f5",
};

const tdStyle = {
  border: "1px solid #ddd",
  padding: "10px",
};