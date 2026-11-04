-- ============================================================================
-- Eventora — OPTIONAL Demo Seed Data
-- ============================================================================
-- This is entirely optional. Run it only if you want the app to look
-- populated for a demo/showcase. It never runs automatically and it will
-- NOT touch or delete any existing data (every insert is ON CONFLICT DO
-- NOTHING, keyed on unique emails / business names).
--
-- HOW TO RUN (after schema.sql has been applied):
--   psql -U postgres -d eventora -f server/db/seed.sql
--
-- All seeded accounts use the password:  password123
-- ============================================================================

-- ---------------------------------------------------------------------------
-- USERS: 4 customers + 15 vendor accounts
-- Password hash below is bcrypt("password123", 10 rounds) for every account.
-- ---------------------------------------------------------------------------
INSERT INTO users (name, email, phone, password, role) VALUES
    ('Priya Sharma',   'priya@example.com',   '9876500001', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'customer'),
    ('Rahul Verma',    'rahul@example.com',   '9876500002', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'customer'),
    ('Ananya Iyer',    'ananya@example.com',  '9876500003', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'customer'),
    ('Vikram Nair',    'vikram@example.com',  '9876500004', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'customer'),

    ('Aditya Rao',     'vendor1@example.com',  '9876510001', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Meera Kapoor',   'vendor2@example.com',  '9876510002', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Sanjay Gupta',   'vendor3@example.com',  '9876510003', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Neha Joshi',     'vendor4@example.com',  '9876510004', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Karan Malhotra', 'vendor5@example.com',  '9876510005', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Ritu Singh',     'vendor6@example.com',  '9876510006', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Arjun Mehta',    'vendor7@example.com',  '9876510007', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Kavita Reddy',   'vendor8@example.com',  '9876510008', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Rohan Kapoor',   'vendor9@example.com',  '9876510009', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Simran Kaur',    'vendor10@example.com', '9876510010', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Meera Chawla',   'vendor11@example.com', '9876510011', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Ishaan Bose',    'vendor12@example.com', '9876510012', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Manoj Tiwari',   'vendor13@example.com', '9876510013', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Divya Nair',     'vendor14@example.com', '9876510014', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),
    ('Tanvi Desai',    'vendor15@example.com', '9876510015', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'vendor'),

    -- Admin panel demo account. Public registration can never create a
    -- role='admin' user (authController.registerUser rejects it), so this
    -- is the only way to get an admin account without hand-editing the DB.
    ('Eventora Admin', 'admin@example.com',   '9876500000', '$2b$10$4GxlaviuXdNWVYAGmYnKP.jejM6j7ZGryOdeXrvciVzUDedmDDCfS', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- VENDOR PROFILES (15 across 10 categories and 5 cities)
-- ---------------------------------------------------------------------------
INSERT INTO vendors (user_id, business_name, category, city, description, price_range, portfolio_image, gallery_images)
SELECT u.id, v.business_name, v.category, v.city, v.description, v.price_range, v.portfolio_image, v.gallery_images
FROM (VALUES
    ('vendor1@example.com', 'Royal Wedding Studio', 'Photography', 'Jaipur',
     'Premium wedding photography and cinematic videography for luxury weddings across Rajasthan.',
     '₹50,000 - ₹1,50,000',
     'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1200&auto=format&fit=crop',
     ARRAY[
        'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=1200&auto=format&fit=crop'
     ]),
    ('vendor2@example.com', 'Dream Decor Events', 'Decoration', 'Udaipur',
     'Elegant wedding decor, floral setups and luxury destination wedding themes.',
     '₹80,000 - ₹3,00,000',
     'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=1200&auto=format&fit=crop',
     ARRAY[
        'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop'
     ]),
    ('vendor3@example.com', 'Royal Feast Caterers', 'Catering', 'Delhi',
     'Multi-cuisine luxury catering services for weddings and grand celebrations.',
     '₹1,00,000 - ₹5,00,000',
     'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=1200&auto=format&fit=crop',
     ARRAY[]::text[]),
    ('vendor4@example.com', 'Melody Makers DJ & Sound', 'Entertainment', 'Jaipur',
     'Live DJ, sound and lighting production for weddings, sangeet nights and corporate events.',
     '₹25,000 - ₹80,000',
     'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1200&auto=format&fit=crop',
     ARRAY[]::text[]),
    ('vendor5@example.com', 'Bloom & Co Florists', 'Decoration', 'Mumbai',
     'Fresh flower installations, mandap florals and bridal bouquets designed to order.',
     '₹30,000 - ₹1,20,000',
     'https://images.unsplash.com/photo-1487530811176-3780de880c2d?q=80&w=1200&auto=format&fit=crop',
     ARRAY[]::text[]),
    ('vendor6@example.com', 'Elegant Events Planners', 'Wedding Planning', 'Jaipur',
     'Full-service wedding planning from budgeting to day-of coordination.',
     '₹1,50,000 - ₹6,00,000',
     'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1200&auto=format&fit=crop',
     ARRAY[]::text[]),
    ('vendor7@example.com', 'Lens & Light Studios', 'Photography', 'Bangalore',
     'Candid wedding photography and drone cinematography with a modern editorial style.',
     '₹40,000 - ₹1,20,000',
     'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=1200&auto=format&fit=crop',
     ARRAY[
        'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1200&auto=format&fit=crop'
     ]),
    ('vendor8@example.com', 'Spice Route Catering', 'Catering', 'Mumbai',
     'Regional Indian and continental menus with live counters for weddings and receptions.',
     '₹80,000 - ₹4,00,000',
     'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=1200&auto=format&fit=crop',
     ARRAY[]::text[]),
    ('vendor9@example.com', 'The Grand Pavilion', 'Venue', 'Delhi',
     'A 500-guest banquet lawn and indoor hall with in-house catering and parking for 200 cars.',
     '₹3,00,000 - ₹10,00,000',
     'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1200&auto=format&fit=crop',
     ARRAY[]::text[]),
    ('vendor10@example.com', 'Glow Up Makeovers', 'Makeup & Beauty', 'Jaipur',
     'Bridal HD makeup, hairstyling and draping for the bride and her family.',
     '₹15,000 - ₹60,000',
     'https://images.unsplash.com/photo-1487530811176-3780de880c2d?q=80&w=1200&auto=format&fit=crop',
     ARRAY[]::text[]),
    ('vendor11@example.com', 'Mehendi by Meera', 'Mehendi Artist', 'Udaipur',
     'Bridal and party mehendi with modern Indo-Arabic and traditional Rajasthani designs.',
     '₹5,000 - ₹25,000',
     'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=1200&auto=format&fit=crop',
     ARRAY[]::text[]),
    ('vendor12@example.com', 'Golden Invites Co.', 'Invitations & Stationery', 'Bangalore',
     'Custom wedding invitation cards, digital e-invites and personalised gifting boxes.',
     '₹10,000 - ₹50,000',
     'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop',
     ARRAY[]::text[]),
    ('vendor13@example.com', 'Swift Wedding Cars', 'Transportation', 'Delhi',
     'Decorated vintage and luxury cars for the wedding baraat and guest transport.',
     '₹8,000 - ₹40,000',
     'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1200&auto=format&fit=crop',
     ARRAY[]::text[]),
    ('vendor14@example.com', 'Symphony Events', 'Wedding Planning', 'Bangalore',
     'Boutique wedding planning studio specialising in intimate and destination weddings.',
     '₹1,00,000 - ₹5,00,000',
     'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=1200&auto=format&fit=crop',
     ARRAY[]::text[]),
    ('vendor15@example.com', 'Petals & Pearls Decor', 'Decoration', 'Jaipur',
     'Theme-based mandap and stage decor with a focus on sustainable, reusable florals.',
     '₹40,000 - ₹1,80,000',
     'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
     ARRAY[]::text[])
) AS v(email, business_name, category, city, description, price_range, portfolio_image, gallery_images)
JOIN users u ON u.email = v.email
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- BOOKINGS (mix of statuses across several vendors so both dashboards,
-- history and wishlist flows all have something real to show)
-- ---------------------------------------------------------------------------
INSERT INTO bookings (customer_id, vendor_id, event_date, event_type, guest_count, message, booking_status)
SELECT c.id, ve.id, b.event_date, b.event_type, b.guest_count, b.message, b.booking_status
FROM (VALUES
    ('priya@example.com',  'vendor1@example.com',  DATE '2026-12-12', 'Wedding',       300, 'Looking for full-day coverage including drone shots.', 'completed'),
    ('priya@example.com',  'vendor3@example.com',  DATE '2026-12-12', 'Wedding',       300, 'Need a vegetarian + Jain menu for 300 guests.', 'approved'),
    ('priya@example.com',  'vendor10@example.com', DATE '2026-12-12', 'Wedding',         1, 'Bridal HD makeup for the wedding day.', 'approved'),
    ('rahul@example.com',  'vendor2@example.com',  DATE '2026-11-02', 'Sangeet Night', 150, 'Looking for a mandap-style stage with warm lighting.', 'pending'),
    ('rahul@example.com',  'vendor6@example.com',  DATE '2027-01-20', 'Wedding',       400, 'Need help planning a 3-day destination wedding in Udaipur.', 'pending'),
    ('ananya@example.com', 'vendor7@example.com',  DATE '2027-02-14', 'Engagement',    120, 'Candid photography for a beachside engagement.', 'completed'),
    ('ananya@example.com', 'vendor9@example.com',  DATE '2027-02-14', 'Engagement',    120, 'Checking hall availability for Valentine weekend.', 'rejected'),
    ('vikram@example.com', 'vendor8@example.com',  DATE '2027-03-05', 'Reception',     500, 'Need a live counter setup with North and South Indian menus.', 'approved'),
    ('vikram@example.com', 'vendor13@example.com', DATE '2027-03-05', 'Reception',       5, 'Need 3 decorated cars for the baraat procession.', 'pending')
) AS b(customer_email, vendor_email, event_date, event_type, guest_count, message, booking_status)
JOIN users c ON c.email = b.customer_email
JOIN users vu ON vu.email = b.vendor_email
JOIN vendors ve ON ve.user_id = vu.id
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- REVIEWS (only for approved/completed bookings, matching the app's rule)
-- ---------------------------------------------------------------------------
INSERT INTO reviews (customer_id, vendor_id, rating, review)
SELECT c.id, ve.id, r.rating, r.review
FROM (VALUES
    ('priya@example.com',  'vendor1@example.com',  5, 'Eventora made our wedding planning completely stress-free. The photos are stunning!'),
    ('priya@example.com',  'vendor3@example.com',  4, 'Food was excellent and the staff were very professional. Would book again.'),
    ('priya@example.com',  'vendor10@example.com', 5, 'Absolutely loved my bridal makeup, it lasted the entire day without touch-ups.'),
    ('ananya@example.com', 'vendor7@example.com',  5, 'Such a talented team - the candid shots captured every emotion perfectly.'),
    ('vikram@example.com', 'vendor8@example.com',  4, 'Great variety of food, guests loved the live chaat counter. Slightly delayed setup though.')
) AS r(customer_email, vendor_email, rating, review)
JOIN users c ON c.email = r.customer_email
JOIN users vu ON vu.email = r.vendor_email
JOIN vendors ve ON ve.user_id = vu.id
ON CONFLICT (customer_id, vendor_id) DO NOTHING;
