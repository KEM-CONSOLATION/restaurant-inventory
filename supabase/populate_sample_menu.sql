-- Populate sample menu data for testing

-- Insert Menu Categories
INSERT INTO public.menu_categories (name, description, display_order, is_active) VALUES
('Main Dishes', 'Our signature main courses', 1, true),
('Soups & Stews', 'Hearty soups and traditional stews', 2, true),
('Sides & Accompaniments', 'Perfect complements to your meal', 3, true),
('Drinks', 'Refreshing beverages', 4, true),
('Desserts', 'Sweet treats to end your meal', 5, true)
ON CONFLICT (name) DO NOTHING;

-- Get category IDs (assuming they exist or were just created)
DO $$
DECLARE
  main_dishes_id UUID;
  soups_id UUID;
  sides_id UUID;
  drinks_id UUID;
  desserts_id UUID;
BEGIN
  SELECT id INTO main_dishes_id FROM public.menu_categories WHERE name = 'Main Dishes';
  SELECT id INTO soups_id FROM public.menu_categories WHERE name = 'Soups & Stews';
  SELECT id INTO sides_id FROM public.menu_categories WHERE name = 'Sides & Accompaniments';
  SELECT id INTO drinks_id FROM public.menu_categories WHERE name = 'Drinks';
  SELECT id INTO desserts_id FROM public.menu_categories WHERE name = 'Desserts';

  -- Insert Main Dishes
  INSERT INTO public.menu_items (category_id, name, description, price, is_available, display_order) VALUES
  (main_dishes_id, 'Jollof Rice', 'Aromatic rice cooked in rich tomato sauce with spices, served with fried plantain', 2500.00, true, 1),
  (main_dishes_id, 'Fried Rice', 'Fragrant basmati rice stir-fried with vegetables and your choice of protein', 2800.00, true, 2),
  (main_dishes_id, 'Coconut Rice', 'Creamy rice cooked in coconut milk with aromatic spices', 2700.00, true, 3),
  (main_dishes_id, 'Ofada Rice & Stew', 'Local rice served with spicy palm oil stew and assorted meat', 3000.00, true, 4),
  (main_dishes_id, 'Beans & Plantain', 'Honey beans cooked with palm oil, served with fried plantain', 2000.00, true, 5);

  -- Insert Soups & Stews
  INSERT INTO public.menu_items (category_id, name, description, price, is_available, display_order) VALUES
  (soups_id, 'Egusi Soup', 'Ground melon seed soup with leafy vegetables, served with fufu or pounded yam', 3500.00, true, 1),
  (soups_id, 'Pepper Soup', 'Spicy broth with assorted meat or fish, perfect for any weather', 3200.00, true, 2),
  (soups_id, 'Bitterleaf Soup', 'Traditional soup with bitterleaf vegetables and assorted meat', 3400.00, true, 3),
  (soups_id, 'Okro Soup', 'Fresh okra soup with palm oil, served with your choice of swallow', 3300.00, true, 4),
  (soups_id, 'Vegetable Soup', 'Mixed vegetables in rich palm oil sauce', 3000.00, true, 5);

  -- Insert Sides & Accompaniments
  INSERT INTO public.menu_items (category_id, name, description, price, is_available, display_order) VALUES
  (sides_id, 'Pounded Yam', 'Smooth, stretchy pounded yam, perfect with soups', 800.00, true, 1),
  (sides_id, 'Fufu', 'Traditional cassava fufu, soft and smooth', 800.00, true, 2),
  (sides_id, 'Garri (Eba)', 'Cassava flakes prepared with hot water', 600.00, true, 3),
  (sides_id, 'Fried Plantain', 'Sweet plantain fried to golden perfection', 1000.00, true, 4),
  (sides_id, 'Coleslaw', 'Fresh cabbage salad with carrots and special dressing', 800.00, true, 5);

  -- Insert Drinks
  INSERT INTO public.menu_items (category_id, name, description, price, is_available, display_order) VALUES
  (drinks_id, 'Chapman', 'Refreshing mix of fruit juices, grenadine, and soda', 1500.00, true, 1),
  (drinks_id, 'Zobo', 'Hibiscus drink with ginger and spices, served chilled', 1200.00, true, 2),
  (drinks_id, 'Tiger Nut Drink', 'Creamy and nutritious tiger nut beverage', 1300.00, true, 3),
  (drinks_id, 'Fresh Orange Juice', 'Freshly squeezed orange juice', 1000.00, true, 4),
  (drinks_id, 'Water', 'Bottled water', 300.00, true, 5);

  -- Insert Desserts
  INSERT INTO public.menu_items (category_id, name, description, price, is_available, display_order) VALUES
  (desserts_id, 'Chin Chin', 'Crispy fried sweet dough snacks', 1500.00, true, 1),
  (desserts_id, 'Buns', 'Sweet bread rolls, soft and fluffy', 800.00, true, 2),
  (desserts_id, 'Puff Puff', 'Deep-fried sweet dough balls', 1000.00, true, 3),
  (desserts_id, 'Fruit Salad', 'Mixed seasonal fruits with cream', 2000.00, true, 4);

END $$;

