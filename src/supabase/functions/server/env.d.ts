declare module "npm:hono@4.6.14";
declare module "npm:hono/cors";
declare module "npm:hono/logger";
declare module "jsr:@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};
