import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/std@0.168.0/encoding/csv.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ColumnSchema {
  name: string;
  type: string;
  position: number;
  config?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { nest_id, payment_method = 'credits' } = await req.json();

    if (!nest_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: nest_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create client with user's JWT to get user info
    const supabaseUser = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user details including organization_id and credits
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('id, organization_id, email, credits')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get nest details
    const { data: nest, error: nestError } = await supabaseAdmin
      .from('growth_nests')
      .select('*')
      .eq('id', nest_id)
      .eq('is_active', true)
      .single();

    if (nestError || !nest) {
      return new Response(
        JSON.stringify({ error: 'Nest not found or not available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabaseAdmin
      .from('growth_nest_purchases')
      .select('id, status, workspace_id')
      .eq('nest_id', nest_id)
      .eq('user_id', user.id)
      .single();

    if (existingPurchase && existingPurchase.status === 'completed') {
      return new Response(
        JSON.stringify({
          error: 'This nest has already been purchased',
          already_purchased: true,
          workspace_id: existingPurchase.workspace_id
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const priceCredits = nest.price_credits || 99;

    // Check credit balance
    if (payment_method === 'credits') {
      if ((userData.credits || 0) < priceCredits) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient credits',
            required: priceCredits,
            available: userData.credits || 0
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Deduct credits using RPC
      const { data: deductResult, error: deductError } = await supabaseAdmin.rpc(
        'deduct_credits',
        {
          p_user_id: user.id,
          p_amount: priceCredits,
          p_transaction_type: 'growth_nest_purchase',
          p_reference_type: 'growth_nest',
          p_reference_id: nest_id,
          p_reference_name: nest.name,
          p_description: `Purchased Growth Nest: ${nest.name}`
        }
      );

      if (deductError) {
        console.error('Failed to deduct credits:', deductError);
        return new Response(
          JSON.stringify({ error: 'Failed to process payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if deduction was successful
      const deductResultData = Array.isArray(deductResult) ? deductResult[0] : deductResult;
      if (!deductResultData?.success) {
        return new Response(
          JSON.stringify({
            error: deductResultData?.error_message || 'Credit deduction failed',
            available: deductResultData?.current_balance
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create enrich_workspace
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('enrich_workspaces')
      .insert({
        organization_id: userData.organization_id,
        name: `${nest.name} - Leads`,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (workspaceError || !workspace) {
      console.error('Failed to create workspace:', workspaceError);
      // TODO: Refund credits if workspace creation fails
      return new Response(
        JSON.stringify({ error: 'Failed to create workspace' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create columns from column_schema
    const columnSchema: ColumnSchema[] = nest.column_schema || [];
    const columnMap = new Map<string, string>(); // name -> id

    if (columnSchema.length > 0) {
      const columnsToInsert = columnSchema.map((col, index) => ({
        workspace_id: workspace.id,
        name: col.name,
        type: col.type || 'field',
        position: col.position ?? index,
        config: col.config || {},
        width: 200,
      }));

      const { data: createdColumns, error: columnsError } = await supabaseAdmin
        .from('enrich_columns')
        .insert(columnsToInsert)
        .select('id, name');

      if (columnsError) {
        console.error('Failed to create columns:', columnsError);
      } else if (createdColumns) {
        createdColumns.forEach(col => columnMap.set(col.name, col.id));
      }
    }

    // Download and parse CSV if available
    let rowsImported = 0;
    if (nest.csv_storage_path) {
      try {
        const { data: csvData, error: downloadError } = await supabaseAdmin.storage
          .from('growth-nests')
          .download(nest.csv_storage_path);

        if (downloadError) {
          console.error('Failed to download CSV:', downloadError);
        } else if (csvData) {
          const csvText = await csvData.text();
          const parsed = parse(csvText, { skipFirstRow: true, columns: undefined });

          // Get headers from first row parsing
          const headersResult = parse(csvText, { skipFirstRow: false });
          const headers = headersResult[0] as string[];

          // Create columns if not from schema
          if (columnSchema.length === 0 && headers.length > 0) {
            const columnsToInsert = headers.map((header, index) => ({
              workspace_id: workspace.id,
              name: header,
              type: 'field',
              position: index,
              config: {},
              width: 200,
            }));

            const { data: createdColumns, error: columnsError } = await supabaseAdmin
              .from('enrich_columns')
              .insert(columnsToInsert)
              .select('id, name');

            if (!columnsError && createdColumns) {
              createdColumns.forEach(col => columnMap.set(col.name, col.id));
            }
          }

          // Create rows
          const rowsToInsert = parsed.slice(0, 10000).map((row, index) => {
            const sourceData: Record<string, any> = {};
            if (Array.isArray(row)) {
              headers.forEach((header, i) => {
                sourceData[header] = row[i];
              });
            } else {
              Object.assign(sourceData, row);
            }
            return {
              workspace_id: workspace.id,
              source_data: sourceData,
              position: index,
            };
          });

          if (rowsToInsert.length > 0) {
            // Insert rows in batches of 500
            const batchSize = 500;
            for (let i = 0; i < rowsToInsert.length; i += batchSize) {
              const batch = rowsToInsert.slice(i, i + batchSize);
              const { error: rowsError } = await supabaseAdmin
                .from('enrich_rows')
                .insert(batch);

              if (rowsError) {
                console.error(`Failed to insert rows batch ${i}:`, rowsError);
              } else {
                rowsImported += batch.length;
              }
            }
          }
        }
      } catch (csvError) {
        console.error('Error processing CSV:', csvError);
      }
    }

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('growth_nest_purchases')
      .upsert({
        user_id: user.id,
        nest_id,
        workspace_id: workspace.id,
        price_paid_credits: payment_method === 'credits' ? priceCredits : null,
        payment_method,
        status: 'completed',
        purchased_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,nest_id',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (purchaseError) {
      console.error('Failed to create purchase record:', purchaseError);
    }

    console.log(`Growth nest ${nest_id} purchased by user ${user.id}, workspace: ${workspace.id}, rows: ${rowsImported}`);

    return new Response(
      JSON.stringify({
        success: true,
        purchase_id: purchase?.id,
        workspace_id: workspace.id,
        rows_imported: rowsImported,
        message: `Successfully purchased "${nest.name}"! ${rowsImported} leads imported to your workspace.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
