import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

function App() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerDetailData, setPlayerDetailData] = useState({});
  const [selectedMetrics, setSelectedMetrics] = useState(["total_points"]);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/bootstrap-static");
      const data = await res.json();
      setPlayers(data.elements);

      const teamMap = {};
      data.teams.forEach((team) => {
        teamMap[team.id] = team.name;
      });
      setTeams(teamMap);
    }

    fetchData();
  }, []);

  const statFields = [
    { key: "total_points", label: "Points" },
    { key: "now_cost", label: "Cost (£)", transform: (v) => v / 10 },
    { key: "minutes", label: "Minutes" },
    { key: "form", label: "Form" },
    { key: "points_per_game", label: "Points/Game" },
    { key: "goals_scored", label: "Goals" },
    { key: "assists", label: "Assists" },
    { key: "clean_sheets", label: "Clean Sheets" },
    { key: "starts_per_90", label: "Starts/90" },
    { key: "clean_sheets_per_90", label: "CS/90" },
    { key: "expected_goals_per_90", label: "xG/90" },
    { key: "expected_assists_per_90", label: "xA/90" },
    { key: "expected_goal_involvements_per_90", label: "xGI/90" },
    { key: "expected_goals_conceded_per_90", label: "xGC/90" },
    { key: "chance_of_playing_this_round", label: "Playing This" },
    { key: "chance_of_playing_next_round", label: "Playing Next" }
  ];

  const filteredPlayers = players.filter((player) => {
    const name = `${player.first_name} ${player.second_name}`.toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    const matchesTeam = teamFilter ? player.team.toString() === teamFilter : true;
    const matchesPosition = positionFilter ? player.element_type.toString() === positionFilter : true;

    const matchesStats = statFields.every(({ key, transform }) => {
      const min = parseFloat(filters[`${key}_min`] || "");
      const max = parseFloat(filters[`${key}_max`] || "");
      let value = player[key];
      if (value == null) return true;
      if (transform) value = transform(value);
      return (!filters[`${key}_min`] || value >= min) && (!filters[`${key}_max`] || value <= max);
    });

    return matchesSearch && matchesTeam && matchesPosition && matchesStats;
  });

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const { key, direction } = sortConfig;
    if (!key) return 0;

    let aVal = a[key];
    let bVal = b[key];

    const transform = statFields.find((f) => f.key === key)?.transform;
    if (transform) {
      aVal = transform(aVal);
      bVal = transform(bVal);
    }

    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handlePlayerClick = async (player) => {
    setSelectedPlayer(player);
    if (!playerDetailData[player.id]) {
      const res = await fetch(`/api/element-summary?id=${player.id}`);
      const detail = await res.json();
      setPlayerDetailData(prev => ({ ...prev, [player.id]: detail }));
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>
        Fantasy Premier League Players
      </h1>

      {!selectedPlayer && (
        <>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "0.5rem", flex: 1 }}
            />

            <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} style={{ padding: "0.5rem" }}>
              <option value="">All Teams</option>
              {Object.entries(teams).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>

            <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} style={{ padding: "0.5rem" }}>
              <option value="">All Positions</option>
              <option value="1">Goalkeeper</option>
              <option value="2">Defender</option>
              <option value="3">Midfielder</option>
              <option value="4">Forward</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {statFields.map(({ key, label }) => (
              <div key={key}>
                <label>{label}</label>
                <div style={{ display: "flex", gap: "4px" }}>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters[`${key}_min`] || ""}
                    onChange={(e) => setFilters({ ...filters, [`${key}_min`]: e.target.value })}
                    style={{ width: "50%" }}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters[`${key}_max`] || ""}
                    onChange={(e) => setFilters({ ...filters, [`${key}_max`]: e.target.value })}
                    style={{ width: "50%" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Team</th>
                  <th style={thStyle}>Position</th>
                  {statFields.map(({ key, label }) => (
                    <th
                      key={key}
                      style={{ ...thStyle, cursor: "pointer" }}
                      onClick={() => handleSort(key)}
                    >
                      {label} {sortConfig.key === key ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player) => (
                  <tr key={player.id}>
                    <td style={tdStyle}>
                      <button style={{ background: "none", border: "none", color: "blue", cursor: "pointer" }} onClick={() => handlePlayerClick(player)}>
                        {player.first_name} {player.second_name}
                      </button>
                    </td>
                    <td style={tdStyle}>{teams[player.team]}</td>
                    <td style={tdStyle}>{getPositionName(player.element_type)}</td>
                    {statFields.map(({ key, transform }) => {
                      let value = player[key];
                      if (value == null) value = "?";
                      else if (transform) value = transform(value);
                      return <td key={key} style={tdStyle}>{value}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedPlayer && (
        <div style={{ marginTop: "2rem" }}>
          <button onClick={() => setSelectedPlayer(null)} style={{ marginBottom: "1rem" }}>⬅ Back to All Players</button>
          {playerDetailData[selectedPlayer.id]?.history && (
  <div style={{ marginBottom: "2rem" }}>

    {playerDetailData[selectedPlayer.id]?.history && (
  <div style={{ marginBottom: "2rem" }}>
    <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
      Gameweek Stats Chart
    </h3>

    {/* ✅ CHECKBOXES HERE */}
    <div style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
      {chartMetrics.map(({ key, label }) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={selectedMetrics.includes(key)}
            onChange={(e) => {
              setSelectedMetrics((prev) =>
                e.target.checked
                  ? [...prev, key]
                  : prev.filter((m) => m !== key)
              );
            }}
          />
          {label}
        </label>
      ))}
    </div>

    {/* ✅ CHART HERE */}
    <LineChart width={700} height={250} data={playerDetailData[selectedPlayer.id].history}>
      <XAxis dataKey="round" label={{ value: "GW", position: "insideBottomRight", offset: -5 }} />
      <YAxis label={{ value: "Metric", angle: -90, position: "insideLeft" }} />
      <Tooltip />
      {selectedMetrics.map((metricKey) => {
        const metricInfo = chartMetrics.find(m => m.key === metricKey);
        return (
          <Line
            key={metricKey}
            type="monotone"
            dataKey={metricKey}
            strokeWidth={2}
            stroke={"#" + Math.floor(Math.random()*16777215).toString(16)} // random color
            dot={false}
          />
        );
      })}
    </LineChart>
  </div>
)}

  </div>
)}
          <h2 style={{ fontSize: "1.5rem" }}>{selectedPlayer.first_name} {selectedPlayer.second_name}</h2>
          <p>Detailed stats for this player:</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
<thead>
  <tr>
    <th style={thStyle}>Fixture</th>
    <th style={thStyle}>Points</th>
    <th style={thStyle}>Minutes</th>
    <th style={thStyle}>Goals</th>
    <th style={thStyle}>Assists</th>
    <th style={thStyle}>Clean Sheets</th>
    <th style={thStyle}>Goals Conceded</th>
    <th style={thStyle}>Own Goals</th>
    <th style={thStyle}>Bonus</th>
    <th style={thStyle}>Creativity</th>
    <th style={thStyle}>Threat</th>
    <th style={thStyle}>Starts</th>
    <th style={thStyle}>xG</th>
    <th style={thStyle}>xA</th>
    <th style={thStyle}>xGI</th>
    <th style={thStyle}>xGC</th>
    <th style={thStyle}>Value (£)</th>
    <th style={thStyle}>Transfers Balance</th>
    <th style={thStyle}>Selected By (%)</th>
    <th style={thStyle}>Transfers In</th>
    <th style={thStyle}>Transfers Out</th>
  </tr>
</thead>
              <tbody>
                {(playerDetailData[selectedPlayer.id]?.history || []).map((entry, idx) => (
<tr key={idx}>
  <td style={tdStyle}>GW {entry.round}</td>
  <td style={tdStyle}>{entry.total_points}</td>
  <td style={tdStyle}>{entry.minutes}</td>
  <td style={tdStyle}>{entry.goals_scored}</td>
  <td style={tdStyle}>{entry.assists}</td>
  <td style={tdStyle}>{entry.clean_sheets}</td>
  <td style={tdStyle}>{entry.goals_conceded}</td>
  <td style={tdStyle}>{entry.own_goals}</td>
  <td style={tdStyle}>{entry.bonus}</td>
  <td style={tdStyle}>{entry.creativity}</td>
  <td style={tdStyle}>{entry.threat}</td>
  <td style={tdStyle}>{entry.starts}</td>
  <td style={tdStyle}>{entry.expected_goals}</td>
  <td style={tdStyle}>{entry.expected_assists}</td>
  <td style={tdStyle}>{entry.expected_goal_involvements}</td>
  <td style={tdStyle}>{entry.expected_goals_conceded}</td>
  <td style={tdStyle}>{(entry.value / 10).toFixed(1)}</td>
  <td style={tdStyle}>{entry.transfers_balance}</td>
  <td style={tdStyle}>{entry.selected}</td>
  <td style={tdStyle}>{entry.transfers_in}</td>
  <td style={tdStyle}>{entry.transfers_out}</td>
</tr>

                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "8px",
  borderBottom: "2px solid #ccc",
  whiteSpace: "nowrap"
};

const chartMetrics = [
  { key: "total_points", label: "Points" },
  { key: "goals_scored", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "bonus", label: "Bonus" },
  { key: "creativity", label: "Creativity" },
  { key: "threat", label: "Threat" },
  { key: "expected_goals", label: "xG" },
  { key: "expected_assists", label: "xA" },
  { key: "expected_goal_involvements", label: "xGI" },
  { key: "expected_goals_conceded", label: "xGC" },
  { key: "value", label: "Value (£)", transform: (v) => v / 10 }
];

const tdStyle = {
  padding: "8px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap"
};

function getPositionName(positionId) {
  const positions = {
    1: "Goalkeeper",
    2: "Defender",
    3: "Midfielder",
    4: "Forward"
  };
  return positions[positionId] || "Unknown";
}

export default App;