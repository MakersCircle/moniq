import { ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import type { Transaction } from '../types';
import { useDataStore } from '../store/dataStore';
import { formatCurrency, formatDateShort } from '../utils/format';
import './TxnRow.css';

interface TxnRowProps {
  txn: Transaction;
  onClick?: () => void;
}

export default function TxnRow({ txn, onClick }: TxnRowProps) {
  const { sources, categories, settings } = useDataStore();

  const source   = sources.find((s) => s.id === txn.sourceId);
  const toSource = sources.find((s) => s.id === txn.toSourceId);
  const category = categories.find((c) => c.id === txn.categoryId);

  const typeIcon = {
    income:   <ArrowUpRight size={16} />,
    expense:  <ArrowDownRight size={16} />,
    transfer: <ArrowLeftRight size={16} />,
  }[txn.type];

  const label = txn.type === 'transfer'
    ? `${source?.name || '?'} → ${toSource?.name || '?'}`
    : category
    ? `${category.head}${category.subHead ? ' · ' + category.subHead : ''}`
    : '—';

  const sub = txn.note || source?.name || '';

  return (
    <button className="txn-row" onClick={onClick} type="button">
      <div className={`txn-icon txn-icon-${txn.type}`}>
        {typeIcon}
      </div>
      <div className="txn-info">
        <span className="txn-label truncate">{label}</span>
        {sub && <span className="txn-sub truncate">{sub}</span>}
      </div>
      <div className="txn-right">
        <span className={`txn-amount mono txn-amount-${txn.type}`}>
          {txn.type === 'income' ? '+' : txn.type === 'expense' ? '-' : ''}
          {formatCurrency(txn.amount, settings)}
        </span>
        <span className="txn-date">{formatDateShort(txn.date)}</span>
      </div>
    </button>
  );
}
