/* ============================================================
   PH_ANTOM ACE — social config
   Single source of truth. Both index.html (via js/main.js) and
   links.html read this file, so a URL is pasted in exactly one
   place and can never drift between the two pages.

   Paste the full profile URL. Leave a value empty ('') and that
   button renders as an honest, non-clickable "coming soon"
   instead of silently routing somewhere else.
   ============================================================ */
window.PHANTOM_SOCIALS = {
  instagram: '',   // e.g. 'https://instagram.com/yourhandle'
  tiktok:    '',   // e.g. 'https://tiktok.com/@yourhandle'
  youtube:   ''    // e.g. 'https://youtube.com/@yourhandle'
};
