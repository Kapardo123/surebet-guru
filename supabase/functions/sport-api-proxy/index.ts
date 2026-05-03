import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SPORT_API_KEY = "sk_live_7f431190a0515b40375c17e0f9ff8f39fbc6df19"
const BASE_URL = "https://sportapi.ai" // Changed: removed /api from here to avoid duplication if endpoint has it

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { endpoint, params } = await req.json()
    
    // The server explicitly asked for X-Api-Key header.
    // Let's build a clean URL and pass the key in the headers.
    
    const url = new URL(`https://sportapi.ai/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`)
    
    if (params) {
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key])
      })
    }

    console.log(`[Proxy] Requesting: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Api-Key': SPORT_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
