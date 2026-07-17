

-- ==========================================
-- 2. ENUMS (Tipos de datos personalizados)
-- ==========================================
CREATE TYPE user_role AS ENUM ('super_admin', 'operario');
CREATE TYPE movement_type AS ENUM ('input', 'output', 'adjustment');

-- ==========================================
-- 3. CREACIÓN DE TABLAS
-- ==========================================

-- Tabla de Perfiles de Usuario (Espejo de auth.users de Supabase)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'operario'::user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 1. Sedes (Ej: Sede Principal, Sede Norte)
CREATE TABLE public.campuses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Zonas (Pertenecen a una Sede. Ej: Primaria, Secundaria, Administración)
CREATE TABLE public.zones (
  id SERIAL PRIMARY KEY,
  campus_id INT REFERENCES public.campuses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(campus_id, name)
);

-- 3. Espacios Físicos (Pertenecen a una Zona y tienen un responsable. Ej: Salón 101, Bodega)
CREATE TABLE public.physical_spaces (
  id SERIAL PRIMARY KEY,
  zone_id INT REFERENCES public.zones(id) ON DELETE CASCADE NOT NULL,
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- Ej: 'Salón', 'Oficina', 'Bodega'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(zone_id, name)
);

-- Tabla Intermedia de Permisos: Qué operario tiene acceso a qué zona
CREATE TABLE public.user_zone_permissions (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  zone_id INT REFERENCES public.zones(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, zone_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Categorías Globales de Productos (Ej: Electrónicos, Mobiliario, Libros)
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Productos / Activos Físicos (Ubicados en un espacio y pertenecen a una categoría)
CREATE TABLE public.products (
  id SERIAL PRIMARY KEY,
  space_id INT REFERENCES public.physical_spaces(id) ON DELETE CASCADE NOT NULL,
  category_id INT REFERENCES public.categories(id) ON DELETE RESTRICT NOT NULL,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  stock INT DEFAULT 0 NOT NULL CHECK (stock >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Historial / Bitácora de Movimientos
CREATE TABLE public.stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  type movement_type NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 4. SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_zone_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Políticas de Perfiles (Lectura para autenticados, escritura solo el dueño o admin)
CREATE POLICY "Permitir lectura de perfiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Políticas de Zonas
CREATE POLICY "Ver zonas autorizadas" ON public.zones FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  OR 
  EXISTS (SELECT 1 FROM public.user_zone_permissions WHERE user_zone_permissions.user_id = auth.uid() AND user_zone_permissions.zone_id = public.zones.id)
);

-- Políticas de Productos (El corazón de tu requerimiento de permisos)
CREATE POLICY "Operaciones de productos basadas en zona autorizada" ON public.products FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  OR 
  EXISTS (
    SELECT 1 FROM public.physical_spaces sp
    JOIN public.user_zone_permissions perm ON perm.zone_id = sp.zone_id
    WHERE sp.id = public.products.space_id AND perm.user_id = auth.uid()
  )
);

-- Políticas de administración pura (Solo Super Admin)
CREATE POLICY "Solo admin gestiona sedes" ON public.campuses FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Solo admin gestiona categorias" ON public.categories FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Solo admin gestiona permisos" ON public.user_zone_permissions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Solo admin gestiona espacios" ON public.physical_spaces FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));

-- ==========================================
-- 5. AUTOMATIZACIÓN (Triggers)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Operario'),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'operario'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();