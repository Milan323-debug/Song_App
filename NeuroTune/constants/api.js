// export const API_URL = "https://xclone-plum.vercel.app/"; 
// export const API_URL = "https://cyan-6czf.onrender.com";
export const API_URL = "https://song-app-noit.vercel.app/";

// Helper to safely join paths to the API root. Keeps API_URL unchanged and
// prevents accidental double-slashes or missing slashes when building endpoints.
export function API(path = "") {
	const base = String(API_URL).replace(/\/+$/, "");
	const p = String(path || "").replace(/^\/+/, "");
	if (!p) return base;
	return `${base}/${p}`;
}