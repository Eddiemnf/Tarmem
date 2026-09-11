#!/usr/bin/env python3
"""Convert the Claude Design prototype template into React components.

The prototype (../project/Tarmem.dc.html) renders through Claude Design's own
runtime: `<sc-if>` / `<sc-for>` elements and `{{ expr }}` bindings against the
object returned by `renderVals()`. That object is ported by hand to
`src/state/viewModel.ts`; this script ports the *markup* mechanically so no
class, inline style or attribute drifts during transcription.

Run from web/:  python3 tools/convert-template.py
"""
from __future__ import annotations

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
DESIGN = os.path.join(os.path.dirname(WEB), "project", "Tarmem.dc.html")

VOID = {"img", "input", "br", "hr", "path", "circle", "rect", "source", "col", "meta", "link"}
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
    "credit-href": "creditHref",
}
DROP_ATTRS = {"hint-placeholder-count", "hint-placeholder-val"}
# React types these as numbers, so a literal must not be emitted as a string.
NUMERIC_ATTRS = {"maxLength", "minLength", "rows", "cols", "size", "span", "tabIndex"}
# `multiple=""` in HTML means true; React wants the bare prop.
BOOLEAN_ATTRS = {"multiple", "disabled", "checked", "readOnly", "required", "hidden", "autoFocus"}
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


"""Deliberate departures from the design file's inline styles.

Both are fixed heights left behind by dragging elements in the visual editor, on
boxes that hold copy. They fit the Arabic text and clip the longer English, so
each becomes a minimum instead: Arabic renders identically, English stops
overlapping. Keyed by the exact declaration so a design change surfaces here.
"""
STYLE_FIXUPS = {
    "height: 519px": ("minHeight", "519px"),  # home: the two audience panels
    "height: 73px": ("minHeight", "73px"),    # home: the contractor panel heading
}
_fixups_applied: set[str] = set()


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
                buf.append(jsx_text(part))
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

    tag = "ImageSlot" if node.tag == "image-slot" else node.tag
    props = []
    for name, value in node.attrs:
        if name in DROP_ATTRS:
            continue
        prop = ATTR_MAP.get(name, name)
        if value is None or (prop in BOOLEAN_ATTRS and value == ""):
            props.append(f"{prop}")
        elif prop == "style":
            props.append(f"style={style_object(scope, value)}")
        elif "{{" in value:
            props.append(f"{prop}={{{interpolate(scope, value)}}}")
        elif prop in NUMERIC_ATTRS and re.fullmatch(r"\d+", value):
            props.append(f"{prop}={{{value}}}")
        else:
            props.append(f'{prop}="{value}"')
    attr_str = (" " + " ".join(props)) if props else ""

    if node.tag == "textarea":
        # React forbids children on a controlled textarea.
        return f"<textarea{attr_str} />"
    if tag in VOID or node.tag == "image-slot":
        return f"<{tag}{attr_str} />"
    body = emit_children(node.children, scope, indent)
    return f"<{tag}{attr_str}>{body}</{tag}>"


# --------------------------------------------------------------------------- file writing

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
    return (
        BANNER
        + "\n".join(imports)
        + f"\n\nexport default function {name}({{ vm }}: {{ vm: VM }}) {{\n"
        + "  return (<>"
        + body
        + "</>);\n}\n"
    )


def render(nodes: list[Node]) -> str:
    return emit_children(nodes, Scope(), 2)


def main() -> None:
    src = open(DESIGN, encoding="utf-8").read()
    tpl = src[src.index("</helmet>") + len("</helmet>"):src.index("</x-dc>")]
    tree = parse(tpl)
    root = next(n for n in tree if isinstance(n, Element) and n.tag == "div")

    header = next(n for n in root.children if isinstance(n, Element) and n.tag == "header")
    footer = next(n for n in root.children if isinstance(n, Element) and n.tag == "footer")
    main_el = next(n for n in root.children if isinstance(n, Element) and n.tag == "main")

    written: list[str] = []

    def write(path: str, name: str, nodes: list[Node]) -> None:
        body = render(nodes)
        code = component(name, body, "<ImageSlot" in body)
        full = os.path.join(WEB, "src", path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(code)
        written.append(path)

    write("components/Header.tsx", "Header", [header])
    write("components/Footer.tsx", "Footer", [footer])

    routes: dict[str, str] = {
        "home": "HomePage", "plan": "PlanPage", "how": "HowPage", "pricing": "PricingPage",
        "about": "AboutPage", "faq": "FaqPage", "auth": "AuthPage", "contractors": "ContractorsPage",
        "settings": "SettingsPage", "wallet": "WalletPage", "homeowner": "HomeownerProfilePage",
        "contractor": "ContractorProfilePage", "post": "PostProjectPage", "hdash": "HomeownerDashboardPage",
        "cdash": "ContractorDashboardPage", "browse": "BrowseProjectsPage", "project": "ProjectPage",
        "admin": "AdminPage", "rules": "RulesPage", "terms": "TermsPage", "privacy": "PrivacyPage",
        "contact": "ContactPage",
    }
    extras = {"hed.open": ("components/HomeownerEditModal.tsx", "HomeownerEditModal"),
              "ed.open": ("components/ContractorEditModal.tsx", "ContractorEditModal"),
              "showBack": ("components/BackLink.tsx", "BackLink")}

    seen_routes = []
    for child in main_el.children:
        if not isinstance(child, Element) or child.tag != "sc-if":
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
            write(path, name, child.children)
        else:
            raise SystemExit(f"unmapped top-level block: {key}")

    missing = set(routes) - set(seen_routes)
    if missing:
        raise SystemExit(f"routes in the map that the template never defines: {missing}")

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
        raise SystemExit(f"STYLE_FIXUPS no longer match the design file: {sorted(stale)}")

    print(f"wrote {len(written) + 1} files:")
    for path in written:
        print("  src/" + path)
    print("  src/routes.ts")


if __name__ == "__main__":
    sys.exit(main())
