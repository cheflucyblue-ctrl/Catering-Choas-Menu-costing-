
export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'unit' | 'each' | 'lb' | 'oz' | string;

export interface Ingredient {
  id: string;
  name: string;
  buyingUnit: string;    // e.g., "Loaf", "1kg Bag", "Crate"
  buyingPrice: number;   // Market-related price paid for the bulk unit (used for costing)
  yieldAmount: number;   // Number of recipe units in one buying unit
  recipeUnit: string;    // The unit used in recipes
  isSubRecipe?: boolean;
  cost?: number;         // Calculated: buyingPrice / yieldAmount
  lastInvoicePrice?: number; // The actual price from the last supplier invoice
  lastInvoiceDate?: string;
}

export interface DishIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface Dish {
  id: string;
  name: string;
  section: 'Breakfast' | 'Starters' | 'Mains' | 'Desserts' | 'Pizza' | 'Kids' | 'Drinks';
  menuPrice: number;
  ingredients: DishIngredient[];
  description?: string;
}

export interface SubRecipe {
  id: string;
  name: string;
  ingredients: DishIngredient[];
  yieldQuantity: number;
  yieldUnit: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
}

export interface LoggedInvoice {
  id: string;
  supplierName: string;
  invoiceDate: string;
  totalAmount: number;
  itemsCount: number;
  fileName: string;
}

export interface MenuData {
  dishes: Dish[];
  subRecipes: SubRecipe[];
}
