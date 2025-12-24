
import React, { useState, useEffect } from 'react';
import { Dish, Ingredient, SubRecipe, DishIngredient, Unit } from '../types';
import { calculateIngredientCost } from '../utils/calculations';

interface Props {
  dish: Dish;
  ingredients: Ingredient[];
  subRecipes: SubRecipe[];
  onClose: () => void;
  onSave: (updatedDish: Dish) => void;
}

export const DishCostingModal: React.FC<Props> = ({ dish, ingredients, subRecipes, onClose, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDish, setEditedDish] = useState<Dish>({ ...dish });

  useEffect(() => {
    setEditedDish({ ...dish });
    setIsEditing(false);
  }, [dish]);

  const getIngredientDetails = (ingredientId: string) => {
    return ingredients.find(i => i.id === ingredientId);
  };

  const calculateTotalCost = (currentDish: Dish) => {
    return currentDish.ingredients.reduce((acc, di) => {
      const ing = getIngredientDetails(di.ingredientId);
      return acc + (ing ? calculateIngredientCost(di.quantity, di.unit, ing) : 0);
    }, 0);
  };

  const totalCost = calculateTotalCost(editedDish);
  const profit = editedDish.menuPrice - totalCost;
  const foodCostPct = editedDish.menuPrice > 0 ? (totalCost / editedDish.menuPrice) * 100 : 0;

  const handleUpdateIngredient = (index: number, key: keyof DishIngredient, value: any) => {
    const newIngredients = [...editedDish.ingredients];
    const item = { ...newIngredients[index] };

    if (key === 'ingredientId') {
      const newIng = ingredients.find(i => i.id === value);
      if (newIng) {
        item.ingredientId = value;
        item.unit = newIng.recipeUnit; // Fixed: Use recipeUnit from ingredient master
      }
    } else if (key === 'quantity') {
      item.quantity = parseFloat(value) || 0;
    } else {
      (item as any)[key] = value;
    }

    newIngredients[index] = item;
    setEditedDish({ ...editedDish, ingredients: newIngredients });
  };

  const handleAddIngredient = () => {
    // Default to the first ingredient in the master list
    if (ingredients.length === 0) return;
    const firstIng = ingredients[0];
    setEditedDish({
      ...editedDish,
      ingredients: [
        ...editedDish.ingredients,
        { ingredientId: firstIng.id, quantity: 1, unit: firstIng.recipeUnit } // Fixed: Default to recipeUnit
      ]
    });
  };

  const handleRemoveIngredient = (index: number) => {
    setEditedDish({
      ...editedDish,
      ingredients: editedDish.ingredients.filter((_, i) => i !== index)
    });
  };

  const handleSave = () => {
    onSave(editedDish);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        {/* Modal Header */}
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            {isEditing ? (
              <input 
                className="text-2xl font-black text-gray-900 bg-transparent border-b-2 border-red-200 focus:border-red-500 outline-none uppercase"
                value={editedDish.name}
                onChange={(e) => setEditedDish({ ...editedDish, name: e.target.value })}
              />
            ) : (
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{editedDish.name}</h3>
            )}
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
              {editedDish.section} • THEORETICAL ANALYSIS
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-400"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Portions & Margins Summary */}
        <div className="p-8 overflow-y-auto flex-1 no-scrollbar">
          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="bg-gray-900 p-6 rounded-3xl text-white shadow-xl shadow-gray-200">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Sell Price</p>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span className="text-red-500 font-black">R</span>
                  <input 
                    type="number"
                    className="bg-transparent text-2xl font-black w-full outline-none border-b border-white/20"
                    value={editedDish.menuPrice}
                    onChange={(e) => setEditedDish({ ...editedDish, menuPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              ) : (
                <p className="text-3xl font-black">R {editedDish.menuPrice.toFixed(0)}</p>
              )}
            </div>
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Unit Cost</p>
              <p className="text-3xl font-black text-red-600">R {totalCost.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
              <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Food Cost %</p>
              <p className="text-3xl font-black text-green-700">{foodCostPct.toFixed(1)}%</p>
            </div>
          </div>

          {/* Recipe Editor Table */}
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">Recipe Matrix</h4>
              {isEditing && (
                <button 
                  onClick={handleAddIngredient}
                  className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all"
                >
                  <i className="fas fa-plus mr-2"></i> Add Item
                </button>
              )}
            </div>
            
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-300 font-black uppercase text-[10px] tracking-widest text-left">
                  <th className="py-4">Component</th>
                  <th className="py-4 text-center">Usage</th>
                  <th className="py-4 text-right">Ext. Cost</th>
                  {isEditing && <th className="py-4 w-10"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {editedDish.ingredients.map((di, idx) => {
                  const ing = getIngredientDetails(di.ingredientId);
                  const itemCost = ing ? calculateIngredientCost(di.quantity, di.unit, ing) : 0;
                  
                  return (
                    <tr key={`${di.ingredientId}-${idx}`} className="group">
                      <td className="py-4">
                        {isEditing ? (
                          <select 
                            className="bg-gray-50 border-none rounded-lg p-2 font-bold text-gray-700 w-full outline-none focus:ring-2 focus:ring-red-500 appearance-none"
                            value={di.ingredientId}
                            onChange={(e) => handleUpdateIngredient(idx, 'ingredientId', e.target.value)}
                          >
                            {ingredients.map(i => (
                              <option key={i.id} value={i.id}>{i.name} ({i.recipeUnit})</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${ing?.isSubRecipe ? 'bg-red-500' : 'bg-gray-200'}`}></div>
                            <span className="font-black text-gray-700">{ing?.name || 'Unknown Item'}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <input 
                              type="number"
                              className="w-20 bg-gray-50 border-none rounded-lg p-2 text-center font-black outline-none focus:ring-2 focus:ring-red-500"
                              value={di.quantity}
                              onChange={(e) => handleUpdateIngredient(idx, 'quantity', e.target.value)}
                            />
                            <span className="text-[10px] font-black text-gray-400 uppercase">{di.unit}</span>
                          </div>
                        ) : (
                          <span className="font-black text-gray-400">{di.quantity} {di.unit}</span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <span className="font-black text-gray-900">R {itemCost.toFixed(2)}</span>
                      </td>
                      {isEditing && (
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => handleRemoveIngredient(idx)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <i className="fas fa-trash-can"></i>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {isEditing ? 'Drafting New Recipe...' : 'Recipe Lock Active'}
          </div>
          <div className="flex gap-4">
            {isEditing ? (
              <>
                <button 
                  onClick={() => { setIsEditing(false); setEditedDish({ ...dish }); }}
                  className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-gray-200 transition-all"
                >
                  Discard Changes
                </button>
                <button 
                  onClick={handleSave}
                  className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-200 transition-all"
                >
                  Finalize Recipe
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-8 py-4 bg-[#121417] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-gray-200 group"
              >
                <i className="fas fa-pen-to-square mr-3 group-hover:rotate-12 transition-transform"></i>
                Edit Recipe Composition
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
