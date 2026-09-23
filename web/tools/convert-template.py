#!/usr/bin/env python3
"""Regenerate the app from the Claude Design prototype.

The prototype (../project/Tarmem.dc.html) is one file: a stylesheet, a template
of `<sc-if>` / `<sc-for>` elements with `{{ expr }}` bindings, and one logic
class whose `renderVals()` returns the object those bindings resolve against.
Everything the design owns is carried over mechanically, so nothing drifts in
transcription:

  template   -> src/pages/*, src/components/{Header,Footer,...}.tsx, src/routes.ts
  <style>    -> src/styles/global.css   (app-only rules below the marker are kept)
  logic      -> src/state/designLogic.generated.ts
  i18n/data  -> src/data/tarmem-data.ts (from ../project/tarmem-i18n.js)
  photo drops-> src/data/image-slots.generated.ts + public/assets/slots/

The logic class runs on the small host in `src/state/designRuntime.ts`, which
mirrors the prototype runtime's contract (props, state, setState, lifecycle).
The few places where a deployed site must differ from the prototype are the
named LOGIC_PATCHES below; each must match or the run fails loudly.

Run from web/:  python3 tools/convert-template.py   (npm run sync:template)
"""
from __future__ import annotations

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
PROJECT = os.path.join(os.path.dirname(WEB), "project")
DESIGN = os.path.join(PROJECT, "Tarmem.dc.html")
I18N = os.path.join(PROJECT, "tarmem-i18n.js")

VOID = {"img", "input", "br", "hr", "path", "circle", "rect", "source", "col", "meta", "link", "stop", "line", "polyline", "ellipse"}
# Attributes React spells differently from HTML.
ATTR_MAP = {
    "class": "className",
    "for": "htmlFor",
    "stroke-width": "strokeWidth",
    "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin",
    "stroke-dasharray": "strokeDasharray",
    "fill-rule": "fillRule",
    "clip-rule": "clipRule",
    "stop-color": "stopColor",
    "stop-opacity": "stopOpacity",
    "stroke-dashoffset": "strokeDashoffset",
    "stroke-miterlimit": "strokeMiterlimit",
    "stroke-opacity": "strokeOpacity",
    "fill-opacity": "fillOpacity",
    "tabindex": "tabIndex",
    "inputmode": "inputMode",
    "readonly": "readOnly",
    "maxlength": "maxLength",
    "minlength": "minLength",
    "autocomplete": "autoComplete",
    "colspan": "colSpan",
    "rowspan": "rowSpan",
    "credit-href": "creditHref",
}
DROP_ATTRS = {"hint-placeholder-count", "hint-placeholder-val"}
# React types these as numbers, so a literal must not be emitted as a string.
NUMERIC_ATTRS = {"maxLength", "minLength", "rows", "cols", "size", "span", "tabIndex", "colSpan", "rowSpan"}
# `multiple=""` in HTML means true; React wants the bare prop.
BOOLEAN_ATTRS = {"multiple", "disabled", "checked", "readOnly", "required", "hidden", "autoFocus",
                 "autoPlay", "muted", "loop", "playsInline", "controls"}
IDENT = re.compile(r"^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$")
LITERALS = {"true", "false", "null", "undefined"}


# --------------------------------------------------------------------------- parse

class Node:
    pass


class Text(Node):
    def __init__(self, data: str):
        self.data = data


class Element(Node):
    def __init__(self, tag: str, attrs: list[tuple[str, str | None]]):
        self.tag = tag
        self.attrs = attrs
        self.children: list[Node] = []


TAG_RE = re.compile(r"<(/?)([A-Za-z][\w-]*)((?:\s+[^\s=/>]+(?:\s*=\s*\"[^\"]*\")?)*)\s*(/?)>", re.S)
ATTR_RE = re.compile(r"([^\s=/>]+)(?:\s*=\s*\"([^\"]*)\")?")


def parse(src: str) -> list[Node]:
    root = Element("#root", [])
    stack = [root]
    pos = 0
    while pos < len(src):
        lt = src.find("<", pos)
        if lt == -1:
            stack[-1].children.append(Text(src[pos:]))
            break
        if lt > pos:
            stack[-1].children.append(Text(src[pos:lt]))
        if src.startswith("<!--", lt):  # drop comments
            pos = src.index("-->", lt) + 3
            continue
        m = TAG_RE.match(src, lt)
        if not m:  # a stray "<" in text
            stack[-1].children.append(Text("<"))
            pos = lt + 1
            continue
        closing, tag, raw_attrs, self_close = m.groups()
        if closing:
            if tag in VOID:  # e.g. `<path …></path>` — already closed on open
                pos = m.end()
                continue
            for i in range(len(stack) - 1, 0, -1):
                if stack[i].tag == tag:
                    del stack[i:]
                    break
            else:
                raise SystemExit(f"unbalanced </{tag}> at {lt}")
        else:
            attrs = [(a, v) for a, v in ATTR_RE.findall(raw_attrs)]
            attrs = [(a, None if v == "" and f'{a}="' not in raw_attrs else v) for a, v in attrs]
            el = Element(tag, attrs)
            stack[-1].children.append(el)
            if not self_close and tag not in VOID:
                stack.append(el)
        pos = m.end()
    if len(stack) != 1:
        raise SystemExit(f"unclosed: {[e.tag for e in stack[1:]]}")
    return root.children


# --------------------------------------------------------------------------- expressions

class Scope:
    def __init__(self):
        self.vars: list[str] = []
        self.indices: list[str] = []

    def expr(self, code: str) -> str:
        """Qualify a template expression against the view model."""
        code = code.strip()
        if code == "$index":
            if not self.indices:
                raise SystemExit("$index outside a loop")
            return self.indices[-1]
        if code in LITERALS or re.fullmatch(r"-?\d+(\.\d+)?", code):
            return code
        if not IDENT.match(code):
            raise SystemExit(f"unsupported expression: {code!r}")
        root = code.split(".")[0]
        return code if root in self.vars else f"vm.{code}"


def interpolate(scope: Scope, value: str) -> str:
    """Render an attribute value as a JSX expression."""
    parts = re.split(r"(\{\{.*?\}\})", value)
    if len(parts) == 3 and parts[0] == "" and parts[2] == "":
        return scope.expr(parts[1][2:-2])
    out = []
    for part in parts:
        if not part:
            continue
        if part.startswith("{{"):
            out.append("${" + scope.expr(part[2:-2]) + "}")
        else:
            out.append(part.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${"))
    return "`" + "".join(out) + "`"


def css_prop(name: str) -> str:
    name = name.strip()
    if name.startswith("--"):
        return f"'{name}'"
    return re.sub(r"-([a-z])", lambda m: m.group(1).upper(), name)


"""Deliberate departures from the design file, listed in tools/departures.json.

styleFixups — fixed sizes left behind by dragging an element in the visual
editor, on boxes that hold copy. A fixed height fits the Arabic text and clips
the longer English, so it becomes a minimum; a fixed width (the home page's
"four steps" heading is 914px wide) pushes a phone's page sideways, so it
becomes a maximum. Desktop Arabic renders identically either way.
  height: 519px  home, the two audience panels
  height: 51px / width: 914px  home, the "four steps" heading

literalTranslations — copy typed straight into the design in Arabic only, which
replaces the bilingual binding, so English visitors got Arabic. The English here
was written for the site and is not approved wording; move each string into the
design's string table and delete its entry.

Both are keyed by the design's exact text, so a design change surfaces here.
"""
import json as _departures_json

_DEPARTURES = _departures_json.load(open(os.path.join(HERE, "departures.json"), encoding="utf-8"))
STYLE_FIXUPS = {decl: tuple(fix) for decl, fix in _DEPARTURES["styleFixups"].items()}
LITERAL_TRANSLATIONS: dict[str, str] = _DEPARTURES["literalTranslations"]
_fixups_applied: set[str] = set()
_literals_applied: set[str] = set()


def literal_text(data: str) -> str:
    """A run of template text: bilingual if the design typed it in Arabic only, else as is."""
    core = data.strip()
    if core not in LITERAL_TRANSLATIONS:
        return jsx_text(data)
    _literals_applied.add(core)
    lead = data[:len(data) - len(data.lstrip())]
    trail = data[len(data.rstrip()):]
    ar, en = _departures_json.dumps(core, ensure_ascii=False), _departures_json.dumps(LITERAL_TRANSLATIONS[core], ensure_ascii=False)
    return lead + "{vm.dir === 'ltr' ? " + en + " : " + ar + "}" + trail

"""Sections of the design file that a hand-written component renders instead.

Empty today. Until the September 2026 design the landing-page hero (the villa
construction film) lived outside the design file and was swapped in here; the
design now carries that hero itself, so nothing is replaced. The mechanism stays
for the next section that has to be hand-built: map a marker class on one of the
section's descendants to (JSX, [import lines]).
"""
NODE_REPLACEMENTS: dict[str, tuple[str, list[str]]] = {}
_replacements_applied: set[str] = set()


def replacement_for(node: "Element") -> tuple[str, list[str]] | None:
    """The replacement for a section, if one of its descendants is marked."""
    if node.tag != "section":
        return None
    stack = list(node.children)
    while stack:
        current = stack.pop()
        if isinstance(current, Element):
            classes = dict(current.attrs).get("class") or ""
            for marker, replacement in NODE_REPLACEMENTS.items():
                if marker in classes.split():
                    _replacements_applied.add(marker)
                    return replacement
            stack.extend(current.children)
    return None


def style_object(scope: Scope, value: str) -> str:
    decls: dict[str, str] = {}  # later declarations win, as in CSS
    for decl in value.split(";"):
        if not decl.strip():
            continue
        if ":" not in decl:
            raise SystemExit(f"bad style declaration: {decl!r}")
        prop, val = decl.split(":", 1)
        val = val.strip()
        fixup = STYLE_FIXUPS.get(decl.strip())
        if fixup:
            _fixups_applied.add(decl.strip())
            decls[fixup[0]] = "'" + fixup[1] + "'"
            continue
        if "{{" in val:
            rendered = interpolate(scope, val)
        else:
            rendered = "'" + val.replace("\\", "\\\\").replace("'", "\\'") + "'"
        decls[css_prop(prop)] = rendered
    return "{{ " + ", ".join(f"{k}: {v}" for k, v in decls.items()) + " }}"


# --------------------------------------------------------------------------- emit

def jsx_text(data: str) -> str:
    if not data.strip():
        return data if "\n" in data else data
    return data.replace("{", "&#123;").replace("}", "&#125;")


def emit_children(nodes: list[Node], scope: Scope, indent: int) -> str:
    out = []
    for node in nodes:
        out.append(emit(node, scope, indent))
    return "".join(out)


def emit(node: Node, scope: Scope, indent: int) -> str:
    pad = "  " * indent
    if isinstance(node, Text):
        parts = re.split(r"(\{\{.*?\}\})", node.data)
        buf = []
        for part in parts:
            if part.startswith("{{"):
                buf.append("{" + scope.expr(part[2:-2]) + "}")
            elif part:
                buf.append(swap_text(part) or literal_text(part))
        return "".join(buf)

    if node.tag == "sc-if":
        cond = None
        for a, v in node.attrs:
            if a == "value":
                cond = interpolate(scope, v)
        body = emit_children(node.children, scope, indent + 1)
        return f"\n{pad}{{{cond} ? (<>{body}</>) : null}}\n{pad}"

    if node.tag == "sc-for":
        lst = alias = None
        for a, v in node.attrs:
            if a == "list":
                lst = interpolate(scope, v)
            elif a == "as":
                alias = v
        idx = f"_i{len(scope.indices)}"
        scope.vars.append(alias)
        scope.indices.append(idx)
        body = emit_children(node.children, scope, indent + 1)
        scope.vars.pop()
        scope.indices.pop()
        return (
            f"\n{pad}{{(({lst}) || []).map(({alias}: any, {idx}: number) => (\n"
            f"{pad}  <React.Fragment key={{{idx}}}>{body}</React.Fragment>\n"
            f"{pad}))}}\n{pad}"
        )

    swap = replacement_for(node)
    if swap:
        return swap[0]

    tag = "ImageSlot" if node.tag == "image-slot" else node.tag
    props = []
    for name, value in node.attrs:
        if name in DROP_ATTRS:
            continue
        prop = ATTR_MAP.get(name, name)
        if value is None or (prop in BOOLEAN_ATTRS and value in ("", "true", name)):
            props.append(f"{prop}")
        elif prop in BOOLEAN_ATTRS and value == "false":
            props.append(f"{prop}={{false}}")
        elif prop == "style":
            props.append(f"style={style_object(scope, value)}")
        elif value.startswith("JSX:"):
            # an expression the converter itself decided on (see a11y_pass): emitted as written
            props.append(f"{prop}={{{value[4:]}}}")
        elif "{{" in value:
            props.append(f"{prop}={{{interpolate(scope, value)}}}")
        elif prop in NUMERIC_ATTRS and re.fullmatch(r"-?\d+", value):
            props.append(f"{prop}={{{value}}}")
        else:
            props.append(f'{prop}="{value}"')
    if node.tag == "img" and "assets/trades/" in (dict(node.attrs).get("src") or ""):
        props += ['loading="lazy"', 'decoding="async"']
    attr_str = (" " + " ".join(props)) if props else ""

    if node.tag == "textarea":
        # React forbids children on a controlled textarea.
        out = f"<textarea{attr_str} />"
    elif tag in VOID or node.tag == "image-slot":
        out = f"<{tag}{attr_str} />"
    else:
        swap_marker = next((m for m in LAUNCH_TEXT_SWAPS if m in (dict(node.attrs).get("class") or "").split()), None)
        if swap_marker:
            _text_swaps.append(LAUNCH_TEXT_SWAPS[swap_marker])
            _launch_rules_applied.add(swap_marker)
        body = emit_children(node.children, scope, indent)
        if swap_marker:
            _text_swaps.pop()
        out = f"<{tag}{attr_str}>{body}</{tag}>"
    hidden_when = launch_hidden(node)
    if hidden_when:
        out = "{" + hidden_when + " ? null : (" + out + ")}"
    return out + launch_insert(node)


# --------------------------------------------------------------------------- file writing

"""Facts about the business that the design only holds placeholders for.

`site.config.json` is the one place they live; the app reads the same file at
runtime (src/launch/mode.ts). The design's WhatsApp links all point at a dummy
number, which is swapped here for the real one.
"""
import json as _json

SITE_CONFIG = _json.load(open(os.path.join(WEB, "site.config.json"), encoding="utf-8"))
PLACEHOLDER_WHATSAPP = "wa.me/966500000000"
_whatsapp_rewrites = 0

"""What the public, early-access site leaves out.

The design is the whole product, walkable on invented data. Until accounts,
identity checks and payments are real, the public site (see src/launch/) shows
only what is true today, and keeps the full product for the private demo at
/demo. Each rule wraps the matching markup in `vm.launch ? null : (...)`, so the
demo renders exactly as designed. A rule that stops matching fails the run.
"""
LAUNCH_HIDDEN_CLASSES = {
    "ph-live": "a live-visitor counter that is a random walk, not a measurement",
    "ai2-stats": "headline figures (contractors, projects, satisfaction) that are not real yet",
    "drop": "a file picker that uploads nothing, until photos have somewhere to go (vm.uploads: src/platform/files.ts)",
    "ai2-att": "the same, on the home page's description box: it feeds the assistant, which is not public",
    "wa-card": "the WhatsApp card (the number, a test message, the channel, quiet hours): shown once the owner has switched WhatsApp updates on in the database (vm.whatsapp, supabase/013)",
    "hp-identity": "the homeowner profile's \"verified with Nafath\" card: Nafath is not connected, so nobody is",
}
# When a marker above is hidden; anything not listed here is hidden on the whole public site.
LAUNCH_HIDDEN_CONDITIONS = {"drop": "vm.launch && !vm.uploads", "wa-card": "vm.launch && !vm.whatsapp"}
# Figures the design typed into a card, which the public site reads from real rows instead (the vm field named here,
# a dash while there is nothing to measure); the demo keeps the typed figures.
LAUNCH_TEXT_SWAPS = {"perf-card": {"128": "vm.perfViews", "31%": "vm.perfWin", "4h": "vm.perfResponse"}}
_text_swaps: list[dict[str, str]] = []


def swap_text(data: str) -> str:
    """Inside a LAUNCH_TEXT_SWAPS element: the typed figure becomes the measured one on the public site ('' = not a swap)."""
    if not _text_swaps:
        return ""
    core = data.strip()
    expr = _text_swaps[-1].get(core)
    if not expr:
        return ""
    lead = data[:len(data) - len(data.lstrip())]
    trail = data[len(data.rstrip()):]
    return f"{lead}{{vm.launch ? String({expr} ?? '—') : '{core}'}}{trail}"
# The indicative price range per trade ("sugbox") was hidden at first as the design's placeholder
# figures. The owner asked for it back on 21 September 2026: the ranges are his to stand behind,
# and they are edited in the design's data file (BUDGETS in project/tarmem-i18n.js).
# The testimonials and the partner logos were hidden here at first, because the design's
# handoff notes call them seed content. The owner confirmed on 21 September 2026 that the
# quotes are from real customers and that every organisation shown is a signed partner, so
# both sections are public. If either stops being true, add its marker back:
#   "tsti-wrap": testimonials,  "prtnrs": partner logos
LAUNCH_HIDDEN_SECTIONS: dict[str, str] = {}
# Links into parts of the product that do not exist publicly yet, and the condition under
# which each is left out. A link that names a sign-up role stays: the launch guard sends it
# to the matching request form. Sign-in appears once real accounts are connected
# (`vm.accounts`, src/platform/); the rest wait for the slices in docs/real-platform-plan.md.
LAUNCH_HIDDEN_ROUTES = {
    "auth": "vm.launch && !vm.accounts",
    "contractors": "vm.launch", "browse": "vm.launch && !vm.accounts",
    "contractor": "vm.launch && !vm.accounts",  # a verified contractor's profile: real rows only (src/platform/, supabase/008)
    # signed-in pages that still run on the design's invented figures
    "wallet": "vm.launch && !vm.wallet",  # the wallet opens with payments (platform_flags.payments_live, supabase/007-008)
    # settings and the homeowner's own profile are real once accounts are (src/platform/): saved to the person's profile row
    "settings": "vm.launch && !vm.accounts", "homeowner": "vm.launch && !vm.accounts",
}
_launch_rules_applied: set[str] = set()


"""What the public site adds to the design's markup, after the element carrying the marker class
("section:" means after the <section> that contains it). Each component renders nothing
outside the public site, so the demo stays identical to the design."""
LAUNCH_INSERTS = {
    "section:ph": ("<LaunchNotice vm={vm} home />", "import LaunchNotice from '../launch/LaunchNotice';"),
    "ph-ctas": ("<HeroJoinLink vm={vm} />", "import HeroJoinLink from '../launch/HeroJoinLink';"),
    # real accounts (src/platform/): a contractor manages their portfolio photos; the team confirms wallet requests
    "own-work": ("<PortfolioManager vm={vm} />", "import PortfolioManager from '../platform/PortfolioManager';"),
    "pay-table": ("<WalletRequests vm={vm} />", "import WalletRequests from '../platform/WalletRequests';"),
    # a homeowner picks which contractor's thread the messages tab shows (supabase/019)
    "msg-card": ("<ThreadPicker vm={vm} />", "import ThreadPicker from '../platform/ThreadPicker';"),
}
_launch_inserts_applied: set[str] = set()


"""Accessibility the design leaves implicit, made explicit for screen readers (and for tapping a label on a phone):

- a `<label class="lbl">` followed by a control gets `for`, and the control the matching id;
- a control with no label at all — the search filters, the pricing slider — gets a spoken name;
- the home page's hero video is chosen per device (src/state/viewModel.ts): the 720p file on
  desktops, the 480p file on phones, and none at all when the visitor asked to save data.

The parity test ignores these additions (tests/parity.mjs), so the demo still compares equal."""
CONTROL_NAMES = {
    "city": ("City", "المدينة"), "trade": ("Trade", "التخصص"), "topic": ("Topic", "الموضوع"), "min": ("Minimum budget", "الحد الأدنى للميزانية"),
    "bank": ("Bank", "البنك"), "sort": ("Sort by", "الترتيب"), "q": ("Search", "بحث"), "range": ("Project value", "قيمة المشروع"),
}
_a11y_ids: dict[str, int] = {}


def a11y_pass(kids: list, parent_tag: str = "root") -> None:
    for i, child in enumerate(kids):
        if not isinstance(child, Element):
            continue
        attrs = dict(child.attrs)
        classes = (attrs.get("class") or "").split()
        if child.tag == "label" and "lbl" in classes and "for" not in attrs:
            following = next((k for k in kids[i + 1:] if isinstance(k, Element)), None)
            if following is not None and following.tag in ("input", "select", "textarea"):
                f_attrs = dict(following.attrs)
                name = f_attrs.get("name")
                if name and "id" not in f_attrs:
                    _a11y_ids[name] = _a11y_ids.get(name, 0) + 1
                    ident = f"a11y-{name}" + ("" if _a11y_ids[name] == 1 else f"-{_a11y_ids[name]}")
                    child.attrs.append(("for", ident))
                    following.attrs.append(("id", ident))
        if child.tag == "video" and attrs.get("src") == "assets/hero.mp4":
            child.attrs = [(k, v) for k, v in child.attrs if k != "src"] + [("src", "JSX:vm.heroVideo === undefined ? 'assets/hero.mp4' : (vm.heroVideo || undefined)")]
        a11y_pass(child.children, child.tag)
    # second look, once labels are linked: what is still nameless gets a spoken name
    for child in kids:
        if isinstance(child, Element) and child.tag in ("select", "input"):
            attrs = dict(child.attrs)
            classes = (attrs.get("class") or "").split()
            key = "range" if "range" in classes else "range" if "calcin" in classes else attrs.get("name")
            if key in CONTROL_NAMES and "id" not in attrs and "aria-label" not in attrs and parent_tag != "label":
                en, ar = CONTROL_NAMES[key]
                child.attrs.append(("aria-label", f"JSX:vm.dir === 'ltr' ? {en!r} : {ar!r}"))


def launch_insert(node: "Element") -> str:
    classes = (dict(node.attrs).get("class") or "").split()
    for marker, (snippet, _imp) in LAUNCH_INSERTS.items():
        if marker.startswith("section:"):
            if node.tag != "section":
                continue
            wanted, stack = marker.split(":", 1)[1], list(node.children)
            while stack:
                current = stack.pop()
                if isinstance(current, Element):
                    if wanted in (dict(current.attrs).get("class") or "").split():
                        _launch_inserts_applied.add(marker)
                        return snippet
                    stack.extend(current.children)
        elif marker in classes:
            _launch_inserts_applied.add(marker)
            return snippet
    return ""


def launch_hidden(node: "Element") -> str:
    """The condition under which the public site leaves this node out ('' = never)."""
    attrs = dict(node.attrs)
    classes = (attrs.get("class") or "").split()
    for marker in LAUNCH_HIDDEN_CLASSES:
        if marker in classes:
            _launch_rules_applied.add(marker)
            return LAUNCH_HIDDEN_CONDITIONS.get(marker, "vm.launch")
    if node.tag == "section":
        stack = list(node.children)
        while stack:
            current = stack.pop()
            if isinstance(current, Element):
                inner = (dict(current.attrs).get("class") or "").split()
                for marker in LAUNCH_HIDDEN_SECTIONS:
                    if marker in inner:
                        _launch_rules_applied.add(marker)
                        return "vm.launch"
                stack.extend(current.children)
    route = attrs.get("data-route")
    names_a_role = attrs.get("data-signup") or attrs.get("data-role")
    if node.tag in ("a", "button") and route in LAUNCH_HIDDEN_ROUTES and not names_a_role:
        _launch_rules_applied.add("route:" + route)
        return LAUNCH_HIDDEN_ROUTES[route]
    return ""


"""Assets the site serves in a lighter form than the design carries them.

The design's ten trade photographs are 2-3 MB PNG placeholders (24 MB on the
landing page). `public/assets/trades/NN.jpg` holds 900px JPEG copies made by
tools/optimize-assets.sh, so references are pointed at those. Applied to the
generated pages here and to the logic's computed paths via LOGIC_PATCHES.
"""
ASSET_REWRITES = [(re.compile(r"(assets/trades/\d\d)\.png"), r"\1.jpg")]
_asset_rewrites_applied = 0


def rewrite_assets(code: str) -> str:
    global _asset_rewrites_applied, _whatsapp_rewrites
    for pattern, replacement in ASSET_REWRITES:
        code, n = pattern.subn(replacement, code)
        _asset_rewrites_applied += n
    _whatsapp_rewrites += code.count(PLACEHOLDER_WHATSAPP)
    return code.replace(PLACEHOLDER_WHATSAPP, "wa.me/" + SITE_CONFIG["whatsapp"])


BANNER = """/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
"""


def component(name: str, body: str, uses_slot: bool) -> str:
    imports = []
    if "React.Fragment" in body:
        imports.append("import React from 'react';")
    imports.append("import type { VM } from '../state/viewModel';")
    if uses_slot:
        imports.append("import { ImageSlot } from '../components/ImageSlot';")
    for _marker, (snippet, extra) in NODE_REPLACEMENTS.items():
        if snippet.split(" ", 1)[0].lstrip("<") in body:
            imports.extend(extra)
    for _marker, (snippet, extra) in LAUNCH_INSERTS.items():
        if snippet in body and extra not in imports:
            imports.append(extra)
    return (
        BANNER
        + "\n".join(imports)
        + f"\n\nexport default function {name}({{ vm }}: {{ vm: VM }}) {{\n"
        + "  return (<>"
        + body
        + "</>);\n}\n"
    )


def render(nodes: list[Node]) -> str:
    _a11y_ids.clear()
    a11y_pass(nodes)
    return emit_children(nodes, Scope(), 2)


# --------------------------------------------------------------------------- stylesheet, data, logic

GENERATED = "Generated from ../../project/{name} by tools/convert-template.py — do not edit by hand."

CSS_KEEP_MARKER = "/* ==== app-only styles below — kept by tools/convert-template.py ==== */"


def sync_css(src: str) -> str:
    """The design's <style> block, verbatim, plus whatever app-only rules follow the marker."""
    helmet = src[src.index("<helmet>"):src.index("</helmet>")]
    css = helmet[helmet.index("<style>") + len("<style>"):helmet.index("</style>")].strip("\n")
    path = os.path.join(WEB, "src", "styles", "global.css")
    old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
    tail = old[old.index(CSS_KEEP_MARKER) + len(CSS_KEEP_MARKER):] if CSS_KEEP_MARKER in old else "\n"
    out = (
        "/* Tarmem global stylesheet.\n"
        "   " + GENERATED.format(name="Tarmem.dc.html") + "\n"
        "   Everything above the app-only marker is the design's <style> block, verbatim. */\n\n"
        + css + "\n\n" + CSS_KEEP_MARKER + tail
    )
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(out)
    return "styles/global.css"


def sync_data() -> str:
    """The design's string table and seed data, verbatim, as the app's data module."""
    body = open(I18N, encoding="utf-8").read()
    if "export const T" not in body:
        raise SystemExit("tarmem-i18n.js no longer exports T — check the design export")
    out = (
        "// @ts-nocheck — a verbatim copy of the design's data module; the design file is its source of truth.\n"
        "/* " + GENERATED.format(name="tarmem-i18n.js") + "\n"
        "   Seed data and all approved Arabic/English copy. Change wording in the design's\n"
        "   string table (both languages), then re-run the converter. */\n\n"
        + body
    )
    with open(os.path.join(WEB, "src", "data", "tarmem-data.ts"), "w", encoding="utf-8") as fh:
        fh.write(out)
    return "data/tarmem-data.ts"


"""Where the deployed site has to differ from the prototype's logic.

Each entry is (why, exact text in the design's script, replacement, expected
count). A patch that stops matching means the design changed underneath it, so
the run fails rather than silently shipping the prototype behaviour.
"""
LOGIC_PATCHES = [
    ("the data module is bundled, not fetched at runtime",
     "const m = await import('./tarmem-i18n.js');",
     "const m = runtimeData();", 1),
    ("the assistant talks to VITE_AI_ENDPOINT — no model key may sit in client code",
     "window.claude.complete(",
     "claude.complete(", 2),
    ("say plainly when no assistant endpoint is configured, instead of a generic failure",
     "error:T.ai.err}",
     "error:aiErrorText(e, this.state.lang, T.ai.err)}", 2),
    ("the design declares componentWillUnmount twice, so its first one (timers, video and\n"
     "     parallax listeners) is silently overridden; React does unmount here, so run both",
     "  componentWillUnmount(){ clearInterval(this._live);",
     "  _unmountTimers(){ clearInterval(this._live);", 1),
    ("... and call the renamed cleanup from the surviving componentWillUnmount",
     "  componentWillUnmount(){ clearTimeout(this._onl);",
     "  componentWillUnmount(){ this._unmountTimers(); clearTimeout(this._onl);", 1),
    ("the public site and the private demo keep separate saved state, so a demo sign-in\n"
     "     can never follow someone onto the public site",
     "'tarmem-state-v3'",
     "STORAGE_KEY", 2),
    ("trade photographs are served as optimised JPEGs (see ASSET_REWRITES)",
     ".padStart(2,'0')+'.png'",
     ".padStart(2,'0')+'.jpg'", 2),
]


def sync_logic(src: str) -> str:
    """The design's logic class, verbatim apart from LOGIC_PATCHES, as an ES module."""
    start = src.index("<script", src.index("</x-dc>"))
    body = src[src.index(">", start) + 1:src.rindex("</script>")]
    if "class Component extends DCLogic" not in body:
        raise SystemExit("the design's script no longer defines `class Component extends DCLogic`")
    for why, old, new, count in LOGIC_PATCHES:
        found = body.count(old)
        if found != count:
            raise SystemExit(f"LOGIC_PATCHES no longer match the design file ({found}/{count}): {why}")
        body = body.replace(old, new)
    out = (
        "// @ts-nocheck — the design's own logic class, carried over verbatim; see tools/convert-template.py.\n"
        "/* " + GENERATED.format(name="Tarmem.dc.html") + "\n"
        "   Behaviour changes belong in the design file. The deliberate differences from the\n"
        "   prototype are the LOGIC_PATCHES listed in the converter. */\n"
        "/* oxlint-disable */\n"
        "import * as D from '../data/tarmem-data';\n"
        "import { DCLogic, aiErrorText, claude } from './designRuntime';\n"
        "import { STORAGE_KEY } from '../launch/mode';\n"
        "import { runtimeData } from '../platform/data';\n"
        + body.rstrip() + "\n\nexport default Component;\n"
    )
    with open(os.path.join(WEB, "src", "state", "designLogic.generated.ts"), "w", encoding="utf-8") as fh:
        fh.write(out)
    return "state/designLogic.generated.ts"


"""Image slots the designer filled by dropping a photo onto them.

Claude Design keeps those in a sidecar next to the design file. Only slots the
current template can still produce are carried over — contractor cards, whose id
is `img-<contractor id>` — so stale drops from earlier designs stay out of the
site. A visitor's own drop (kept in their browser) still wins over these.
"""
SLOT_SIDECAR = os.path.join(PROJECT, ".image-slots.state.json")
SLOT_PREFIXES = ("img-",)
SLOT_TYPES = {"image/webp": "webp", "image/png": "png", "image/jpeg": "jpg"}


def sync_image_slots() -> str:
    import base64
    import json
    slots = json.load(open(SLOT_SIDECAR, encoding="utf-8")) if os.path.exists(SLOT_SIDECAR) else {}
    out_dir = os.path.join(WEB, "public", "assets", "slots")
    os.makedirs(out_dir, exist_ok=True)
    for stale in os.listdir(out_dir):
        os.remove(os.path.join(out_dir, stale))
    entries = []
    for slot_id in sorted(slots):
        if not slot_id.startswith(SLOT_PREFIXES):
            continue
        match = re.match(r"data:([\w/+.-]+);base64,(.*)$", slots[slot_id].get("u") or "", re.S)
        if not match or match.group(1) not in SLOT_TYPES:
            continue
        name = f"{slot_id}.{SLOT_TYPES[match.group(1)]}"
        with open(os.path.join(out_dir, name), "wb") as fh:
            fh.write(base64.b64decode(match.group(2)))
        entries.append(f"  '{slot_id}': 'assets/slots/{name}',")
    body = (
        "/* " + GENERATED.format(name=".image-slots.state.json") + "\n"
        "   Photographs the designer dropped onto image slots; ImageSlot shows them until a\n"
        "   visitor drops their own. The files live in public/assets/slots/. */\n\n"
        "export const FILLED_SLOTS: Record<string, string> = {\n" + "\n".join(entries) + "\n};\n"
    )
    with open(os.path.join(WEB, "src", "data", "image-slots.generated.ts"), "w", encoding="utf-8") as fh:
        fh.write(body)
    return "data/image-slots.generated.ts"


def sync_fonts(src: str) -> None:
    """index.html must load the same font families the design's <helmet> asks for."""
    helmet = src[src.index("<helmet>"):src.index("</helmet>")]
    wanted = sorted(set(re.findall(r"family=([A-Za-z+]+)", helmet)))
    index = open(os.path.join(WEB, "index.html"), encoding="utf-8").read()
    missing = [f for f in wanted if f"family={f}" not in index]
    if missing:
        raise SystemExit(f"index.html does not load fonts the design uses: {missing}")


# --------------------------------------------------------------------------- main

def main() -> None:
    src = open(DESIGN, encoding="utf-8").read()
    if "omelette-injected" in src:
        raise SystemExit("project/Tarmem.dc.html carries Claude Design's preview script — export the clean file")
    tpl = src[src.index("</helmet>") + len("</helmet>"):src.index("</x-dc>")]
    tree = parse(tpl)
    root = next(n for n in tree if isinstance(n, Element) and n.tag == "div")

    header = next(n for n in root.children if isinstance(n, Element) and n.tag == "header")
    footer = next(n for n in root.children if isinstance(n, Element) and n.tag == "footer")
    main_el = next(n for n in root.children if isinstance(n, Element) and n.tag == "main")

    written: list[str] = []

    def write(path: str, name: str, nodes: list[Node]) -> None:
        body = render(nodes)
        code = rewrite_assets(component(name, body, "<ImageSlot" in body))
        full = os.path.join(WEB, "src", path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(code)
        written.append(path)

    write("components/Header.tsx", "Header", [header])
    write("components/Footer.tsx", "Footer", [footer])

    # Whatever else sits beside <header>, <main> and <footer> (the fixed-header spacer,
    # the WhatsApp button). Each keeps its own condition; App.tsx renders them between
    # the header and <main>, where the design has them.
    elements = [n for n in root.children if isinstance(n, Element)]
    between = elements[elements.index(header) + 1:elements.index(main_el)]
    stray = [n for n in elements if n not in between and n not in (header, main_el, footer)]
    if stray:
        raise SystemExit(f"root-level blocks outside header..main: {[n.tag for n in stray]}")
    write("components/ShellBlocks.tsx", "ShellBlocks", between)

    routes: dict[str, str] = {
        "home": "HomePage", "plan": "PlanPage", "how": "HowPage", "pricing": "PricingPage",
        "about": "AboutPage", "help": "HelpPage", "faq": "FaqPage", "auth": "AuthPage",
        "contractors": "ContractorsPage",
        "settings": "SettingsPage", "wallet": "WalletPage", "homeowner": "HomeownerProfilePage",
        "contractor": "ContractorProfilePage", "post": "PostProjectPage", "hdash": "HomeownerDashboardPage",
        "cdash": "ContractorDashboardPage", "browse": "BrowseProjectsPage", "project": "ProjectPage",
        "admin": "AdminPage", "rules": "RulesPage", "terms": "TermsPage", "privacy": "PrivacyPage",
        "contact": "ContactPage",
    }
    # Blocks inside <main> that are not pages. App.tsx renders each one; the component
    # carries its own condition, so the shell never restates the design's logic.
    extras = {"hed.open": ("components/HomeownerEditModal.tsx", "HomeownerEditModal"),
              "ed.open": ("components/ContractorEditModal.tsx", "ContractorEditModal"),
              "giftOpen": ("components/GiftModal.tsx", "GiftModal"),
              "showBack": ("components/BackLink.tsx", "BackLink")}

    seen_routes = []
    seen_extras = []
    for child in main_el.children:
        if not isinstance(child, Element) or child.tag != "sc-if":
            if isinstance(child, Element):
                raise SystemExit(f"unexpected <{child.tag}> directly inside <main>")
            continue
        cond = dict(child.attrs)["value"]
        key = re.sub(r"[{}\s]", "", cond)
        if key.startswith("r."):
            route = key[2:]
            if route not in routes:
                raise SystemExit(f"unmapped route: {route}")
            write(f"pages/{routes[route]}.tsx", routes[route], child.children)
            seen_routes.append(route)
        elif key in extras:
            path, name = extras[key]
            write(path, name, [child])
            seen_extras.append(key)
        else:
            raise SystemExit(f"unmapped top-level block: {key}")

    missing = set(routes) - set(seen_routes)
    if missing:
        raise SystemExit(f"routes in the map that the template never defines: {missing}")
    missing_extras = set(extras) - set(seen_extras)
    if missing_extras:
        raise SystemExit(f"blocks in the map that the template never defines: {missing_extras}")

    # A routing table so App.tsx stays declarative.
    lines = [BANNER, "import type { ComponentType } from 'react';",
             "import type { VM } from './state/viewModel';"]
    for route in seen_routes:
        lines.append(f"import {routes[route]} from './pages/{routes[route]}';")
    lines.append("\nexport type Route =\n  " + "\n  | ".join(f"'{r}'" for r in seen_routes) + ";\n")
    lines.append("export const PAGES: Record<Route, ComponentType<{ vm: VM }>> = {")
    for route in seen_routes:
        lines.append(f"  {route}: {routes[route]},")
    lines.append("};\n")
    with open(os.path.join(WEB, "src", "routes.ts"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    stale = set(STYLE_FIXUPS) - _fixups_applied
    if stale:
        raise SystemExit(f"departures.json styleFixups no longer match the design file: {sorted(stale)}")

    fixed = set(LITERAL_TRANSLATIONS) - _literals_applied
    if fixed:
        raise SystemExit(f"departures.json literalTranslations no longer match the design file "
                         f"(fixed at source? then delete them): {sorted(fixed)}")

    unmatched = set(NODE_REPLACEMENTS) - _replacements_applied
    if unmatched:
        raise SystemExit(f"NODE_REPLACEMENTS no longer match the design file: {sorted(unmatched)}")

    if not _asset_rewrites_applied:
        raise SystemExit("ASSET_REWRITES matched nothing — the design no longer references assets/trades/NN.png")

    if not _whatsapp_rewrites:
        raise SystemExit(f"the design no longer links to {PLACEHOLDER_WHATSAPP} — check where its WhatsApp links point")

    expected = set(LAUNCH_HIDDEN_CLASSES) | set(LAUNCH_HIDDEN_SECTIONS) | set(LAUNCH_TEXT_SWAPS) | {"route:" + r for r in LAUNCH_HIDDEN_ROUTES}
    unmatched_launch = (expected - _launch_rules_applied) | (set(LAUNCH_INSERTS) - _launch_inserts_applied)
    if unmatched_launch:
        raise SystemExit(f"launch rules no longer match the design file: {sorted(unmatched_launch)}")

    written.append(sync_css(src))
    written.append(sync_data())
    written.append(sync_logic(src))
    written.append(sync_image_slots())
    sync_fonts(src)

    print(f"wrote {len(written) + 1} files:")
    for path in written:
        print("  src/" + path)
    print("  src/routes.ts")


if __name__ == "__main__":
    sys.exit(main())
