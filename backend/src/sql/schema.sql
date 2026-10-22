-- DiaVita : Diabetes Lifestyle Management App
-- Database schema for Neon (serverless PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(160) NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  age             INT,
  gender          VARCHAR(10),
  diabetes_type   VARCHAR(20) DEFAULT 'type2',
  height_cm       NUMERIC(5,1),
  weight_kg       NUMERIC(5,1),
  waist_cm        NUMERIC(5,1),
  target_min      INT NOT NULL DEFAULT 70,
  target_max      INT NOT NULL DEFAULT 180,
  daily_carb_goal INT NOT NULL DEFAULT 180,
  daily_step_goal INT NOT NULL DEFAULT 7000,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS glucose_readings (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value_mgdl  NUMERIC(5,1) NOT NULL CHECK (value_mgdl BETWEEN 20 AND 600),
  context     VARCHAR(20) NOT NULL DEFAULT 'random', -- fasting | pre_meal | post_meal | bedtime | random
  note        TEXT,
  source      VARCHAR(10) NOT NULL DEFAULT 'manual', -- manual (typed) | voice
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- databases created before the source column existed
ALTER TABLE glucose_readings ADD COLUMN IF NOT EXISTS source VARCHAR(10) NOT NULL DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS idx_glucose_user_time ON glucose_readings(user_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS foods (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(120) NOT NULL UNIQUE,
  category  VARCHAR(40) NOT NULL,
  serving   VARCHAR(60) NOT NULL,
  carbs_g   NUMERIC(6,1) NOT NULL,
  calories  INT NOT NULL,
  gi        INT NOT NULL,
  fiber_g   NUMERIC(5,1) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meals (
  id             SERIAL PRIMARY KEY,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_type      VARCHAR(20) NOT NULL, -- breakfast | lunch | dinner | snack
  items          JSONB NOT NULL DEFAULT '[]',
  total_carbs    NUMERIC(7,1) NOT NULL DEFAULT 0,
  total_calories INT NOT NULL DEFAULT 0,
  glycemic_load  NUMERIC(6,1) NOT NULL DEFAULT 0,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meals_user_time ON meals(user_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS activities (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type   VARCHAR(40) NOT NULL,
  duration_min    INT NOT NULL CHECK (duration_min > 0),
  steps           INT NOT NULL DEFAULT 0,
  calories_burned INT NOT NULL DEFAULT 0,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activities_user_time ON activities(user_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS medications (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(120) NOT NULL,
  dosage        VARCHAR(60) NOT NULL,
  med_type      VARCHAR(20) NOT NULL DEFAULT 'tablet', -- tablet | insulin | other
  schedule_time TIME NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_logs (
  id            SERIAL PRIMARY KEY,
  medication_id INT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  taken_on      DATE NOT NULL DEFAULT CURRENT_DATE,
  taken_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (medication_id, taken_on)
);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id             SERIAL PRIMARY KEY,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  age_score      INT NOT NULL,
  waist_score    INT NOT NULL,
  activity_score INT NOT NULL,
  family_score   INT NOT NULL,
  total_score    INT NOT NULL,
  risk_level     VARCHAR(20) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: Indian food library with Glycemic Index (GI) per serving
INSERT INTO foods (name, category, serving, carbs_g, calories, gi, fiber_g) VALUES
  ('Idli',                 'Breakfast', '2 pieces',        30, 140, 69, 1.5),
  ('Plain Dosa',           'Breakfast', '1 medium',        28, 168, 77, 1.0),
  ('Ragi Dosa',            'Breakfast', '1 medium',        22, 120, 56, 3.0),
  ('Rava Upma',            'Breakfast', '1 cup',           35, 190, 65, 2.0),
  ('Ven Pongal',           'Breakfast', '1 cup',           40, 250, 70, 1.5),
  ('Poha',                 'Breakfast', '1 cup',           30, 180, 64, 1.5),
  ('Oats Porridge',        'Breakfast', '1 cup',           27, 150, 55, 4.0),
  ('Chapati (Whole Wheat)','Main',      '1 piece',         18, 104, 52, 2.5),
  ('White Rice',           'Main',      '1 cup cooked',    45, 205, 73, 0.6),
  ('Brown Rice',           'Main',      '1 cup cooked',    45, 216, 68, 3.5),
  ('Foxtail Millet Rice',  'Main',      '1 cup cooked',    40, 200, 50, 4.0),
  ('Veg Biryani',          'Main',      '1 cup',           45, 290, 70, 2.0),
  ('Sambar',               'Curry',     '1 cup',           18, 130, 40, 4.0),
  ('Dal (Lentils)',        'Curry',     '1 cup',           30, 230, 32, 8.0),
  ('Chicken Curry',        'Curry',     '1 cup',            8, 280,  0, 1.0),
  ('Paneer',               'Protein',   '100 g',            4, 265, 27, 0.0),
  ('Boiled Egg',           'Protein',   '1 egg',            1,  78,  0, 0.0),
  ('Sprouts Salad',        'Protein',   '1 cup',           10,  80, 25, 4.0),
  ('Curd',                 'Dairy',     '1 cup',           11, 150, 35, 0.0),
  ('Banana',               'Fruit',     '1 medium',        27, 105, 51, 3.1),
  ('Apple',                'Fruit',     '1 medium',        25,  95, 36, 4.4),
  ('Guava',                'Fruit',     '1 medium',        14,  68, 31, 5.4),
  ('Mango',                'Fruit',     '1 cup',           25,  99, 51, 2.6),
  ('Vegetable Salad',      'Vegetable', '1 bowl',           7,  40, 15, 3.0),
  ('Almonds',              'Snack',     '10 nuts',          3,  70, 15, 1.5),
  ('White Bread',          'Snack',     '2 slices',        26, 150, 75, 1.2),
  ('Whole Wheat Bread',    'Snack',     '2 slices',        24, 140, 70, 3.8),
  ('Gulab Jamun',          'Sweet',     '1 piece',         23, 150, 75, 0.2),
  ('Tea with Sugar',       'Beverage',  '1 cup',           12,  70, 65, 0.0),
  ('Black Coffee',         'Beverage',  '1 cup',            0,   5,  0, 0.0),
  ('Soft Drink',           'Beverage',  '330 ml can',      35, 140, 63, 0.0)
ON CONFLICT (name) DO NOTHING;
