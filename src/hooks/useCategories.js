import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

export const useCategories = (user) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase 
      .from('categories') 
      .select('*') 
      .eq('user_id', user.id)
      .order('name');
    
    if (fetchError) {
      setError("Could not fetch categories from the database.");
      console.error(fetchError);
    } else {
      setCategories(data || []);
    }
    setIsLoading(false);
  }, [user]);

  const addSpendingItem = async ({ categoryName, amount, itemName }) => {
    if (!user) return;
    
    setError(null);

    try {
      const { data: categoryData, error: fetchError } = await supabase
        .from('categories')
        .select('id, total_spent')
        .eq('user_id', user.id)
        .ilike('name', categoryName)
        .single();

      if (fetchError || !categoryData) {
        throw new Error(`Could not find the category "${categoryName}" in the database.`);
      }

      const { error: insertError } = await supabase
        .from('spending_items')
        .insert({
          user_id: user.id,
          category_id: categoryData.id,
          item_name: itemName,
          amount: amount,
        });

      if (insertError) {
        throw new Error(`Could not add spending item: ${insertError.message}`);
      }

      const newTotal = categoryData.total_spent + amount;

      const { error: updateError } = await supabase
        .from('categories')
        .update({ total_spent: newTotal })
        .eq('id', categoryData.id);

      if (updateError) {
        // If this fails, we should ideally roll back the spending item insert.
        // For now, we'll just throw an error.
        throw new Error(`Could not update category total: ${updateError.message}`);
      }
      
      await fetchCategories();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  
  const fetchSpendingItems = async (categoryId) => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('spending_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .order('created_at', { descending: true });
      
    if (error) {
      console.error('Error fetching spending items:', error);
      return [];
    }
    
    return data;
  };

  const updateCategoryAmount = async (categoryId, newAmount, adjustment = null) => {
    if (!user) return;
    setError(null);
    if (isNaN(newAmount) || newAmount < 0) {
      throw new Error(`Invalid amount: ${newAmount}`);
    }
    // If adjustment is provided, log it as a spending item
    if (adjustment && adjustment !== 0) {
      // Find the category name for logging
      const category = categories.find(cat => cat.id === categoryId);
      if (category) {
        await supabase.from('spending_items').insert({
          user_id: user.id,
          category_id: categoryId,
          item_name: 'Adjustment',
          amount: adjustment,
        });
      }
    }
    const { error: updateError } = await supabase
      .from('categories')
      .update({ total_spent: newAmount })
      .eq('id', categoryId)
      .eq('user_id', user.id);
    if (updateError) {
      throw new Error(`Could not update category amount: ${updateError.message}`);
    }
    await fetchCategories();
  };

  const resetAllCategories = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('spending_items')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error(`Could not clear spending items: ${deleteError.message}`);
      }

      const { error } = await supabase
        .from('categories')
        .update({ total_spent: 0 })
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`Could not reset category totals: ${error.message}`);
      }
      
      await fetchCategories();
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user, fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    addSpendingItem,
    fetchSpendingItems,
    updateCategoryAmount,
    resetAllCategories,
    fetchCategories
  };
}; 