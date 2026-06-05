#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the migration SQL file
const migrationPath = join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20251008121500_add_destination_display_order.sql'
);
const migrationSQL = readFileSync(migrationPath, 'utf8');

// Server-only Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE_URL and SUPABASE_SECRET_KEY are required');
  console.log('Create a server-only key in Supabase Settings > API Keys');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  try {
    console.log('Applying display_order migration...');

    // Execute the migration SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL,
    });

    if (error) {
      // Try direct SQL execution if RPC doesn't work
      console.log('RPC failed, trying direct SQL execution...');

      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        const { error: stmtError } = await supabase
          .from('_temp_sql_execution')
          .select('*')
          .limit(0); // This will fail but let us test connection

        if (
          statement.includes('ALTER TABLE') ||
          statement.includes('CREATE INDEX') ||
          statement.includes('UPDATE')
        ) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          // We'll need to use a different approach since Supabase client doesn't support DDL
        }
      }

      throw new Error(
        'Direct SQL execution not supported via client. Migration needs to be applied via Supabase CLI or dashboard.'
      );
    }

    console.log('Migration applied successfully!');

    // Verify the column was added
    const { data, error: verifyError } = await supabase
      .from('destinations')
      .select('id, display_order')
      .limit(1);

    if (verifyError) {
      console.error('Error verifying migration:', verifyError);
    } else {
      console.log('Verification successful - display_order column exists');
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
