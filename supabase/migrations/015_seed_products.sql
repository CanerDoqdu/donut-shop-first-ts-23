-- 015_seed_products.sql
-- Seed products table with the same stable UUIDs used in lib/data.ts.
-- This migration is idempotent: ON CONFLICT DO UPDATE ensures prices/stock stay in sync.

INSERT INTO products (id, slug, name_tr, name_en, description_tr, description_en, price, image_url, category, stock, featured)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'strawberry-glazed', 'Çilekli Glazürlü', 'Strawberry Glazed',
   'Taze çilek glazürü ile kaplı, hafif ve lezzetli donut. Premium çilek özü ve özel glazür karışımımızla hazırlanmıştır.',
   'Light and delicious donut covered with fresh strawberry glaze. Made with premium strawberry extract and our special glaze recipe.',
   45.00, '/donut 4.png', 'glazed', 25, true),

  ('a1b2c3d4-0002-4000-8000-000000000002', 'chocolate-dream', 'Çikolata Rüyası', 'Chocolate Dream',
   'İçi çikolata kreması dolu, üzeri kakao tozlu özel donut. Belçika çikolatasıyla hazırlanır.',
   'Special donut filled with chocolate cream and dusted with cocoa powder. Made with Belgian chocolate.',
   50.00, '/donut 5.png', 'filled', 20, true),

  ('a1b2c3d4-0003-4000-8000-000000000003', 'classic-sugar', 'Klasik Şekerli', 'Classic Sugar',
   'Geleneksel ince şeker tozuyla kaplanmış klasik donut. Sade ve zamanın ötesinde lezzet.',
   'Traditional donut coated with fine sugar powder. Simple and timeless flavor.',
   40.00, '/donut 6.png', 'glazed', 30, false),

  ('a1b2c3d4-0004-4000-8000-000000000004', 'caramel-delight', 'Karamelli Şahane', 'Caramel Delight',
   'Tuzlu karamel sosuyla süslenmiş özel donut. Her lokmada karamel patlaması.',
   'Special donut topped with salted caramel sauce. A burst of caramel in every bite.',
   55.00, '/donut 6 (2).png', 'specialty', 15, true),

  ('a1b2c3d4-0005-4000-8000-000000000005', 'rainbow-sprinkles', 'Renkli Boncuklu', 'Rainbow Sprinkles',
   'Renkli şeker boncuklarıyla süslenmiş neşeli donut. Çocukların ve gençlerin favorisi.',
   'Cheerful donut decorated with rainbow sprinkles. A favorite among kids and teens.',
   45.00, '/9877db2dcff20bf4feec3349824f74e3.png', 'glazed', 28, false),

  ('a1b2c3d4-0006-4000-8000-000000000006', 'vanilla-cream', 'Vanilyalı Kremalı', 'Vanilla Cream',
   'İçi vanilyalı krema dolu, üzeri pudra şekeri. Madagaskar vanilyası kullanılır.',
   'Filled with vanilla cream and dusted with powdered sugar. Made with Madagascar vanilla.',
   48.00, '/a0f87c462026bee95d2ccf126b9bc60a.png', 'filled', 22, false),

  ('a1b2c3d4-0007-4000-8000-000000000007', 'maple-bacon', 'Akçaağaç & Bacon', 'Maple Bacon',
   'Akçaağaç şurubu ve çıtır bacon parçalarıyla kaplı. Tatlı ve tuzlu mükemmel uyum.',
   'Topped with maple syrup and crispy bacon bits. The perfect sweet and savory combo.',
   60.00, '/donut (3).png', 'specialty', 12, true),

  ('a1b2c3d4-0008-4000-8000-000000000008', 'pumpkin-spice', 'Balkabağı Baharat', 'Pumpkin Spice',
   'Mevsimsel balkabağı baharatı ile hazırlanan sonbahar lezzeti.',
   'Seasonal autumn flavor made with pumpkin spice blend.',
   52.00, '/e7477fc5ceac0d47e8eade2ff3d7354c.png', 'seasonal', 18, false),

  ('a1b2c3d4-0009-4000-8000-000000000009', 'berry-bliss-smoothie', 'Berry Bliss Smoothie', 'Berry Bliss Smoothie',
   'Taze çilek, yaban mersini ve ahududu ile hazırlanan ferahlatıcı smoothie. Doğal meyvelerden.',
   'Refreshing smoothie made with fresh strawberries, blueberries and raspberries. From natural fruits.',
   65.00, '/beverage 1.png', 'beverage', 50, true),

  ('a1b2c3d4-0010-4000-8000-000000000010', 'chocolate-milkshake', 'Çikolatalı Milkshake', 'Chocolate Milkshake',
   'Kremsi Belçika çikolatalı milkshake. Üzerinde krem şanti ve çikolata sosu.',
   'Creamy Belgian chocolate milkshake. Topped with whipped cream and chocolate sauce.',
  70.00, '/beverage 2.png', 'beverage', 40, false),

  ('a1b2c3d4-0011-4000-8000-000000000011', 'caramel-frappe', 'Karamelli Frappe', 'Caramel Frappe',
   'Buzlu karamelli kahve, krem şanti ile taçlandırılmış. Tatlı sevenler için.',
   'Iced caramel coffee topped with whipped cream. For sweet lovers.',
  68.00, '/beverage 3.png', 'beverage', 35, false),

  ('a1b2c3d4-0012-4000-8000-000000000012', 'strawberry-lemonade', 'Çilekli Limonata', 'Strawberry Lemonade',
   'Taze çilek ve limon ile hazırlanan serinletici içecek. Yaz favorisi.',
   'Refreshing drink made with fresh strawberries and lemon. Summer favorite.',
  55.00, '/beverage 4.png', 'beverage', 60, false),

  ('a1b2c3d4-0013-4000-8000-000000000013', 'vanilla-iced-latte', 'Vanilyalı Buzlu Latte', 'Vanilla Iced Latte',
   'Soğuk espresso ve vanilya şurubu ile hazırlanan kremsi latte.',
   'Creamy latte made with cold espresso and vanilla syrup.',
  62.00, '/beverage 5.png', 'beverage', 45, true),

  ('a1b2c3d4-0014-4000-8000-000000000014', 'mango-passion-smoothie', 'Mango Passion Smoothie', 'Mango Passion Smoothie',
   'Tropikal mango ve çarkıfelek meyvesi ile hazırlanan egzotik smoothie.',
   'Exotic smoothie made with tropical mango and passion fruit.',
  68.00, '/beverage 6.png', 'beverage', 38, false),

  ('a1b2c3d4-0015-4000-8000-000000000015', 'iced-mocha', 'Buzlu Mocha', 'Iced Mocha',
   'Espresso, çikolata ve soğuk süt birleşimi. Kahve ve çikolata severler için.',
   'Combination of espresso, chocolate and cold milk. For coffee and chocolate lovers.',
  72.00, '/beverage 7.png', 'beverage', 42, false),

  ('a1b2c3d4-0016-4000-8000-000000000016', 'pink-cloud-shake', 'Pembe Bulut Shake', 'Pink Cloud Shake',
   'Çilekli ve frambuazlı özel pembe milkshake. Instagram favorisi!',
   'Special pink milkshake with strawberry and raspberry. Instagram favorite!',
  75.00, '/beverage 18.png', 'beverage', 30, true)
ON CONFLICT (id) DO UPDATE SET
  slug         = EXCLUDED.slug,
  name_tr      = EXCLUDED.name_tr,
  name_en      = EXCLUDED.name_en,
  description_tr = EXCLUDED.description_tr,
  description_en = EXCLUDED.description_en,
  price        = EXCLUDED.price,
  image_url    = EXCLUDED.image_url,
  category     = EXCLUDED.category,
  stock        = EXCLUDED.stock,
  featured     = EXCLUDED.featured,
  updated_at   = NOW();
