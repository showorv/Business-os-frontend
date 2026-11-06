import { describe, expect, it } from "vitest";
import { resources } from "./index";

const keysOf = (value: object, prefix = ""): string[] =>
  Object.entries(value).flatMap(([key, inner]) => (typeof inner === "object" && inner !== null ? keysOf(inner, `${prefix}${key}.`) : [`${prefix}${key}`]));

const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();

describe("translations", () => {
  for (const namespace of Object.keys(resources.en) as (keyof typeof resources.en)[]) {
    it(`${namespace}: Bangla has every English key, and no extra ones`, () => {
      expect(keysOf(resources.bn[namespace]).sort()).toEqual(keysOf(resources.en[namespace]).sort());
    });

    it(`${namespace}: each Bangla text keeps the English one's {{values}}`, () => {
      const english = resources.en[namespace] as Record<string, string>;
      const bangla = resources.bn[namespace] as Record<string, string>;
      for (const key of Object.keys(english)) expect(placeholders(bangla[key]!), key).toEqual(placeholders(english[key]!));
    });
  }
});
