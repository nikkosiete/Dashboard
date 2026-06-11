import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";
import "./hud.css";

// Database Connection Constants
const supabase = createClient(
  "https://efkpbpmcbkbcltapexvs.supabase.co",
  "sb_publishable_axcZxi0-ULgdttBWQjCA1Q_5u0FS0tg"
);

export default function App() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState([]);

  // 1. Safely cleans text cells and clears out empty dashes '-'
  const cleanText = (val) => {
    if (val === undefined || val === null || String(val).trim() === "" || String(val).trim() === "-") {
      return null;
    }
    return String(val).trim();
  };

  // 2. Safely converts strings into true Integers for database compliance
  const cleanInt = (val) => {
    const cleaned = cleanText(val);
    if (!cleaned) return null;
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? null : parsed;
  };

  // 3. Translates M/D/YYYY to YYYY-MM-DD
  const cleanDate = (val) => {
    const cleaned = cleanText(val);
    if (!cleaned) return null;
    
    const parts = cleaned.split("/");
    if (parts.length === 3) {
      const month = parts[0].padStart(2, "0");
      const day = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return cleaned;
  };

  // 4. Core upload engine
  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: async ({ data }) => {
        try {
          const formattedData = data.map((row) => ({
            id: cleanText(row["ID"]), 
            job_name: cleanText(row["Job Name"]),
            status: cleanText(row["Status"]),
            site_id: cleanText(row["Site ID"]),
            platform: cleanText(row["Platform"]),
            developer: cleanText(row["Developer"]),
            type_of_request: cleanText(row["Type of Request"]),
            num_of_pages: cleanText(row["Num of Pages"]),
            sla_agreed: cleanText(row["SLA Agreed"]),
            sla_missed: cleanText(row["SLA Missed"]),
            time_taken: cleanText(row["Time Taken"]),
            qc_rounds: cleanInt(row["QC Rounds"]),
            created_on: cleanDate(row["Created On"]),
            start_time: cleanDate(row["Start Time"]),
            end_time: cleanDate(row["End Time"]),
            closed_on: cleanDate(row["Closed On"]),
          }));

          const uniqueDataMap = new Map();
          formattedData.forEach((item) => {
            if (item.id) {
              uniqueDataMap.set(item.id, item);
            }
          });
          const deduplicatedData = Array.from(uniqueDataMap.values());

          const { error } = await supabase
            .from("joblog")
            .upsert(deduplicatedData, { onConflict: "id" });

          if (error) {
            console.error("Supabase Error:", error);
            alert(`Database rejected upload: ${error.message}`);
          } else {
            alert(`Successfully processed ${deduplicatedData.length} unique records!`);
          }
        } catch (err) {
          console.error("Processing failure:", err);
          alert("Error parsing CSV data layout.");
        } finally {
          setLoading(false);
          event.target.value = "";
        }
      },
    });
  }

  // 5. Fetch dashboard metrics via Supabase RPC
  async function fetchDashboard() {
    if (!startDate || !endDate) {
      alert("Paki-select muna ang Start at End Date!");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_weekly_dashboard', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      setDashboardData(data);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      alert("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  // Summary Card Helpers
  const totalCompleted = dashboardData.reduce((acc, row) => acc + Number(row.completed_websites || 0), 0);
  const totalInternalQa = dashboardData.reduce((acc, row) => acc + Number(row['Internal QA Passed'] || 0), 0);
  const totalSla = dashboardData.reduce((acc, row) => acc + Number(row.completed_within_sla || 0), 0);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Duda Production Importer</h1>
        <p>Upload and parse standardized export CSV files to synchronize metrics with your target database schema.</p>
      </div>

      {/* Grid Controls Section */}
      <div className="controls-grid">
        {/* Card 1: Upload CSV */}
        <div className="card">
          <div className="input-group">
            <label>Upload Job Log CSV here</label>
            <input type="file" onChange={handleFileUpload} />
          </div>
        </div>

        {/* Card 2: Date Filters */}
        <div className="card">
          <div className="input-group">
            <label>Filter Date Range</label>
            <div className="date-row">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
              <button className="btn-primary" onClick={fetchDashboard} disabled={loading}>
                {loading ? '...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Scorecards */}
      {dashboardData.length > 0 && (
        <div className="metrics-grid">
          <div className="metric-card completed">
            <span>Total Completed</span>
            <h2>{totalCompleted}</h2>
          </div>

          <div className="metric-card sla">
            <span>Within SLA</span>
            <h2>{totalSla}</h2>
          </div>

          <div className="metric-card qa">
            <span>Internal QA Passed</span>
            <h2>{totalInternalQa}</h2>
          </div>
        </div>
      )}

      {/* Data Table Results */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Week Start</th>
              <th>Week End</th>
              <th>Completed Websites</th>
              <th>Completed Within SLA</th>
              <th>SLA Pass Rate</th>
              <th>Internal QA Passed</th>
            </tr>
          </thead>
          <tbody>
            {dashboardData.map((row, index) => (
              <tr key={index}>
                <td>{row.week_start}</td>
                <td>{row.week_end}</td>
                <td className="text-bold">{row.completed_websites}</td>
                <td className="text-bold">{row.completed_within_sla}</td>
                <td className="text-bold">{row.sla_pass_rate}%</td>
                <td className="text-bold text-primary-color">{row['Internal QA Passed']}</td>
              </tr>
            ))}
            {dashboardData.length === 0 && (
              <tr>
                <td colSpan="5" className="table-empty-state">
                  No data generated. Select dates and click Generate.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}