// import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Headers":
//     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
//   "Access-Control-Allow-Methods": "POST, OPTIONS", // ✅ ADD THIS
// };

// Deno.serve(async (req) => {
//   if (req.method === "OPTIONS") {
//    return new Response("ok", { headers: corsHeaders });
//   }

//   try {
//     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
//     const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
//     const supabase = createClient(supabaseUrl, serviceRoleKey);

//     const { event_type, donation_id, user_id, message, notify_role } = await req.json();

//     const recipients: { id: string; email: string; full_name: string }[] = [];

//     if (notify_role) {
//       const { data: roleProfiles } = await supabase
//         .from("profiles")
//         .select("id, full_name")
//         .eq("role", notify_role)
//         .eq("disabled", false);

//       if (roleProfiles) {
//         for (const profile of roleProfiles) {
//           const { data: { user: authUser } } = await supabase.auth.admin.getUserById(profile.id);
//           if (authUser?.email) {
//             recipients.push({ id: profile.id, email: authUser.email, full_name: profile.full_name });
//           }
//         }
//       }
//     } else if (user_id) {
//       const { data: profile } = await supabase
//         .from("profiles")
//         .select("full_name")
//         .eq("id", user_id)
//         .single();

//       const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user_id);
//       if (authUser?.email) {
//         recipients.push({ id: user_id, email: authUser.email, full_name: profile?.full_name || "User" });
//       }
//     }

//     if (recipients.length === 0) {
//       return new Response(
//         JSON.stringify({ error: "No recipients found" }),
//         { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
//       );
//     }

//     // Create in-app notifications for all recipients
//     const notifications = recipients.map((r) => ({
//       user_id: r.id,
//       title: getTitle(event_type),
//       message,
//       type: event_type,
//     }));

//     await supabase.from("notifications").insert(notifications);

//     // Send push notifications to all recipients
//     const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
//     if (vapidPrivateKey) {
//       for (const r of recipients) {
//         await sendPushToUser(supabase, r.id, {
//           title: getTitle(event_type),
//           body: message,
//           icon: "/pwa-192x192.png",
//           url: "/dashboard",
//         }, vapidPrivateKey);
//       }
//     }

//     // Log email notifications for each recipient
//     for (const r of recipients) {
//       console.log(`[Email Notification] To: ${r.email} (${r.full_name}), Event: ${event_type}, Message: ${message}`);
//     }

//     return new Response(
//       JSON.stringify({
//         success: true,
//         recipients_count: recipients.length,
//         event_type,
//       }),
//       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     console.error("Error:", error);
//     return new Response(
//       JSON.stringify({ error: error.message }),
//       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
//     );
//   }
// });

// async function sendPushToUser(
//   supabase: any,
//   userId: string,
//   payload: { title: string; body: string; icon: string; url: string },
//   vapidPrivateKey: string
// ) {
//   const { data: subscriptions } = await supabase
//     .from("push_subscriptions")
//     .select("endpoint, p256dh, auth")
//     .eq("user_id", userId);

//   if (!subscriptions || subscriptions.length === 0) return;

//   for (const sub of subscriptions) {
//     try {
//       const pushPayload = JSON.stringify(payload);
      
//       // Use the Web Push protocol with VAPID
//       const pushSubscription = {
//         endpoint: sub.endpoint,
//         keys: {
//           p256dh: sub.p256dh,
//           auth: sub.auth,
//         },
//       };

//       // Generate VAPID auth headers and encrypt payload
//       const { headers, body } = await generateWebPushRequest(
//         pushSubscription,
//         pushPayload,
//         vapidPrivateKey
//       );

//       const response = await fetch(sub.endpoint, {
//         method: "POST",
//         headers,
//         body,
//       });

//       if (response.status === 410 || response.status === 404) {
//         // Subscription expired or invalid, clean up
//         await supabase
//           .from("push_subscriptions")
//           .delete()
//           .eq("user_id", userId)
//           .eq("endpoint", sub.endpoint);
//         console.log(`Removed stale push subscription for user ${userId}`);
//       } else if (!response.ok) {
//         console.error(`Push failed for ${sub.endpoint}: ${response.status} ${await response.text()}`);
//       } else {
//         console.log(`Push sent successfully to user ${userId}`);
//       }
//     } catch (err) {
//       console.error(`Push error for user ${userId}:`, err);
//     }
//   }
// }

// async function generateWebPushRequest(
//   subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
//   payload: string,
//   vapidPrivateKey: string
// ) {
//   // For web push, we need to:
//   // 1. Create VAPID JWT token
//   // 2. Encrypt the payload using the subscription keys
  
//   const url = new URL(subscription.endpoint);
//   const audience = `${url.protocol}//${url.host}`;
  
//   // Create VAPID JWT
//   const vapidHeaders = await createVapidAuth(
//     audience,
//     "mailto:noreply@foodshare.app",
//     vapidPrivateKey
//   );

//   // For simplicity, send unencrypted with TTL
//   // In production, you'd want full RFC 8291 encryption
//   const headers: Record<string, string> = {
//     "Content-Type": "application/json",
//     TTL: "86400",
//     Authorization: vapidHeaders.authorization,
//     "Crypto-Key": vapidHeaders.cryptoKey,
//   };

//   return { headers, body: payload };
// }

// async function createVapidAuth(audience: string, subject: string, privateKeyBase64: string) {
//   const header = { typ: "JWT", alg: "ES256" };
//   const now = Math.floor(Date.now() / 1000);
//   const claims = {
//     aud: audience,
//     exp: now + 86400,
//     sub: subject,
//   };

//   const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
//   const claimsB64 = btoa(JSON.stringify(claims)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
//   const unsignedToken = `${headerB64}.${claimsB64}`;

//   // Import the private key
//   const privateKeyBytes = base64UrlToBytes(privateKeyBase64);
//   const key = await crypto.subtle.importKey(
//     "pkcs8",
//     privateKeyBytes,
//     { name: "ECDSA", namedCurve: "P-256" },
//     false,
//     ["sign"]
//   );

//   const signature = await crypto.subtle.sign(
//     { name: "ECDSA", hash: "SHA-256" },
//     key,
//     new TextEncoder().encode(unsignedToken)
//   );

//   const sigB64 = bytesToBase64Url(new Uint8Array(signature));
//   const jwt = `${unsignedToken}.${sigB64}`;

//   return {
//     authorization: `vapid t=${jwt}, k=${privateKeyBase64}`,
//     cryptoKey: `p256ecdsa=${privateKeyBase64}`,
//   };
// }

// function base64UrlToBytes(base64url: string): ArrayBuffer {
//   const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
//   const padding = "=".repeat((4 - (base64.length % 4)) % 4);
//   const binary = atob(base64 + padding);
//   const bytes = new Uint8Array(binary.length);
//   for (let i = 0; i < binary.length; i++) {
//     bytes[i] = binary.charCodeAt(i);
//   }
//   return bytes.buffer;
// }

// function bytesToBase64Url(bytes: Uint8Array): string {
//   let binary = "";
//   for (const byte of bytes) {
//     binary += String.fromCharCode(byte);
//   }
//   return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
// }

// function getTitle(eventType: string): string {
//   switch (eventType) {
//     case "donation_created": return "🍽️ New Food Donation Available";
//     case "donation_reserved": return "📋 Donation Reserved";
//     case "volunteer_assigned": return "🚚 Pickup Assignment";
//     case "pickup_status_changed": return "📦 Pickup Status Updated";
//     case "donation_delivered": return "✅ Delivery Confirmed";
//     default: return "Notification";
//   }
// }


import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // ✅ HANDLE PREFLIGHT PROPERLY
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { event_type, message } = body;

    console.log("Incoming:", body);

    // SIMPLE TEST RESPONSE FIRST
    return new Response(
      JSON.stringify({
        success: true,
        message: "Function working 🚀",
        event_type,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

