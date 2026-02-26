import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * reach-publish-post
 *
 * Publishes a scheduled post to all targeted social platforms.
 *
 * Accepts: { post_id: string }
 *
 * Flow:
 *  1. Read the post from reach_scheduled_posts
 *  2. Read active social connections for the company
 *  3. For each platform in the post's platforms array:
 *     - Check if a matching connection exists and is active
 *     - Call the platform-specific API (stubbed with TODOs)
 *     - Record per-platform success/failure
 *  4. Update the post's platform_statuses, status, and error_log
 *  5. Return the results
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { post_id } = await req.json();

    if (!post_id) {
      return new Response(
        JSON.stringify({ error: "post_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin Supabase client (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ---- 1. Read the post ----
    const { data: post, error: postError } = await adminClient
      .from("reach_scheduled_posts")
      .select("*")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      return new Response(
        JSON.stringify({ error: "Post not found", details: postError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!post.platforms || post.platforms.length === 0) {
      return new Response(
        JSON.stringify({ error: "Post has no target platforms" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- 2. Read active social connections ----
    const { data: connections, error: connError } = await adminClient
      .from("reach_social_connections")
      .select("*")
      .eq("company_id", post.company_id)
      .eq("is_active", true);

    if (connError) {
      console.error("Failed to fetch connections:", connError);
    }

    const connectionMap: Record<string, any> = {};
    (connections || []).forEach((conn: any) => {
      connectionMap[conn.platform] = conn;
    });

    // ---- 3. Publish to each platform ----
    const platformStatuses: Record<string, { success: boolean; error?: string; post_id?: string }> = {};
    const errors: Record<string, string> = {};
    let successCount = 0;
    let failCount = 0;

    for (const platform of post.platforms) {
      const connection = connectionMap[platform];

      if (!connection) {
        platformStatuses[platform] = {
          success: false,
          error: `No active connection for ${platform}`,
        };
        errors[platform] = `No active connection for ${platform}`;
        failCount++;
        continue;
      }

      try {
        // Platform-specific publishing logic
        const result = await publishToPlatform(platform, post, connection);
        platformStatuses[platform] = result;

        if (result.success) {
          successCount++;
        } else {
          failCount++;
          if (result.error) {
            errors[platform] = result.error;
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        platformStatuses[platform] = { success: false, error: errorMsg };
        errors[platform] = errorMsg;
        failCount++;
      }
    }

    // ---- 4. Determine overall status ----
    let overallStatus: string;
    if (failCount === 0) {
      overallStatus = "published";
    } else if (successCount === 0) {
      overallStatus = "failed";
    } else {
      overallStatus = "partial";
    }

    // ---- 5. Update the post ----
    const { error: updateError } = await adminClient
      .from("reach_scheduled_posts")
      .update({
        platform_statuses: platformStatuses,
        status: overallStatus,
        error_log: Object.keys(errors).length > 0 ? errors : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post_id);

    if (updateError) {
      console.error("Failed to update post:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: overallStatus !== "failed",
        status: overallStatus,
        platform_statuses: platformStatuses,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("reach-publish-post error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ---------------------------------------------------------------------------
// Platform-specific publishing stubs
// ---------------------------------------------------------------------------

interface PublishResult {
  success: boolean;
  post_id?: string;
  error?: string;
}

async function publishToPlatform(
  platform: string,
  post: any,
  connection: any
): Promise<PublishResult> {
  switch (platform) {
    case "instagram":
    case "facebook":
      return publishToMeta(platform, post, connection);

    case "linkedin":
      return publishToLinkedIn(post, connection);

    case "twitter":
      return publishToTwitter(post, connection);

    case "tiktok":
      return publishToTikTok(post, connection);

    default:
      return {
        success: false,
        error: `Unsupported platform: ${platform}`,
      };
  }
}

/**
 * Meta (Facebook / Instagram) publishing
 *
 * TODO: Implement Meta Graph API call
 * - Facebook: POST to /{page-id}/feed with message, link, etc.
 * - Instagram: POST to /{ig-user-id}/media then /{ig-user-id}/media_publish
 * - Requires a valid Page Access Token stored in the connection
 *
 * Reference: https://developers.facebook.com/docs/graph-api/reference/page/feed
 * Reference: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */
async function publishToMeta(
  platform: string,
  post: any,
  connection: any
): Promise<PublishResult> {
  // TODO: Implement Meta Graph API call
  // const accessToken = connection.access_token;
  // const pageId = connection.page_id;
  //
  // For Facebook:
  //   const resp = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       message: post.caption,
  //       access_token: accessToken,
  //     }),
  //   });
  //
  // For Instagram:
  //   Step 1: Create container
  //   const container = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
  //     method: 'POST',
  //     body: JSON.stringify({
  //       image_url: post.media_urls?.[0],
  //       caption: post.caption,
  //       access_token: accessToken,
  //     }),
  //   });
  //   Step 2: Publish container
  //   const publish = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
  //     method: 'POST',
  //     body: JSON.stringify({
  //       creation_id: container.id,
  //       access_token: accessToken,
  //     }),
  //   });

  // Simulated success for now
  console.log(`[reach-publish-post] Simulating ${platform} publish for post ${post.id}`);
  return {
    success: true,
    post_id: `sim_${platform}_${Date.now()}`,
  };
}

/**
 * LinkedIn publishing
 *
 * TODO: Implement LinkedIn API v2 call
 * - POST to /ugcPosts or /posts (v2)
 * - Requires OAuth2 access token with w_member_social scope
 * - For organization posts: requires w_organization_social scope
 *
 * Reference: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 */
async function publishToLinkedIn(
  post: any,
  connection: any
): Promise<PublishResult> {
  // TODO: Implement LinkedIn API v2 call
  // const accessToken = connection.access_token;
  // const authorUrn = connection.author_urn; // e.g. "urn:li:person:xxx" or "urn:li:organization:xxx"
  //
  // const resp = await fetch('https://api.linkedin.com/v2/posts', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${accessToken}`,
  //     'Content-Type': 'application/json',
  //     'X-Restli-Protocol-Version': '2.0.0',
  //   },
  //   body: JSON.stringify({
  //     author: authorUrn,
  //     lifecycleState: 'PUBLISHED',
  //     specificContent: {
  //       'com.linkedin.ugc.ShareContent': {
  //         shareCommentary: { text: post.caption },
  //         shareMediaCategory: post.media_urls?.length ? 'IMAGE' : 'NONE',
  //       },
  //     },
  //     visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  //   }),
  // });

  console.log(`[reach-publish-post] Simulating LinkedIn publish for post ${post.id}`);
  return {
    success: true,
    post_id: `sim_linkedin_${Date.now()}`,
  };
}

/**
 * Twitter/X publishing
 *
 * TODO: Implement Twitter API v2 call
 * - POST to /2/tweets
 * - Requires OAuth 2.0 Bearer Token or OAuth 1.0a
 * - For media: upload via /1.1/media/upload first
 *
 * Reference: https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
 */
async function publishToTwitter(
  post: any,
  connection: any
): Promise<PublishResult> {
  // TODO: Implement Twitter API v2 call
  // const accessToken = connection.access_token;
  //
  // // Step 1: Upload media (if any)
  // let mediaIds = [];
  // if (post.media_urls?.length) {
  //   for (const url of post.media_urls) {
  //     // Download image, then upload to Twitter media endpoint
  //     // const mediaResp = await fetch('https://upload.twitter.com/1.1/media/upload.json', ...);
  //     // mediaIds.push(mediaResp.media_id_string);
  //   }
  // }
  //
  // // Step 2: Create tweet
  // const resp = await fetch('https://api.twitter.com/2/tweets', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${accessToken}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     text: post.caption?.substring(0, 280),
  //     ...(mediaIds.length ? { media: { media_ids: mediaIds } } : {}),
  //   }),
  // });

  console.log(`[reach-publish-post] Simulating Twitter publish for post ${post.id}`);
  return {
    success: true,
    post_id: `sim_twitter_${Date.now()}`,
  };
}

/**
 * TikTok publishing
 *
 * TODO: Implement TikTok Content Posting API call
 * - POST to /v2/post/publish/video/init/ or /v2/post/publish/content/init/
 * - Requires valid access token with video.publish scope
 * - Video must be uploaded first via TikTok's chunk upload
 *
 * Reference: https://developers.tiktok.com/doc/content-posting-api-get-started
 */
async function publishToTikTok(
  post: any,
  connection: any
): Promise<PublishResult> {
  // TODO: Implement TikTok Content Posting API call
  // const accessToken = connection.access_token;
  //
  // // TikTok requires video content - text-only posts are not supported
  // if (!post.media_urls?.length) {
  //   return { success: false, error: 'TikTok requires video content' };
  // }
  //
  // // Step 1: Initialize post
  // const initResp = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${accessToken}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     post_info: {
  //       title: post.caption?.substring(0, 150),
  //       privacy_level: 'PUBLIC_TO_EVERYONE',
  //     },
  //     source_info: {
  //       source: 'PULL_FROM_URL',
  //       video_url: post.media_urls[0],
  //     },
  //   }),
  // });
  //
  // Step 2: Check publish status via /v2/post/publish/status/fetch/

  console.log(`[reach-publish-post] Simulating TikTok publish for post ${post.id}`);
  return {
    success: true,
    post_id: `sim_tiktok_${Date.now()}`,
  };
}
