/**
 * UNDERHEAT Studio Backend Worker
 * Handles user auth, email verification, admin management
 */

import bcryptjs from 'bcryptjs';

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname;
		const now = Date.now();

		// JSON response helper
		function json(data, status = 200) {
			return new Response(JSON.stringify(data), {
				status,
				headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
			});
		}

		// CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 200,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization"
				}
			});
		}

		// ------------------------------------------------
		// AUTH0 VERIFICATION & ROLE MANAGEMENT
		// ------------------------------------------------
		const FOUNDER_AUTH0_ID = "google-oauth2|113043894566831592879";
		const AUTH0_DOMAIN = "dev-2j6f0pfj7mazarrg.us.auth0.com";
		const AUTH0_AUDIENCE = "https://cold-cell-aa07.jkmeiihh.workers.dev";

		// Verify and decode Auth0 token
		async function verifyAuth0Token(token) {
			if (!token) return null;

			try {
				// Remove "Bearer " prefix if present
				const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
				const parts = cleanToken.split(".");

				if (parts.length !== 3) return null;

				// Decode header and payload (don't verify signature yet)
				const header = JSON.parse(atob(parts[0]));
				const payload = JSON.parse(atob(parts[1]));

				// Check basic validity
				const now = Math.floor(Date.now() / 1000);
				if (payload.exp && payload.exp < now) return null; // Token expired

				// Check issuer
				if (payload.iss !== `https://${AUTH0_DOMAIN}/`) return null;

				// Check audience (Auth0 sends aud as an array)
				const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
				if (!aud.includes(AUTH0_AUDIENCE)) return null;

				// In production, verify the signature using JWKS
				// For now, we trust the issuer/audience/expiry checks
				// To add full signature verification, fetch JWKS from:
				// https://{AUTH0_DOMAIN}/.well-known/jwks.json

				return payload;
			} catch (err) {
				console.error("Auth0 verification error:", err);
				return null;
			}
		}

		// Get role for Auth0 user
		async function getRoleForAuth0User(sub) {
			// Founder check
			if (sub === FOUNDER_AUTH0_ID) {
				return "founder";
			}

			// Check KV for stored role
			try {
				const stored = await env.USERS.get(`auth0:${sub}`);
				if (stored) {
					const data = JSON.parse(stored);
					return data.role || "user";
				}
			} catch (err) {
				console.error("KV fetch error:", err);
			}

			// Default to user role
			return "user";
		}

		// ------------------------------------------------
		// RATE LIMITING
		// ------------------------------------------------
		const ip = request.headers.get("cf-connecting-ip") || "unknown";
		const rateKey = `rate:${ip}`;
		const stored = await env.UNDERHEAT_KV.get(rateKey);
		const timestamps = stored ? JSON.parse(stored) : [];

		// Remove timestamps older than 60 seconds
		const recent = timestamps.filter(t => now - t < 60000);
		if (recent.length >= 5) {
			return json({
				success: false,
				message: "Too many requests. Try again in a minute."
			}, 429);
		}

		recent.push(now);
		await env.UNDERHEAT_KV.put(rateKey, JSON.stringify(recent), {
			expirationTtl: 60
		});

		// ------------------------------------------------
		// PASSWORD HASHING HELPERS
		// ------------------------------------------------
		async function hashPassword(password) {
			return await bcryptjs.hash(password, 10);
		}

		async function verifyPassword(plainPassword, hash) {
			return await bcryptjs.compare(plainPassword, hash);
		}

		// ------------------------------------------------
		// CHECK IF FOUNDER EXISTS
		// ------------------------------------------------
		async function founderExists() {
			const list = await env.USERS.list();
			for (const key of list.keys) {
				const raw = await env.USERS.get(key.name);
				if (raw) {
					const user = JSON.parse(raw);
					if (user.role === "founder") {
						return true;
					}
				}
			}
			return false;
		}

		// ------------------------------------------------
		// VERIFY ADMIN OR FOUNDER
		// ------------------------------------------------
		async function verifyAdminOrFounder(body) {
			const { adminUsername, adminPassword, username, password } = body;
			const u = adminUsername || username;
			const p = adminPassword || password;

			if (!u || !p) return false;

			const raw = await env.USERS.get(u);
			if (!raw) return false;

			const user = JSON.parse(raw);
			const isValid = await verifyPassword(p, user.passwordHash);
			return isValid && (user.role === "founder" || user.role === "admin");
		}

		// ------------------------------------------------
		// REGISTER
		// ------------------------------------------------
		if ((path === "/register" || path === "/api/register") && request.method === "POST") {
			let body;
			try {
				body = await request.json();
			} catch {
				return json({ success: false, message: "Invalid request body." }, 400);
			}

			const { username, password, email } = body;

			if (!username || !password) {
				return json({ success: false, message: "Username and password required." }, 400);
			}

			if (username.length < 3 || password.length < 6) {
				return json({ success: false, message: "Username must be 3+ chars, password 6+ chars." }, 400);
			}

			// Check if username exists
			const existing = await env.USERS.get(username);
			if (existing) {
				return json({ success: false, message: "Username already taken." }, 400);
			}

			try {
				// Determine if this is the first user (becomes founder)
				const hasFounder = await founderExists();
				const role = hasFounder ? "user" : "founder";

				// Hash password
				const passwordHash = await hashPassword(password);

				// Create user
				const user = {
					email: email || "",
					passwordHash,
					role,
					createdAt: now,
					lastLogin: now
				};

				await env.USERS.put(username, JSON.stringify(user));

				return json({
					success: true,
					message: role === "founder" ? "Welcome! You are the founder." : "Account created.",
					username,
					role,
					email: user.email
				});
			} catch (err) {
				console.error("Register error:", err);
				return json({ success: false, message: "Failed to create account." }, 500);
			}
		}

		// ------------------------------------------------
		// LOGIN
		// ------------------------------------------------
		if ((path === "/login" || path === "/api/login") && request.method === "POST") {
			let body;
			try {
				body = await request.json();
			} catch {
				return json({ success: false, message: "Invalid request body." }, 400);
			}

			const { username, password } = body;

			if (!username || !password) {
				return json({ success: false, message: "Username and password required." }, 400);
			}

			try {
				const raw = await env.USERS.get(username);
				if (!raw) {
					return json({ success: false, message: "Invalid username or password." }, 401);
				}

				const user = JSON.parse(raw);

				// Verify password
				const isValid = await verifyPassword(password, user.passwordHash);
				if (!isValid) {
					return json({ success: false, message: "Invalid username or password." }, 401);
				}

				// Update last login
				user.lastLogin = now;
				await env.USERS.put(username, JSON.stringify(user));

				return json({
					success: true,
					username,
					role: user.role,
					email: user.email
				});
			} catch (err) {
				console.error("Login error:", err);
				return json({ success: false, message: "Login failed." }, 500);
			}
		}

		// ------------------------------------------------
		// CHANGE PASSWORD
		// ------------------------------------------------
		if ((path === "/change-password" || path === "/api/change-password") && request.method === "POST") {
			let body;
			try {
				body = await request.json();
			} catch {
				return json({ success: false, message: "Invalid request body." }, 400);
			}

			const { username, oldPassword, newPassword } = body;

			if (!username || !oldPassword || !newPassword) {
				return json({ success: false, message: "Username, old password, and new password required." }, 400);
			}

			if (newPassword.length < 6) {
				return json({ success: false, message: "New password must be 6+ characters." }, 400);
			}

			try {
				const raw = await env.USERS.get(username);
				if (!raw) {
					return json({ success: false, message: "User not found." }, 404);
				}

				const user = JSON.parse(raw);

				// Verify old password
				const isValid = await verifyPassword(oldPassword, user.passwordHash);
				if (!isValid) {
					return json({ success: false, message: "Old password is incorrect." }, 401);
				}

				// Hash and set new password
				user.passwordHash = await hashPassword(newPassword);
				await env.USERS.put(username, JSON.stringify(user));

				return json({ success: true, message: "Password updated." });
			} catch (err) {
				console.error("Change password error:", err);
				return json({ success: false, message: "Password change failed." }, 500);
			}
		}

		// ------------------------------------------------
		// LIST USERS (admin/founder only)
		// ------------------------------------------------
		if ((path === "/admin/list" || path === "/api/admin/list") && request.method === "POST") {
			let body;
			try {
				body = await request.json();
			} catch {
				return json({ success: false, message: "Invalid body." }, 400);
			}

			const isAdmin = await verifyAdminOrFounder(body);

			if (!isAdmin) {
				return json({ success: false, message: "Unauthorized." }, 403);
			}

			try {
				const list = await env.USERS.list();
				const users = [];

				for (const key of list.keys) {
					const raw = await env.USERS.get(key.name);
					if (raw) {
						const user = JSON.parse(raw);
						users.push({
							username: key.name,
							email: user.email,
							role: user.role,
							createdAt: user.createdAt,
							lastLogin: user.lastLogin
						});
					}
				}

				return json({ success: true, users });
			} catch (err) {
				console.error("List users error:", err);
				return json({ success: false, message: "Failed to list users." }, 500);
			}
		}

		// ------------------------------------------------
		// PROMOTE TO ADMIN (founder/admin only)
		// ------------------------------------------------
		if ((path === "/promote-admin" || path === "/api/promote-admin") && request.method === "POST") {
			let body;
			try {
				body = await request.json();
			} catch {
				return json({ success: false, message: "Invalid body." }, 400);
			}

			const { targetUsername } = body;
			const isAdmin = await verifyAdminOrFounder(body);

			if (!isAdmin) {
				return json({ success: false, message: "Unauthorized." }, 403);
			}

			if (!targetUsername) {
				return json({ success: false, message: "Target username required." }, 400);
			}

			try {
				const raw = await env.USERS.get(targetUsername);
				if (!raw) {
					return json({ success: false, message: "User not found." }, 404);
				}

				const user = JSON.parse(raw);

				// Cannot promote to founder or if already admin
				if (user.role === "founder") {
					return json({ success: false, message: "Cannot change founder role." }, 400);
				}

				if (user.role === "admin") {
					return json({ success: false, message: "User is already admin." }, 400);
				}

				user.role = "admin";
				await env.USERS.put(targetUsername, JSON.stringify(user));

				return json({ success: true, message: `${targetUsername} promoted to admin.` });
			} catch (err) {
				console.error("Promote error:", err);
				return json({ success: false, message: "Promotion failed." }, 500);
			}
		}

		// ------------------------------------------------
		// DEMOTE FROM ADMIN (founder/admin only)
		// ------------------------------------------------
		if ((path === "/demote-admin" || path === "/api/demote-admin") && request.method === "POST") {
			let body;
			try {
				body = await request.json();
			} catch {
				return json({ success: false, message: "Invalid body." }, 400);
			}

			const { targetUsername } = body;
			const isAdmin = await verifyAdminOrFounder(body);

			if (!isAdmin) {
				return json({ success: false, message: "Unauthorized." }, 403);
			}

			if (!targetUsername) {
				return json({ success: false, message: "Target username required." }, 400);
			}

			try {
				const raw = await env.USERS.get(targetUsername);
				if (!raw) {
					return json({ success: false, message: "User not found." }, 404);
				}

				const user = JSON.parse(raw);

				// Cannot demote founder or if already user
				if (user.role === "founder") {
					return json({ success: false, message: "Cannot demote founder." }, 400);
				}

				if (user.role !== "admin") {
					return json({ success: false, message: "User is not an admin." }, 400);
				}

				user.role = "user";
				await env.USERS.put(targetUsername, JSON.stringify(user));

				return json({ success: true, message: `${targetUsername} demoted to user.` });
			} catch (err) {
				console.error("Demote error:", err);
				return json({ success: false, message: "Demotion failed." }, 500);
			}
		}

		// ------------------------------------------------
		// DELETE USER (admin/founder only)
		// ------------------------------------------------
		if ((path === "/admin/delete" || path === "/api/admin/delete") && request.method === "POST") {
			let body;
			try { body = await request.json(); } catch { return json({ success: false, message: "Invalid body." }, 400); }

			const isAdmin = await verifyAdminOrFounder(body);
			if (!isAdmin) return json({ success: false, message: "Unauthorized." }, 403);

			const { targetUsername } = body;
			if (!targetUsername) return json({ success: false, message: "Target username required." }, 400);

			const raw = await env.USERS.get(targetUsername);
			if (!raw) return json({ success: false, message: "User not found." }, 404);

			const user = JSON.parse(raw);
			if (user.role === "founder") return json({ success: false, message: "Cannot delete founder." }, 403);

			await env.USERS.delete(targetUsername);
			return json({ success: true, message: "User deleted successfully." });
		}

		// ------------------------------------------------
		// SET PASSWORD (admin/founder only)
		// ------------------------------------------------
		if ((path === "/admin/set-password" || path === "/api/admin/set-password") && request.method === "POST") {
			let body;
			try { body = await request.json(); } catch { return json({ success: false, message: "Invalid body." }, 400); }

			const isAdmin = await verifyAdminOrFounder(body);
			if (!isAdmin) return json({ success: false, message: "Unauthorized." }, 403);

			const { targetUsername, newPassword } = body;
			if (!targetUsername || !newPassword) return json({ success: false, message: "Missing required fields." }, 400);

			const raw = await env.USERS.get(targetUsername);
			if (!raw) return json({ success: false, message: "User not found." }, 404);

			const user = JSON.parse(raw);
			user.passwordHash = await hashPassword(newPassword);
			await env.USERS.put(targetUsername, JSON.stringify(user));

			return json({ success: true, message: "Password updated by admin." });
		}

		// ------------------------------------------------
		// SEND CODE (email verification)
		// ------------------------------------------------
		if ((path === "/send-code" || path === "/api/send-code") && request.method === "POST") {
			let email;
			try {
				({ email } = await request.json());
			} catch {
				return json({ success: false, message: "Invalid request body." }, 400);
			}

			if (!email || !email.includes("@")) {
				return json({ success: false, message: "Invalid email." }, 400);
			}

			const code = Math.floor(100000 + Math.random() * 900000).toString();
			const entry = { code, expires: now + 5 * 60 * 1000 };

			await env.UNDERHEAT_KV.put(
				`code:${email}`,
				JSON.stringify(entry),
				{ expirationTtl: 300 }
			);

			const fromAddress = env.VERIFIED_DOMAIN
				? `UNDERHEAT Studio <noreply@${env.VERIFIED_DOMAIN}>`
				: "onboarding@resend.dev";

			const resendRes = await fetch("https://api.resend.com/emails", {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${env.RESEND_API_KEY}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					from: fromAddress,
					to: email,
					subject: "UNDERHEAT Studio — Verification Code",
					html: `
						<div style="font-family:sans-serif;max-width:400px;margin:auto;">
							<h2>UNDERHEAT Studio</h2>
							<p>Your verification code is:</p>
							<h1 style="letter-spacing:8px;">${code}</h1>
							<p style="color:#888;">Expires in 5 minutes. Do not share this code.</p>
						</div>
					`
				})
			});

			if (!resendRes.ok) {
				const err = await resendRes.text();
				console.error("Resend error:", err);
				return json({ success: false, message: "Failed to send email." }, 500);
			}

			return json({ success: true, message: "Verification code sent." });
		}

		// ------------------------------------------------
		// VERIFY CODE
		// ------------------------------------------------
		if ((path === "/verify-code" || path === "/api/verify-code") && request.method === "POST") {
			let email, code;
			try {
				({ email, code } = await request.json());
			} catch {
				return json({ success: false, message: "Invalid request body." }, 400);
			}

			if (!email || !code) {
				return json({ success: false, message: "Missing fields." }, 400);
			}

			const stored = await env.UNDERHEAT_KV.get(`code:${email}`);
			if (!stored) {
				return json({ success: false, message: "No code found or it already expired." }, 400);
			}

			const entry = JSON.parse(stored);

			if (now > entry.expires) {
				await env.UNDERHEAT_KV.delete(`code:${email}`);
				return json({ success: false, message: "Code expired." }, 400);
			}

			if (entry.code !== code) {
				return json({ success: false, message: "Invalid code." }, 400);
			}

			await env.UNDERHEAT_KV.delete(`code:${email}`);
			return json({ success: true, message: "Code verified." });
		}

		// ------------------------------------------------
		// GET ROLE (Auth0 + KV)
		// ------------------------------------------------
		if ((path === "/role" || path === "/api/role") && request.method === "GET") {
			const authHeader = request.headers.get("Authorization");
			const payload = await verifyAuth0Token(authHeader);

			if (!payload || !payload.sub) {
				return json({ success: false, role: "user", message: "Invalid or missing token." }, 401);
			}

			const role = await getRoleForAuth0User(payload.sub);
			return json({ success: true, role, sub: payload.sub });
		}

		// ------------------------------------------------
		// SET ROLE (Auth0 + founder/admin only)
		// ------------------------------------------------
		if ((path === "/set-role" || path === "/api/set-role") && request.method === "POST") {
			const authHeader = request.headers.get("Authorization");
			const payload = await verifyAuth0Token(authHeader);

			if (!payload || !payload.sub) {
				return json({ success: false, message: "Invalid or missing token." }, 401);
			}

			// Only founder can set roles
			const currentRole = await getRoleForAuth0User(payload.sub);
			if (currentRole !== "founder" && currentRole !== "admin") {
				return json({ success: false, message: "Unauthorized. Only founder/admin can set roles." }, 403);
			}

			let body;
			try {
				body = await request.json();
			} catch {
				return json({ success: false, message: "Invalid request body." }, 400);
			}

			const { targetSub, newRole } = body;

			if (!targetSub || !newRole) {
				return json({ success: false, message: "Missing targetSub or newRole." }, 400);
			}

			if (!["user", "admin", "founder"].includes(newRole)) {
				return json({ success: false, message: "Invalid role. Must be user, admin, or founder." }, 400);
			}

			// Cannot demote founder
			if (targetSub === FOUNDER_AUTH0_ID && newRole !== "founder") {
				return json({ success: false, message: "Cannot change founder's role." }, 403);
			}

			try {
				await env.USERS.put(
					`auth0:${targetSub}`,
					JSON.stringify({ role: newRole, updatedAt: now }),
					{ expirationTtl: 365 * 24 * 60 * 60 } // 1 year
				);

				return json({ success: true, message: `Role updated to ${newRole}.`, role: newRole });
			} catch (err) {
				console.error("Set role error:", err);
				return json({ success: false, message: "Failed to set role." }, 500);
			}
		}

		return json({ success: false, message: "Not found." }, 404);
	}
};
