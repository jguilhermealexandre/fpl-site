export default async function handler(req, res) {
  const apiRes = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
  const data = await apiRes.json();
  res.status(200).json(data);
}
