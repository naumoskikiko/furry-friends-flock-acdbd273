import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const videoFile = formData.get('video') as File;
    const coverFile = formData.get('cover') as File;
    const trimStart = parseFloat(formData.get('trimStart') as string || '0');
    const trimEnd = parseFloat(formData.get('trimEnd') as string || '0');
    const aspectRatio = formData.get('aspectRatio') as string || 'original';

    if (!videoFile) {
      return new Response(JSON.stringify({ error: 'No video file' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Backend validation: reject if trimmed duration exceeds 60s for posts
    const trimmedDuration = trimEnd - trimStart;
    if (trimmedDuration > 60) {
      return new Response(JSON.stringify({ error: 'Upload failed: video exceeds 60 seconds limit' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const timestamp = Date.now();
    const videoPath = `${user.id}/${timestamp}-video.mp4`;
    const coverPath = `${user.id}/${timestamp}-cover.jpg`;

    // Upload video
    const videoBuffer = await videoFile.arrayBuffer();
    const { error: videoUploadError } = await supabase.storage
      .from('post-images')
      .upload(videoPath, videoBuffer, {
        contentType: videoFile.type || 'video/mp4',
        upsert: false,
      });

    if (videoUploadError) {
      return new Response(JSON.stringify({ error: `Video upload failed: ${videoUploadError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upload cover
    let coverUrl = null;
    if (coverFile) {
      const coverBuffer = await coverFile.arrayBuffer();
      const { error: coverUploadError } = await supabase.storage
        .from('post-images')
        .upload(coverPath, coverBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (!coverUploadError) {
        const { data: coverData } = supabase.storage.from('post-images').getPublicUrl(coverPath);
        coverUrl = coverData.publicUrl;
      }
    }

    const { data: videoData } = supabase.storage.from('post-images').getPublicUrl(videoPath);

    return new Response(JSON.stringify({
      videoUrl: videoData.publicUrl,
      coverUrl,
      trimStart,
      trimEnd,
      aspectRatio,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
