#!/bin/sh
# Pre-push guard: refuse to push any ref whose tree still contains an
# unpromoted draft (content/**.md with `draft = true`). The repo source is
# public — drafts stay local until promoted (drop the flag, set final date).
#
# Install (once per clone):  cp scripts/pre-push-no-drafts.sh .git/hooks/pre-push
#
# stdin: one line per ref being pushed: <local ref> <local sha> <remote ref> <remote sha>

zero=0000000000000000000000000000000000000000
status=0

while read -r local_ref local_sha remote_ref remote_sha; do
    # branch deletion — nothing to check
    [ "$local_sha" = "$zero" ] && continue

    drafts=$(git grep -l -E '^draft[[:space:]]*=[[:space:]]*true' "$local_sha" -- 'content/' 2>/dev/null)
    if [ -n "$drafts" ]; then
        echo "push blocked: $local_ref contains unpromoted draft(s):" >&2
        echo "$drafts" | sed 's/^/  /' >&2
        echo "promote (remove 'draft = true') or keep the draft off pushed branches." >&2
        status=1
    fi
done

exit $status
