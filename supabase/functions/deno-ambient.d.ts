declare const Deno: any;

declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export const serve: (handler: (req: Request) => Response | Promise<Response>) => void;
}

declare module "npm:@supabase/supabase-js@2.57.2" {
  export const createClient: any;
}

declare module "https://esm.sh/stripe@18.5.0" {
  const Stripe: any;
  export default Stripe;
}
