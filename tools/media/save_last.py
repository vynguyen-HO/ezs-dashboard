#!/usr/bin/env python3
"""Save the latest result of a tool call, verbatim, from the Claude Code session transcripts.

Usage:
  python3 tools/media/save_last.py <tool_name_substring> <out_path> <match_text>

Used by the scheduled update (see UPDATE.md): small tool results come back inline instead of
being saved to a file, and retyping JSON by hand is error-prone.

<match_text> must appear in the JSON input of the call you just made and should be unique to it,
e.g. a campaign id, `"level": "ad"`, an account id plus page, or a range like `Daily_History`.
Several sessions can be writing transcripts at the same time (a scheduled run while someone is
chatting), so the script searches every transcript touched in the last 2 hours and takes the most
recent finished call whose tool name contains <tool_name_substring> AND whose input contains
<match_text>. It prints the transcript, timestamp and the full input so the caller can confirm it
is the right call. Exits non-zero if nothing matches or the result was an error.
"""
import glob, json, os, sys, time


def calls(path):
    uses, res = {}, {}
    with open(path, encoding='utf-8') as f:
        for line in f:
            try:
                o = json.loads(line)
            except ValueError:
                continue
            content = (o.get('message') or {}).get('content')
            if not isinstance(content, list):
                continue
            ts = o.get('timestamp', '')
            for b in content:
                if not isinstance(b, dict):
                    continue
                if b.get('type') == 'tool_use':
                    uses[b['id']] = (ts, b)
                elif b.get('type') == 'tool_result':
                    res[b.get('tool_use_id')] = (ts, b)
    for tid, (ts, u) in uses.items():
        if tid in res:
            yield res[tid][0] or ts, u, res[tid][1], path


def main(sub, out, needle):
    cutoff = time.time() - 2 * 3600
    paths = [p for p in glob.glob(os.path.expanduser('~/.claude/projects/**/*.jsonl'), recursive=True)
             if os.path.getmtime(p) >= cutoff]
    best = None
    for p in paths:
        for ts, u, r, path in calls(p):
            inp = json.dumps(u.get('input'), ensure_ascii=False)
            if sub in u.get('name', '') and needle in inp and (best is None or ts > best[0]):
                best = (ts, u, r, path, inp)
    if not best:
        sys.exit(f'no finished call of a tool matching "{sub}" with input containing {needle!r} in {len(paths)} recent transcripts')
    ts, u, r, path, inp = best
    c = r.get('content')
    if isinstance(c, list):
        c = ''.join(x.get('text', '') for x in c if isinstance(x, dict) and x.get('type') == 'text')
    c = c or ''
    if r.get('is_error'):
        sys.exit('tool returned an error: ' + c[:300])
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f'{out}: {len(c)} bytes\n  from {os.path.basename(path)} at {ts}\n  tool {u.get("name")}\n  input {inp[:1500]}')


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
