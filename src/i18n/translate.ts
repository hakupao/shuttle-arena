import { Fragment, createElement, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Messages } from "./messages/zh";
import zh from "./messages/zh";
import ja from "./messages/ja";
import en from "./messages/en";

export const MESSAGES: Record<Locale, Messages> = { zh, ja, en };

/** Dotted path to every string leaf of the dictionary, e.g. "common.nav.home". */
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type MessageParams = Record<string, string | number>;

export type TFunction = (key: MessageKey, params?: MessageParams) => string;
export type TNodeFunction = (key: MessageKey, values: Record<string, ReactNode>) => ReactNode;

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

const PLACEHOLDER = /\{(\w+)\}/g;

function resolve(locale: Locale, key: string): string {
  // Missing keys fall back to English, then to the key itself so gaps stay visible.
  return lookup(MESSAGES[locale], key) ?? lookup(MESSAGES.en, key) ?? key;
}

export function createT(locale: Locale): TFunction {
  return (key, params) => {
    const template = resolve(locale, key);
    if (!params) return template;
    return template.replace(PLACEHOLDER, (match, name: string) =>
      name in params ? String(params[name]) : match
    );
  };
}

/**
 * Like `t`, but placeholders may be React nodes, for messages that wrap
 * elements such as `<strong>{count}</strong>` inside translated text.
 */
export function createTNode(locale: Locale): TNodeFunction {
  return function tNode(key, values) {
    const template = resolve(locale, key);
    const parts = template.split(PLACEHOLDER);
    // split() with a capture group alternates: text, name, text, name, ...
    return createElement(
      Fragment,
      null,
      ...parts.map((part, index) => {
        if (index % 2 === 0) return part;
        return createElement(Fragment, { key: index }, part in values ? values[part] : `{${part}}`);
      })
    );
  };
}
