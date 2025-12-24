
import React, { useState, useEffect, useRef } from 'react';
import { MenuDashboard } from './components/MenuDashboard';
import { EditableTable } from './components/EditableTable';
import { DishCostingModal } from './components/DishCostingModal';
import { SubRecipeCostingModal } from './components/SubRecipeCostingModal';
import { PrepListView } from './components/PrepListView';
import { SupplierManagement } from './components/SupplierManagement';
import { Dish, Ingredient, SubRecipe, Unit, Supplier, LoggedInvoice } from './types';
import { analyzeMenuFile, suggestIngredientPrices } from './services/geminiService';
import { getSubRecipeUnitCost } from './utils/calculations';
import { generatePDFReport } from './utils/pdfExport';
import { downloadCSV, parseCSV } from './utils/csvUtils';

// Robust ID Generator
const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

const normalizeIngredient = (ing: Partial<Ingredient>): Ingredient => {
  const buyingUnit = String(ing.buyingUnit || 'kg').toLowerCase().trim();
  let yieldAmount = ing.yieldAmount ?? 1;
  let recipeUnit = ing.recipeUnit ?? ing.buyingUnit ?? 'kg';

  if (buyingUnit === 'kg') {
    yieldAmount = 1000;
    recipeUnit = 'g';
  } else if (buyingUnit === 'l' || buyingUnit === 'litre') {
    yieldAmount = 1000;
    recipeUnit = 'ml';
  }

  return {
    id: ing.id || generateId(),
    name: ing.name || 'New Ingredient',
    buyingUnit: ing.buyingUnit || 'kg',
    buyingPrice: ing.buyingPrice ?? 0,
    yieldAmount: yieldAmount,
    recipeUnit: recipeUnit,
    isSubRecipe: ing.isSubRecipe ?? false,
    cost: ing.cost ?? 0,
    lastInvoicePrice: ing.lastInvoicePrice,
    lastInvoiceDate: ing.lastInvoiceDate
  };
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'preplist' | 'backoffice' | 'suppliers' | 'upload'>('dashboard');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [subRecipes, setSubRecipes] = useState<SubRecipe[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loggedInvoices, setLoggedInvoices] = useState<LoggedInvoice[]>([]);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [selectedSubRecipe, setSelectedSubRecipe] = useState<SubRecipe | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');

  // Sync sub-recipe costs
  useEffect(() => {
    setIngredients(prev => {
      let changed = false;
      const next = [...prev];
      const updatedNext = next.map(ing => {
        if (ing.isSubRecipe) {
          const sr = subRecipes.find(s => s.id === ing.id);
          if (sr) {
            const newCost = getSubRecipeUnitCost(sr, prev);
            if (Math.abs(ing.buyingPrice - newCost) > 0.001) {
              changed = true;
              return { ...ing, buyingPrice: newCost, cost: newCost };
            }
          }
        }
        return ing;
      });
      subRecipes.forEach(sr => {
        if (!updatedNext.find(i => i.id === sr.id)) {
          const cost = getSubRecipeUnitCost(sr, prev);
          updatedNext.push({
            id: sr.id,
            name: sr.name,
            buyingUnit: sr.yieldUnit,
            buyingPrice: cost,
            yieldAmount: 1,
            recipeUnit: sr.yieldUnit,
            isSubRecipe: true,
            cost: cost
          });
          changed = true;
        }
      });
      return changed ? updatedNext : prev;
    });
  }, [subRecipes]);

  const updateDish = (updatedDish: Dish) => {
    setDishes(prev => prev.map(d => d.id === updatedDish.id ? updatedDish : d));
    setSelectedDish(updatedDish);
  };

  const updateSubRecipe = (updatedSR: SubRecipe) => {
    setSubRecipes(prev => prev.map(s => s.id === updatedSR.id ? updatedSR : s));
    setSelectedSubRecipe(updatedSR);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    setProgressMessage("Mastering the menu...");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result?.toString().split(',')[1] || '';
        const result = await analyzeMenuFile(base64, file.type);
        const uniqueIngNames = new Set<string>();
        result.dishes.forEach(d => d.ingredients.forEach(i => uniqueIngNames.add((i as any).ingredientName)));
        result.subRecipes.forEach(s => s.ingredients.forEach(i => uniqueIngNames.add((i as any).ingredientName)));
        const ingredientNames = Array.from(uniqueIngNames);
        const suggestedPrices = ingredientNames.length > 0 ? await suggestIngredientPrices(ingredientNames) : {};
        const discoveredIngredients: Ingredient[] = [];
        const ingredientMap: Record<string, string> = {};

        ingredientNames.forEach((name) => {
          const existing = ingredients.find(i => i.name.toLowerCase() === name.toLowerCase());
          if (existing) {
            ingredientMap[name] = existing.id;
          } else {
            const pricing = suggestedPrices[name];
            const ing = normalizeIngredient({ 
              name, 
              buyingPrice: pricing?.cost || 0, 
              buyingUnit: pricing?.unit || 'kg', 
              yieldAmount: pricing?.baseQty || 1000, 
              recipeUnit: pricing?.unit || 'g' 
            });
            discoveredIngredients.push(ing);
            ingredientMap[name] = ing.id;
          }
        });

        const processedSubRecipes = result.subRecipes.map(s => {
          const srId = generateId();
          ingredientMap[s.name] = srId; 
          return {
            ...s,
            id: srId,
            ingredients: s.ingredients.map((i: any) => ({
              ingredientId: ingredientMap[i.ingredientName] || generateId(),
              quantity: i.quantity,
              unit: i.unit as Unit
            }))
          };
        });

        const processedDishes = result.dishes.map(d => ({
          ...d,
          id: generateId(),
          ingredients: d.ingredients.map((i: any) => ({
            ingredientId: ingredientMap[i.ingredientName] || generateId(),
            quantity: i.quantity,
            unit: i.unit as Unit
          }))
        }));

        setDishes(prev => [...prev, ...processedDishes]);
        setIngredients(prev => [...prev, ...discoveredIngredients]);
        setSubRecipes(prev => [...prev, ...processedSubRecipes]);
        setIsAnalyzing(false);
        setActiveTab('dashboard');
      };
    } catch (err) {
      console.error(err);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-gray-900 bg-[#fbfcfd]">
      <aside className="w-full md:w-72 bg-[#121417] text-white flex-shrink-0 z-20 sticky top-0 md:h-screen shadow-2xl">
        <div className="p-8">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-sm shadow-lg shadow-red-600/20">
              <i className="fas fa-fire"></i>
            </div>
            Chaos Catering
          </h1>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Kitchen Intelligence</p>
        </div>
        
        <nav className="mt-4 px-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Menu Grid', icon: 'fa-table-cells' },
            { id: 'preplist', label: 'Prep Lists', icon: 'fa-clipboard-check' },
            { id: 'suppliers', label: 'Suppliers', icon: 'fa-truck' },
            { id: 'backoffice', label: 'Back Office', icon: 'fa-gear' },
            { id: 'upload', label: 'Upload Menu', icon: 'fa-cloud-arrow-up' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === tab.id ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
              <i className={`fas ${tab.icon} text-sm w-5`}></i>
              <span className="font-black text-xs uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-10 md:px-12 md:py-16">
          <header className="mb-12 flex flex-wrap justify-between items-end gap-6">
            <div>
              <h2 className="text-5xl font-black tracking-tight text-gray-900 mb-2 uppercase italic">
                {activeTab === 'dashboard' && 'Menu Grid'}
                {activeTab === 'preplist' && 'Kitchen Prep'}
                {activeTab === 'backoffice' && 'Inventory'}
                {activeTab === 'suppliers' && 'Suppliers'}
                {activeTab === 'upload' && 'Menu Vision'}
              </h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                <span className="w-8 h-1 bg-red-600 rounded-full"></span>
                {activeTab === 'dashboard' && 'Costing & Economic Analysis'}
                {activeTab === 'preplist' && 'Production vs Station Pull'}
                {activeTab === 'backoffice' && 'Master Pricing & Prep Costing'}
                {activeTab === 'suppliers' && 'Invoice Audit & Address Book'}
                {activeTab === 'upload' && 'Intelligent Extraction'}
              </p>
            </div>
          </header>

          {activeTab === 'dashboard' && (
            <MenuDashboard dishes={dishes} ingredients={ingredients} subRecipes={subRecipes} onDishSelect={setSelectedDish} onImportDishes={d => setDishes(prev => [...prev, ...d as any])} />
          )}

          {activeTab === 'preplist' && (
            <PrepListView dishes={dishes} ingredients={ingredients} subRecipes={subRecipes} />
          )}

          {activeTab === 'suppliers' && (
            <SupplierManagement 
              suppliers={suppliers} 
              setSuppliers={setSuppliers} 
              loggedInvoices={loggedInvoices}
              setLoggedInvoices={setLoggedInvoices}
              ingredients={ingredients} 
              onUpdateIngredients={(newIngs) => setIngredients(prev => {
                const next = [...prev];
                newIngs.forEach(update => {
                   const idx = next.findIndex(i => i.id === update.id);
                   if (idx !== -1) next[idx] = { ...next[idx], ...update };
                });
                return next;
              })}
            />
          )}

          {activeTab === 'backoffice' && (
            <div className="space-y-16">
               <section className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Manufactured Prep Master</h3>
                    <button onClick={() => {
                        const id = generateId();
                        setSubRecipes(prev => [...prev, { id, name: 'New Prep Item', yieldQuantity: 1, yieldUnit: 'unit', ingredients: [] }]);
                        setSelectedSubRecipe({ id, name: 'New Prep Item', yieldQuantity: 1, yieldUnit: 'unit', ingredients: [] });
                    }} className="px-5 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg flex items-center gap-2">
                      <i className="fas fa-hammer"></i>
                      New Prep Item
                    </button>
                  </div>
                  <EditableTable<SubRecipe> 
                    data={subRecipes}
                    idField="id"
                    onUpdate={(id, key, val) => setSubRecipes(prev => prev.map(s => s.id === id ? ({ ...s, [key]: val } as SubRecipe) : s))}
                    onDelete={(id) => setSubRecipes(prev => prev.filter(s => s.id !== id))}
                    columns={[
                      { header: 'Prep Item Name', key: 'name', editable: true },
                      { header: 'Yield Qty', key: 'yieldQuantity', editable: true },
                      { header: 'Yield Unit', key: 'yieldUnit', editable: true },
                      { header: 'Current Unit Cost', key: 'id', render: (_, item) => <span className="font-black text-blue-600">R {getSubRecipeUnitCost(item, ingredients).toFixed(2)}</span> },
                      { header: 'Recipe', key: 'id', render: (_, item) => <button onClick={() => setSelectedSubRecipe(item)} className="text-[10px] font-black text-blue-500 uppercase hover:underline">Edit Components</button> }
                    ]}
                  />
               </section>

               <section className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Ingredient Master (Raw Goods)</h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Buying Price drives costing. Last Invoice Price is for comparison.</p>
                    </div>
                    <button onClick={() => setIngredients(prev => [normalizeIngredient({ name: 'New Ingredient' }), ...prev])} className="px-5 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg flex items-center gap-2">
                      <i className="fas fa-plus"></i>
                      Add Ingredient
                    </button>
                  </div>
                  <EditableTable<Ingredient> 
                    data={ingredients.filter(i => !i.isSubRecipe)}
                    idField="id"
                    onUpdate={(id, key, val) => setIngredients(prev => prev.map(ing => ing.id === id ? normalizeIngredient({ ...ing, [key]: val }) : ing))}
                    onDelete={(id) => setIngredients(prev => prev.filter(i => i.id !== id))}
                    columns={[
                      { header: 'Ingredient Name', key: 'name', editable: true },
                      { header: 'Purchase Unit', key: 'buyingUnit', editable: true },
                      { header: 'Buying Price (Market)', key: 'buyingPrice', editable: true, render: v => <span className="font-black">R {parseFloat(v).toFixed(2)}</span> },
                      { 
                        header: 'Last Invoice Price', 
                        key: 'lastInvoicePrice', 
                        render: (v, item) => {
                          if (!v) return <span className="text-gray-300 italic">No Data</span>;
                          const variance = ((v - item.buyingPrice) / item.buyingPrice) * 100;
                          const color = variance > 5 ? 'text-red-500' : variance < -5 ? 'text-green-500' : 'text-gray-400';
                          return (
                            <div className="flex flex-col">
                              <span className={`font-black ${color}`}>R {parseFloat(v).toFixed(2)}</span>
                              <span className="text-[8px] text-gray-400 uppercase">{item.lastInvoiceDate}</span>
                            </div>
                          );
                        }
                      },
                      { header: 'Yield Qty', key: 'yieldAmount', editable: true },
                      { header: 'Recipe Unit', key: 'recipeUnit', editable: true },
                    ]}
                  />
               </section>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="max-w-3xl auto py-12">
               <div className={`group relative p-20 border-4 border-dashed rounded-[60px] text-center bg-white shadow-3xl transition-all ${isAnalyzing ? 'border-red-500' : 'border-gray-100 hover:border-red-200'}`}>
                {!isAnalyzing ? (
                  <>
                    <div className="w-32 h-32 bg-red-50 text-red-500 rounded-[40px] flex items-center justify-center mx-auto mb-10 text-4xl shadow-inner group-hover:scale-110 transition-transform">
                      <i className="fas fa-camera"></i>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Extract Chaos Menu</h3>
                    <p className="text-gray-400 mb-8 max-w-sm mx-auto">Upload your PDF menu. We'll extract dishes, infer recipes, and calculate margins automatically.</p>
                    <label className="inline-flex items-center justify-center gap-4 bg-red-600 hover:bg-red-700 text-white px-12 py-6 rounded-[30px] font-black text-sm uppercase tracking-widest cursor-pointer transition-all shadow-xl shadow-red-600/20 active:scale-95">
                      <i className="fas fa-plus"></i>
                      Select File
                      <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileUpload} />
                    </label>
                  </>
                ) : (
                  <div className="py-10">
                    <div className="relative w-28 h-28 mx-auto mb-12">
                        <div className="absolute inset-0 border-[12px] border-red-50 rounded-full"></div>
                        <div className="absolute inset-0 border-[12px] border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-red-500 font-black uppercase tracking-widest text-[10px] animate-pulse">{progressMessage}</p>
                    <p className="text-gray-400 text-xs mt-4">Analyzing recipe layers and market prices...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedDish && (
        <DishCostingModal dish={selectedDish} ingredients={ingredients} subRecipes={subRecipes} onClose={() => setSelectedDish(null)} onSave={updateDish} />
      )}
      {selectedSubRecipe && (
        <SubRecipeCostingModal subRecipe={selectedSubRecipe} ingredients={ingredients} onClose={() => setSelectedSubRecipe(null)} onSave={updateSubRecipe} />
      )}
    </div>
  );
};

export default App;
