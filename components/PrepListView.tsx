
import React, { useState, useMemo } from 'react';
import { Dish, Ingredient, SubRecipe } from '../types';
import { generatePrepPDF } from '../utils/pdfExport';

interface Props {
  dishes: Dish[];
  ingredients: Ingredient[];
  subRecipes: SubRecipe[];
}

interface PrepItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  isSubRecipe: boolean;
}

export const PrepListView: React.FC<Props> = ({ dishes, ingredients, subRecipes }) => {
  const sections = ['Breakfast', 'Starters', 'Mains', 'Desserts', 'Pizza', 'Kids'] as const;
  
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [selectedDishIds, setSelectedDishIds] = useState<Set<string>>(new Set(dishes.map(d => d.id)));

  const toggleDish = (id: string) => {
    const next = new Set(selectedDishIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDishIds(next);
  };

  // Group items by Section and separate Manufactured
  const { sectionRaw, manufacturedPrep } = useMemo(() => {
    const raw: Record<string, PrepItem[]> = {};
    const manuf: PrepItem[] = [];
    sections.forEach(s => raw[s] = []);

    selectedDishIds.forEach(dishId => {
      const dish = dishes.find(d => d.id === dishId);
      if (!dish) return;

      const section = dish.section;
      
      dish.ingredients.forEach(di => {
        const ing = ingredients.find(i => i.id === di.ingredientId);
        if (!ing) return;

        if (ing.isSubRecipe) {
          const existing = manuf.find(item => item.id === ing.id);
          if (existing) existing.qty += di.quantity;
          else manuf.push({ id: ing.id, name: ing.name, qty: di.quantity, unit: ing.recipeUnit, isSubRecipe: true });
        } else if (sections.includes(section as any)) {
          const existing = raw[section].find(item => item.id === ing.id);
          if (existing) existing.qty += di.quantity;
          else raw[section].push({ id: ing.id, name: ing.name, qty: di.quantity, unit: ing.recipeUnit, isSubRecipe: false });
        }
      });
    });

    return { sectionRaw: raw, manufacturedPrep: manuf };
  }, [selectedDishIds, dishes, ingredients]);

  const handleUpdateQty = (key: string, val: string) => {
    const num = parseFloat(val) || 0;
    setOverrides(prev => ({ ...prev, [key]: num }));
  };

  const getDisplayQty = (key: string, calculatedQty: number) => {
    return overrides[key] !== undefined ? overrides[key] : calculatedQty;
  };

  const handleExportPDF = () => {
    const exportData: Record<string, PrepItem[]> = { 'MANUFACTURED PRODUCTION': manufacturedPrep };
    sections.forEach(s => {
      const items = sectionRaw[s];
      if (items.length > 0) {
        exportData[s] = items.map(item => ({
          ...item,
          qty: getDisplayQty(`${s}-${item.id}`, item.qty)
        }));
      }
    });
    generatePrepPDF(exportData);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Kitchen Prep Book</h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Production & Station Pull Lists</p>
        </div>
        <button onClick={handleExportPDF} className="px-8 py-4 bg-gray-900 text-white rounded-[24px] font-black text-xs uppercase hover:bg-red-600 transition-all shadow-xl">
          Export Daily PDF
        </button>
      </div>

      <section className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Calculate based on active dishes:</p>
        <div className="flex flex-wrap gap-2">
          {dishes.length > 0 ? dishes.map(dish => (
            <button key={dish.id} onClick={() => toggleDish(dish.id)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${selectedDishIds.has(dish.id) ? 'bg-red-600 border-red-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
              {dish.name}
            </button>
          )) : <p className="text-xs text-gray-300 font-bold uppercase p-2">No dishes to display</p>}
        </div>
      </section>

      {/* Manufactured Section */}
      {manufacturedPrep.length > 0 && (
        <section className="bg-blue-600 p-10 rounded-[40px] shadow-2xl shadow-blue-200">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-2xl font-black text-white uppercase italic">Manufactured Production</h4>
            <span className="bg-white/20 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Master Batching Station</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {manufacturedPrep.map(item => (
              <div key={item.id} className="bg-white/10 backdrop-blur-md p-6 rounded-3xl flex justify-between items-center group">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-6 h-6 border-2 border-white/30 rounded-lg flex-shrink-0 flex items-center justify-center text-white/10">
                    <i className="fas fa-check text-[10px]"></i>
                  </div>
                  <span className="font-black text-white text-sm truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    className="w-20 bg-white/20 border-none rounded-xl p-2 text-right font-black text-white outline-none"
                    value={getDisplayQty(`manuf-${item.id}`, item.qty)}
                    onChange={(e) => handleUpdateQty(`manuf-${item.id}`, e.target.value)}
                  />
                  <span className="text-[10px] font-black text-white/50 uppercase">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section Raw Pull Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {sections.map(section => {
          const items = sectionRaw[section];
          if (items.length === 0) return null;
          return (
            <div key={section} className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 bg-gray-50 border-b border-gray-100">
                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight italic">{section}</h4>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Station Pull List</p>
              </div>
              <div className="p-6 space-y-4 flex-1">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-5 h-5 border-2 border-gray-200 rounded flex-shrink-0"></div>
                      <span className="text-xs font-black text-gray-800 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        className="w-16 bg-white border-b-2 border-gray-100 focus:border-red-500 text-right font-black text-sm outline-none transition-colors"
                        value={getDisplayQty(`${section}-${item.id}`, item.qty)}
                        onChange={(e) => handleUpdateQty(`${section}-${item.id}`, e.target.value)}
                      />
                      <span className="text-[9px] font-black text-gray-400 uppercase">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
