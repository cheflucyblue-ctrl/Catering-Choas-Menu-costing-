
import { Ingredient, DishIngredient, SubRecipe } from "../types";

/**
 * Calculates cost based on the new Buying vs Recipe unit model
 * Buying Price / Yield Amount = Cost per Recipe Unit
 */
export const calculateIngredientCost = (
  quantity: number,
  unit: string,
  ingredient: Ingredient
): number => {
  if (!ingredient) return 0;

  // For Sub-Recipes, cost is pre-calculated per yield unit
  if (ingredient.isSubRecipe) {
    return quantity * (ingredient.buyingPrice || 0);
  }

  // Cost per individual recipe unit
  const costPerUnit = ingredient.buyingPrice / (ingredient.yieldAmount || 1);
  
  return quantity * costPerUnit;
};

export const getSubRecipeUnitCost = (
  subRecipe: SubRecipe,
  allIngredients: Ingredient[]
): number => {
  let totalCost = 0;
  subRecipe.ingredients.forEach(di => {
    const ing = allIngredients.find(i => i.id === di.ingredientId);
    if (ing) {
      totalCost += calculateIngredientCost(di.quantity, di.unit, ing);
    }
  });
  
  return totalCost / (subRecipe.yieldQuantity || 1);
};
