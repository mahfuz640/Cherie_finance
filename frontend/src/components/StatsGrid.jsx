const money = (amount) => `BDT ${Number(amount || 0).toLocaleString('en-BD')}`;

export default function StatsGrid({ stats }) {
  const cards = [
    ['Total Invested', money(stats.invested)], ['Paid Requests', money(stats.paid)],
    ['Remaining After Requests', money(stats.remaining)], ['Loan Remaining', money(stats.loanRemaining)],
    ['Total Selling Amount', money(stats.selling)], ['Money in Company', money(stats.companyMoney)],
    ['Total Quantity', stats.totalQuantity], ['Total Sold', stats.totalSold],
    ['Total Stock', stats.totalStock], ['Total Profit', money(stats.profit)],
  ];

  return <section className="stats">{cards.map(([label, value], index) => (
    <article className={index < 4 ? 'featured' : ''} key={label}><small>{label}</small><strong>{value}</strong></article>
  ))}</section>;
}
