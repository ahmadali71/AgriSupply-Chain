import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Download, FileText, CheckCircle2, ShieldAlert,
  Boxes, Truck, DollarSign, Award, ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

export const ReportsPage: React.FC = () => {
  const [sampleInvoiceId, setSampleInvoiceId] = useState<string | null>(null);
  const [sampleInspectionId, setSampleInspectionId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch a sample invoice and inspection to allow 1-click PDF sample downloads
    api.get<any[]>('/api/finance/invoices').then(res => {
      if (res.success && res.data && res.data.length > 0) {
        setSampleInvoiceId(res.data[0].id);
      }
    });
    api.get<any[]>('/api/inspections').then(res => {
      if (res.success && res.data && res.data.length > 0) {
        setSampleInspectionId(res.data[0].id);
      }
    });
  }, []);

  const csvReports = [
    {
      id: 'inventory',
      title: 'Warehouse Inventory & FEFO Ledger',
      description: 'Stock levels, expiration dates (FEFO/FIFO), slot designations, and temperature zone assignments.',
      format: 'CSV',
      icon: <Boxes className="w-5 h-5 text-agri-600" />
    },
    {
      id: 'shipments',
      title: 'Reefer Shipments & Transit Telemetry',
      description: 'Trip logistics logs, driver certifications, vehicle plate numbers, and temperature compliance history.',
      format: 'CSV',
      icon: <Truck className="w-5 h-5 text-cold-600" />
    },
    {
      id: 'quality',
      title: 'Quality Inspections & Compliance Audit',
      description: 'Visual ratings, pulp temperature, moisture content, damage percentages, and auditor pass/fail decisions.',
      format: 'CSV',
      icon: <CheckCircle2 className="w-5 h-5 text-purple-600" />
    },
    {
      id: 'temperature',
      title: 'Cold-Chain Thermal Excursion Report',
      description: 'Critical threshold breaches, duration above safe temperature limits, and corrective actions taken.',
      format: 'CSV',
      icon: <ShieldAlert className="w-5 h-5 text-rose-600" />
    },
    {
      id: 'finance',
      title: 'Commercial Billing & Ledger Statement',
      description: 'Itemized invoices, reefer transport charges, chilled warehouse tariffs, and settled receivables.',
      format: 'CSV',
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />
    }
  ];

  const pdfCertificates = [
    {
      id: 'quality-cert',
      title: 'Official Quality Inspection Certificate',
      description: 'USDA/ISO-22000 compliant certificate with organoleptic metrics, cold pulp temperature, and auditor digital signature.',
      format: 'PDF',
      url: sampleInspectionId ? `/api/inspections/${sampleInspectionId}/pdf` : '/api/inspections',
      icon: <Award className="w-5 h-5 text-amber-500" />
    },
    {
      id: 'commercial-invoice',
      title: 'Commercial Logistics & Tariff Invoice',
      description: 'Tax invoice detailing produce items, reefer freight surcharges, cold storage room tariffs, and net payable.',
      format: 'PDF',
      url: sampleInvoiceId ? `/api/finance/invoices/${sampleInvoiceId}/pdf` : '/api/finance/invoices',
      icon: <FileText className="w-5 h-5 text-cold-600" />
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-agri-600" />
          <span>Automated Compliance, PDF & CSV Report Generator</span>
        </h2>
        <p className="text-xs text-slate-500">
          Export standardized CSV data dumps and cryptographic PDF certificates compliant with USDA, ISO-22000, and FDA FSMA traceability standards.
        </p>
      </div>

      {/* PDF Compliance Certificates Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-cold-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Automated Server-Side PDF Compliance Certificates
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pdfCertificates.map(doc => (
            <div
              key={doc.id}
              className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between shadow-2xs hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {doc.icon}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-mono">
                    {doc.format}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{doc.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{doc.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cold-600 hover:bg-cold-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Download Compliance {doc.format}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Standardized CSV Data Export Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="w-4 h-4 text-agri-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Standardized CSV Data Dumps (Excel / BigQuery Ingestion)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {csvReports.map(report => (
            <div
              key={report.id}
              className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between shadow-2xs hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {report.icon}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                    {report.format}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{report.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{report.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <a
                  href={`/api/reports/export?type=${report.id}&format=csv`}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-agri-600 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export {report.format}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
