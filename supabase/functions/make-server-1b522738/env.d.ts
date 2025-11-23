declare module "https://deno.land/std@0.177.0/http/server.ts";
declare module "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};
