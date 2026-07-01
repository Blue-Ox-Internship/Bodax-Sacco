import ChartPanel from '../../components/ChartPanel.jsx';
import DataTable from '../../components/DataTable.jsx';
import { Panel, StatCard } from '../../components/Card.jsx';
import { useApi } from '../../hooks/useApi.js';
import { money, shortDate } from '../../utils/format.js';

export default function Analytics() {
  const { data } = useApi('/reports/analytics', { topSavers: [], defaulters: [], trend: [], income: {}, expenditure: {} });
  const totalIncome = Number(data.income.savings_collected || 0) + Number(data.income.loan_repayments || 0);

  return (
    <div className="page-stack">
      <h1>Analytics</h1>
      <div className="stat-grid">
        <StatCard label="Total income" value={money(totalIncome)} />
        <StatCard label="Savings collected" value={money(data.income.savings_collected)} />
        <StatCard label="Loan repayments" value={money(data.income.loan_repayments)} />
        <StatCard label="Interest income" value={money(data.income.interest_income)} />
        <StatCard label="Withdrawals paid" value={money(data.expenditure.withdrawals_paid)} tone="warn" />
        <StatCard label="Withdrawals processed" value={data.expenditure.withdrawal_count || 0} tone="warn" />
      </div>

      <ChartPanel title="Monthly collection trends" data={data.trend} />

      <Panel title="Top savers">
        <DataTable
          rows={data.topSavers}
          columns={[
            { key: 'full_name', label: 'Member' },
            { key: 'member_number', label: 'Member no.' },
            { key: 'total', label: 'Total savings', render: (row) => money(row.total) },
          ]}
        />
      </Panel>

      <Panel title="Defaulters">
        <DataTable
          rows={data.defaulters}
          columns={[
            { key: 'full_name', label: 'Member' },
            { key: 'member_number', label: 'Member no.' },
            { key: 'balance', label: 'Balance', render: (row) => money(row.balance) },
            { key: 'due_date', label: 'Due date', render: (row) => shortDate(row.due_date) },
          ]}
        />
      </Panel>

      <Panel title="Income and expenditure summary">
        <dl className="details">
          <dt>Savings collected</dt>
          <dd>{money(data.income.savings_collected)}</dd>
          <dt>Loan repayments</dt>
          <dd>{money(data.income.loan_repayments)}</dd>
          <dt>Interest income</dt>
          <dd>{money(data.income.interest_income)}</dd>
          <dt>Withdrawals paid</dt>
          <dd>{money(data.expenditure.withdrawals_paid)}</dd>
          <dt>Withdrawals processed</dt>
          <dd>{data.expenditure.withdrawal_count || 0}</dd>
        </dl>
      </Panel>
    </div>
  );
}
