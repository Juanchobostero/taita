/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session: import('@supabase/supabase-js').Session | null
    user:    import('@supabase/supabase-js').User | null
  }
}
