
import React, { useState, useMemo } from 'react';
import { Supplier, Ingredient, InvoiceItem, LoggedInvoice } from '../types';
import { analyzeInvoiceFile, analyzeSupplierCard } from '../services/geminiService';

interface Props {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  loggedInvoices: LoggedInvoice[];
  setLoggedInvoices: React.Dispatch<React.SetStateAction<LoggedInvoice[]>>;
  ingredients: Ingredient[];
  onUpdateIngredients: (updates: Partial<Ingredient>[]) => void;
}

export const SupplierManagement: React.FC<Props> = ({ 
  suppliers, 
  setSuppliers, 
  loggedInvoices, 
  setLoggedInvoices, 
  ingredients, 
  onUpdateIngredients 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'addressbook' | 'invoices' | 'history'>('invoices');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanningCard, setIsScanningCard] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [extractedItems, setExtractedItems] = useState<(InvoiceItem & { supplierName: string; invoiceDate?: string; fileName?: string })[]>([]);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result?.toString().split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: files.length });
    
    const allExtracted: (InvoiceItem & { supplierName: string; invoiceDate?: string; fileName?: string })[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setProcessingProgress({ current: i + 1, total: files.length });
        const file = files[i];
        const base64 = await readFileAsBase64(file);
        const result = await analyzeInvoiceFile(base64, file.type);
        
        const supplierName = result.supplierName || 'Unknown Supplier';
        const invoiceDate = result.invoiceDate || new Date().toLocaleDateString();
        const items = (result.items || []).map((item: InvoiceItem) => ({
          ...item,
          supplierName,
          invoiceDate,
          fileName: file.name
        }));
        
        allExtracted.push(...items);
      }
      
      setExtractedItems(prev => [...allExtracted, ...prev]);
      setIsProcessing(false);
    } catch (err) {
      console.error("Error processing invoices:", err);
      alert("An error occurred while processing one or more invoices.");
      setIsProcessing(false);
    } finally {
      if (e.target) e.target.value = ''; 
    }
  };

  const handleSupplierCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningCard(true);
    try {
      const base64 = await readFileAsBase64(file);
      const details = await analyzeSupplierCard(base64, file.type);
      
      const newSupplier: Supplier = {
        id: Math.random().toString(36).substr(2, 9),
        name: details.name || 'Extracted Supplier',
        contactPerson: details.contactPerson || '',
        email: details.email || '',
        phone: details.phone || '',
        category: details.category || 'General'
      };

      setSuppliers(prev => [...prev, newSupplier]);
      alert(`Extracted: ${newSupplier.name}`);
    } catch (err) {
      console.error("Error scanning supplier card:", err);
      alert("Failed to extract supplier details from the image.");
    } finally {
      setIsScanningCard(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleApplyInvoice = () => {
    const updates: Partial<Ingredient>[] = [];
    const invoiceSummary: Record<string, { total: number, count: number, date: string, file: string }> = {};

    extractedItems.forEach(item => {
      // Ingredient Updates
      const existing = ingredients.find(i => i.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        updates.push({
          id: existing.id,
          lastInvoicePrice: item.pricePerUnit,
          lastInvoiceDate: item.invoiceDate
        });
      }

      // History Logging
      const key = `${item.supplierName}-${item.invoiceDate}`;
      if (!invoiceSummary[key]) {
        invoiceSummary[key] = { total: 0, count: 0, date: item.invoiceDate || '', file: item.fileName || 'document.pdf' };
      }
      invoiceSummary[key].total += item.totalPrice;
      invoiceSummary[key].count += 1;
    });

    if (updates.length > 0 || extractedItems.length > 0) {
      onUpdateIngredients(updates);
      
      // Save to Logged Invoices
      const newLogs = Object.entries(invoiceSummary).map(([key, data]) => ({
        id: Math.random().toString(36).substr(2, 9),
        supplierName: key.split('-')[0],
        invoiceDate: data.date,
        totalAmount: data.total,
        itemsCount: data.count,
        fileName: data.file
      }));
      
      setLoggedInvoices(prev => [...newLogs, ...prev]);
      alert(`Logged ${newLogs.length} invoices and updated comparison data for ${updates.length} items.`);
      setExtractedItems([]);
      setActiveSubTab('history');
    } else {
      alert("No data to log.");
    }
  };

  const addNewSupplier = () => {
    setSuppliers(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Supplier',
      contactPerson: '',
      email: '',
      phone: '',
      category: 'General'
    }]);
  };

  const deleteSupplier = (id: string) => {
    if (confirm("Delete this supplier?")) {
      setSuppliers(prev => prev.filter(s => s.id !== id));
    }
  };

  const getSupplierTotalSpend = (name: string) => {
    return loggedInvoices
      .filter(inv => inv.supplierName.toLowerCase() === name.toLowerCase())
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-4 border-b border-gray-100 overflow-x-auto no-scrollbar">
        {[
          { id: 'invoices', label: 'Invoice Auditor', icon: 'fa-magnifying-glass-chart' },
          { id: 'addressbook', label: 'Address Book', icon: 'fa-address-book' },
          { id: 'history', label: 'Logged Invoices', icon: 'fa-clock-rotate-left' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeSubTab === tab.id ? 'border-b-4 border-red-600 text-red-600' : 'text-gray-400'}`}
          >
            <i className={`fas ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'invoices' && (
        <div className="space-y-10">
          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm text-center">
            {isProcessing ? (
              <div className="py-10">
                <div className="relative w-16 h-16 mx-auto mb-6">
                    <div className="absolute inset-0 border-4 border-red-50 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-red-500 font-black uppercase tracking-widest text-[10px]">
                  Auditing Invoice {processingProgress.current} of {processingProgress.total}...
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase italic tracking-tight">Invoice Vision</h3>
                <p className="text-gray-400 text-xs mb-8 italic">Compare supplier billing against market prices. Costing remains linked to market data.</p>
                <label className="inline-flex items-center gap-4 bg-gray-900 text-white px-10 py-5 rounded-full font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-red-600 transition-all shadow-xl">
                  <i className="fas fa-file-invoice"></i>
                  Audit Invoices
                  <input type="file" className="hidden" accept="application/pdf" multiple onChange={handleInvoiceUpload} />
                </label>
              </>
            )}
          </div>

          {extractedItems.length > 0 && (
            <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h4 className="text-xl font-black text-gray-900 uppercase italic">Price Variance Analysis</h4>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comparing Extracted Invoice vs Master Market Price</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setExtractedItems([])} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200">
                    Clear Results
                  </button>
                  <button onClick={handleApplyInvoice} className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 shadow-lg">
                    Log & Save Actuals
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-300 font-black uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="py-4 px-2">Item Name</th>
                      <th className="py-4 px-2">Supplier Price</th>
                      <th className="py-4 px-2">Market Price</th>
                      <th className="py-4 px-2">Variance</th>
                      <th className="py-4 px-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-bold">
                    {extractedItems.map((item, i) => {
                      const master = ingredients.find(ing => ing.name.toLowerCase() === item.name.toLowerCase());
                      const marketPrice = master?.buyingPrice || 0;
                      const variance = marketPrice > 0 ? ((item.pricePerUnit - marketPrice) / marketPrice) * 100 : 0;
                      const varianceColor = variance > 5 ? 'text-red-500' : variance < -5 ? 'text-green-500' : 'text-gray-400';

                      return (
                        <tr key={i} className="text-gray-700 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-2">
                            <p className="font-black">{item.name}</p>
                            <p className="text-[9px] text-gray-400 uppercase">{item.supplierName} • {item.invoiceDate}</p>
                          </td>
                          <td className="py-4 px-2">R {item.pricePerUnit.toFixed(2)}</td>
                          <td className="py-4 px-2">R {marketPrice.toFixed(2)}</td>
                          <td className={`py-4 px-2 font-black ${varianceColor}`}>
                            {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                          </td>
                          <td className="py-4 px-2">
                            {!master && <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-[8px] uppercase">New Item</span>}
                            {master && <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-[8px] uppercase">Matched</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'addressbook' && (
        <div className="space-y-10">
           <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">Supplier Directory</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact management & aggregated spend data</p>
              </div>
              <div className="flex gap-3">
                <label className="px-5 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2 cursor-pointer">
                  {isScanningCard ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-id-card"></i>}
                  {isScanningCard ? 'Extracting...' : 'Extract from Image'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleSupplierCardUpload} disabled={isScanningCard} />
                </label>
                <button onClick={addNewSupplier} className="px-5 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-lg">
                  <i className="fas fa-plus mr-2"></i> Manual Entry
                </button>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliers.map(supplier => (
                <div key={supplier.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <span className="bg-red-50 text-red-500 text-[8px] font-black uppercase px-3 py-1 rounded-full tracking-widest">{supplier.category}</span>
                      <button onClick={() => deleteSupplier(supplier.id)} className="text-gray-200 hover:text-red-500 transition-colors"><i className="fas fa-trash-can"></i></button>
                    </div>
                    <h4 className="text-xl font-black text-gray-900 mb-1">{supplier.name}</h4>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Contact: {supplier.contactPerson || 'Not listed'}</p>
                    
                    <div className="space-y-3 mb-8">
                      <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                        <i className="fas fa-envelope w-4 text-gray-300"></i>
                        {supplier.email || '—'}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                        <i className="fas fa-phone w-4 text-gray-300"></i>
                        {supplier.phone || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-50 mt-auto">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total Invoice History</p>
                        <p className="text-xl font-black text-gray-900">R {getSupplierTotalSpend(supplier.name).toFixed(2)}</p>
                      </div>
                      <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 group-hover:bg-red-600 group-hover:text-white transition-all">
                        <i className="fas fa-arrow-trend-up text-xs"></i>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {suppliers.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-gray-200">
                  <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No suppliers registered</p>
                </div>
              )}
           </div>
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">Logged Invoices</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Historical record of all AI-processed supplier documents</p>
              </div>
              <button 
                onClick={() => setLoggedInvoices([])}
                className="text-[10px] font-black text-gray-400 uppercase hover:text-red-600 tracking-widest"
              >
                Clear History
              </button>
           </div>

           <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <tr>
                    <th className="py-5 px-8">Supplier</th>
                    <th className="py-5 px-8">Invoice Date</th>
                    <th className="py-5 px-8">Filename</th>
                    <th className="py-5 px-8 text-center">Items</th>
                    <th className="py-5 px-8 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loggedInvoices.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-6 px-8 font-black text-gray-900">{log.supplierName}</td>
                      <td className="py-6 px-8 text-gray-500 font-bold">{log.invoiceDate}</td>
                      <td className="py-6 px-8 text-[10px] text-gray-400 italic">{log.fileName}</td>
                      <td className="py-6 px-8 text-center font-black text-blue-600">{log.itemsCount}</td>
                      <td className="py-6 px-8 text-right font-black text-gray-900">R {log.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                  {loggedInvoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-gray-300 font-black uppercase tracking-widest text-xs italic">
                        No processed invoices found in database
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};
