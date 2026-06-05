import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServerKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServerKey) {
  console.error('SUPABASE_URL and SUPABASE_SECRET_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServerKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const main = async () => {
  const { data: destinations, error: destinationsError } = await supabase
    .from('destinations')
    .select('id, name, location, image_url, images, featured, display_order')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(20);

  let galleries = null;
  let galleriesError = null;

  try {
    const response = await supabase.from('provider_galleries').select('*').limit(5);

    galleries = response.data;
    galleriesError = response.error;
  } catch (err) {
    galleriesError = err;
  }

  if (destinationsError) {
    console.error('Error fetching destinations:', destinationsError);
    process.exit(1);
  }

  if (galleriesError) {
    console.warn('Provider galleries unavailable:', galleriesError);
  }

  console.log(JSON.stringify({ destinations, galleries }, null, 2));
};

main().then(() => process.exit(0));
