import React, { useState, useEffect } from 'react';
import {
  DollarSign, Receipt, CreditCard, Download, Plus, CheckCircle2,
  TrendingUp, ArrowUpRight, ArrowDownRight, PieChart, FileText
} from 'lucide-react';
import { Invoice } from '../types';
import { api } from '../services/api';
import { DataTable, Column } from '../components/DataTable';
import { KpiCard } from '../components/KpiCard';

export interface FinancePageProps {
  initialTab?: 'invoices' | 'finance';
}

interface LedgerEntry {
  id: string;
  reference: string;
  account: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  category: string;
  description: string;
  date: string;
}

export const FinancePage: React.FC<FinancePageProps> = ({ initialTab = 'invoices' }) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'finance'>(initialTab);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(0);

  // Mock comprehensive ledger entries
  const [ledgerEntries] = useState<LedgerEntry[]>([
    {
      id: 'led-001',
      reference: 'TX-2026-0928-881',
      account: 'Accounts Receivable',
      type: 'CREDIT',
      amount: 14250.00,
      category: 'Wholesale Sales',
      description: 'Organic Roma Tomatoes shipment to FreshDirect Bay Area',
      date: '2026-09-28'
    },
    {
      id: 'led-002',
      reference: 'TX-2026-0928-882',
      account: 'Direct Logistics Cost',
      type: 'DEBIT',
      amount: 1850.00,
      category: 'Reefer Transportation',
      description: 'Freight diesel & electric chiller surcharge - Salinas corridor',
      date: '2026-09-28'
    },
    {
      id: 'led-003',
      reference: 'TX-2026-0927-883',
      account: 'Cold Storage Tariffs',
      type: 'DEBIT',
      amount: 920.00,
      category: 'Facility Storage',
      description: 'Chamber #2 pallet slots tariff (4 days @ 3.5°C setpoint)',
      date: '2026-09-27'
    },
    {
      id: 'led-004',
      reference: 'TX-2026-0927-884',
      account: 'Quality Assurance Fees',
      type: 'DEBIT',
      amount: 350.00,
      category: 'Compliance Audit',
      description: 'Pre-shipment brix & pesticide residue inspection certificate',
      date: '2026-09-27'
    },
    {
      id: 'led-005',
      reference: 'TX-2026-0926-885',
      account: 'Accounts Receivable',
      type: 'CREDIT',
      amount: 8900.00,
      category: 'Wholesale Sales',
      description: 'Crisp Romaine Lettuce order delivered to Whole Foods Market',
      date: '2026-09-26'
    }
  ]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const fetchFinance = async () => {
    const [invRes, sumRes] = await Promise.all([
      api.get<Invoice[]>('/api/finance/invoices'),
      api.get<any>('/api/finance/summary')
    ]);
    if (invRes.success && invRes.data) setInvoices(invRes.data);
    if (sumRes.success && sumRes.data) setSummary(sumRes.data);
  };

  useEffect(() => {
    fetchFinance();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const res = await api.post('/api/finance/payments', {
      invoice_id: selectedInvoice.id,
      amount: payAmount
    });

    if (res.success) {
      setIsPayOpen(false);
      fetchFinance();
    } else {
      alert(res.error || 'Failed to record payment');
    }
  };

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice Number',
      render: (inv) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Receipt className="w-3.5 h-3.5 text-cold-600" />
            <span>{inv.invoice_number}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-sans">{inv.retailer_name || 'Retail Supermarket'}</div>
        </div>
      )
    },
    {
      key: 'issued_date',
      header: 'Issue / Due Date',
      render: (inv) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">{inv.issued_date}</div>
          <div className="text-[11px] text-slate-400">Due: {inv.due_date}</div>
        </div>
      )
    },
    {
      key: 'breakdown',
      header: 'Charges Breakdown',
      render: (inv) => (
        <div className="text-[11px] text-slate-500">
          Subtotal: ${inv.total_amount?.toFixed(2)} • Freight: ${inv.transport_charges?.toFixed(2)}
        </div>
      )
    },
    {
      key: 'net_payable',
      header: 'Net Payable',
      render: (inv) => (
        <span className="font-bold text-slate-900 dark:text-white text-sm">
          ${inv.net_payable?.toFixed(2)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
        }`}>
          {inv.status}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (inv) => (
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <a
            href={`/api/finance/invoices/${inv.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Download PDF Invoice"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
          {inv.status !== 'PAID' && (
            <button
              onClick={() => { setSelectedInvoice(inv); setPayAmount(inv.net_payable); setIsPayOpen(true); }}
              className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 shadow-2xs"
            >
              Pay
            </button>
          )}
        </div>
      )
    }
  ];

  const ledgerColumns: Column<LedgerEntry>[] = [
    {
      key: 'reference',
      header: 'Transaction Reference',
      render: (l) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">{l.reference}</div>
          <div className="text-[11px] text-slate-400">{l.date}</div>
        </div>
      )
    },
    {
      key: 'account',
      header: 'Ledger Account',
      render: (l) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{l.account}</div>
          <div className="text-[11px] text-slate-400">{l.category}</div>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Particulars',
      render: (l) => (
        <div className="text-xs text-slate-600 dark:text-slate-300 max-w-sm truncate">
          {l.description}
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (l) => (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center w-fit space-x-1 ${
          l.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
        }`}>
          {l.type === 'CREDIT' ? <ArrowDownRight className="w-3 h-3 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 text-rose-600" />}
          <span>{l.type}</span>
        </span>
      )
    },
    {
      key: 'amount',
      header: 'Amount ($)',
      render: (l) => (
        <span className={`font-mono font-bold text-xs ${l.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
          {l.type === 'CREDIT' ? '+' : '-'}${l.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Financial Ledger & Billing Management</h2>
        <p className="text-xs text-slate-500">Commercial invoicing, freight charges, cold-storage tariffs, and automated payment settlement.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-semibold text-xs rounded-t-xl transition-colors border-b-2 ${
            activeTab === 'invoices'
              ? 'border-cold-600 text-cold-600 dark:text-cold-400 bg-cold-50/50 dark:bg-cold-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Commercial Invoices ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-semibold text-xs rounded-t-xl transition-colors border-b-2 ${
            activeTab === 'finance'
              ? 'border-cold-600 text-cold-600 dark:text-cold-400 bg-cold-50/50 dark:bg-cold-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <span>General Ledger & P&L Analysis</span>
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            title="Total Invoiced"
            value={`$${summary.totalBilled?.toFixed(2)}`}
            subtitle="Gross Billing"
            icon={<Receipt className="w-4 h-4" />}
            tone="agri"
          />
          <KpiCard
            title="Total Collected"
            value={`$${summary.totalCollected?.toFixed(2)}`}
            subtitle="Settled Payments"
            icon={<CheckCircle2 className="w-4 h-4" />}
            tone="agri"
          />
          <KpiCard
            title="Outstanding Dues"
            value={`$${summary.totalOutstanding?.toFixed(2)}`}
            subtitle="Pending Accounts"
            icon={<CreditCard className="w-4 h-4" />}
            tone="amber"
          />
          <KpiCard
            title="Operating Profit"
            value={`$${summary.netProfit?.toFixed(2)}`}
            subtitle="After Cold & Fuel Costs"
            icon={<TrendingUp className="w-4 h-4" />}
            tone={summary.netProfit >= 0 ? 'agri' : 'rose'}
          />
        </div>
      )}

      {/* Tab 1: Invoices */}
      {activeTab === 'invoices' && (
        <DataTable
          columns={invoiceColumns}
          data={invoices}
          title="Commercial Billing Invoices"
        />
      )}

      {/* Tab 2: Financial Ledger */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">Gross Margin %</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">42.8%</div>
              <div className="text-[11px] text-slate-400 mt-1">+3.2% vs previous quarter</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">Avg Cold Tariff per MT/Day</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">$4.60</div>
              <div className="text-[11px] text-slate-400 mt-1">Energy-optimized chill chambers</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">Transit Fuel & Surcharge Cost</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">$1.12 / km</div>
              <div className="text-[11px] text-slate-400 mt-1">Reefer auxiliary electric support</div>
            </div>
          </div>

          <DataTable
            columns={ledgerColumns}
            data={ledgerEntries}
            title="Real-Time Double-Entry Accounting Ledger"
          />
        </div>
      )}

      {/* Record Payment Modal */}
      {isPayOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Invoice Payment</h3>
            <p className="text-xs text-slate-500">Settling invoice: <strong className="font-mono">{selectedInvoice.invoice_number}</strong></p>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <option value="BANK_TRANSFER">ACH / Wire Transfer</option>
                  <option value="CREDIT_CARD">Corporate Card</option>
                  <option value="ESCROW">Agricultural Escrow</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPayOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
