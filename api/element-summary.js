export default async function handler(req, res) {
  const { id } = req.query;
  const apiRes = await fetch(`https://fantasy.premierleague.com/api/element-summary/${id}/`);
  const data = await apiRes.json();
  res.status(200).json(data);
}
