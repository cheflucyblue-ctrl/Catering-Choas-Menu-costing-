
import { Dish, Ingredient, SubRecipe } from "../types";
import { calculateIngredientCost } from "./calculations";

declare const window: any;

export const generatePDFReport = (
  dishes: Dish[], 
  ingredients: Ingredient[], 
  subRecipes: SubRecipe[]
) => {
  const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
  if (!jsPDF) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  const getDishCost = (dish: Dish) => {
    return dish.ingredients.reduce((acc, di) => {
      const ing = ingredients.find(i => i.id === di.ingredientId);
      if (ing) {
        return acc + calculateIngredientCost(di.quantity, di.unit, ing);
      }
      return acc;
    }, 0);
  };

  // 1. Cover Page
  doc.setFillColor(18, 20, 23); // Dark theme cover
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text("CHAOS CATERING", margin, 40);
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38); // Highlight red
  doc.text("MASTER RECIPE & MARGIN ANALYSIS", margin, 55);

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(10);
  doc.text(`REPORT GENERATED: ${new Date().toLocaleDateString('en-ZA')}`, margin, 95);

  const avgFC = dishes.length > 0 
    ? (dishes.reduce((acc, d) => acc + (d.menuPrice > 0 ? (getDishCost(d) / d.menuPrice) * 100 : 0), 0) / dishes.length).toFixed(1)
    : "0";

  (doc as any).autoTable({
    startY: 110,
    head: [['OVERVIEW STATS', 'VALUE']],
    body: [
      ['TOTAL MENU ITEMS', dishes.length],
      ['HOUSE PREP RECIPES', subRecipes.length],
      ['ESTIMATED PORTFOLIO FOOD COST %', `${avgFC}%`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [18, 20, 23] }
  });

  // 2. Dish-by-Dish Detail Pages
  const sections = ['Breakfast', 'Starters', 'Mains', 'Desserts', 'Pizza', 'Kids', 'Drinks'];
  
  sections.forEach(section => {
    const sectionDishes = dishes.filter(d => d.section === section as any);
    if (sectionDishes.length === 0) return;
    
    // Section Header Page
    doc.addPage();
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, pageWidth, 297, 'F');
    doc.setFontSize(48);
    doc.setTextColor(18, 20, 23);
    doc.text(section.toUpperCase(), margin, 150);
    doc.setFontSize(12);
    doc.setTextColor(150, 150, 150);
    doc.text("RECIPE SECTION BREAKDOWN", margin, 165);

    // Individual Dish Pages
    sectionDishes.forEach(dish => {
      doc.addPage();
      
      // Dish Header
      doc.setFontSize(22);
      doc.setTextColor(18, 20, 23);
      doc.text(dish.name.toUpperCase(), margin, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(section.toUpperCase(), margin, 32);

      const dishCost = getDishCost(dish);
      const foodCostPct = dish.menuPrice > 0 ? ((dishCost / dish.menuPrice) * 100).toFixed(1) : "0";
      
      // Economics Table
      (doc as any).autoTable({
        startY: 40,
        head: [['SELLING PRICE', 'UNIT COST', 'PROFIT MARGIN', 'FOOD COST %']],
        body: [[
          `R ${dish.menuPrice.toFixed(2)}`, 
          `R ${dishCost.toFixed(2)}`, 
          `R ${(dish.menuPrice - dishCost).toFixed(2)}`, 
          `${foodCostPct}%`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38] }, // Red for economics
        styles: { fontSize: 11, fontStyle: 'bold' }
      });

      // Recipe Matrix Title
      doc.setFontSize(12);
      doc.setTextColor(18, 20, 23);
      doc.text("RECIPE COMPOSITION", margin, (doc as any).lastAutoTable.finalY + 15);

      // Recipe Table
      const recipeRows = dish.ingredients.map(di => {
        const ing = ingredients.find(i => i.id === di.ingredientId);
        return [
          ing?.name || 'Unknown Item', 
          `${di.quantity} ${di.unit}`, 
          `R ${ing ? calculateIngredientCost(di.quantity, di.unit, ing).toFixed(2) : '0.00'}`
        ];
      });

      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['COMPONENT', 'QUANTITY', 'EXT. COST']],
        body: recipeRows,
        theme: 'striped',
        headStyles: { fillColor: [18, 20, 23] },
        styles: { fontSize: 9 }
      });
      
      // Description footer if available
      if (dish.description) {
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.text("Description: " + dish.description, margin, (doc as any).lastAutoTable.finalY + 15, { maxWidth: pageWidth - 28 });
      }
    });
  });

  doc.save(`Chaos_Catering_Master_Book_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Minimalist Ink-Saving Prep Report
 */
export const generatePrepPDF = (sectionData: Record<string, any[]>) => {
  const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
  if (!jsPDF) return;

  const doc = new jsPDF();
  const margin = 14;

  // Simple Header
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text("DAILY KITCHEN PREP LIST", margin, 20);
  doc.setFontSize(9);
  doc.text(`DATE: ${new Date().toLocaleDateString('en-ZA')}`, margin, 26);
  doc.line(margin, 28, 196, 28); // Thin divider

  let currentY = 35;

  Object.entries(sectionData).forEach(([section, items]) => {
    if (items.length === 0) return;

    // Check if we need a new page
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(section.toUpperCase(), margin, currentY);
    currentY += 4;

    const rows = items.map(item => [
      '[    ]',
      item.name,
      `${item.qty.toFixed(1)} ${item.unit}`,
      item.isSubRecipe ? 'MANUF' : 'RAW'
    ]);

    (doc as any).autoTable({
      startY: currentY,
      head: [['CHECK', 'ITEM NAME', 'REQUIRED', 'TYPE']],
      body: rows,
      theme: 'plain', // Minimal ink
      headStyles: { 
        textColor: [0, 0, 0], 
        fontStyle: 'bold', 
        fontSize: 8,
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      styles: { 
        fontSize: 8, 
        textColor: [0, 0, 0],
        cellPadding: 4,
        lineWidth: 0.1,
        lineColor: [240, 240, 240]
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        2: { halign: 'right' },
        3: { cellWidth: 15, halign: 'center' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  });

  doc.save(`Prep_List_${new Date().toISOString().split('T')[0]}.pdf`);
};
