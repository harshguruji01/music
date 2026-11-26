#!/usr/bin/env node
/**
 * GURU MUSIC — Trusted Server-Side Admin Provisioning Script
 *
 * Usage:
 *   node scripts/provision-admin.mjs
 *
 * Prompts securely (or reads ADMIN_INITIAL_PASSWORD from env without storing
 * any password in source control) to provision the allowlisted admin user
 * (harshguruji01@gmail.com) in Supabase Auth and assign role = 'admin' in
 * public.user_roles.
 */

import readline from "node:readline";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    if (fs.existsSync(".env.local")) {
      const lines = fs.readFileSync(".env.local", "utf8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {
    // ignore
  }
}

async function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const stdin = process.openStdin();
    const onData = (char) => {
      const str = String(char);
      if (str === "\n" || str === "\r" || str === "\u0004") {
        stdin.removeListener("data", onData);
      } else {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(question + "*".repeat(rl.line.length));
      }
    };
    stdin.on("data", onData);
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

await (async () => {
  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const allowlistRaw = process.env.ADMIN_ALLOWLIST_EMAILS || "harshguruji01@gmail.com";
  const allowlist = allowlistRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
    process.exit(1);
  }

  const targetEmail = (process.env.ADMIN_PROVISION_EMAIL || allowlist[0] || "harshguruji01@gmail.com").toLowerCase();
  if (!allowlist.includes(targetEmail)) {
    console.error(`ERROR: ${targetEmail} is not in ADMIN_ALLOWLIST_EMAILS (${allowlist.join(", ")})`);
    process.exit(1);
  }

  let password = process.env.ADMIN_PROVISION_PASSWORD;
  if (!password) {
    password = await promptHidden(`Enter a strong private admin password for ${targetEmail} (min 12 chars): `);
  }
  if (!password || password.length < 12) {
    console.error("ERROR: Password must be at least 12 characters.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if user exists
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.error("Failed to list users:", listErr.message);
    process.exit(1);
  }

  const existing = usersData.users.find((u) => (u.email || "").toLowerCase() === targetEmail);
  let userId;

  if (existing) {
    const { data: updated, error: updErr } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata || {}), full_name: "HarshGuruJi" },
    });
    if (updErr) {
      console.error("Failed to update admin user:", updErr.message);
      process.exit(1);
    }
    userId = updated.user.id;
    console.log(`Updated existing Supabase Auth user for ${targetEmail}`);
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: targetEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "HarshGuruJi" },
    });
    if (createErr) {
      console.error("Failed to create admin user:", createErr.message);
      process.exit(1);
    }
    userId = created.user.id;
    console.log(`Created Supabase Auth user for ${targetEmail}`);
  }

  // Upsert profile and assign admin role in public.user_roles
  await supabase.from("profiles").upsert({
    id: userId,
    email: targetEmail,
    full_name: "HarshGuruJi",
  });

  const { error: roleErr } = await supabase.from("user_roles").upsert(
    {
      user_id: userId,
      role: "admin",
      assigned_by: userId,
    },
    { onConflict: "user_id" }
  );

  if (roleErr) {
    console.error("Failed to assign admin role:", roleErr.message);
    process.exit(1);
  }

  await supabase.from("admin_activity_logs").insert({
    admin_id: userId,
    admin_email: targetEmail,
    action: "admin.provisioned",
    resource_type: "user_roles",
    resource_id: userId,
    details: { method: "cli_provisioning" },
    status: "success",
  });

  console.log(`SUCCESS: ${targetEmail} provisioned with role 'admin' in public.user_roles.`);
})();
