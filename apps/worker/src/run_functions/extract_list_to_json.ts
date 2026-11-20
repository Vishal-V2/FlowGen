import * as cheerio from "cheerio";
import { ExecutionEnvironment, PhaseEnvironment } from "../schema/environment";

type FieldSpec = { name: string; selector: string; attribute?: string };

/**
 * Parses the "Fields" input. One field per line, formatted as
 *   name: selector
 *   name: selector @attribute
 * An empty selector (e.g. "link: @href") reads from the item element itself.
 */
function parseFields(raw: string): FieldSpec[] {
  const fields: FieldSpec[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const sep = trimmed.indexOf(":");
    if (sep <= 0) {
      throw new Error(
        `Invalid field "${trimmed}". Use the format "name: selector".`
      );
    }

    const name = trimmed.slice(0, sep).trim();
    let selector = trimmed.slice(sep + 1).trim();
    let attribute: string | undefined;

    const attrMatch = selector.match(/(?:^|\s)@([\w-]+)$/);
    if (attrMatch) {
      attribute = attrMatch[1];
      selector = selector.slice(0, attrMatch.index).trim();
    }

    fields.push({ name, selector, attribute });
  }
  return fields;
}

export const ExtractListToJSONExecutor = async (
  environmentio: PhaseEnvironment,
  environmentFn: ExecutionEnvironment
) => {
  try {
    const html = environmentio.inputs["HTML"];
    if (!html) {
      environmentFn.log.ERROR("No HTML provided.");
      return false;
    }

    const itemSelector = environmentio.inputs["Item Selector"]?.trim();
    if (!itemSelector) {
      environmentFn.log.ERROR("No item selector defined.");
      return false;
    }

    const fields = parseFields(environmentio.inputs["Fields"] || "");
    if (fields.length === 0) {
      environmentFn.log.ERROR("Define at least one field.");
      return false;
    }

    const $ = cheerio.load(html);
    const items = $(itemSelector);

    if (items.length === 0) {
      environmentFn.log.ERROR(`No elements matched "${itemSelector}".`);
      return false;
    }

    const results: Record<string, string | null>[] = [];
    items.each((_, el) => {
      const item = $(el);
      const row: Record<string, string | null> = {};
      for (const field of fields) {
        const target = field.selector ? item.find(field.selector).first() : item;
        if (target.length === 0) {
          row[field.name] = null;
          continue;
        }
        const value = field.attribute
          ? target.attr(field.attribute)
          : target.text();
        row[field.name] =
          value === undefined ? null : value.replace(/\s+/g, " ").trim();
      }
      results.push(row);
    });

    for (const field of fields) {
      if (results.every((row) => row[field.name] === null)) {
        environmentFn.log.WARN(
          `Field "${field.name}" was empty for every item. Check its selector.`
        );
      }
    }

    environmentio.outputs["JSON"] = JSON.stringify(results);
    environmentio.outputs["Item Count"] = String(results.length);
    environmentFn.log.INFO(
      `Extracted ${results.length} item(s) with ${fields.length} field(s).`
    );
    return true;
  } catch (err: any) {
    environmentFn.log.ERROR(err.message);
    return false;
  }
};
