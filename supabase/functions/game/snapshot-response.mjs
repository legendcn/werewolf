const encoder = new TextEncoder();

// Only compare the fully authorized response after the room transaction commits.
// Equal revisions alone don't imply equal presence, visibility or chat contents.
export async function snapshotResponse(cmd, uid, view) {
  if ((cmd.op !== 'snapshot' && cmd.op !== 'spectate') || cmd.retry ||
      typeof cmd.viewTag !== 'string' || !view?.options || (cmd.op === 'spectate' && !view.options.g)) return view;
  const bytes = encoder.encode(JSON.stringify([uid, cmd.op, view]));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const viewTag = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (viewTag === cmd.viewTag) return { code: view.code, revision: view.revision, viewTag, unchanged: true };
  return { ...view, viewTag };
}
