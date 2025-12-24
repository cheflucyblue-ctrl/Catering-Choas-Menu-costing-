
import React, { useState } from 'react';
import { SubRecipe, Ingredient, DishIngredient } from '../types';
import { calculateIngredientCost } from '../utils/calculations';

interface Props {
  subRecipe: SubRecipe;
  ingredients: Ingredient[];
  onClose: () => void;
  onSave: (updatedSR: SubRecipe) => void;
}

export const SubRecipeCostingModal: React.FC<Props> = ({ subRecipe, ingredients, onClose, onSave }) => {
  const [editedSR, setEditedSR] = useState<SubRecipe>({ ...subRecipe });

  const calculateTotalBatchCost = () => {
    return editedSR.ingredients.reduce((acc, di) => {
      const ing = ingredients.find(i => i.id === di.ingredientId);
      return acc + (ing ? calculateIngredientCost(di.quantity, di.unit, ing) : 0);
    }, 0);
  };

  const batchCost = calculateTotalBatchCost();
  const unitCost = batchCost / (editedSR.yieldQuantity || 1);

  const handleUpdateIngredient = (index: number, key: keyof DishIngredient, value: any) => {
    const newIngredients = [...editedSR.ingredients];
    const item = { ...newIngredients[index] };
    if (key === 'ingredientId') {
      const ing = ingredients.find(i => i.id === value);
      if (ing) {
        item.ingredientId = value;
        item.unit = ing.recipeUnit;
      }
    } else if (key === 'quantity') {
      item.quantity = parseFloat(value) || 0;
    }
    newIngredients[index] = item;
    setEditedSR({ ...editedSR, ingredients: newIngredients });
  };

  const handleAddIngredient = () => {
    if (ingredients.length === 0) return;
    const first = ingredients.filter(i => !i.isSubRecipe)[0] || ingredients[0];
    setEditedSR({ ...editedSR, ingredients: [...editedSR.ingredients, { ingredientId: first.id, quantity: 1, unit: first.recipeUnit }] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
          <div>
            <input 
              className="text-2xl font-black text-gray-900 bg-transparent border-b-2 border-blue-200 outline-none uppercase"
              value={editedSR.name}
              onChange={(e) => setEditedSR({ ...editedSR, name: e.target.value })}
            />
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Manufactured Item Costing</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-400">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 no-scrollbar space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-blue-600 p-6 rounded-3xl text-white">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Unit Production Cost</p>
              <p className="text-3xl font-black">R {unitCost.toFixed(2)}</p>
              <p className="text-[10px] font-black text-blue-200 uppercase mt-2">Yield: {editedSR.yieldQuantity} {editedSR.yieldUnit}</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col justify-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Batch Yield Settings</p>
              <div className="flex gap-4">
                <input 
                  type="number"
                  className="bg-white border-b-2 border-blue-200 w-full font-black p-2 outline-none"
                  value={editedSR.yieldQuantity}
                  onChange={(e) => setEditedSR({ ...editedSR, yieldQuantity: parseFloat(e.target.value) || 1 })}
                />
                <input 
                  type="text"
                  className="bg-white border-b-2 border-blue-200 w-full font-black p-2 outline-none"
                  value={editedSR.yieldUnit}
                  onChange={(e) => setEditedSR({ ...editedSR, yieldUnit: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest italic">Recipe Breakdown</h4>
              <button onClick={handleAddIngredient} className="text-[10px] font-black text-blue-600 uppercase hover:underline">
                Add Component
              </button>
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-gray-50">
                {editedSR.ingredients.map((di, idx) => {
                  const ing = ingredients.find(i => i.id === di.ingredientId);
                  return (
                    <tr key={idx}>
                      <td className="py-3">
                        <select 
                          className="bg-transparent font-bold text-gray-700 w-full outline-none"
                          value={di.ingredientId}
                          onChange={(e) => handleUpdateIngredient(idx, 'ingredientId', e.target.value)}
                        >
                          {ingredients.filter(i => i.id !== editedSR.id).map(i => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <input 
                            type="number"
                            className="w-20 bg-gray-50 rounded p-1 text-right font-black"
                            value={di.quantity}
                            onChange={(e) => handleUpdateIngredient(idx, 'quantity', e.target.value)}
                          />
                          <span className="text-[10px] font-black text-gray-400 uppercase">{di.unit}</span>
                        </div>
                      </td>
                      <td className="py-3 text-right w-10">
                        <button onClick={() => setEditedSR({ ...editedSR, ingredients: editedSR.ingredients.filter((_, i) => i !== idx) })} className="text-gray-300 hover:text-red-500">
                          <i className="fas fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 flex justify-end">
          <button 
            onClick={() => { onSave(editedSR); onClose(); }}
            className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-700"
          >
            Update Prep Costing
          </button>
        </div>
      </div>
    </div>
  );
};
