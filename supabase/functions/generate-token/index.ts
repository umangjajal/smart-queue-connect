// deno-lint-ignore-file no-explicit-any
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenRequest {
  shop_id: string;
  customer_location: {
    lat: number;
    lng: number;
  };
  distance_meters: number;
}

Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const requestBody: TokenRequest = await req.json();
    const { shop_id, customer_location, distance_meters } = requestBody;

    // Get shop details
    const { data: shop, error: shopError } = await supabaseClient
      .from('shops')
      .select('average_service_time')
      .eq('id', shop_id)
      .single();

    if (shopError || !shop) {
      throw new Error('Shop not found');
    }

    // Calculate traffic duration based on distance
    // Simple formula: base time + distance factor
    // For every 1000m, add 3 minutes (assumes ~20km/h average speed with traffic)
    const trafficDurationMinutes = Math.ceil(distance_meters / 1000 * 3);
    
    // Add shop's average service time
    const totalMinutes = trafficDurationMinutes + shop.average_service_time;

    // Get current queue position for this shop
    const { count: queueCount } = await supabaseClient
      .from('tokens')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shop_id)
      .in('status', ['pending', 'preparing']);

    // Add queue wait time (each person in queue adds service time)
    const queueWaitMinutes = (queueCount || 0) * shop.average_service_time;
    const estimatedPickupTime = new Date(
      Date.now() + (totalMinutes + queueWaitMinutes) * 60000
    );

    // Generate unique token number
    const tokenNumber = `TKN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create token in database
    const { data: token, error: tokenError } = await supabaseClient
      .from('tokens')
      .insert({
        token_number: tokenNumber,
        customer_id: user.id,
        shop_id,
        customer_location_lat: customer_location.lat,
        customer_location_lng: customer_location.lng,
        distance_meters,
        traffic_duration_minutes: trafficDurationMinutes,
        estimated_pickup_time: estimatedPickupTime.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (tokenError) {
      console.error('Token creation error:', tokenError);
      throw new Error('Failed to create token');
    }

    console.log('Token generated:', {
      token_number: tokenNumber,
      distance_meters,
      traffic_duration: trafficDurationMinutes,
      queue_wait: queueWaitMinutes,
      total_wait: totalMinutes + queueWaitMinutes,
    });

    return new Response(
      JSON.stringify({
        token_id: token.id,
        token_number: tokenNumber,
        estimated_pickup_time: estimatedPickupTime.toISOString(),
        traffic_duration_minutes: trafficDurationMinutes,
        queue_position: (queueCount || 0) + 1,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
