-- Demo seed data for PartBank MVP
-- Auth users must exist first (created via Supabase dashboard / CLI):
--   internal@partbank.com  / password  → id: 92afcc5d-d8fa-45d9-93af-2584407ae1e0
--   workshop@bengkel.com   / password  → id: 4b90b486-f598-4580-a12e-67ca3bca1660
--   buyer@buyer.com        / password  → id: ea2b3d43-8e99-476b-a3f6-e391f01dbaeb

DO $$
DECLARE
  internal_id   UUID := '92afcc5d-d8fa-45d9-93af-2584407ae1e0';
  workshop_uid  UUID := '4b90b486-f598-4580-a12e-67ca3bca1660';
  customer_id   UUID := 'ea2b3d43-8e99-476b-a3f6-e391f01dbaeb';

  hino_id       UUID := uuid_generate_v4();
  fuso_id       UUID := uuid_generate_v4();
  isuzu_id      UUID := uuid_generate_v4();

  hino_fm_id    UUID := uuid_generate_v4();
  hino_rng_id   UUID := uuid_generate_v4();
  fuso_fn_id    UUID := uuid_generate_v4();
  fuso_fj_id    UUID := uuid_generate_v4();
  isuzu_elf_id  UUID := uuid_generate_v4();
  isuzu_giga_id UUID := uuid_generate_v4();

  -- Global categories (no model_id)
  cat_kemudi    UUID := uuid_generate_v4();
  cat_rem       UUID := uuid_generate_v4();
  cat_suspensi  UUID := uuid_generate_v4();
  cat_transmisi UUID := uuid_generate_v4();
  cat_pendingin UUID := uuid_generate_v4();
  cat_bbm       UUID := uuid_generate_v4();

BEGIN
  INSERT INTO profiles (id, role, full_name) VALUES
    (internal_id, 'internal', 'Admin PartBank'),
    (workshop_uid, 'workshop', 'Bengkel Maju Jaya'),
    (customer_id,  'customer', 'Pak Budi Santoso');

  INSERT INTO workshops (profile_id, name, capability_tags, is_verified) VALUES
    (workshop_uid, 'Bengkel Maju Jaya', ARRAY['machining', 'welding', 'casting'], true);

  INSERT INTO truck_brands (id, name) VALUES
    (hino_id,  'Hino'),
    (fuso_id,  'Mitsubishi Fuso'),
    (isuzu_id, 'Isuzu');

  INSERT INTO truck_models (id, brand_id, name, year_range) VALUES
    (hino_fm_id,    hino_id,  'FM 260 JD',   '2015–2023'),
    (hino_rng_id,   hino_id,  'Ranger FG',   '2012–2022'),
    (fuso_fn_id,    fuso_id,  'FN 527 ML',   '2016–2023'),
    (fuso_fj_id,    fuso_id,  'FJ 2523',     '2013–2021'),
    (isuzu_elf_id,  isuzu_id, 'ELF NMR 71',  '2014–2023'),
    (isuzu_giga_id, isuzu_id, 'Giga FVZ 34', '2017–2023');

  -- Global categories
  INSERT INTO part_categories (id, name) VALUES
    (cat_kemudi,    'Sistem Kemudi'),
    (cat_rem,       'Sistem Rem'),
    (cat_suspensi,  'Sistem Suspensi'),
    (cat_transmisi, 'Sistem Transmisi'),
    (cat_pendingin, 'Sistem Pendingin'),
    (cat_bbm,       'Sistem Bahan Bakar');

  -- Parts: each linked to category + model directly
  INSERT INTO parts (category_id, model_id, name, description, manufacturability_grade, status, created_by) VALUES
    -- Hino FM 260 JD
    (cat_kemudi,    hino_fm_id,    'Tie Rod End Kiri',      'Tie rod end sisi kiri untuk Hino FM 260',   'B', 'request_only', internal_id),
    (cat_kemudi,    hino_fm_id,    'Rack Steering',         'Rack kemudi Hino FM 260 JD',                'A', 'request_only', internal_id),
    (cat_kemudi,    hino_fm_id,    'King Pin Set',          'Set king pin lengkap dengan bushing',        'B', 'request_only', internal_id),
    (cat_rem,       hino_fm_id,    'Kampas Rem Depan',      'Brake pad depan Hino FM 260',               'A', 'request_only', internal_id),
    (cat_rem,       hino_fm_id,    'Master Silinder Rem',   'Master cylinder rem hidrolik',               'B', 'request_only', internal_id),
    -- Hino Ranger FG
    (cat_suspensi,  hino_rng_id,   'Shackle Pegas Belakang','Shackle daun pegas belakang Ranger FG',     'B', 'request_only', internal_id),
    (cat_suspensi,  hino_rng_id,   'Bos Pegas Depan',       'Bushing pegas daun depan',                  'C', 'request_only', internal_id),
    (cat_transmisi, hino_rng_id,   'Gardan Belakang',       'Differential rear axle Ranger FG',          'A', 'request_only', internal_id),
    (cat_transmisi, hino_rng_id,   'Cross Joint Propeller', 'Universal joint propeller shaft',            'B', 'request_only', internal_id),
    -- Fuso FN 527 ML
    (cat_kemudi,    fuso_fn_id,    'Drag Link',             'Drag link kemudi Fuso FN 527',               'B', 'request_only', internal_id),
    (cat_kemudi,    fuso_fn_id,    'Idler Arm',             'Idler arm steering Fuso FN',                 'C', 'request_only', internal_id),
    (cat_pendingin, fuso_fn_id,    'Pompa Air',             'Water pump Fuso FN 527 ML',                  'A', 'request_only', internal_id),
    (cat_pendingin, fuso_fn_id,    'Tutup Radiator',        'Radiator cap pressure valve',                'A', 'request_only', internal_id),
    -- Fuso FJ 2523
    (cat_rem,       fuso_fj_id,    'Booster Rem',           'Brake booster assembly Fuso FJ',             'B', 'request_only', internal_id),
    (cat_rem,       fuso_fj_id,    'Caliper Rem Depan',     'Brake caliper depan FJ 2523',                'A', 'request_only', internal_id),
    (cat_bbm,       fuso_fj_id,    'Filter Solar',          'Fuel filter diesel Fuso FJ',                 'A', 'request_only', internal_id),
    (cat_bbm,       fuso_fj_id,    'Pompa Injeksi',         'Injection pump FJ 2523',                     'B', 'request_only', internal_id),
    -- Isuzu ELF NMR 71
    (cat_kemudi,    isuzu_elf_id,  'Tie Rod End',           'Tie rod end Isuzu ELF NMR 71',               'B', 'request_only', internal_id),
    (cat_kemudi,    isuzu_elf_id,  'Ball Joint Bawah',      'Lower ball joint ELF NMR',                   'B', 'request_only', internal_id),
    (cat_rem,       isuzu_elf_id,  'Kampas Rem Tromol',     'Brake shoe tromol belakang ELF',             'A', 'request_only', internal_id),
    (cat_rem,       isuzu_elf_id,  'Wheel Cylinder Belakang','Wheel cylinder rem tromol',                 'B', 'request_only', internal_id),
    -- Isuzu Giga FVZ 34
    (cat_transmisi, isuzu_giga_id, 'Kopling Utama',         'Clutch disc assembly Giga FVZ',              'A', 'request_only', internal_id),
    (cat_transmisi, isuzu_giga_id, 'Plat Penekan Kopling',  'Pressure plate clutch Giga FVZ',             'B', 'request_only', internal_id),
    (cat_suspensi,  isuzu_giga_id, 'Shock Absorber Depan',  'Front shock absorber Isuzu Giga',            'A', 'request_only', internal_id),
    (cat_suspensi,  isuzu_giga_id, 'Baut U-Bolt Belakang',  'U-bolt pegas belakang Giga FVZ',             'B', 'request_only', internal_id);

END $$;
