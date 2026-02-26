import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailInvoiceRequest {
  event: {
    from?: string;
    sender?: string;
    subject?: string;
    snippet?: string;
    message_text?: string;
    date?: string;
    message_timestamp?: string;
    id?: string;
    message_id?: string;
    thread_id?: string;
    has_attachments?: boolean;
    attachments?: Array<{
      filename: string;
      mimeType: string;
      attachmentId: string;
      size?: number;
    }>;
  };
  connected_account_id: string;
  company_id?: string;
  user_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const composioApiKey = Deno.env.get("COMPOSIO_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: EmailInvoiceRequest = await req.json();
    const { event, connected_account_id } = body;

    // Normalize email fields
    const emailFrom = event.from || event.sender || "";
    const emailSubject = event.subject || "";
    const emailDate = event.date || event.message_timestamp || new Date().toISOString();
    const emailId = event.id || event.message_id || "";

    console.log(`[email-invoice-import] Processing email: "${emailSubject}" from ${emailFrom}`);

    // 1. Look up email_import_settings for this connected account
    const { data: settings } = await supabase
      .from("email_import_settings")
      .select("*")
      .eq("connected_account_id", connected_account_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!settings) {
      console.log(`[email-invoice-import] No active settings for connected_account: ${connected_account_id}`);
      return new Response(
        JSON.stringify({ success: false, message: "No active email import settings found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyId = settings.company_id;
    const userId = settings.user_id;

    // 2. Filter check: subject/sender matches keywords/senders filter
    const subjectLower = emailSubject.toLowerCase();
    const senderLower = emailFrom.toLowerCase();

    // Check sender filter (if set, only allow whitelisted senders)
    if (settings.filter_senders && settings.filter_senders.length > 0) {
      const senderAllowed = settings.filter_senders.some(
        (s: string) => senderLower.includes(s.toLowerCase())
      );
      if (!senderAllowed) {
        console.log(`[email-invoice-import] Sender not in whitelist: ${emailFrom}`);
        return new Response(
          JSON.stringify({ success: true, message: "Sender not in whitelist, skipped" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check keyword filter
    const keywords = settings.filter_keywords || ["invoice", "factuur", "rekening", "nota", "receipt", "bon"];
    const hasKeywordMatch = keywords.some(
      (kw: string) => subjectLower.includes(kw.toLowerCase())
    );

    if (!hasKeywordMatch) {
      console.log(`[email-invoice-import] No keyword match in subject: "${emailSubject}"`);
      return new Response(
        JSON.stringify({ success: true, message: "No invoice keywords found, skipped" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch full email with attachments via Composio
    let attachments: Array<{ filename: string; mimeType: string; data?: string; attachmentId?: string }> = [];

    if (composioApiKey && emailId) {
      try {
        // Use Composio executeTool to fetch email details
        const toolResp = await fetch("https://backend.composio.dev/api/v2/actions/GMAIL_FETCH_MESSAGE/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": composioApiKey,
          },
          body: JSON.stringify({
            connectedAccountId: connected_account_id,
            input: { message_id: emailId, format: "full" },
          }),
        });

        if (toolResp.ok) {
          const toolResult = await toolResp.json();
          const parts = toolResult?.response_data?.payload?.parts || toolResult?.data?.parts || [];
          attachments = parts
            .filter((p: any) => p.filename && p.body?.attachmentId)
            .map((p: any) => ({
              filename: p.filename,
              mimeType: p.mimeType || "application/octet-stream",
              attachmentId: p.body.attachmentId,
            }));
        }
      } catch (e) {
        console.error("[email-invoice-import] Composio fetch failed:", e);
        // Fall back to event-level attachment info
        if (event.attachments) {
          attachments = event.attachments.map(a => ({
            filename: a.filename,
            mimeType: a.mimeType,
            attachmentId: a.attachmentId,
          }));
        }
      }
    } else if (event.attachments) {
      attachments = event.attachments.map(a => ({
        filename: a.filename,
        mimeType: a.mimeType,
        attachmentId: a.attachmentId,
      }));
    }

    // Filter to PDF/image attachments only
    const invoiceAttachments = attachments.filter((a) => {
      const ext = (a.filename || "").toLowerCase();
      const mime = (a.mimeType || "").toLowerCase();
      return ext.endsWith(".pdf") || ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg") ||
        mime.includes("pdf") || mime.includes("image/");
    });

    if (invoiceAttachments.length === 0) {
      console.log(`[email-invoice-import] No PDF/image attachments found`);
      return new Response(
        JSON.stringify({ success: true, message: "No invoice attachments found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[email-invoice-import] Found ${invoiceAttachments.length} invoice attachment(s)`);

    const results: Array<{ filename: string; status: string; import_id?: string }> = [];

    // 4. Process each attachment
    for (const attachment of invoiceAttachments) {
      try {
        // Dedup check
        const { data: existing } = await supabase
          .from("email_invoice_imports")
          .select("id")
          .eq("company_id", companyId)
          .eq("email_message_id", emailId)
          .eq("attachment_filename", attachment.filename)
          .maybeSingle();

        if (existing) {
          console.log(`[email-invoice-import] Already imported: ${attachment.filename}`);
          results.push({ filename: attachment.filename, status: "duplicate" });
          continue;
        }

        // Download attachment via Composio
        let fileData: Uint8Array | null = null;
        if (composioApiKey && emailId && attachment.attachmentId) {
          try {
            const dlResp = await fetch("https://backend.composio.dev/api/v2/actions/GMAIL_GET_ATTACHMENT/execute", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": composioApiKey,
              },
              body: JSON.stringify({
                connectedAccountId: connected_account_id,
                input: {
                  message_id: emailId,
                  attachment_id: attachment.attachmentId,
                },
              }),
            });

            if (dlResp.ok) {
              const dlResult = await dlResp.json();
              const base64Data = dlResult?.response_data?.data || dlResult?.data?.data;
              if (base64Data) {
                // Decode base64 (URL-safe)
                const cleanBase64 = base64Data.replace(/-/g, "+").replace(/_/g, "/");
                const binaryStr = atob(cleanBase64);
                fileData = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                  fileData[i] = binaryStr.charCodeAt(i);
                }
              }
            }
          } catch (e) {
            console.error(`[email-invoice-import] Failed to download attachment: ${attachment.filename}`, e);
          }
        }

        // Upload to Supabase storage
        const storagePath = `email-imports/${companyId}/${emailId}/${attachment.filename}`;
        let uploadSuccess = false;

        if (fileData) {
          const { error: uploadErr } = await supabase.storage
            .from("attachments")
            .upload(storagePath, fileData, {
              contentType: attachment.mimeType || "application/pdf",
              upsert: true,
            });

          if (uploadErr) {
            console.error(`[email-invoice-import] Upload failed: ${uploadErr.message}`);
          } else {
            uploadSuccess = true;
          }
        }

        // Insert import record
        const { data: importRecord, error: insertErr } = await supabase
          .from("email_invoice_imports")
          .insert({
            company_id: companyId,
            email_message_id: emailId,
            email_subject: emailSubject,
            email_from: emailFrom,
            email_date: emailDate,
            attachment_filename: attachment.filename,
            attachment_storage_path: uploadSuccess ? storagePath : null,
            status: uploadSuccess ? "pending" : "failed",
            error_message: uploadSuccess ? null : "Failed to download/upload attachment",
          })
          .select("id")
          .single();

        if (insertErr) {
          console.error(`[email-invoice-import] Insert failed: ${insertErr.message}`);
          results.push({ filename: attachment.filename, status: "error" });
          continue;
        }

        // 5. If auto_process and file uploaded, trigger smart-import-invoice
        if (settings.auto_process && uploadSuccess && fileData) {
          try {
            // Extract text from PDF if it's a PDF
            const isPdf = attachment.filename.toLowerCase().endsWith(".pdf") ||
              (attachment.mimeType || "").includes("pdf");

            if (isPdf) {
              // Fire-and-forget call to smart-import-invoice
              fetch(`${supabaseUrl}/functions/v1/smart-import-invoice`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  storagePath,
                  bucket: "attachments",
                  companyId,
                  userId,
                  fileName: attachment.filename,
                  emailImportId: importRecord.id,
                }),
              }).catch(err => console.error("[email-invoice-import] smart-import call failed:", err));

              // Update status to processing
              await supabase
                .from("email_invoice_imports")
                .update({ status: "processing" })
                .eq("id", importRecord.id);
            }
          } catch (e) {
            console.error("[email-invoice-import] Auto-process trigger failed:", e);
          }
        }

        results.push({
          filename: attachment.filename,
          status: uploadSuccess ? "queued" : "failed",
          import_id: importRecord?.id,
        });
      } catch (e) {
        console.error(`[email-invoice-import] Error processing attachment: ${attachment.filename}`, e);
        results.push({ filename: attachment.filename, status: "error" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        company_id: companyId,
        email_subject: emailSubject,
        attachments_processed: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[email-invoice-import] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
