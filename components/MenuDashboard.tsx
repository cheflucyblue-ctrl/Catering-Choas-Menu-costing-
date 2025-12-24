
import React, { useRef, useState } from 'react';
import { Dish, Ingredient, SubRecipe } from '../types';
import { calculateIngredientCost } from '../utils/calculations';
import { downloadCSV, parseCSV } from '../utils/csvUtils';

interface Props {
  dishes: Dish[];
  ingredients: Ingredient[];
  subRecipes: SubRecipe[];
  onDishSelect: (dish: Dish) => void;
  onImportDishes: (importedDishes: Partial<Dish>[]) => void;
}

export const MenuDashboard: React.FC<Props> = ({ dishes, ingredients, subRecipes, onDishSelect, onImportDishes }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const getDishCost = (dish: Dish) => {
    return dish.ingredients.reduce((acc, di) => {
      const ing = ingredients.find(i => i.id === di.ingredientId);
      if (ing) {
        return acc + calculateIngredientCost(di.quantity, di.unit, ing);
      }
      return acc;
    }, 0);
  };

  const handleExportCSV = () => {
    const exportData = dishes.map(d => {
      const cost = getDishCost(d);
      return {
        'Dish Name': d.name,
        'Section': d.section,
        'Selling Price (R)': d.menuPrice.toFixed(2),
        'Cost (R)': cost.toFixed(2),
        'Margin (R)': (d.menuPrice - cost).toFixed(2),
        'Food Cost %': d.menuPrice > 0 ? ((cost / d.menuPrice) * 100).toFixed(1) : '0',
        'Description': d.description || ''
      };
    });
    downloadCSV(exportData, `Menu_Costing_Report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseCSV(file);
      const mappedDishes: Partial<Dish>[] = data.map(row => ({
        name: row['Dish Name'] || row['name'] || 'Unknown Dish',
        section: (row['Section'] || row['section'] || 'Mains') as any,
        menuPrice: parseFloat(row['Selling Price (R)'] || row['menuPrice'] || '0'),
        description: row['Description'] || row['description'] || '',
        ingredients: [] 
      }));
      onImportDishes(mappedDishes);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert("Failed to parse CSV. Please check the format.");
    }
  };

  const sections = ['All', 'Breakfast', 'Starters', 'Mains', 'Desserts', 'Pizza', 'Kids', 'Drinks'];
  const filteredDishes = activeCategory === 'All' 
    ? dishes 
    : dishes.filter(d => d.section === activeCategory);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Stats - Touch Enhanced */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Menu Items', value: dishes.length, sub: 'Active', color: 'text-gray-900' },
          { label: 'In-House Prep', value: subRecipes.length, sub: 'Crafted', color: 'text-blue-600' },
          { 
            label: 'Avg Margin', 
            value: `R ${(dishes.reduce((acc, d) => acc + (d.menuPrice - getDishCost(d)), 0) / (dishes.length || 1)).toFixed(2)}`, 
            sub: 'Per Plate', 
            color: 'text-gray-900' 
          },
          { 
            label: 'Food Cost', 
            value: `${dishes.length > 0 ? (dishes.reduce((acc, d) => acc + (d.menuPrice > 0 ? (getDishCost(d) / d.menuPrice) * 100 : 0), 0) / dishes.length).toFixed(1) : 0}%`, 
            sub: 'Target: 28%', 
            color: 'text-green-600' 
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 touch-none">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
            <div>
              <h3 className={`text-2xl font-black tracking-tight ${stat.color}`}>{stat.value}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Category Navigator */}
      <div className="flex items-center justify-between gap-4 sticky top-0 z-10 py-2 bg-[#fbfcfd]">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-fade-right w-full md:w-auto">
          {sections.map(section => (
            <button
              key={section}
              onClick={() => setActiveCategory(section)}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                activeCategory === section 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-105' 
                : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
              }`}
            >
              {section}
            </button>
          ))}
        </div>

        <div className="hidden md:flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-400 hover:text-blue-500 hover:border-blue-100 transition-all shadow-sm"
            title="Import Menu CSV"
          >
            <i className="fas fa-file-import"></i>
          </button>
          <button 
            onClick={handleExportCSV}
            className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-400 hover:text-green-500 hover:border-green-100 transition-all shadow-sm"
            title="Export Menu CSV"
          >
            <i className="fas fa-file-export"></i>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDishes.length > 0 ? (
          filteredDishes.map(dish => {
            const cost = getDishCost(dish);
            const margin = dish.menuPrice - cost;
            const foodCostPct = dish.menuPrice > 0 ? (cost / dish.menuPrice) * 100 : 0;
            const statusColor = foodCostPct < 25 ? 'bg-green-500' : foodCostPct < 35 ? 'bg-orange-500' : 'bg-red-500';

            return (
              <div 
                key={dish.id} 
                onClick={() => onDishSelect(dish)}
                className="group relative bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer overflow-hidden flex flex-col h-full"
              >
                {/* Visual Indicator Pill */}
                <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest ${statusColor} shadow-lg`}>
                  {foodCostPct.toFixed(0)}% FC
                </div>

                <div className="p-8 flex-1">
                  <div className="mb-6">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">{dish.section}</span>
                    <h4 className="text-xl font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">{dish.name}</h4>
                    <p className="text-sm text-gray-400 font-medium mt-2 line-clamp-2">{dish.description || 'Standard house recipe.'}</p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-50">
                    <div className="flex justify-between items-end">
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Menu Price</p>
                        <p className="text-2xl font-black text-gray-900">R {dish.menuPrice.toFixed(0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Profit</p>
                        <p className="text-lg font-black text-green-600">R {margin.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-4 bg-gray-50 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>Cost: R {cost.toFixed(2)}</span>
                  <span className="group-hover:text-blue-600 transition-colors">Tap for details <i className="fas fa-chevron-right ml-1"></i></span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-search text-gray-200 text-2xl"></i>
            </div>
            <h4 className="text-xl font-bold text-gray-900">No dishes found</h4>
            <p className="text-gray-400">Try selecting a different category or upload a new menu.</p>
          </div>
        )}
      </div>

      {/* Mobile-Only Actions */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-3 bg-gray-900/90 backdrop-blur-xl p-3 rounded-full shadow-2xl border border-white/10 z-50">
        <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center">
          <i className="fas fa-file-import"></i>
        </button>
        <button onClick={handleExportCSV} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center">
          <i className="fas fa-file-export"></i>
        </button>
      </div>
    </div>
  );
};
