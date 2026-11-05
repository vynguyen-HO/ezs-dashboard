#!/usr/bin/env python3
"""Save the latest result of a tool call, verbatim, from the current Claude Code session transcript.

Usage:
  python3 tools/media/save_last.py <tool_name_substring> <out_path>

Used by the scheduled update (see UPDATE.md): small tool results come back inline instead of
being saved to a file, and retyping JSON by hand is error-prone. This reads the newest session
transcript (*.jsonl under ~/.claude/projects, i.e. the session that is running right now), finds
the last tool_use whose name contains <tool_name_substring> and that already has a result, and
writes that result's text to <out_path>. Prints the size and the tool input so it can be checked.
Exits non-zero if the result was an error.
"""
import glob, json, os, sys


def newest_transcript():
    files = glob.glob(os.path.expanduser('~/.claude/projects/**/*.jsonl'), recursive=True)
    if not files:
        sys.exit('no transcript found under ~/.claude/projects')
    return max(files, key=os.path.getmtime)


def main(sub, out):
    path = newest_transcript()
    uses, res, order = {}, {}, []
    with open(path, encoding='utf-8') as f:
        for line in f:
            try:
                o = json.loads(line)
            except ValueError:
                continue
            content = (o.get('message') or {}).get('content')
            if not isinstance(content, list):
                continue
            for b in content:
                if not isinstance(b, dict):
                    continue
                if b.get('type') == 'tool_use' and sub in b.get('name', ''):
                    uses[b['id']] = b
                    order.append(b['id'])
                elif b.get('type') == 'tool_result':
                    res[b.get('tool_use_id')] = b
    done = [i for i in order if i in res]
    if not done:
        sys.exit(f'no finished call of a tool matching "{sub}" in {path}')
    tid = done[-1]
    c = res[tid].get('content')
    if isinstance(c, list):
        c = ''.join(x.get('text', '') for x in c if isinstance(x, dict) and x.get('type') == 'text')
    c = c or ''
    if res[tid].get('is_error'):
        sys.exit('tool returned an error: ' + c[:300])
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(c)
    print(out, len(c), 'bytes | input:', json.dumps(uses[tid].get('input'), ensure_ascii=False)[:240])


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
