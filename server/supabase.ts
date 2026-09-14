import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseConfig(): {
  url: string | undefined;
  key: string | undefined;
  isConfigured: boolean;
} {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.VITE_SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  return {
    url,
    key,
    isConfigured: Boolean(url && key && !url.includes('placeholder')),
  };
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseConfig();

  if (!isConfigured || !url || !key) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseClient;
}

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  url?: string;
  hasTables?: boolean;
}> {
  const client = getSupabaseClient();
  const { url, isConfigured } = getSupabaseConfig();

  if (!isConfigured || !client) {
    return {
      connected: false,
      message: 'Supabase credentials (SUPABASE_URL and SUPABASE_KEY) are not set in environment.',
      url,
    };
  }

  try {
    // Attempt a lightweight probe against petworld_collections or information_schema
    const { data, error } = await client.from('petworld_collections').select('collection_name').limit(1);

    if (error) {
      // Check if it's just "table doesn't exist yet"
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return {
          connected: true,
          message: 'Connected to Supabase project! Ready for schema creation and data sync.',
          url,
          hasTables: false,
        };
      }
      return {
        connected: false,
        message: `Supabase query error: ${error.message} (${error.code || 'UNKNOWN'})`,
        url,
      };
    }

    return {
      connected: true,
      message: 'Connected and ready! Tables detected.',
      url,
      hasTables: true,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Connection failed: ${err.message || String(err)}`,
      url,
    };
  }
}

/**
 * Sync entire Pet World database snapshot to Supabase
 */
export async function syncDatabaseToSupabase(data: any): Promise<{
  success: boolean;
  syncedCollections: string[];
  errors: string[];
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      syncedCollections: [],
      errors: ['Supabase client is not configured.'],
    };
  }

  const collections = [
    'branches',
    'products',
    'inventory',
    'sales',
    'purchases',
    'purchaseBills',
    'purchaseAllocations',
    'stockMovements',
    'suppliers',
    'staff',
    'attendance',
    'salaries',
    'salaryAdvances',
    'notifications',
    'settings',
  ];

  const syncedCollections: string[] = [];
  const errors: string[] = [];

  for (const col of collections) {
    if (data[col] !== undefined) {
      try {
        const { error } = await client
          .from('petworld_collections')
          .upsert(
            {
              collection_name: col,
              data: data[col],
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'collection_name' }
          );

        if (error) {
          errors.push(`Error syncing ${col}: ${error.message}`);
        } else {
          syncedCollections.push(col);
        }
      } catch (e: any) {
        errors.push(`Exception syncing ${col}: ${e.message}`);
      }
    }
  }

  return {
    success: errors.length === 0,
    syncedCollections,
    errors,
  };
}

/**
 * Pull entire database snapshot from Supabase if available
 */
export async function loadDatabaseFromSupabase(): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('petworld_collections').select('*');
    if (error || !data || data.length === 0) {
      return null;
    }

    const result: Record<string, any> = {};
    for (const row of data) {
      if (row.collection_name && row.data) {
        result[row.collection_name] = row.data;
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (err) {
    console.warn('Failed to load database from Supabase:', err);
    return null;
  }
}

/**
 * Returns PostgreSQL SQL Schema ready to execute in Supabase SQL Editor
 */
export function getSupabaseSchemaSQL(): string {
  return `-- =========================================================
-- THE PET WORLD - SUPABASE POSTGRESQL SCHEMA INITIALIZATION
-- Paste and execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =========================================================

-- 1. Master Collections Table (Enables instant sync of all documents)
CREATE TABLE IF NOT EXISTS public.petworld_collections (
    collection_name TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.petworld_collections ENABLE ROW LEVEL SECURITY;

-- Allow read/write access for service role & authenticated clients
CREATE POLICY "Allow public read-write for PetWorld collections"
    ON public.petworld_collections
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. Structured Relational Tables (Optional - For Direct SQL Queries)

-- Branches
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products & Catalog
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    barcode TEXT,
    category TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    mrp NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    min_stock INTEGER DEFAULT 5,
    description TEXT,
    image_url TEXT,
    company TEXT,
    brand TEXT,
    product_form TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- Store Inventory
CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER DEFAULT 5,
    batch_number TEXT,
    expiry_date DATE,
    location TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_product ON public.inventory(branch_id, product_id);

-- POS Sales Transactions
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL,
    branch_id TEXT REFERENCES public.branches(id),
    branch_name TEXT,
    cashier_id TEXT,
    cashier_name TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    subtotal NUMERIC(10, 2) DEFAULT 0,
    discount NUMERIC(10, 2) DEFAULT 0,
    tax NUMERIC(10, 2) DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_branch_date ON public.sales(branch_id, created_at);

-- Staff Members
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    username TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL,
    branch_id TEXT REFERENCES public.branches(id),
    branch_name TEXT,
    designation TEXT,
    basic_salary NUMERIC(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance Records
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES public.staff(id) ON DELETE CASCADE,
    staff_name TEXT,
    branch_id TEXT REFERENCES public.branches(id),
    branch_name TEXT,
    date DATE NOT NULL,
    login_time TEXT,
    logout_time TEXT,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary Records & Advances
CREATE TABLE IF NOT EXISTS public.salaries (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES public.staff(id) ON DELETE CASCADE,
    staff_name TEXT,
    branch_id TEXT REFERENCES public.branches(id),
    branch_name TEXT,
    month TEXT NOT NULL,
    basic_salary NUMERIC(10, 2) NOT NULL,
    allowances NUMERIC(10, 2) DEFAULT 0,
    deductions NUMERIC(10, 2) DEFAULT 0,
    overtime NUMERIC(10, 2) DEFAULT 0,
    bonus NUMERIC(10, 2) DEFAULT 0,
    advance NUMERIC(10, 2) DEFAULT 0,
    net_salary NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'PENDING',
    payment_status TEXT DEFAULT 'PENDING',
    payment_date DATE,
    payment_mode TEXT,
    advances JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Movements & Audits
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES public.products(id),
    product_name TEXT,
    sku TEXT,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    from_branch_id TEXT,
    to_branch_id TEXT,
    from_branch_name TEXT,
    to_branch_name TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    reference TEXT,
    reason TEXT,
    performed_by TEXT
);

-- Realtime publication for live multi-branch synchronization
ALTER PUBLICATION supabase_realtime ADD TABLE public.petworld_collections;
`;
}
